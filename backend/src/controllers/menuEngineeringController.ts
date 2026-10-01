import { Response } from 'express';
import { Types } from 'mongoose';
import {
  MenuEngineeringReport,
  MenuQuadrant,
  IMenuEngineeringItem,
} from '../models/MenuEngineeringReport';
import { MenuItem } from '../models/MenuItem';
import { Recipe } from '../models/Recipe';
import { RestaurantOrder } from '../models/RestaurantOrder';
import { TenantRequest } from '../types';

// Helper to assign quadrant and action strategy
export const classifyItemQuadrant = (
  volume: number,
  margin: number,
  avgVolume: number,
  avgMargin: number
): { quadrant: MenuQuadrant; actionStrategy: string } => {
  const isHighVolume = volume >= avgVolume;
  const isHighMargin = margin >= avgMargin;

  if (isHighVolume && isHighMargin) {
    return {
      quadrant: MenuQuadrant.STAR,
      actionStrategy:
        'Star Item: High profit & high volume. Protect portion consistency and food quality. Maintain prime menu placement.',
    };
  } else if (isHighVolume && !isHighMargin) {
    return {
      quadrant: MenuQuadrant.PLOWHORSE,
      actionStrategy:
        'Plowhorse Item: High popularity but low margin. Increase selling price slightly, re-negotiate ingredient cost, or reduce portion waste.',
    };
  } else if (!isHighVolume && isHighMargin) {
    return {
      quadrant: MenuQuadrant.PUZZLE,
      actionStrategy:
        'Puzzle Item: High profit margin but sluggish sales. Feature on specials board, improve menu imagery, and train waitstaff to upsell.',
    };
  } else {
    return {
      quadrant: MenuQuadrant.DOG,
      actionStrategy:
        'Dog Item: Low popularity and low profit. Redesign recipe or consider phase-out to eliminate prep time and inventory holding cost.',
    };
  }
};

