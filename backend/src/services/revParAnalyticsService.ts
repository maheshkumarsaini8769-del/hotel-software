import { Types } from 'mongoose';
import { Stay } from '../models/Stay';
import { Room } from '../models/Room';
import { RestaurantOrder } from '../models/RestaurantOrder';
import { RestaurantBill } from '../models/RestaurantBill';

export interface RevParMetrics {
  totalAvailableRooms: number;
  roomsSold: number;
  totalRoomRevenue: number;
  totalFnBRevenue: number;
  totalGrossRevenue: number;
  occupancyPercent: number;
  adr: number;
  revPar: number;
  tRevPar: number;
  dailyTrends: Array<{
    date: string;
    adr: number;
    revPar: number;
    occupancy: number;
    roomRevenue: number;
    fnbRevenue: number;
  }>;
}

export class RevParAnalyticsService {
  /**
   * Mongoose aggregation pipeline for calculating RevPAR, ADR, and TRevPAR over a date window.
   */
  public static async calculateRevPar(
    hotelId: Types.ObjectId | string,
    startDate: Date = new Date(Date.now() - 30 * 86400000),
    endDate: Date = new Date()
  ): Promise<RevParMetrics> {
    const hId = new Types.ObjectId(hotelId);

    // 1. Total available physical rooms for property
    const totalAvailableRooms = await Room.countDocuments({
      hotelId: hId,
      status: { $ne: 'OUT_OF_SERVICE' },
    });
    const safeRooms = Math.max(1, totalAvailableRooms);

    // 2. Mongoose Aggregation Pipeline: Stays Room Revenue & Rooms Sold
    const stayAggregation = await Stay.aggregate([
      {
        $match: {
          hotelId: hId,
          createdAt: { $gte: startDate, $lte: endDate },
          stayStatus: { $in: ['ACTIVE', 'CHECKED_OUT'] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          roomsSold: { $sum: 1 },
          roomRevenue: { $sum: { $ifNull: ['$totalRoomRent', { $ifNull: ['$grandTotal', 2500] }] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 3. Mongoose Aggregation Pipeline: Restaurant F&B Revenue
    const fnbAggregation = await RestaurantBill.aggregate([
      {
        $match: {
          hotelId: hId,
          createdAt: { $gte: startDate, $lte: endDate },
          billStatus: { $in: ['PAID', 'PARTIALLY_PAID'] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          fnbRevenue: { $sum: '$grandTotal' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const fnbMap = new Map<string, number>();
    fnbAggregation.forEach((row) => fnbMap.set(row._id, row.fnbRevenue));

    let totalRoomRevenue = 0;
    let totalRoomsSold = 0;
    let totalFnBRevenue = 0;

    const dailyTrends = stayAggregation.map((row) => {
      const date = row._id;
      const roomsSold = row.roomsSold || 0;
      const roomRevenue = Math.round(row.roomRevenue || 0);
      const fnbRevenue = Math.round(fnbMap.get(date) || 0);

      totalRoomRevenue += roomRevenue;
      totalRoomsSold += roomsSold;
      totalFnBRevenue += fnbRevenue;

      const adr = roomsSold > 0 ? Math.round(roomRevenue / roomsSold) : 0;
      const revPar = Math.round(roomRevenue / safeRooms);
      const occupancy = Math.min(100, Math.round((roomsSold / safeRooms) * 100));

      return {
        date,
        adr,
        revPar,
        occupancy,
        roomRevenue,
        fnbRevenue,
      };
    });

    const totalDays = Math.max(1, dailyTrends.length || 1);
    const availableRoomNights = safeRooms * totalDays;

    const adr = totalRoomsSold > 0 ? Math.round(totalRoomRevenue / totalRoomsSold) : 0;
    const revPar = Math.round(totalRoomRevenue / availableRoomNights);
    const tRevPar = Math.round((totalRoomRevenue + totalFnBRevenue) / availableRoomNights);
    const occupancyPercent = Math.min(100, Math.round((totalRoomsSold / availableRoomNights) * 100));

    return {
      totalAvailableRooms: safeRooms,
      roomsSold: totalRoomsSold,
      totalRoomRevenue,
      totalFnBRevenue,
      totalGrossRevenue: totalRoomRevenue + totalFnBRevenue,
      occupancyPercent,
      adr,
      revPar,
      tRevPar,
      dailyTrends,
    };
  }
}
