import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { TableSession } from '../models/TableSession';
import { RestaurantOrder, OverallOrderStatus } from '../models/RestaurantOrder';
import { Tenant } from '../models/Tenant';
import { io } from '../index';

export interface HallDTO {
  id: string;
  name: string;
  code: string;
  floorLevel: string;
  floorNumber: number;
  description?: string;
  maxCapacity?: number;
  tablesCount: number;
  isActive: boolean;
}

export interface FloorDTO {
  id: string;
  floorNumber: number;
  name: string;
  shortName: string;
  halls: HallDTO[];
  tablesCount: number;
  totalCapacity: number;
}

export interface TableDTO {
  id: string;
  tableNumber: string;
  floorLevel: string;
  floorNumber: number;
  hallId: string;
  section: string;
  capacity: number;
  shape: 'SQUARE' | 'ROUND' | 'RECTANGLE' | 'BOOTH';
  currentStatus: TableStatus;
  assignedWaiter?: string;
  assignedWaiterId?: string;
  activeSessionId?: string;
  activeOrderTotal: number;
  activeItemsCount: number;
  sessionStartTime?: string;
  qrCodeUrl?: string;
  notes?: string;
  createdAt: string;
}

// Default Floors and Halls Dataset
const DEFAULT_FLOORS: FloorDTO[] = [
  {
    id: 'fl-1',
    floorNumber: 1,
    name: '1st Floor (Ground & Main Dining)',
    shortName: 'Floor 1',
    halls: [
      {
        id: 'hall-1-1',
        name: 'Grand AC Dining Hall',
        code: 'AC_HALL',
        floorLevel: '1st Floor',
        floorNumber: 1,
        description: 'Primary family dining hall with central air conditioning and buffet pass.',
        maxCapacity: 50,
        tablesCount: 10,
        isActive: true,
      },
      {
        id: 'hall-1-2',
        name: 'Open Garden & Patio',
        code: 'GARDEN',
        floorLevel: '1st Floor',
        floorNumber: 1,
        description: 'Outdoor fresh-air dining patio surrounded by greenery and water fountain.',
        maxCapacity: 30,
        tablesCount: 5,
        isActive: true,
      },
    ],
    tablesCount: 15,
    totalCapacity: 56,
  },
  {
    id: 'fl-2',
    floorNumber: 2,
    name: '2nd Floor (Banquets & Luxury Suites)',
    shortName: 'Floor 2',
    halls: [
      {
        id: 'hall-2-1',
        name: 'Royal Banquet Hall',
        code: 'BANQUET_HALL',
        floorLevel: '2nd Floor',
        floorNumber: 2,
        description: 'Large event banquet hall for wedding celebrations, corporate buffets and galas.',
        maxCapacity: 80,
        tablesCount: 8,
        isActive: true,
      },
      {
        id: 'hall-2-2',
        name: 'Family AC Dining Suite',
        code: 'FAMILY_SUITE',
        floorLevel: '2nd Floor',
        floorNumber: 2,
        description: 'Private family dining enclosure with dedicated service and acoustic privacy.',
        maxCapacity: 35,
        tablesCount: 6,
        isActive: true,
      },
      {
        id: 'hall-2-3',
        name: 'Executive VIP Dining (PDR)',
        code: 'VIP_PDR',
        floorLevel: '2nd Floor',
        floorNumber: 2,
        description: 'Ultra-exclusive private dining rooms for corporate executives and VIP guests.',
        maxCapacity: 16,
        tablesCount: 2,
        isActive: true,
      },
    ],
    tablesCount: 16,
    totalCapacity: 92,
  },
  {
    id: 'fl-3',
    floorNumber: 3,
    name: '3rd Floor (Rooftop & Sky Lounge)',
    shortName: 'Floor 3',
    halls: [
      {
        id: 'hall-3-1',
        name: 'Skyview Rooftop Lounge',
        code: 'ROOFTOP',
        floorLevel: '3rd Floor',
        floorNumber: 3,
        description: 'Open sky panoramic city view lounge with live barbecue grill and mocktail bar.',
        maxCapacity: 40,
        tablesCount: 6,
        isActive: true,
      },
      {
        id: 'hall-3-2',
        name: 'Poolside Deck Bar',
        code: 'POOLSIDE',
        floorLevel: '3rd Floor',
        floorNumber: 3,
        description: 'Relaxed ambient lounge tables adjacent to the rooftop infinity pool.',
        maxCapacity: 24,
        tablesCount: 4,
        isActive: true,
      },
    ],
    tablesCount: 10,
    totalCapacity: 44,
  },
];