// 1. Generate Menu Engineering Report (Live Analysis)
export const generateMenuEngineeringReport = async (
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
      reportTitle = `Menu Matrix Analysis - ${new Date().toLocaleDateString('en-GB')}`,
      startDate,
      endDate,
      customItems,
    } = req.body;

    const periodStart = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const periodEnd = endDate ? new Date(endDate) : new Date();

    let rawItemList: Array<{
      menuItemId: Types.ObjectId;
      itemName: string;
      category?: string;
      sellingPrice: number;
      foodCost: number;
      quantitySold: number;
    }> = [];

    if (customItems && Array.isArray(customItems) && customItems.length > 0) {
      // Direct custom items list
      rawItemList = customItems.map((ci: any) => ({
        menuItemId: ci.menuItemId ? new Types.ObjectId(ci.menuItemId) : new Types.ObjectId(),
        itemName: ci.itemName,
        category: ci.category || 'Main Course',
        sellingPrice: Number(ci.sellingPrice) || 0,
        foodCost: Number(ci.foodCost) || 0,
        quantitySold: Number(ci.quantitySold) || 0,
      }));
    } else {
      // Compute from DB: Get MenuItems, Recipes & Orders
      const menuItems = await MenuItem.find({ hotelId, isAvailable: true });
      const recipes = await Recipe.find({ hotelId, isActive: true });
      const recipeCostMap = new Map<string, number>();
      recipes.forEach((r) => {
        recipeCostMap.set(r.menuItemId.toString(), r.costPerPortion);
      });

      // Find sales in date range
      const orders = await RestaurantOrder.find({
        hotelId,
        placedAt: { $gte: periodStart, $lte: periodEnd },
      });

      const salesVolumeMap = new Map<string, number>();
      orders.forEach((ord) => {
        ord.items.forEach((item) => {
          const key = item.menuItemId.toString();
          salesVolumeMap.set(key, (salesVolumeMap.get(key) || 0) + item.quantity);
        });
      });

      rawItemList = menuItems.map((mi) => {
        const idStr = mi._id.toString();
        const cost = recipeCostMap.get(idStr) || Math.round(mi.basePrice * 0.32); // 32% default food cost if no recipe
        const sold = salesVolumeMap.get(idStr) || 0;
        return {
          menuItemId: mi._id,
          itemName: mi.name,
          category: 'Food & Beverage',
          sellingPrice: mi.basePrice,
          foodCost: cost,
          quantitySold: sold,
        };
      });
    }

    if (rawItemList.length === 0) {
      res.status(400).json({
        success: false,
        errorCode: 'EMPTY_MENU_DATA',
        message: 'No menu items found to evaluate',
      });
      return;
    }

    // Mathematical Totals
    let totalSalesVolume = 0;
    let totalRevenue = 0;
    let totalFoodCost = 0;
    let totalContributionMargin = 0;

    rawItemList.forEach((item) => {
      const margin = item.sellingPrice - item.foodCost;
      totalSalesVolume += item.quantitySold;
      totalRevenue += item.sellingPrice * item.quantitySold;
      totalFoodCost += item.foodCost * item.quantitySold;
      totalContributionMargin += margin * item.quantitySold;
    });

    const averageVolumeBenchmark =
      rawItemList.length > 0 ? Math.round((totalSalesVolume / rawItemList.length) * 100) / 100 : 0;

    const averageMarginBenchmark =
      totalSalesVolume > 0
        ? Math.round((totalContributionMargin / totalSalesVolume) * 100) / 100
        : 0;

    const overallFoodCostPercentage =
      totalRevenue > 0 ? Math.round((totalFoodCost / totalRevenue) * 1000) / 10 : 0;

    let starsCount = 0;
    let plowhorsesCount = 0;
    let puzzlesCount = 0;
    let dogsCount = 0;

    const analyzedItems: IMenuEngineeringItem[] = rawItemList.map((it) => {
      const contributionMargin = Math.round((it.sellingPrice - it.foodCost) * 100) / 100;
      const totalItemMargin = Math.round(contributionMargin * it.quantitySold * 100) / 100;
      const totalItemRev = Math.round(it.sellingPrice * it.quantitySold * 100) / 100;
      const foodCostPercentage =
        it.sellingPrice > 0 ? Math.round((it.foodCost / it.sellingPrice) * 1000) / 10 : 0;
      const menuSharePercentage =
        totalSalesVolume > 0 ? Math.round((it.quantitySold / totalSalesVolume) * 1000) / 10 : 0;

      const { quadrant, actionStrategy } = classifyItemQuadrant(
        it.quantitySold,
        contributionMargin,
        averageVolumeBenchmark,
        averageMarginBenchmark
      );

      if (quadrant === MenuQuadrant.STAR) starsCount++;
      else if (quadrant === MenuQuadrant.PLOWHORSE) plowhorsesCount++;
      else if (quadrant === MenuQuadrant.PUZZLE) puzzlesCount++;
      else if (quadrant === MenuQuadrant.DOG) dogsCount++;

      return {
        menuItemId: it.menuItemId,
        itemName: it.itemName,
        category: it.category,
        sellingPrice: it.sellingPrice,
        foodCost: it.foodCost,
        foodCostPercentage,
        contributionMargin,
        quantitySold: it.quantitySold,
        totalRevenue: totalItemRev,
        totalContributionMargin: totalItemMargin,
        menuSharePercentage,
        quadrant,
        actionStrategy,
      };
    });

    const report = new MenuEngineeringReport({
      hotelId,
      reportTitle,
      periodStart,
      periodEnd,
      totalSalesVolume,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalFoodCost: Math.round(totalFoodCost * 100) / 100,
      totalContributionMargin: Math.round(totalContributionMargin * 100) / 100,
      overallFoodCostPercentage,
      averageVolumeBenchmark,
      averageMarginBenchmark,
      items: analyzedItems,
      summaryCounts: {
        starsCount,
        plowhorsesCount,
        puzzlesCount,
        dogsCount,
      },
      generatedByUserId: req.user?.userId ? new Types.ObjectId(req.user.userId) : new Types.ObjectId(),
    });

    await report.save();

    res.status(201).json({
      success: true,
      message: 'Menu Engineering Matrix generated successfully',
      report,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 2. Get Historical Menu Engineering Reports
export const getMenuEngineeringReports = async (
  req: TenantRequest,
  res: Response
): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const reports = await MenuEngineeringReport.find({ hotelId })
      .populate('generatedByUserId', 'name role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      reports,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 3. What-If Price Elasticity & Profitability Simulator
export const simulateMenuPriceChange = async (
  req: TenantRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      itemName = 'Dish Name',
      currentPrice,
      currentFoodCost,
      currentVolume,
      priceDeltaPercent = 0,
      costDeltaPercent = 0,
      volumeElasticityFactor = -0.5,
      avgVolumeBenchmark = 50,
      avgMarginBenchmark = 200,
    } = req.body;

    if (!currentPrice || !currentVolume) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_SIMULATION_INPUT',
        message: 'currentPrice and currentVolume are required',
      });
      return;
    }

    const price = Number(currentPrice);
    const cost = Number(currentFoodCost) || 0;
    const volume = Number(currentVolume);

    // Current State
    const currentMargin = price - cost;
    const currentTotalProfit = currentMargin * volume;
    const currentFoodCostPct = price > 0 ? (cost / price) * 100 : 0;

    // Projected Price & Cost
    const projectedPrice = Math.round(price * (1 + priceDeltaPercent / 100) * 100) / 100;
    const projectedCost = Math.round(cost * (1 + costDeltaPercent / 100) * 100) / 100;

    // Price elasticity: volume change = priceDelta% * elasticityFactor
    const volumeDeltaPercent = (priceDeltaPercent * volumeElasticityFactor);
    const projectedVolume = Math.max(
      0,
      Math.round(volume * (1 + volumeDeltaPercent / 100))
    );

    const projectedMargin = Math.round((projectedPrice - projectedCost) * 100) / 100;
    const projectedTotalProfit = Math.round(projectedMargin * projectedVolume * 100) / 100;
    const projectedFoodCostPct =
      projectedPrice > 0 ? Math.round((projectedCost / projectedPrice) * 1000) / 10 : 0;

    const profitDifference = Math.round((projectedTotalProfit - currentTotalProfit) * 100) / 100;
    const profitGrowthPercentage =
      currentTotalProfit > 0
        ? Math.round((profitDifference / currentTotalProfit) * 1000) / 10
        : 0;

    const { quadrant: currentQuadrant } = classifyItemQuadrant(
      volume,
      currentMargin,
      avgVolumeBenchmark,
      avgMarginBenchmark
    );

    const { quadrant: projectedQuadrant, actionStrategy } = classifyItemQuadrant(
      projectedVolume,
      projectedMargin,
      avgVolumeBenchmark,
      avgMarginBenchmark
    );

    res.status(200).json({
      success: true,
      simulation: {
        itemName,
        currentState: {
          price,
          cost,
          volume,
          margin: currentMargin,
          totalProfit: currentTotalProfit,
          foodCostPercentage: Math.round(currentFoodCostPct * 10) / 10,
          quadrant: currentQuadrant,
        },
        projectedState: {
          price: projectedPrice,
          cost: projectedCost,
          volume: projectedVolume,
          margin: projectedMargin,
          totalProfit: projectedTotalProfit,
          foodCostPercentage: projectedFoodCostPct,
          quadrant: projectedQuadrant,
          actionStrategy,
        },
        impact: {
          profitDifference,
          profitGrowthPercentage,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};
