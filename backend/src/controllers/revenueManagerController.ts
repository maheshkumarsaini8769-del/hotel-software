import { Response } from 'express';
import { Types } from 'mongoose';
import { RevenueStrategy, IRevenueStrategy } from '../models/RevenueStrategy';
import { Room, RoomStatus } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { Stay, StayStatus } from '../models/Stay';
import { TenantRequest } from '../types';

// Helper to determine if a date is a weekend (Friday, Saturday, Sunday in hospitality yield)
export const isWeekendHospitality = (dateStr: string | Date): boolean => {
  const d = new Date(dateStr);
  const day = d.getDay();
  return day === 5 || day === 6 || day === 0; // Fri=5, Sat=6, Sun=0
};

// 1. Create or Update Dynamic Pricing Strategy for a Room Type
export const createOrUpdateRevenueStrategy = async (
  req: TenantRequest,
  res: Response
): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      roomTypeId,
      strategyName,
      basePrice,
      minPriceFloor,
      maxPriceCeiling,
      surgeTiers,
      weekendMultiplier = 1.15,
      competitorBenchmarks = [],
      notes,
    } = req.body;

    if (!roomTypeId || !Types.ObjectId.isValid(roomTypeId)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_INPUT', message: 'Valid roomTypeId is required' });
      return;
    }

    if (basePrice <= 0 || minPriceFloor <= 0 || maxPriceCeiling <= 0) {
      res.status(400).json({ success: false, errorCode: 'INVALID_PRICE', message: 'Prices must be greater than zero' });
      return;
    }

    if (minPriceFloor > basePrice || basePrice > maxPriceCeiling) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_BOUNDS',
        message: 'Floor price must be <= base price <= ceiling price',
      });
      return;
    }

    const roomType = await RoomType.findOne({ _id: new Types.ObjectId(roomTypeId), hotelId });
    if (!roomType) {
      res.status(404).json({ success: false, errorCode: 'ROOM_TYPE_NOT_FOUND', message: 'Room type not found' });
      return;
    }

    const strategy = await RevenueStrategy.findOneAndUpdate(
      { hotelId, roomTypeId: new Types.ObjectId(roomTypeId) },
      {
        $set: {
          strategyName: strategyName || `${roomType.name} Dynamic Yield Strategy`,
          basePrice,
          minPriceFloor,
          maxPriceCeiling,
          surgeTiers: surgeTiers && surgeTiers.length > 0 ? surgeTiers : undefined,
          weekendMultiplier,
          competitorBenchmarks,
          notes,
          isActive: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      message: 'Revenue strategy successfully saved',
      data: strategy,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      errorCode: 'STRATEGY_SAVE_FAILED',
      message: error.message || 'Internal server error saving revenue strategy',
    });
  }
};

// 2. Get All Revenue Strategies for Tenant Hotel
export const getRevenueStrategies = async (
  req: TenantRequest,
  res: Response
): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const strategies = await RevenueStrategy.find({ hotelId })
      .populate('roomTypeId', 'name code basePriceOvernight totalRoomsCount')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: strategies,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      errorCode: 'STRATEGIES_FETCH_FAILED',
      message: error.message || 'Internal server error fetching strategies',
    });
  }
};

// 3. Calculate Authoritative Dynamic Rate Quote
export const calculateDynamicRateQuote = async (
  req: TenantRequest,
  res: Response
): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      roomTypeId,
      targetDate = new Date().toISOString(),
      overrideOccupancyPercent,
      isWeekendOverride,
    } = req.body;

    if (!roomTypeId || !Types.ObjectId.isValid(roomTypeId)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_INPUT', message: 'Valid roomTypeId is required' });
      return;
    }

    const roomType = await RoomType.findOne({ _id: new Types.ObjectId(roomTypeId), hotelId });
    if (!roomType) {
      res.status(404).json({ success: false, errorCode: 'ROOM_TYPE_NOT_FOUND', message: 'Room type not found' });
      return;
    }

    // A. Determine Live Occupancy %
    let occupancyPercent = 0;
    if (typeof overrideOccupancyPercent === 'number') {
      occupancyPercent = Math.max(0, Math.min(100, overrideOccupancyPercent));
    } else {
      const totalRooms = await Room.countDocuments({
        hotelId,
        roomTypeId: new Types.ObjectId(roomTypeId),
        status: { $ne: RoomStatus.OUT_OF_SERVICE },
      });
      const occupiedRooms = await Stay.countDocuments({
        hotelId,
        stayStatus: StayStatus.ACTIVE,
      });
      occupancyPercent = totalRooms > 0 ? Number(((occupiedRooms / totalRooms) * 100).toFixed(1)) : 0;
    }

    // B. Check Strategy
    const strategy = await RevenueStrategy.findOne({
      hotelId,
      roomTypeId: new Types.ObjectId(roomTypeId),
      isActive: true,
    });

    const isWeekend = typeof isWeekendOverride === 'boolean' ? isWeekendOverride : isWeekendHospitality(targetDate);

    let baseRate = strategy ? strategy.basePrice : roomType.basePriceOvernight;
    let activeTierName = 'DEFAULT_RACK_RATE';
    let surgeMultiplier = 1.0;
    let fixedAdjustment = 0;

    if (strategy && strategy.surgeTiers && strategy.surgeTiers.length > 0) {
      // Find matching tier based on occupancy %
      const matchedTier = strategy.surgeTiers.find(
        (tier) => occupancyPercent >= tier.minOccupancyPercent && occupancyPercent <= tier.maxOccupancyPercent
      );
      if (matchedTier) {
        activeTierName = matchedTier.tierName;
        surgeMultiplier = matchedTier.multiplier;
        fixedAdjustment = matchedTier.fixedAdjustment || 0;
      }
    }

    // C. Compute Dynamic Rate
    let calculatedRate = baseRate * surgeMultiplier + fixedAdjustment;

    // Apply weekend surge if applicable
    if (isWeekend && strategy) {
      calculatedRate = calculatedRate * strategy.weekendMultiplier;
    }

    // Clamp within min floor and max ceiling
    if (strategy) {
      calculatedRate = Math.max(strategy.minPriceFloor, Math.min(strategy.maxPriceCeiling, calculatedRate));
    }

    // Round to nearest integer
    const finalDynamicRate = Math.round(calculatedRate);
    const tax12Percent = Math.round(finalDynamicRate * 0.12);
    const totalWithGst = finalDynamicRate + tax12Percent;

    // D. Competitor Benchmark Comparison
    let competitorAverage = 0;
    let competitorComparison: any[] = [];
    if (strategy && strategy.competitorBenchmarks && strategy.competitorBenchmarks.length > 0) {
      const sum = strategy.competitorBenchmarks.reduce((acc, c) => acc + c.benchmarkPrice, 0);
      competitorAverage = Math.round(sum / strategy.competitorBenchmarks.length);
      competitorComparison = strategy.competitorBenchmarks.map((c) => ({
        competitorName: c.competitorName,
        benchmarkPrice: c.benchmarkPrice,
        priceDelta: finalDynamicRate - c.benchmarkPrice,
      }));
    }

    res.status(200).json({
      success: true,
      data: {
        roomTypeId,
        roomTypeName: roomType.name,
        basePrice: baseRate,
        finalDynamicRate,
        activeTierName,
        surgeMultiplier,
        occupancyPercent,
        isWeekend,
        weekendMultiplierApplied: isWeekend ? (strategy?.weekendMultiplier || 1.0) : 1.0,
        tax12Percent,
        totalWithGst,
        competitorAverage,
        competitorComparison,
        yieldRecommendation:
          occupancyPercent > 80
            ? 'HIGH_DEMAND_SURGE: Room rates raised to capture maximum guest willingness to pay.'
            : occupancyPercent < 40
            ? 'LOW_DEMAND_STIMULATION: Discounted rate applied to accelerate occupancy.'
            : 'OPTIMAL_PARITY: Standard yield trajectory active.',
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      errorCode: 'DYNAMIC_RATE_CALC_FAILED',
      message: error.message || 'Internal server error calculating rate',
    });
  }
};

