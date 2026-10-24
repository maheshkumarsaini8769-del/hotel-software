import { Response } from 'express';
import { Types } from 'mongoose';
import { TenantRequest } from '../types';
import { Room } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { Booking, BookingStatus } from '../models/Booking';
import { RestaurantOrder, OverallOrderStatus } from '../models/RestaurantOrder';
import { RestaurantBill, BillStatus } from '../models/RestaurantBill';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { Payment, PaymentStatus } from '../models/Payment';
import { User } from '../models/User';
import { GuestProfile } from '../models/GuestProfile';
import { ServiceRequest } from '../models/ServiceRequest';

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function pct(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

function growth(current: number, previous: number): number {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function parseRange(query: TenantRequest['query']): {
  rangeStart: Date;
  rangeEnd: Date;
  previousStart: Date;
  previousEnd: Date;
} {
  const now = new Date();
  const defaultStart = startOfDay(now);
  const defaultEnd = addDays(defaultStart, 1);
  const queryStart = typeof query.startDate === 'string' ? new Date(query.startDate) : null;
  const queryEnd = typeof query.endDate === 'string' ? new Date(query.endDate) : null;

  const rangeStart =
    queryStart && !Number.isNaN(queryStart.getTime()) ? queryStart : defaultStart;
  const rangeEnd =
    queryEnd && !Number.isNaN(queryEnd.getTime()) && queryEnd > rangeStart
      ? queryEnd
      : addDays(rangeStart, 1);
  const duration = rangeEnd.getTime() - rangeStart.getTime();
  const previousEnd = new Date(rangeStart.getTime());
  const previousStart = new Date(rangeStart.getTime() - duration);

  return { rangeStart, rangeEnd, previousStart, previousEnd };
}

export const getDashboardOverview = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const tenantId = new Types.ObjectId(hotelId);
    const now = new Date();
    const { rangeStart, rangeEnd, previousStart, previousEnd } = parseRange(req.query);
    const trendStart = addDays(rangeEnd, -7);

    const [
      totalRooms,
      occupiedRooms,
      totalTables,
      occupiedTables,
      totalGuests,
      totalStaff,
      arrivalsInRange,
      departuresInRange,
      rangePaymentRows,
      previousPaymentRows,
      rangeBillRows,
      previousBillRows,
      trendPaymentRows,
      trendBillRows,
      recentOrders,
      recentBookings,
      roomStatusRows,
      roomTypes,
      roomTypeRows,
      serviceRequests,
      orderTypeRows,
    ] = await Promise.all([
      Room.countDocuments({ hotelId: tenantId }),
      Room.countDocuments({ hotelId: tenantId, status: 'OCCUPIED' }),
      DiningTable.countDocuments({ hotelId: tenantId }),
      DiningTable.countDocuments({
        hotelId: tenantId,
        currentStatus: {
          $in: [TableStatus.OCCUPIED, TableStatus.BILLING, TableStatus.PARTIALLY_OCCUPIED],
        },
      }),
      GuestProfile.countDocuments({ hotelId: tenantId }),
      User.countDocuments({ hotelId: tenantId, isActive: true }),
      Booking.countDocuments({
        hotelId: tenantId,
        checkInDate: { $gte: rangeStart, $lt: rangeEnd },
        bookingStatus: { $ne: BookingStatus.CANCELLED },
      }),
      Booking.countDocuments({
        hotelId: tenantId,
        checkOutDate: { $gte: rangeStart, $lt: rangeEnd },
        bookingStatus: { $in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
      }),
      Payment.aggregate([
        { $match: { hotelId: tenantId, status: PaymentStatus.SUCCESS, createdAt: { $gte: rangeStart, $lt: rangeEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { hotelId: tenantId, status: PaymentStatus.SUCCESS, createdAt: { $gte: previousStart, $lt: previousEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      RestaurantBill.aggregate([
        {
          $match: {
            hotelId: tenantId,
            billStatus: BillStatus.PAID,
            settledAt: { $gte: rangeStart, $lt: rangeEnd },
          },
        },
        { $group: { _id: null, total: { $sum: '$paidAmount' }, count: { $sum: 1 } } },
      ]),
      RestaurantBill.aggregate([
        {
          $match: {
            hotelId: tenantId,
            billStatus: BillStatus.PAID,
            settledAt: { $gte: previousStart, $lt: previousEnd },
          },
        },
        { $group: { _id: null, total: { $sum: '$paidAmount' }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { hotelId: tenantId, status: PaymentStatus.SUCCESS, createdAt: { $gte: trendStart, $lt: rangeEnd } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$amount' },
            payments: { $sum: 1 },
          },
        },
      ]),
      RestaurantBill.aggregate([
        {
          $match: {
            hotelId: tenantId,
            billStatus: BillStatus.PAID,
            settledAt: { $gte: trendStart, $lt: rangeEnd },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$settledAt' } },
            revenue: { $sum: '$paidAmount' },
            payments: { $sum: 1 },
          },
        },
      ]),
      RestaurantOrder.find({ hotelId: tenantId })
        .sort({ placedAt: -1 })
        .limit(6)
        .populate('tableId', 'tableNumber section')
        .populate('roomId', 'roomNumber')
        .lean(),
      Booking.find({ hotelId: tenantId })
        .sort({ createdAt: -1 })
        .limit(6)
        .populate('roomTypeId', 'name code')
        .populate('allocatedRoomId', 'roomNumber')
        .lean(),
      Room.aggregate([
        { $match: { hotelId: tenantId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      RoomType.find({ hotelId: tenantId, isActive: true }).sort({ basePriceOvernight: 1 }).lean(),
      Room.aggregate([
        { $match: { hotelId: tenantId } },
        { $group: { _id: { roomTypeId: '$roomTypeId', status: '$status' }, count: { $sum: 1 } } },
      ]),
      ServiceRequest.find({ hotelId: tenantId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('roomId', 'roomNumber')
        .lean(),
      RestaurantOrder.aggregate([
        {
          $match: {
            hotelId: tenantId,
            placedAt: { $gte: rangeStart, $lt: rangeEnd },
            orderStatus: { $ne: OverallOrderStatus.CANCELLED },
          },
        },
        { $group: { _id: '$orderType', count: { $sum: 1 } } },
      ]),
    ]);

    const rangePayments = Number(rangePaymentRows[0]?.total || 0);
    const rangeBills = Number(rangeBillRows[0]?.total || 0);
    const previousPayments = Number(previousPaymentRows[0]?.total || 0);
    const previousBills = Number(previousBillRows[0]?.total || 0);

    const rangeRevenue = rangePayments > 0 ? rangePayments : rangeBills;
    const previousRevenue = previousPayments > 0 ? previousPayments : previousBills;
    const rangeTransactions =
      Number(rangePaymentRows[0]?.count || 0) || Number(rangeBillRows[0]?.count || 0);
    const previousTransactions =
      Number(previousPaymentRows[0]?.count || 0) || Number(previousBillRows[0]?.count || 0);

    const [rangeOrders, previousOrders] = await Promise.all([
      RestaurantOrder.countDocuments({
        hotelId: tenantId,
        placedAt: { $gte: rangeStart, $lt: rangeEnd },
        orderStatus: { $ne: OverallOrderStatus.CANCELLED },
      }),
      RestaurantOrder.countDocuments({
        hotelId: tenantId,
        placedAt: { $gte: previousStart, $lt: previousEnd },
        orderStatus: { $ne: OverallOrderStatus.CANCELLED },
      }),
    ]);

    const paymentByDay = new Map<string, { revenue: number; payments: number }>();
    for (const row of trendPaymentRows as any[]) {
      paymentByDay.set(String(row._id), { revenue: Number(row.revenue || 0), payments: Number(row.payments || 0) });
    }
    const billByDay = new Map<string, { revenue: number; payments: number }>();
    for (const row of trendBillRows as any[]) {
      billByDay.set(String(row._id), { revenue: Number(row.revenue || 0), payments: Number(row.payments || 0) });
    }

    const revenueTrend: Array<{ date: string; label: string; revenue: number; orders: number }> = [];
    for (let offset = 0; offset < 7; offset += 1) {
      const date = addDays(trendStart, offset);
      const key = dayKey(date);
      const payment = paymentByDay.get(key);
      const bill = billByDay.get(key);
      revenueTrend.push({
        date: key,
        label: date.toLocaleDateString('en-IN', { weekday: 'short' }),
        revenue: payment && payment.revenue > 0 ? payment.revenue : Number(bill?.revenue || 0),
        orders: payment?.payments || bill?.payments || 0,
      });
    }

    const roomStatusBreakdown = (roomStatusRows as any[]).map((row) => ({
      status: String(row._id),
      count: Number(row.count || 0),
    }));

    const typeTotals = new Map<string, { total: number; occupied: number }>();
    for (const row of roomTypeRows as any[]) {
      const id = String(row._id?.roomTypeId || '');
      if (!id) continue;
      const entry = typeTotals.get(id) || { total: 0, occupied: 0 };
      entry.total += Number(row.count || 0);
      if (row._id?.status === 'OCCUPIED') entry.occupied += Number(row.count || 0);
      typeTotals.set(id, entry);
    }

    const occupancyByRoomType = (roomTypes as any[]).map((type) => {
      const totals = typeTotals.get(String(type._id)) || { total: 0, occupied: 0 };
      return {
        id: String(type._id),
        name: type.name,
        code: type.code,
        totalRooms: totals.total,
        occupiedRooms: totals.occupied,
        occupancyRate: pct(totals.occupied, totals.total),
        basePrice: type.basePriceOvernight,
      };
    });

    const recentOrderRows = (recentOrders as any[]).map((order) => ({
      id: String(order._id),
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      status: order.orderStatus,
      tableNumber: order.tableId?.tableNumber || null,
      roomNumber: order.roomId?.roomNumber || null,
      guestName:
        order.customerName || (order.orderType === 'ROOM_SERVICE' ? 'In-room guest' : 'Walk-in guest'),
      itemCount: Array.isArray(order.items)
        ? order.items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0)
        : 0,
      amount: Array.isArray(order.items)
        ? order.items.reduce((sum: number, item: any) => sum + Number(item.subtotal || 0), 0)
        : 0,
      placedAt: order.placedAt,
    }));

    const recentBookingRows = (recentBookings as any[]).map((booking) => ({
      id: String(booking._id),
      bookingNumber: booking.bookingNumber,
      guestName: booking.guestName,
      roomType: booking.roomTypeId?.name || 'Room',
      roomNumber: booking.allocatedRoomId?.roomNumber || null,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      status: booking.bookingStatus,
      paymentStatus: booking.paymentStatus,
      grandTotal: booking.grandTotal,
    }));

    const orderTypeCounts: Record<string, number> = {};
    for (const row of orderTypeRows as any[]) {
      orderTypeCounts[String(row._id)] = Number(row.count || 0);
    }

    res.status(200).json({
      success: true,
      data: {
        generatedAt: now.toISOString(),
        range: { start: rangeStart.toISOString(), end: rangeEnd.toISOString() },
        kpis: {
          totalRevenue: rangeRevenue,
          revenueGrowthPct: growth(rangeRevenue, previousRevenue),
          todayTransactions: rangeTransactions,
          transactionGrowthPct: growth(rangeTransactions, previousTransactions),
          totalOrders: rangeOrders,
          orderGrowthPct: growth(rangeOrders, previousOrders),
          occupiedRooms,
          totalRooms,
          occupancyRate: pct(occupiedRooms, totalRooms),
          occupiedTables,
          totalTables,
          tableOccupancyRate: pct(occupiedTables, totalTables),
          totalGuests,
          totalStaff,
          arrivalsToday: arrivalsInRange,
          departuresToday: departuresInRange,
          dineInOrders: orderTypeCounts.DINE_IN || 0,
          takeawayOrders: orderTypeCounts.TAKEAWAY || 0,
          roomServiceOrders: orderTypeCounts.ROOM_SERVICE || 0,
        },
        revenueTrend,
        recentOrders: recentOrderRows,
        recentBookings: recentBookingRows,
        roomStatusBreakdown,
        occupancyByRoomType,
        liveOperations: (serviceRequests as any[]).map((request) => ({
          id: String(request._id),
          type: request.requestType,
          status: request.status,
          priority: request.priority,
          roomNumber: request.roomId?.roomNumber || null,
          createdAt: request.createdAt,
        })),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      errorCode: 'DASHBOARD_OVERVIEW_ERROR',
      message: error.message || 'Failed to load dashboard overview',
    });
  }
};
