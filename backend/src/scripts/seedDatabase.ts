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
import { Recipe } from '../models/Recipe';
import { StockBatch, BatchFreshnessStatus } from '../models/StockBatch';

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
    // --- Starters ---
    {
      hotelId,
      categoryId: catStarters._id,
      kitchenStationId: tandoorStation._id,
      name: 'Paneer Tikka Angara',
      description: 'Charcoal grilled cottage cheese marinated in spiced hung yogurt, Kashmiri deghi mirch and kasoori methi',
      foodType: FoodType.VEG,
      basePrice: 280,
      hasVariants: false,
      isAvailable: true,
      prepTimeMinutes: 12,
      hsnCode: '2106',
      itemCode: '101',
      images: ['https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&auto=format&fit=crop&q=80'],
    },
    {
      hotelId,
      categoryId: catStarters._id,
      kitchenStationId: tandoorStation._id,
      name: 'Murgh Malai Tikka',
      description: 'Velvety chicken chunks marinated in rich cream cheese, green cardamom and charcoal grilled to golden perfection',
      foodType: FoodType.NON_VEG,
      basePrice: 340,
      hasVariants: false,
      isAvailable: true,
      prepTimeMinutes: 14,
      hsnCode: '2106',
      itemCode: '102',
      images: ['https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&auto=format&fit=crop&q=80'],
    },
    {
      hotelId,
      categoryId: catStarters._id,
      kitchenStationId: tandoorStation._id,
      name: 'Tandoori Malai Broccoli',
      description: 'Tender broccoli florets infused with royal cardamom, mild cheddar and baked in clay oven',
      foodType: FoodType.VEG,
      basePrice: 310,
      hasVariants: false,
      isAvailable: true,
      prepTimeMinutes: 10,
      hsnCode: '2106',
      itemCode: '103',
      images: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80'],
    },
    {
      hotelId,
      categoryId: catStarters._id,
      kitchenStationId: tandoorStation._id,
      name: 'Galouti Kebab Nawabi',
      description: 'Melt-in-mouth smoked lamb patties prepared with 32 royal spices on griddle with saffron glaze',
      foodType: FoodType.NON_VEG,
      basePrice: 410,
      hasVariants: false,
      isAvailable: true,
      prepTimeMinutes: 15,
      hsnCode: '2106',
      itemCode: '104',
      images: ['https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80'],
    },
    // --- Mains ---
    {
      hotelId,
      categoryId: catMains._id,
      kitchenStationId: curryStation._id,
      name: 'Dal Makhani Bukhara',
      description: 'Slow-simmered black lentils overnight with fresh white butter, tomato puree and dairy cream',
      foodType: FoodType.VEG,
      basePrice: 310,
      hasVariants: false,
      isAvailable: true,
      prepTimeMinutes: 8,
      hsnCode: '2106',
      itemCode: '201',
      images: ['https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80'],
    },
    {
      hotelId,
      categoryId: catMains._id,
      kitchenStationId: curryStation._id,
      name: 'Butter Chicken Aslam Style',
      description: 'Smoky roasted tandoori chicken cooked in rich velvety tomato makhani satin gravy with fenugreek butter',
      foodType: FoodType.NON_VEG,
      basePrice: 420,
      hasVariants: false,
      isAvailable: true,
      prepTimeMinutes: 12,
      hsnCode: '2106',
      itemCode: '202',
      images: ['https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&auto=format&fit=crop&q=80'],
    },
    {
      hotelId,
      categoryId: catMains._id,
      kitchenStationId: curryStation._id,
      name: 'Paneer Lababdar Royal',
      description: 'Fresh artisanal paneer cubes tossed in rich onion-tomato gravy with crushed ginger and royal spices',
      foodType: FoodType.VEG,
      basePrice: 350,
      hasVariants: false,
      isAvailable: true,
      prepTimeMinutes: 12,
      hsnCode: '2106',
      itemCode: '203',
      images: ['https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=80'],
    },
    {
      hotelId,
      categoryId: catMains._id,
      kitchenStationId: curryStation._id,
      name: 'Awadhi Murgh Dum Biryani',
      description: 'Fragrant Daawat basmati rice layered with spiced chicken, caramelized onions, fresh mint and saffron milk',
      foodType: FoodType.NON_VEG,
      basePrice: 460,
      hasVariants: false,
      isAvailable: true,
      prepTimeMinutes: 15,
      hsnCode: '2106',
      itemCode: '204',
      images: ['https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80'],
    },
    // --- Breads ---
    {
      hotelId,
      categoryId: catBreads._id,
      kitchenStationId: tandoorStation._id,
      name: 'Butter Garlic Naan',
      description: 'Clay-oven baked leavened bread brushed with melted garlic butter and freshly chopped cilantro',
      foodType: FoodType.VEG,
      basePrice: 70,
      hasVariants: false,
      isAvailable: true,
      prepTimeMinutes: 6,
      hsnCode: '1905',
      itemCode: '301',
      images: ['https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop&q=80'],
    },
    {
      hotelId,
      categoryId: catBreads._id,
      kitchenStationId: tandoorStation._id,
      name: 'Amritsari Stuffed Kulcha',
      description: 'Crisp layered tandoori bread filled with spiced herb potato mash and pomegranate seeds',
      foodType: FoodType.VEG,
      basePrice: 95,
      hasVariants: false,
      isAvailable: true,
      prepTimeMinutes: 7,
      hsnCode: '1905',
      itemCode: '302',
      images: ['https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=80'],
    },
    // --- Beverages & Desserts ---
    {
      hotelId,
      categoryId: catDrinks._id,
      kitchenStationId: barStation._id,
      name: 'Shahi Tukda with Kesar Rabri',
      description: 'Crispy ghee fried brioche steeped in cardamom saffron syrup served with reduced pistachio rabri',
      foodType: FoodType.VEG,
      basePrice: 210,
      hasVariants: false,
      isAvailable: true,
      prepTimeMinutes: 6,
      hsnCode: '2106',
      itemCode: '401',
      images: ['https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80'],
    },
    {
      hotelId,
      categoryId: catDrinks._id,
      kitchenStationId: barStation._id,
      name: 'Mint Lime Virgin Mojito',
      description: 'Muddled fresh mint leaves, key lime chunks, raw cane syrup and chilled sparkling soda',
      foodType: FoodType.BEVERAGE,
      basePrice: 180,
      hasVariants: false,
      isAvailable: true,
      prepTimeMinutes: 5,
      hsnCode: '2202',
      itemCode: '402',
      images: ['https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80'],
    },
    {
      hotelId,
      categoryId: catDrinks._id,
      kitchenStationId: barStation._id,
      name: 'Royal Kesar Pista Lassi',
      description: 'Traditional thick churned yogurt lassi infused with Kashmiri saffron strands and slivered pistachios',
      foodType: FoodType.BEVERAGE,
      basePrice: 160,
      hasVariants: false,
      isAvailable: true,
      prepTimeMinutes: 5,
      hsnCode: '2202',
      itemCode: '403',
      images: ['https://images.unsplash.com/photo-1571006682893-4a12368a183d?w=600&auto=format&fit=crop&q=80'],
    },
  ]);
  console.log(`✅ [5/9] Menu Categories & ${menuItems.length} Authentic Dishes created`);

  // 6b. Seed Recipe BOM (Bill of Materials) & FEFO Stock Batches (Shift 53)
  await Recipe.deleteMany({ hotelId });
  await StockBatch.deleteMany({ hotelId });

  const paneerTikka = menuItems.find((m) => m.name === 'Paneer Tikka Angara');
  const murghMalai = menuItems.find((m) => m.name === 'Murgh Malai Tikka');
  const butterChicken = menuItems.find((m) => m.name === 'Butter Chicken Aslam Style');
  const dalMakhani = menuItems.find((m) => m.name === 'Dal Makhani Bukhara');

  if (paneerTikka) {
    await Recipe.create({
      hotelId,
      menuItemId: paneerTikka._id,
      recipeCode: 'REC-101',
      title: 'Paneer Tikka Angara BOM',
      yieldPortions: 1,
      portionSizeDescription: '6 succulent chargrilled cubes (250g)',
      ingredients: [
        { ingredientName: 'Malai Paneer', quantity: 0.25, unit: 'kg', unitCost: 360, costContribution: 90 },
        { ingredientName: 'Hung Curd', quantity: 0.1, unit: 'kg', unitCost: 120, costContribution: 12 },
        { ingredientName: 'Kashmiri Spices', quantity: 0.03, unit: 'kg', unitCost: 400, costContribution: 12 },
      ],
      preparationSteps: [
        'Cut fresh malai paneer into 40g uniform cubes',
        'Whisk hung curd with mustard oil and Kashmiri deghi mirch',
        'Marinate for 2 hours in walk-in cold storage',
        'Roast in clay tandoor on skewer at 350°C for 9 minutes',
      ],
      totalBatchCost: 114,
      costPerPortion: 114,
      targetSellingPrice: 280,
      foodCostPercentage: 40.7,
      grossMarginPercentage: 59.3,
      targetCostPercentage: 35,
      isActive: true,
    });
  }

  if (murghMalai) {
    await Recipe.create({
      hotelId,
      menuItemId: murghMalai._id,
      recipeCode: 'REC-102',
      title: 'Murgh Malai Tikka BOM',
      yieldPortions: 1,
      portionSizeDescription: '6 tender chargrilled pieces (280g)',
      ingredients: [
        { ingredientName: 'Boneless Chicken', quantity: 0.28, unit: 'kg', unitCost: 280, costContribution: 78.4 },
        { ingredientName: 'Dairy Cream', quantity: 0.08, unit: 'l', unitCost: 220, costContribution: 17.6 },
      ],
      preparationSteps: [
        'Trim and tenderize fresh chicken breast pieces',
        'Coat in cheese, cream, cardamom and cashew paste marinade',
        'Roast gently in medium tandoor',
      ],
      totalBatchCost: 96,
      costPerPortion: 96,
      targetSellingPrice: 340,
      foodCostPercentage: 28.2,
      grossMarginPercentage: 71.8,
      targetCostPercentage: 30,
      isActive: true,
    });
  }

  if (butterChicken) {
    await Recipe.create({
      hotelId,
      menuItemId: butterChicken._id,
      recipeCode: 'REC-202',
      title: 'Butter Chicken Aslam Style BOM',
      yieldPortions: 1,
      portionSizeDescription: 'Single signature portion with gravy (450g)',
      ingredients: [
        { ingredientName: 'Boneless Chicken', quantity: 0.3, unit: 'kg', unitCost: 280, costContribution: 84 },
        { ingredientName: 'Amul Butter', quantity: 0.05, unit: 'kg', unitCost: 550, costContribution: 27.5 },
        { ingredientName: 'Makhani Satin Gravy', quantity: 0.2, unit: 'l', unitCost: 150, costContribution: 30 },
      ],
      preparationSteps: [
        'Half-roast marinated chicken tikka in tandoor',
        'Simmer makhani satin gravy with fenugreek leaves',
        'Fold in chicken with generous clarified Amul butter',
      ],
      totalBatchCost: 141.5,
      costPerPortion: 141.5,
      targetSellingPrice: 420,
      foodCostPercentage: 33.7,
      grossMarginPercentage: 66.3,
      targetCostPercentage: 32,
      isActive: true,
    });
  }

  if (dalMakhani) {
    await Recipe.create({
      hotelId,
      menuItemId: dalMakhani._id,
      recipeCode: 'REC-201',
      title: 'Dal Makhani Bukhara BOM',
      yieldPortions: 1,
      portionSizeDescription: 'Signature copper handi portion (350g)',
      ingredients: [
        { ingredientName: 'Black Urad Dal', quantity: 0.15, unit: 'kg', unitCost: 160, costContribution: 24 },
        { ingredientName: 'Amul Butter', quantity: 0.04, unit: 'kg', unitCost: 550, costContribution: 22 },
        { ingredientName: 'Dairy Cream', quantity: 0.05, unit: 'l', unitCost: 220, costContribution: 11 },
      ],
      preparationSteps: [
        'Slow cook overnight over smouldering charcoal embers',
        'Temper with ginger, garlic and ripe tomato puree',
        'Finish with rich white dairy butter and fresh cream',
      ],
      totalBatchCost: 57,
      costPerPortion: 57,
      targetSellingPrice: 310,
      foodCostPercentage: 18.4,
      grossMarginPercentage: 81.6,
      targetCostPercentage: 25,
      isActive: true,
    });
  }

  // Seed FEFO Stock Batches
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  await StockBatch.insertMany([
    // Malai Paneer: Batch 1 (Expiring Soon - 2.5 kg, expires tomorrow) -> FEFO consumes this first!
    {
      hotelId,
      batchNumber: 'BAT-MP-2026-001',
      itemName: 'Malai Paneer',
      category: 'Dairy & Perishables',
      currentQuantity: 2.5,
      unit: 'kg',
      unitCost: 360,
      location: 'Walk-in Cold Storage A1',
      mfgDate: new Date(now.getTime() - 2 * dayMs),
      expiryDate: new Date(now.getTime() + 1 * dayMs),
      status: BatchFreshnessStatus.EXPIRING_SOON,
    },
    // Malai Paneer: Batch 2 (Fresh - 2.6 kg, expires in 6 days) -> Total = 5.1 kg (Order 1 portion drops to 4.85 kg <= 5.0 kg low stock threshold!)
    {
      hotelId,
      batchNumber: 'BAT-MP-2026-002',
      itemName: 'Malai Paneer',
      category: 'Dairy & Perishables',
      currentQuantity: 2.6,
      unit: 'kg',
      unitCost: 360,
      location: 'Walk-in Cold Storage A2',
      mfgDate: now,
      expiryDate: new Date(now.getTime() + 6 * dayMs),
      status: BatchFreshnessStatus.FRESH,
    },
    // Boneless Chicken
    {
      hotelId,
      batchNumber: 'BAT-CK-2026-001',
      itemName: 'Boneless Chicken',
      category: 'Poultry',
      currentQuantity: 12.0,
      unit: 'kg',
      unitCost: 280,
      location: 'Meat Deep Freezer',
      mfgDate: new Date(now.getTime() - 1 * dayMs),
      expiryDate: new Date(now.getTime() + 4 * dayMs),
      status: BatchFreshnessStatus.FRESH,
    },
    // Amul Butter
    {
      hotelId,
      batchNumber: 'BAT-BT-2026-001',
      itemName: 'Amul Butter',
      category: 'Dairy',
      currentQuantity: 8.0,
      unit: 'kg',
      unitCost: 550,
      location: 'Dairy Cold Storage',
      mfgDate: new Date(now.getTime() - 4 * dayMs),
      expiryDate: new Date(now.getTime() + 25 * dayMs),
      status: BatchFreshnessStatus.FRESH,
    },
    // Black Urad Dal
    {
      hotelId,
      batchNumber: 'BAT-UD-2026-001',
      itemName: 'Black Urad Dal',
      category: 'Dry Store',
      currentQuantity: 20.0,
      unit: 'kg',
      unitCost: 160,
      location: 'Dry Grain Store',
      mfgDate: new Date(now.getTime() - 10 * dayMs),
      expiryDate: new Date(now.getTime() + 90 * dayMs),
      status: BatchFreshnessStatus.FRESH,
    },
    // Dairy Cream
    {
      hotelId,
      batchNumber: 'BAT-DC-2026-001',
      itemName: 'Dairy Cream',
      category: 'Dairy',
      currentQuantity: 10.0,
      unit: 'l',
      unitCost: 220,
      location: 'Walk-in Cold Storage A1',
      mfgDate: new Date(now.getTime() - 1 * dayMs),
      expiryDate: new Date(now.getTime() + 5 * dayMs),
      status: BatchFreshnessStatus.FRESH,
    },
  ]);

  console.log('✅ [5b/9] Recipe BOMs & FEFO Stock Batches created');

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
