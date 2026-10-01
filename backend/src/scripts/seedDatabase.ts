import mongoose, { Types } from 'mongoose';
import argon2 from 'argon2';
import dotenv from 'dotenv';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { UserRole, ShiftStatus } from '../types';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { TableSession, SessionStatus } from '../models/TableSession';
import { KitchenStation } from '../models/KitchenStation';
import { MenuCategory } from '../models/MenuCategory';
import { MenuItem, FoodType } from '../models/MenuItem';
import { RoomType } from '../models/RoomType';
import { Room, RoomStatus } from '../models/Room';
import { TaxRule, TaxType, TaxApplicability } from '../models/TaxRule';
import { WaiterCashFloat, WaiterFloatStatus } from '../models/WaiterCashFloat';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';

export async function seedDatabase() {
  console.log('========================================================');
  console.log('🌱 [SpiceHub Engine] Starting Complete System Seeding...');
  console.log('========================================================');

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  // 1. Clean existing seed data for idempotent fresh run
  await Tenant.deleteMany({ slug: 'taj-gateway' });
  await User.deleteMany({ email: { $in: [
    'superadmin@spicehub.com',
    'admin@tajgateway.com',
    'ramesh@tajgateway.com',
    'suresh@tajgateway.com',
    'vikram@tajgateway.com',
    'priya@tajgateway.com'
  ] } });

  const defaultPasswordHash = await argon2.hash('SpiceHub@123');
  const defaultPinHash = await argon2.hash('1234');

  // 2. Create SuperAdmin
  const superAdmin = await User.create({
    name: 'SpiceHub Super Admin',
    email: 'superadmin@spicehub.com',
    phone: '+91 99999 00001',
    passwordHash: defaultPasswordHash,
    role: UserRole.SUPERADMIN,
    permissions: ['ALL'],
    shiftStatus: ShiftStatus.ON_DUTY,
    isActive: true,
  });
  console.log(`✅ [1/9] Super Admin created: ${superAdmin.email}`);

  // 3. Create Tenant Hotel
  const hotel = await Tenant.create({
    name: 'Hotel Taj Gateway & Luxury Dining',
    slug: 'taj-gateway',
    contactEmail: 'contact@tajgateway.com',
    contactPhone: '+91 98765 43210',
    currency: 'INR',
    status: 'ACTIVE',
    address: {
      street: '14 Palace Road, Civil Lines',
      city: 'Jaipur',
      state: 'Rajasthan',
      country: 'India',
      pincode: '302006',
    },
    featureFlags: {
      pmsEnabled: true,
      kdsEnabled: true,
      qrDineInEnabled: true,
      roomServiceEnabled: true,
      banquetEnabled: true,
      loyaltyEnabled: true,
      aiInsightsEnabled: true,
      tallyExportEnabled: true,
    },
  });
  const hotelId = hotel._id as Types.ObjectId;
  console.log(`✅ [2/9] Tenant Hotel created: ${hotel.name} (ID: ${hotelId})`);

  // 4. Create Hotel Staff Users
  const hotelAdmin = await User.create({
    hotelId,
    name: 'Rajesh Sharma (General Manager)',
    email: 'admin@tajgateway.com',
    phone: '+91 98765 11111',
    passwordHash: defaultPasswordHash,
    pinCodeHash: await argon2.hash('1111'),
    role: UserRole.HOTEL_ADMIN,
    permissions: ['ALL_HOTEL'],
    shiftStatus: ShiftStatus.ON_DUTY,
    isActive: true,
  });

  const waiterRamesh = await User.create({
    hotelId,
    name: 'Ramesh Kumar (Captain/Waiter)',
    email: 'ramesh@tajgateway.com',
    phone: '+91 98765 22222',
    passwordHash: defaultPasswordHash,
    pinCodeHash: defaultPinHash, // PIN 1234
    role: UserRole.WAITER,
    permissions: ['PUNCH_KOT', 'VIEW_TABLES', 'COLLECT_CASH', 'ACCEPT_CALLS'],
    shiftStatus: ShiftStatus.ON_DUTY,
    isActive: true,
  });

  const waiterSuresh = await User.create({
    hotelId,
    name: 'Suresh Patel (Waiter)',
    email: 'suresh@tajgateway.com',
    phone: '+91 98765 33333',
    passwordHash: defaultPasswordHash,
    pinCodeHash: await argon2.hash('5678'),
    role: UserRole.WAITER,
    permissions: ['PUNCH_KOT', 'VIEW_TABLES', 'COLLECT_CASH', 'ACCEPT_CALLS'],
    shiftStatus: ShiftStatus.ON_DUTY,
    isActive: true,
  });

  const chefVikram = await User.create({
    hotelId,
    name: 'Vikram Singh (Head Chef)',
    email: 'vikram@tajgateway.com',
    phone: '+91 98765 44444',
    passwordHash: defaultPasswordHash,
    pinCodeHash: await argon2.hash('2222'),
    role: UserRole.CHEF,
    permissions: ['VIEW_KDS', 'MARK_READY', 'ITEM_86'],
    shiftStatus: ShiftStatus.ON_DUTY,
    isActive: true,
  });

  const cashierPriya = await User.create({
    hotelId,
    name: 'Priya Verma (Head Cashier)',
    email: 'priya@tajgateway.com',
    phone: '+91 98765 55555',
    passwordHash: defaultPasswordHash,
    pinCodeHash: await argon2.hash('3333'),
    role: UserRole.CASHIER,
    permissions: ['BILLING', 'SPLIT_BILL', 'SETTLE_PAYMENT', 'APPROVE_DROPS'],
    shiftStatus: ShiftStatus.ON_DUTY,
    isActive: true,
  });
  console.log('✅ [3/9] Hotel Staff (Admin, Waiters, Chef, Cashier) created');

  // 5. Create Kitchen Stations
  await KitchenStation.deleteMany({ hotelId });
  const tandoorStation = await KitchenStation.create({
    hotelId,
    stationName: 'TANDOOR',
    screenToken: 'kds_token_tandoor_taj_gateway',
    assignedChefIds: [chefVikram._id as Types.ObjectId],
    printerIp: '192.168.1.101',
    printerPort: 9100,
    isOnline: true,
  });

  const curryStation = await KitchenStation.create({
    hotelId,
    stationName: 'CURRY_MAIN',
    screenToken: 'kds_token_curry_taj_gateway',
    assignedChefIds: [chefVikram._id as Types.ObjectId],
    printerIp: '192.168.1.102',
    printerPort: 9100,
    isOnline: true,
  });

  const barStation = await KitchenStation.create({
    hotelId,
    stationName: 'BAR_BEVERAGE',
    screenToken: 'kds_token_bar_taj_gateway',
    assignedChefIds: [],
    printerIp: '192.168.1.103',
    printerPort: 9100,
    isOnline: true,
  });
  console.log('✅ [4/9] Kitchen Stations created (Tandoor, Curry, Bar)');

  // 6. Create Menu Categories & Items
  await MenuCategory.deleteMany({ hotelId });
  await MenuItem.deleteMany({ hotelId });

  const catStarters = await MenuCategory.create({
    hotelId,
    name: 'Appetizers & Starters',
    slug: 'appetizers-starters',
    displayOrder: 1,
    isActive: true,
  });
  const catMains = await MenuCategory.create({
    hotelId,
    name: 'North Indian Curries & Mains',
    slug: 'curries-mains',
    displayOrder: 2,
    isActive: true,
  });
  const catBreads = await MenuCategory.create({
    hotelId,
    name: 'Tandoori Breads & Naan',
    slug: 'tandoori-breads',
    displayOrder: 3,
    isActive: true,
  });
  const catDrinks = await MenuCategory.create({
    hotelId,
    name: 'Beverages & Mocktails',
    slug: 'beverages-mocktails',
    displayOrder: 4,
    isActive: true,
  });

  const menuItems = await MenuItem.insertMany([
    {
      hotelId,
      categoryId: catStarters._id,
      kitchenStationId: tandoorStation._id,
      name: 'Paneer Tikka Angara',
      description: 'Charcoal grilled cottage cheese marinated in spiced yogurt and kasoori methi',
      foodType: FoodType.VEG,
      basePrice: 280,
      hasVariants: false,
      isAvailable: true,
      prepTimeMinutes: 12,
      hsnCode: '2106',
      itemCode: '101',
      images: ['https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500'],
    },
    {
      hotelId,
      categoryId: catStarters._id,
      kitchenStationId: tandoorStation._id,
      name: 'Murgh Malai Tikka',
      description: 'Creamy chicken chunks spiced with cardamom and grilled to golden perfection',
      foodType: FoodType.NON_VEG,
      basePrice: 340,
      hasVariants: false,
      isAvailable: true,
      prepTimeMinutes: 14,
      hsnCode: '2106',
      itemCode: '102',
      images: ['https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500'],
    },
    {
      hotelId,
      categoryId: catMains._id,
      kitchenStationId: curryStation._id,
      name: 'Dal Makhani Bukhara',
      description: 'Slow-simmered black lentils overnight with fresh butter and dairy cream',
      foodType: FoodType.VEG,
      basePrice: 310,
      hasVariants: false,
      isAvailable: true,
      prepTimeMinutes: 8,
      hsnCode: '2106',
      itemCode: '201',
      images: ['https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500'],
    },
    {
      hotelId,
      categoryId: catMains._id,
      kitchenStationId: curryStation._id,
      name: 'Butter Chicken Aslam Style',
      description: 'Tender tandoori chicken cooked in rich velvety tomato makhani gravy',
      foodType: FoodType.NON_VEG,
      basePrice: 420,
      hasVariants: false,
      isAvailable: true,
      prepTimeMinutes: 12,
      hsnCode: '2106',
      itemCode: '202',
      images: ['https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500'],
    },
    {
      hotelId,
      categoryId: catBreads._id,
      kitchenStationId: tandoorStation._id,
      name: 'Butter Garlic Naan',
      description: 'Clay-oven baked leavened bread brushed with garlic butter and fresh cilantro',
      foodType: FoodType.VEG,
      basePrice: 70,
      hasVariants: false,
      isAvailable: true,
      prepTimeMinutes: 6,
      hsnCode: '1905',
      itemCode: '301',
      images: ['https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500'],
    },
    {
      hotelId,
      categoryId: catDrinks._id,
      kitchenStationId: barStation._id,
      name: 'Mint Lime Virgin Mojito',
      description: 'Fresh crushed mint leaves, lime chunks, simple syrup and chilled fizz',
      foodType: FoodType.BEVERAGE,
      basePrice: 180,
      hasVariants: false,
      isAvailable: true,
      prepTimeMinutes: 5,
      hsnCode: '2202',
      itemCode: '401',
      images: ['https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500'],
    },
  ]);
  console.log(`✅ [5/9] Menu Categories & ${menuItems.length} Authentic Dishes created`);

  // 7. Create Dining Tables (1 to 10)
  await DiningTable.deleteMany({ hotelId });
  const tables = [];
  for (let i = 1; i <= 10; i++) {
    const section = i <= 4 ? 'Indoor AC Dining' : i <= 7 ? 'Garden Patio' : 'VIP Corner';
    const capacity = i % 2 === 0 ? 4 : 2;
    const table = await DiningTable.create({
      hotelId,
      tableNumber: `T-${i < 10 ? '0' + i : i}`,
      capacity,
      section,
      currentStatus: i === 4 ? TableStatus.OCCUPIED : TableStatus.AVAILABLE,
      qrTokenHash: `qr_hash_token_table_${i}`,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://spicehub.live/dine/${hotelId}/table-${i}`,
      isAvailable: true,
    });
    tables.push(table);
  }
  console.log(`✅ [6/9] Dining Tables created: 10 tables across 3 sections`);

  // 8. Create Authoritative Tax Rules
  await TaxRule.deleteMany({ hotelId });
  await TaxRule.create([
    {
      hotelId,
      taxName: 'GST 5% (Restaurant Dining)',
      taxType: TaxType.GST,
      applicableTo: TaxApplicability.RESTAURANT_DINE_IN,
      cgstRate: 2.5,
      sgstRate: 2.5,
      igstRate: 0,
      serviceChargeRate: 0,
      totalEffectiveRate: 5.0,
      isDefault: true,
      isActive: true,
    },
    {
      hotelId,
      taxName: 'GST 12% (Hotel Room Stay)',
      taxType: TaxType.GST,
      applicableTo: TaxApplicability.ROOM_STAY,
      cgstRate: 6.0,
      sgstRate: 6.0,
      igstRate: 0,
      serviceChargeRate: 0,
      totalEffectiveRate: 12.0,
      isDefault: true,
      isActive: true,
    },
  ]);
  console.log('✅ [7/9] Authoritative Tax Rules (5% Dining, 12% Room) created');

  // 9. Create Hotel Rooms & Room Types
  await RoomType.deleteMany({ hotelId });
  await Room.deleteMany({ hotelId });

  const deluxeType = await RoomType.create({
    hotelId,
    name: 'Deluxe AC Room',
    code: 'DLX',
    basePriceOvernight: 3500,
    totalRoomsCount: 3,
    maxCapacity: 3,
    description: 'Spacious king-bed room with city view, high-speed WiFi and luxury en-suite bathroom',
    amenities: ['King Bed', 'AC', 'Smart TV', 'High-speed WiFi', 'Mini Bar'],
    isActive: true,
  });

  const suiteType = await RoomType.create({
    hotelId,
    name: 'Royal Heritage Suite',
    code: 'STE',
    basePriceOvernight: 6500,
    totalRoomsCount: 2,
    maxCapacity: 4,
    description: 'Master suite with private balcony, separate living lounge and jacuzzi bath',
    amenities: ['King Bed', 'Living Area', 'Balcony', 'Jacuzzi', 'Complimentary Breakfast'],
    isActive: true,
  });

  await Room.insertMany([
    { hotelId, roomTypeId: deluxeType._id, roomNumber: '101', floorNumber: 1, status: RoomStatus.AVAILABLE, permanentQrCodeHash: 'room_101_hash' },
    { hotelId, roomTypeId: deluxeType._id, roomNumber: '102', floorNumber: 1, status: RoomStatus.OCCUPIED, permanentQrCodeHash: 'room_102_hash' },
    { hotelId, roomTypeId: deluxeType._id, roomNumber: '103', floorNumber: 1, status: RoomStatus.DIRTY, permanentQrCodeHash: 'room_103_hash' },
    { hotelId, roomTypeId: suiteType._id, roomNumber: '201', floorNumber: 2, status: RoomStatus.AVAILABLE, permanentQrCodeHash: 'room_201_hash' },
    { hotelId, roomTypeId: suiteType._id, roomNumber: '202', floorNumber: 2, status: RoomStatus.AVAILABLE, permanentQrCodeHash: 'room_202_hash' },
  ]);
  console.log('✅ [8/9] PMS Rooms created: 5 Rooms (Deluxe 101-103, Suite 201-202)');

  // 10. Create Active Table Session & Waiter Float
  await TableSession.deleteMany({ hotelId });
  await WaiterCashFloat.deleteMany({ hotelId });

  const activeTable4 = tables[3]; // Table 4
  await TableSession.create({
    hotelId,
    tableId: activeTable4._id,
    sessionTokenHash: 'active_session_table_4_token_hash',
    openedAt: new Date(),
    guestCount: 3,
    customerName: 'Aman Sharma',
    customerPhone: '+91 98765 99999',
    status: SessionStatus.ACTIVE,
    totalAmount: 1140,
    discountAmount: 0,
    taxAmount: 57,
    finalAmount: 1197,
  });

  await WaiterCashFloat.create({
    hotelId,
    waiterUserId: waiterRamesh._id as Types.ObjectId,
    waiterName: waiterRamesh.name,
    shiftDate: new Date().toISOString().split('T')[0],
    openingFloat: 1000,
    totalCashCollected: 1450,
    totalChangeGiven: 50,
    expectedCashInHand: 2400,
    status: WaiterFloatStatus.OPEN,
    dropRequests: [],
  });
  console.log('✅ [9/9] Active Table 4 Session & Waiter Ramesh Cash Float (₹2,400) seeded');

  console.log('========================================================');
  console.log('🎉 [SpiceHub Engine] Database Seeding Completed Successfully!');
  console.log('========================================================');
  console.log('LOGIN CREDENTIALS SUMMARY:');
  console.log('  1. Super Admin: superadmin@spicehub.com | Password: SpiceHub@123');
  console.log('  2. Hotel Admin: admin@tajgateway.com    | Password: SpiceHub@123 | PIN: 1111');
  console.log('  3. Waiter:      ramesh@tajgateway.com   | Password: SpiceHub@123 | PIN: 1234');
  console.log('  4. Chef:        vikram@tajgateway.com   | Password: SpiceHub@123 | PIN: 2222');
  console.log('  5. Cashier:     priya@tajgateway.com    | Password: SpiceHub@123 | PIN: 3333');
  console.log('========================================================');
}

if (require.main === module) {
  seedDatabase()
    .then(() => {
      mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      mongoose.disconnect();
      process.exit(1);
    });
}