// Default Tables Dataset
const DEFAULT_TABLES: TableDTO[] = [
  // Floor 1 - Grand AC Dining Hall (10 tables: T-01 to T-10)
  { id: 'tbl-1', tableNumber: 'T-01', floorLevel: '1st Floor', floorNumber: 1, hallId: 'hall-1-1', section: 'Grand AC Dining Hall', capacity: 2, shape: 'SQUARE', currentStatus: TableStatus.OCCUPIED, assignedWaiter: 'Ramesh Kumar', activeOrderTotal: 2050, activeItemsCount: 11, sessionStartTime: '2026-10-10T09:30:00Z', notes: 'Near Entrance Window', createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-2', tableNumber: 'T-02', floorLevel: '1st Floor', floorNumber: 1, hallId: 'hall-1-1', section: 'Grand AC Dining Hall', capacity: 4, shape: 'SQUARE', currentStatus: TableStatus.AVAILABLE, assignedWaiter: 'Ramesh Kumar', activeOrderTotal: 0, activeItemsCount: 0, notes: 'Central Pillar', createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-3', tableNumber: 'T-03', floorLevel: '1st Floor', floorNumber: 1, hallId: 'hall-1-1', section: 'Grand AC Dining Hall', capacity: 2, shape: 'ROUND', currentStatus: TableStatus.OCCUPIED, assignedWaiter: 'Sunita Sharma', activeOrderTotal: 400, activeItemsCount: 3, sessionStartTime: '2026-10-10T10:15:00Z', notes: 'Quiet Corner', createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-4', tableNumber: 'T-04', floorLevel: '1st Floor', floorNumber: 1, hallId: 'hall-1-1', section: 'Grand AC Dining Hall', capacity: 6, shape: 'RECTANGLE', currentStatus: TableStatus.OCCUPIED, assignedWaiter: 'Ramesh Kumar', activeOrderTotal: 2000, activeItemsCount: 10, sessionStartTime: '2026-10-10T10:45:00Z', notes: 'VIP Booth Section', createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-5', tableNumber: 'T-05', floorLevel: '1st Floor', floorNumber: 1, hallId: 'hall-1-1', section: 'Grand AC Dining Hall', capacity: 4, shape: 'SQUARE', currentStatus: TableStatus.OCCUPIED, assignedWaiter: 'Vikram Singh', activeOrderTotal: 1880, activeItemsCount: 8, sessionStartTime: '2026-10-10T11:00:00Z', notes: 'Buffet Pass View', createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-6', tableNumber: 'T-06', floorLevel: '1st Floor', floorNumber: 1, hallId: 'hall-1-1', section: 'Grand AC Dining Hall', capacity: 4, shape: 'SQUARE', currentStatus: TableStatus.AVAILABLE, assignedWaiter: 'Vikram Singh', activeOrderTotal: 0, activeItemsCount: 0, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-7', tableNumber: 'T-07', floorLevel: '1st Floor', floorNumber: 1, hallId: 'hall-1-1', section: 'Grand AC Dining Hall', capacity: 2, shape: 'ROUND', currentStatus: TableStatus.AVAILABLE, assignedWaiter: 'Sunita Sharma', activeOrderTotal: 0, activeItemsCount: 0, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-8', tableNumber: 'T-08', floorLevel: '1st Floor', floorNumber: 1, hallId: 'hall-1-1', section: 'Grand AC Dining Hall', capacity: 6, shape: 'RECTANGLE', currentStatus: TableStatus.RESERVED, assignedWaiter: 'Ramesh Kumar', activeOrderTotal: 0, activeItemsCount: 0, notes: 'Reserved for Mr. Singhania (7 PM)', createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-9', tableNumber: 'T-09', floorLevel: '1st Floor', floorNumber: 1, hallId: 'hall-1-1', section: 'Grand AC Dining Hall', capacity: 2, shape: 'SQUARE', currentStatus: TableStatus.CLEANING, assignedWaiter: 'Floor Staff', activeOrderTotal: 0, activeItemsCount: 0, notes: 'Flagged for sanitization', createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-10', tableNumber: 'T-10', floorLevel: '1st Floor', floorNumber: 1, hallId: 'hall-1-1', section: 'Grand AC Dining Hall', capacity: 4, shape: 'SQUARE', currentStatus: TableStatus.AVAILABLE, assignedWaiter: 'Vikram Singh', activeOrderTotal: 0, activeItemsCount: 0, createdAt: '2026-10-01T00:00:00Z' },

  // Floor 1 - Open Garden & Patio (5 tables: G-01 to G-05)
  { id: 'tbl-11', tableNumber: 'G-01', floorLevel: '1st Floor', floorNumber: 1, hallId: 'hall-1-2', section: 'Open Garden & Patio', capacity: 4, shape: 'ROUND', currentStatus: TableStatus.AVAILABLE, assignedWaiter: 'Amit Verma', activeOrderTotal: 0, activeItemsCount: 0, notes: 'Garden Umbrella', createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-12', tableNumber: 'G-02', floorLevel: '1st Floor', floorNumber: 1, hallId: 'hall-1-2', section: 'Open Garden & Patio', capacity: 4, shape: 'ROUND', currentStatus: TableStatus.AVAILABLE, assignedWaiter: 'Amit Verma', activeOrderTotal: 0, activeItemsCount: 0, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-13', tableNumber: 'G-03', floorLevel: '1st Floor', floorNumber: 1, hallId: 'hall-1-2', section: 'Open Garden & Patio', capacity: 6, shape: 'RECTANGLE', currentStatus: TableStatus.OCCUPIED, assignedWaiter: 'Amit Verma', activeOrderTotal: 3400, activeItemsCount: 14, sessionStartTime: '2026-10-10T10:30:00Z', notes: 'Fountain Side', createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-14', tableNumber: 'G-04', floorLevel: '1st Floor', floorNumber: 1, hallId: 'hall-1-2', section: 'Open Garden & Patio', capacity: 4, shape: 'ROUND', currentStatus: TableStatus.AVAILABLE, assignedWaiter: 'Amit Verma', activeOrderTotal: 0, activeItemsCount: 0, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-15', tableNumber: 'G-05', floorLevel: '1st Floor', floorNumber: 1, hallId: 'hall-1-2', section: 'Open Garden & Patio', capacity: 2, shape: 'SQUARE', currentStatus: TableStatus.AVAILABLE, assignedWaiter: 'Amit Verma', activeOrderTotal: 0, activeItemsCount: 0, createdAt: '2026-10-01T00:00:00Z' },

  // Floor 2 - Royal Banquet Hall (8 tables: B-01 to B-08)
  { id: 'tbl-16', tableNumber: 'B-01', floorLevel: '2nd Floor', floorNumber: 2, hallId: 'hall-2-1', section: 'Royal Banquet Hall', capacity: 10, shape: 'ROUND', currentStatus: TableStatus.AVAILABLE, assignedWaiter: 'Banquet Captain', activeOrderTotal: 0, activeItemsCount: 0, notes: 'Main Stage Front', createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-17', tableNumber: 'B-02', floorLevel: '2nd Floor', floorNumber: 2, hallId: 'hall-2-1', section: 'Royal Banquet Hall', capacity: 10, shape: 'ROUND', currentStatus: TableStatus.AVAILABLE, assignedWaiter: 'Banquet Captain', activeOrderTotal: 0, activeItemsCount: 0, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-18', tableNumber: 'B-03', floorLevel: '2nd Floor', floorNumber: 2, hallId: 'hall-2-1', section: 'Royal Banquet Hall', capacity: 10, shape: 'ROUND', currentStatus: TableStatus.OCCUPIED, assignedWaiter: 'Banquet Captain', activeOrderTotal: 12500, activeItemsCount: 42, sessionStartTime: '2026-10-10T09:00:00Z', notes: 'Corporate Summit Buffet', createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-19', tableNumber: 'B-04', floorLevel: '2nd Floor', floorNumber: 2, hallId: 'hall-2-1', section: 'Royal Banquet Hall', capacity: 10, shape: 'ROUND', currentStatus: TableStatus.OCCUPIED, assignedWaiter: 'Banquet Captain', activeOrderTotal: 9800, activeItemsCount: 36, sessionStartTime: '2026-10-10T09:00:00Z', createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-20', tableNumber: 'B-05', floorLevel: '2nd Floor', floorNumber: 2, hallId: 'hall-2-1', section: 'Royal Banquet Hall', capacity: 12, shape: 'RECTANGLE', currentStatus: TableStatus.RESERVED, assignedWaiter: 'Banquet Captain', activeOrderTotal: 0, activeItemsCount: 0, notes: 'Wedding Reception Head Table', createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-21', tableNumber: 'B-06', floorLevel: '2nd Floor', floorNumber: 2, hallId: 'hall-2-1', section: 'Royal Banquet Hall', capacity: 10, shape: 'ROUND', currentStatus: TableStatus.AVAILABLE, assignedWaiter: 'Banquet Captain', activeOrderTotal: 0, activeItemsCount: 0, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-22', tableNumber: 'B-07', floorLevel: '2nd Floor', floorNumber: 2, hallId: 'hall-2-1', section: 'Royal Banquet Hall', capacity: 10, shape: 'ROUND', currentStatus: TableStatus.AVAILABLE, assignedWaiter: 'Banquet Captain', activeOrderTotal: 0, activeItemsCount: 0, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-23', tableNumber: 'B-08', floorLevel: '2nd Floor', floorNumber: 2, hallId: 'hall-2-1', section: 'Royal Banquet Hall', capacity: 10, shape: 'ROUND', currentStatus: TableStatus.AVAILABLE, assignedWaiter: 'Banquet Captain', activeOrderTotal: 0, activeItemsCount: 0, createdAt: '2026-10-01T00:00:00Z' },

  // Floor 2 - Family AC Dining Suite (6 tables: F-01 to F-06)
  { id: 'tbl-24', tableNumber: 'F-01', floorLevel: '2nd Floor', floorNumber: 2, hallId: 'hall-2-2', section: 'Family AC Dining Suite', capacity: 6, shape: 'RECTANGLE', currentStatus: TableStatus.AVAILABLE, assignedWaiter: 'Sunita Sharma', activeOrderTotal: 0, activeItemsCount: 0, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-25', tableNumber: 'F-02', floorLevel: '2nd Floor', floorNumber: 2, hallId: 'hall-2-2', section: 'Family AC Dining Suite', capacity: 6, shape: 'RECTANGLE', currentStatus: TableStatus.OCCUPIED, assignedWaiter: 'Sunita Sharma', activeOrderTotal: 4200, activeItemsCount: 16, sessionStartTime: '2026-10-10T10:00:00Z', notes: 'Birthday Celebration', createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-26', tableNumber: 'F-03', floorLevel: '2nd Floor', floorNumber: 2, hallId: 'hall-2-2', section: 'Family AC Dining Suite', capacity: 8, shape: 'RECTANGLE', currentStatus: TableStatus.AVAILABLE, assignedWaiter: 'Sunita Sharma', activeOrderTotal: 0, activeItemsCount: 0, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-27', tableNumber: 'F-04', floorLevel: '2nd Floor', floorNumber: 2, hallId: 'hall-2-2', section: 'Family AC Dining Suite', capacity: 4, shape: 'SQUARE', currentStatus: TableStatus.AVAILABLE, assignedWaiter: 'Sunita Sharma', activeOrderTotal: 0, activeItemsCount: 0, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-28', tableNumber: 'F-05', floorLevel: '2nd Floor', floorNumber: 2, hallId: 'hall-2-2', section: 'Family AC Dining Suite', capacity: 4, shape: 'SQUARE', currentStatus: TableStatus.AVAILABLE, assignedWaiter: 'Sunita Sharma', activeOrderTotal: 0, activeItemsCount: 0, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-29', tableNumber: 'F-06', floorLevel: '2nd Floor', floorNumber: 2, hallId: 'hall-2-2', section: 'Family AC Dining Suite', capacity: 4, shape: 'SQUARE', currentStatus: TableStatus.AVAILABLE, assignedWaiter: 'Sunita Sharma', activeOrderTotal: 0, activeItemsCount: 0, createdAt: '2026-10-01T00:00:00Z' },

  // Floor 2 - Executive VIP Dining (PDR) (2 tables: VIP-1, VIP-2)
  { id: 'tbl-30', tableNumber: 'VIP-1', floorLevel: '2nd Floor', floorNumber: 2, hallId: 'hall-2-3', section: 'Executive VIP Dining (PDR)', capacity: 8, shape: 'BOOTH', currentStatus: TableStatus.OCCUPIED, assignedWaiter: 'Senior Butler', activeOrderTotal: 8400, activeItemsCount: 22, sessionStartTime: '2026-10-10T09:40:00Z', notes: 'Private Butler Service Assigned', createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-31', tableNumber: 'VIP-2', floorLevel: '2nd Floor', floorNumber: 2, hallId: 'hall-2-3', section: 'Executive VIP Dining (PDR)', capacity: 8, shape: 'BOOTH', currentStatus: TableStatus.RESERVED, assignedWaiter: 'Senior Butler', activeOrderTotal: 0, activeItemsCount: 0, notes: 'Minister Dinner at 8:30 PM', createdAt: '2026-10-01T00:00:00Z' },

  // Floor 3 - Skyview Rooftop Lounge (6 tables: R-01 to R-06)
  { id: 'tbl-32', tableNumber: 'R-01', floorLevel: '3rd Floor', floorNumber: 3, hallId: 'hall-3-1', section: 'Skyview Rooftop Lounge', capacity: 4, shape: 'ROUND', currentStatus: TableStatus.AVAILABLE, assignedWaiter: 'Deepak Rao', activeOrderTotal: 0, activeItemsCount: 0, notes: 'Edge Balcony View', createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-33', tableNumber: 'R-02', floorLevel: '3rd Floor', floorNumber: 3, hallId: 'hall-3-1', section: 'Skyview Rooftop Lounge', capacity: 4, shape: 'ROUND', currentStatus: TableStatus.AVAILABLE, assignedWaiter: 'Deepak Rao', activeOrderTotal: 0, activeItemsCount: 0, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-34', tableNumber: 'R-03', floorLevel: '3rd Floor', floorNumber: 3, hallId: 'hall-3-1', section: 'Skyview Rooftop Lounge', capacity: 6, shape: 'RECTANGLE', currentStatus: TableStatus.AVAILABLE, assignedWaiter: 'Deepak Rao', activeOrderTotal: 0, activeItemsCount: 0, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-35', tableNumber: 'R-04', floorLevel: '3rd Floor', floorNumber: 3, hallId: 'hall-3-1', section: 'Skyview Rooftop Lounge', capacity: 4, shape: 'ROUND', currentStatus: TableStatus.OCCUPIED, assignedWaiter: 'Deepak Rao', activeOrderTotal: 2950, activeItemsCount: 12, sessionStartTime: '2026-10-10T10:10:00Z', notes: 'Sunset Vista', createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-36', tableNumber: 'R-05', floorLevel: '3rd Floor', floorNumber: 3, hallId: 'hall-3-1', section: 'Skyview Rooftop Lounge', capacity: 4, shape: 'ROUND', currentStatus: TableStatus.AVAILABLE, assignedWaiter: 'Deepak Rao', activeOrderTotal: 0, activeItemsCount: 0, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-37', tableNumber: 'R-06', floorLevel: '3rd Floor', floorNumber: 3, hallId: 'hall-3-1', section: 'Skyview Rooftop Lounge', capacity: 6, shape: 'RECTANGLE', currentStatus: TableStatus.AVAILABLE, assignedWaiter: 'Deepak Rao', activeOrderTotal: 0, activeItemsCount: 0, createdAt: '2026-10-01T00:00:00Z' },

  // Floor 3 - Poolside Deck Bar (4 tables: P-01 to P-04)
  { id: 'tbl-38', tableNumber: 'P-01', floorLevel: '3rd Floor', floorNumber: 3, hallId: 'hall-3-2', section: 'Poolside Deck Bar', capacity: 4, shape: 'ROUND', currentStatus: TableStatus.AVAILABLE, assignedWaiter: 'Kunal Joshi', activeOrderTotal: 0, activeItemsCount: 0, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-39', tableNumber: 'P-02', floorLevel: '3rd Floor', floorNumber: 3, hallId: 'hall-3-2', section: 'Poolside Deck Bar', capacity: 4, shape: 'ROUND', currentStatus: TableStatus.AVAILABLE, assignedWaiter: 'Kunal Joshi', activeOrderTotal: 0, activeItemsCount: 0, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-40', tableNumber: 'P-03', floorLevel: '3rd Floor', floorNumber: 3, hallId: 'hall-3-2', section: 'Poolside Deck Bar', capacity: 4, shape: 'ROUND', currentStatus: TableStatus.AVAILABLE, assignedWaiter: 'Kunal Joshi', activeOrderTotal: 0, activeItemsCount: 0, createdAt: '2026-10-01T00:00:00Z' },
  { id: 'tbl-41', tableNumber: 'P-04', floorLevel: '3rd Floor', floorNumber: 3, hallId: 'hall-3-2', section: 'Poolside Deck Bar', capacity: 4, shape: 'ROUND', currentStatus: TableStatus.AVAILABLE, assignedWaiter: 'Kunal Joshi', activeOrderTotal: 0, activeItemsCount: 0, createdAt: '2026-10-01T00:00:00Z' },
];

const floorsByHotel = new Map<string, FloorDTO[]>();
const tablesByHotel = new Map<string, TableDTO[]>();

function getHotelKey(req: Request): string {
  const raw = (req as any).hotelId || req.query.hotelId || req.headers['x-hotel-id'] || req.body?.hotelId;
  return raw ? String(raw) : 'default';
}

function getFloorsForHotel(req: Request): FloorDTO[] {
  const key = getHotelKey(req);
  let values = floorsByHotel.get(key);
  if (!values) {
    values = JSON.parse(JSON.stringify(DEFAULT_FLOORS)) as FloorDTO[];
    floorsByHotel.set(key, values);
  }
  return values;
}

function getTablesForHotel(req: Request): TableDTO[] {
  const key = getHotelKey(req);
  let values = tablesByHotel.get(key);
  if (!values) {
    if (Types.ObjectId.isValid(key)) {
      values = [];
    } else {
      values = JSON.parse(JSON.stringify(DEFAULT_TABLES)) as TableDTO[];
    }
    tablesByHotel.set(key, values);
  }
  return values;
}

function recalculateStats(floors: FloorDTO[], tables: TableDTO[]) {
  for (let index = 0; index < floors.length; index++) {
    const fl = floors[index];
    const floorTables = tables.filter((t) => t.floorNumber === fl.floorNumber);
    const updatedHalls = fl.halls.map((h) => {
      const hCount = floorTables.filter((t) => t.hallId === h.id || t.section.toLowerCase() === h.name.toLowerCase()).length;
      return { ...h, tablesCount: hCount };
    });
    const totalCap = floorTables.reduce((acc, t) => acc + (t.capacity || 4), 0);
    floors[index] = {
      ...fl,
      halls: updatedHalls,
      tablesCount: floorTables.length,
      totalCapacity: totalCap,
    };
  }
}

// 1. GET /api/v1/table-management/overview
export const getTableManagementOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const floors = getFloorsForHotel(req);
    const tables = getTablesForHotel(req);

    const hotelIdStr = getHotelKey(req);
    let maxTables = 20;
    if (Types.ObjectId.isValid(hotelIdStr)) {
      const tenant = await Tenant.findById(hotelIdStr).select('maxTables maxRooms name');
      if (tenant?.maxTables) {
        maxTables = tenant.maxTables;
      }
      if (tables.length === 0) {
        const dbTables = await DiningTable.find({ hotelId: new Types.ObjectId(hotelIdStr) }).lean();
        for (const dt of dbTables) {
          tables.push({
            id: dt._id.toString(),
            tableNumber: dt.tableNumber,
            floorNumber: parseInt(dt.floorLevel?.replace(/\D/g, '') || '1') || 1,
            floorLevel: dt.floorLevel || '1st Floor',
            hallId: 'hall-1-1',
            section: dt.section || 'Grand AC Dining Hall',
            capacity: dt.capacity || 4,
            shape: 'SQUARE',
            currentStatus: (dt.currentStatus as any) || TableStatus.AVAILABLE,
            assignedWaiter: 'Floor Staff',
            activeOrderTotal: 0,
            activeItemsCount: 0,
            createdAt: (dt as any).createdAt ? (dt as any).createdAt.toISOString() : new Date().toISOString(),
          });
        }
      }
    }
    recalculateStats(floors, tables);

    const totalTables = tables.length;
    const occupiedCount = tables.filter((t) => t.currentStatus === TableStatus.OCCUPIED).length;
    const availableCount = tables.filter((t) => t.currentStatus === TableStatus.AVAILABLE).length;
    const reservedCount = tables.filter((t) => t.currentStatus === TableStatus.RESERVED).length;
    const cleaningCount = tables.filter((t) => t.currentStatus === TableStatus.CLEANING || t.currentStatus === TableStatus.DIRTY).length;
    const totalCapacity = tables.reduce((sum, t) => sum + (t.capacity || 4), 0);
    const totalHalls = floors.reduce((sum, f) => sum + f.halls.length, 0);

    const floorBreakdowns = floors.map((fl) => {
      const floorTables = tables.filter((t) => t.floorNumber === fl.floorNumber);
      const occ = floorTables.filter((t) => t.currentStatus === TableStatus.OCCUPIED).length;
      return {
        id: fl.id,
        floorId: fl.id,
        floorNumber: fl.floorNumber,
        name: fl.name,
        floorName: fl.name,
        shortName: fl.shortName,
        totalHalls: fl.halls.length,
        halls: fl.halls,
        tablesCount: floorTables.length,
        totalTables: floorTables.length,
        totalCapacity: floorTables.reduce((sum, t) => sum + (t.capacity || 4), 0),
        occupiedTables: occ,
        availableTables: floorTables.filter((t) => t.currentStatus === TableStatus.AVAILABLE).length,
        reservedTables: floorTables.filter((t) => t.currentStatus === TableStatus.RESERVED).length,
        occupancyRate: floorTables.length > 0 ? Math.round((occ / floorTables.length) * 100) : 0,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalFloors: floors.length,
          totalHalls,
          totalTables,
          maxTables,
          totalCapacity,
          occupiedCount,
          availableCount,
          reservedCount,
          cleaningCount,
          overallOccupancyRate: totalTables > 0 ? Math.round((occupiedCount / totalTables) * 100) : 0,
        },
        floors: floorBreakdowns,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 2. GET /api/v1/table-management/floors-halls
export const getFloorsAndHalls = async (req: Request, res: Response): Promise<void> => {
  try {
    const floors = getFloorsForHotel(req);
    const tables = getTablesForHotel(req);
    recalculateStats(floors, tables);
    res.status(200).json({
      success: true,
      data: floors,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 3. POST /api/v1/table-management/floors
export const createFloor = async (req: Request, res: Response): Promise<void> => {
  try {
    const floors = getFloorsForHotel(req);
    const tables = getTablesForHotel(req);
    const { floorNumber, name, shortName } = req.body;
    if (!floorNumber || !name) {
      res.status(400).json({ success: false, message: 'Floor number and name are required' });
      return;
    }

    const existingFloor = floors.find((f) => f.floorNumber === Number(floorNumber));
    if (existingFloor) {
      existingFloor.name = String(name).trim();
      if (shortName) existingFloor.shortName = String(shortName).trim();
      recalculateStats(floors, tables);
      try {
        if (io) {
          io.emit('table:floor_updated', existingFloor);
        }
      } catch (_) {}
      res.status(200).json({
        success: true,
        data: existingFloor,
        message: `Floor ${floorNumber} updated successfully!`,
      });
      return;
    }

    const newFloor: FloorDTO = {
      id: `fl-${Date.now()}`,
      floorNumber: Number(floorNumber),
      name: String(name).trim(),
      shortName: shortName ? String(shortName).trim() : `Floor ${floorNumber}`,
      halls: [],
      tablesCount: 0,
      totalCapacity: 0,
    };

    floors.push(newFloor);
    recalculateStats(floors, tables);

    try {
      if (io) {
        io.emit('table:floor_created', newFloor);
      }
    } catch (_) {}

    res.status(201).json({
      success: true,
      data: newFloor,
      message: 'New floor added successfully!',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 4. POST /api/v1/table-management/halls
export const createHall = async (req: Request, res: Response): Promise<void> => {
  try {
    const floors = getFloorsForHotel(req);
    const tables = getTablesForHotel(req);
    const { floorId, name, code, description, maxCapacity } = req.body;
    if (!floorId || !name) {
      res.status(400).json({ success: false, message: 'Floor and Hall name are required' });
      return;
    }

    const floor = floors.find((f) => f.id === floorId || f.floorNumber === Number(floorId));
    if (!floor) {
      res.status(404).json({ success: false, message: 'Target floor not found' });
      return;
    }

    const newHall: HallDTO = {
      id: `hall-${Date.now()}`,
      name: String(name).trim(),
      code: code ? String(code).trim().toUpperCase() : name.replace(/\s+/g, '_').toUpperCase(),
      floorLevel: floor.shortName,
      floorNumber: floor.floorNumber,
      description: description ? String(description).trim() : '',
      maxCapacity: maxCapacity ? Number(maxCapacity) : 40,
      tablesCount: 0,
      isActive: true,
    };

    floor.halls.push(newHall);
    recalculateStats(floors, tables);

    try {
      if (io) {
        io.emit('table:hall_created', newHall);
      }
    } catch (_) {}

    res.status(201).json({
      success: true,
      data: newHall,
      message: `Hall "${newHall.name}" added to ${floor.shortName}!`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 5. GET /api/v1/table-management/tables
export const getTables = async (req: Request, res: Response): Promise<void> => {
  try {
    const tables = getTablesForHotel(req);
    const hotelIdStr = getHotelKey(req);
    if (Types.ObjectId.isValid(hotelIdStr) && tables.length === 0) {
      const dbTables = await DiningTable.find({ hotelId: new Types.ObjectId(hotelIdStr) }).lean();
      for (const dt of dbTables) {
        tables.push({
          id: dt._id.toString(),
          tableNumber: dt.tableNumber,
          floorNumber: parseInt(dt.floorLevel?.replace(/\D/g, '') || '1') || 1,
          floorLevel: dt.floorLevel || '1st Floor',
          hallId: 'hall-1-1',
          section: dt.section || 'Grand AC Dining Hall',
          capacity: dt.capacity || 4,
          shape: 'SQUARE',
          currentStatus: (dt.currentStatus as any) || TableStatus.AVAILABLE,
          assignedWaiter: 'Floor Staff',
          activeOrderTotal: 0,
          activeItemsCount: 0,
          createdAt: (dt as any).createdAt ? (dt as any).createdAt.toISOString() : new Date().toISOString(),
        });
      }
    }
    const { floorNumber, floorLevel, hallId, section, status, search } = req.query;

    let results = [...tables];

    if (floorNumber && floorNumber !== 'ALL') {
      results = results.filter((t) => t.floorNumber === Number(floorNumber));
    } else if (floorLevel && floorLevel !== 'ALL') {
      results = results.filter((t) => t.floorLevel.toLowerCase() === String(floorLevel).toLowerCase());
    }

    if (hallId && hallId !== 'ALL') {
      results = results.filter((t) => t.hallId === hallId);
    }
    if (section && section !== 'ALL') {
      results = results.filter((t) => t.section.toLowerCase() === String(section).toLowerCase());
    }
    if (status && status !== 'ALL') {
      results = results.filter((t) => t.currentStatus === status);
    }
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter(
        (t) =>
          t.tableNumber.toLowerCase().includes(q) ||
          t.section.toLowerCase().includes(q) ||
          (t.assignedWaiter || '').toLowerCase().includes(q) ||
          (t.notes || '').toLowerCase().includes(q)
      );
    }

    res.status(200).json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 6. POST /api/v1/table-management/tables
export const createTable = async (req: Request, res: Response): Promise<void> => {
  try {
    const hotelId = getHotelKey(req);
    if (!Types.ObjectId.isValid(hotelId)) {
      res.status(400).json({ success: false, message: 'Hotel context is required' });
      return;
    }

    const tables = getTablesForHotel(req);
    const floors = getFloorsForHotel(req);
    const { tableNumber, floorNumber, floorLevel, hallId, section, capacity, shape, assignedWaiter, notes } = req.body;
    if (!tableNumber) {
      res.status(400).json({ success: false, message: 'Table Number is required' });
      return;
    }

    // Enforce SuperAdmin capacity ceiling
    const tenant = await Tenant.findById(hotelId).select('maxTables name');
    const maxAllowedTables = Number(tenant?.maxTables || 20);
    const currentDbCount = await DiningTable.countDocuments({ hotelId: new Types.ObjectId(hotelId) });
    const currentCount = Math.max(tables.length, currentDbCount);

    if (currentCount >= maxAllowedTables) {
      res.status(403).json({
        success: false,
        errorCode: 'TABLE_LIMIT_EXCEEDED',
        message: `Table limit reached: SuperAdmin has allocated a maximum of ${maxAllowedTables} tables for ${tenant?.name || 'this hotel'}. You currently have ${currentCount} tables and cannot create more. Please contact SuperAdmin to upgrade capacity.`,
        maxAllowed: maxAllowedTables,
        currentCount,
      });
      return;
    }

    const tNum = String(tableNumber).trim().toUpperCase();
    const existing = tables.find((t) => t.tableNumber.toLowerCase() === tNum.toLowerCase());
    if (existing) {
      res.status(400).json({ success: false, message: `Table with number ${tNum} already exists!` });
      return;
    }

    const fNum = floorNumber ? Number(floorNumber) : 1;
    const fLevel = floorLevel ? String(floorLevel) : `${fNum}st Floor`;
    const sec = section ? String(section).trim() : 'Grand AC Dining Hall';

    const newTable: TableDTO = {
      id: `tbl-${Date.now()}`,
      tableNumber: tNum,
      floorNumber: fNum,
      floorLevel: fLevel,
      hallId: hallId ? String(hallId) : 'hall-1-1',
      section: sec,
      capacity: capacity ? Number(capacity) : 4,
      shape: shape ? shape : 'SQUARE',
      currentStatus: TableStatus.AVAILABLE,
      assignedWaiter: assignedWaiter ? String(assignedWaiter).trim() : 'Floor Staff',
      activeOrderTotal: 0,
      activeItemsCount: 0,
      notes: notes ? String(notes).trim() : undefined,
      qrCodeUrl: `http://localhost:3001/?table=${encodeURIComponent(tNum)}`,
      createdAt: new Date().toISOString(),
    };

    tables.push(newTable);
    recalculateStats(floors, tables);

    // Also persist into MongoDB DiningTable if connected, scoped to the authenticated tenant
    try {
      await DiningTable.create({
        hotelId: new Types.ObjectId(hotelId),
        tableNumber: tNum,
        floorLevel: fLevel,
        section: sec,
        capacity: newTable.capacity,
        currentStatus: TableStatus.AVAILABLE,
        isCommunityTable: false,
        allowCoDining: false,
        seats: [],
        availableSeatsCount: newTable.capacity,
        occupiedSeatsCount: 0,
      });
    } catch (_) {}

    try {
      if (io) {
        io.emit('table:created', newTable);
        io.emit('table:status_changed', { tableNumber: tNum, status: 'AVAILABLE', table: newTable });
      }
    } catch (_) {}

    res.status(201).json({
      success: true,
      data: newTable,
      message: `Table ${tNum} created on ${fLevel}!`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 7. PATCH /api/v1/table-management/tables/:id
export const updateTable = async (req: Request, res: Response): Promise<void> => {
  try {
    const tables = getTablesForHotel(req);
    const floors = getFloorsForHotel(req);
    const id = String(req.params.id);
    const { tableNumber, floorNumber, floorLevel, hallId, section, capacity, shape, assignedWaiter, notes, currentStatus } = req.body;

    const idx = tables.findIndex((t) => t.id === id || t.tableNumber === id);
    if (idx === -1) {
      res.status(404).json({ success: false, message: 'Table not found' });
      return;
    }

    tables[idx] = {
      ...tables[idx],
      ...(tableNumber && { tableNumber: String(tableNumber).trim().toUpperCase() }),
      ...(floorNumber !== undefined && { floorNumber: Number(floorNumber) }),
      ...(floorLevel && { floorLevel: String(floorLevel).trim() }),
      ...(hallId && { hallId: String(hallId) }),
      ...(section && { section: String(section).trim() }),
      ...(capacity !== undefined && { capacity: Number(capacity) }),
      ...(shape && { shape }),
      ...(assignedWaiter && { assignedWaiter: String(assignedWaiter).trim() }),
      ...(notes !== undefined && { notes: String(notes).trim() }),
      ...(currentStatus && { currentStatus }),
    };

    const updated = tables[idx];
    recalculateStats(floors, tables);

    try {
      if (io) {
        io.emit('table:updated', updated);
        if (currentStatus) {
          io.emit('table:status_changed', { tableNumber: updated.tableNumber, status: currentStatus, table: updated });
        }
      }
    } catch (_) {}

    res.status(200).json({
      success: true,
      data: updated,
      message: `Table ${updated.tableNumber} updated successfully!`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 8. PATCH /api/v1/table-management/tables/:id/status
export const updateTableStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const tables = getTablesForHotel(req);
    const floors = getFloorsForHotel(req);
    const id = String(req.params.id);
    const { status, guestCount } = req.body;

    if (!status) {
      res.status(400).json({ success: false, message: 'Status is required' });
      return;
    }

    const idx = tables.findIndex((t) => t.id === id || t.tableNumber === id);
    if (idx === -1) {
      res.status(404).json({ success: false, message: 'Table not found' });
      return;
    }

    tables[idx].currentStatus = status as TableStatus;
    if (status === TableStatus.OCCUPIED && !tables[idx].sessionStartTime) {
      tables[idx].sessionStartTime = new Date().toISOString();
    } else if (status === TableStatus.AVAILABLE) {
      tables[idx].sessionStartTime = undefined;
      tables[idx].activeOrderTotal = 0;
      tables[idx].activeItemsCount = 0;
    }

    const updated = tables[idx];
    recalculateStats(floors, tables);

    // MongoDB sync (tenant-scoped)
    try {
      const hotelId = getHotelKey(req);
      if (Types.ObjectId.isValid(hotelId)) {
        await DiningTable.updateOne(
          { hotelId: new Types.ObjectId(hotelId), tableNumber: updated.tableNumber },
          { currentStatus: status as TableStatus }
        );
      }
    } catch (_) {}

    try {
      if (io) {
        io.emit('table:status_changed', { tableNumber: updated.tableNumber, status, table: updated });
      }
    } catch (_) {}

    res.status(200).json({
      success: true,
      data: updated,
      message: `Table ${updated.tableNumber} marked as ${status}!`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 9. DELETE /api/v1/table-management/tables/:id
export const deleteTable = async (req: Request, res: Response): Promise<void> => {
  try {
    const tables = getTablesForHotel(req);
    const floors = getFloorsForHotel(req);
    const id = String(req.params.id);
    const tableToDelete = tables.find((t) => t.id === id || t.tableNumber === id);
    if (!tableToDelete) {
      res.status(404).json({ success: false, message: 'Table not found' });
      return;
    }

    const removeIndex = tables.findIndex((t) => t.id === id || t.tableNumber === id);
    if (removeIndex !== -1) tables.splice(removeIndex, 1);
    recalculateStats(floors, tables);

    try {
      const hotelId = getHotelKey(req);
      if (Types.ObjectId.isValid(hotelId)) {
        await DiningTable.deleteOne({
          hotelId: new Types.ObjectId(hotelId),
          tableNumber: tableToDelete.tableNumber,
        });
      }
    } catch (_) {}

    try {
      if (io) {
        io.emit('table:deleted', { id, tableNumber: tableToDelete.tableNumber });
      }
    } catch (_) {}

    res.status(200).json({
      success: true,
      data: { id, tableNumber: tableToDelete.tableNumber },
      message: `Table ${tableToDelete.tableNumber} removed from floor layout!`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