// 4. Add or Update Competitor Benchmark Rate
export const updateCompetitorBenchmark = async (
  req: TenantRequest,
  res: Response
): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { roomTypeId, competitorName, benchmarkPrice } = req.body;
    if (!roomTypeId || !competitorName || typeof benchmarkPrice !== 'number') {
      res.status(400).json({ success: false, errorCode: 'INVALID_INPUT', message: 'Missing required benchmark fields' });
      return;
    }

    const strategy = await RevenueStrategy.findOne({
      hotelId,
      roomTypeId: new Types.ObjectId(roomTypeId),
    });

    if (!strategy) {
      res.status(404).json({ success: false, errorCode: 'STRATEGY_NOT_FOUND', message: 'Strategy not found' });
      return;
    }

    const existingIndex = strategy.competitorBenchmarks.findIndex(
      (c) => c.competitorName.toLowerCase() === competitorName.toLowerCase()
    );

    if (existingIndex >= 0) {
      strategy.competitorBenchmarks[existingIndex].benchmarkPrice = benchmarkPrice;
      strategy.competitorBenchmarks[existingIndex].lastUpdated = new Date();
    } else {
      strategy.competitorBenchmarks.push({
        competitorName,
        benchmarkPrice,
        lastUpdated: new Date(),
      });
    }

    await strategy.save();

    res.status(200).json({
      success: true,
      message: 'Competitor benchmark updated',
      data: strategy,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      errorCode: 'COMPETITOR_UPDATE_FAILED',
      message: error.message || 'Internal server error updating competitor benchmark',
    });
  }
};

// 5. Apply Dynamic Rate to Live RoomType Inventory & Broadcast via Sockets
export const applyDynamicRateToLiveInventory = async (
  req: TenantRequest,
  res: Response
): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { roomTypeId, newDynamicRate } = req.body;
    if (!roomTypeId || typeof newDynamicRate !== 'number' || newDynamicRate <= 0) {
      res.status(400).json({ success: false, errorCode: 'INVALID_INPUT', message: 'Valid roomTypeId and newDynamicRate required' });
      return;
    }

    const roomType = await RoomType.findOneAndUpdate(
      { _id: new Types.ObjectId(roomTypeId), hotelId },
      { $set: { basePriceOvernight: newDynamicRate } },
      { new: true }
    );

    if (!roomType) {
      res.status(404).json({ success: false, errorCode: 'ROOM_TYPE_NOT_FOUND', message: 'Room type not found' });
      return;
    }

    // Update strategy lastCalculatedRate
    await RevenueStrategy.findOneAndUpdate(
      { hotelId, roomTypeId: new Types.ObjectId(roomTypeId) },
      { $set: { lastCalculatedRate: newDynamicRate } }
    );

    // Broadcast realtime event
    const io = req.app?.get('io');
    if (io) {
      io.to(`${hotelId.toString()}_global`).emit('DYNAMIC_RATE_UPDATED', {
        roomTypeId,
        roomTypeName: roomType.name,
        newDynamicRate,
        updatedAt: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      message: `Live inventory updated for ${roomType.name} to ₹${newDynamicRate}`,
      data: roomType,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      errorCode: 'INVENTORY_RATE_APPLY_FAILED',
      message: error.message || 'Internal server error applying dynamic rate',
    });
  }
};
