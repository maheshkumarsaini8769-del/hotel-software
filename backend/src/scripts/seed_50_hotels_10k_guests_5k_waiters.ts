import mongoose, { Types } from 'mongoose';
import argon2 from 'argon2';
import dotenv from 'dotenv';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { UserRole, ShiftStatus } from '../types';
import { GuestProfile, VIPTier } from '../models/GuestProfile';
import { DiningTable, TableStatus, SeatStatus } from '../models/DiningTable';
import { RoomType } from '../models/RoomType';
import { Room, RoomStatus } from '../models/Room';
import { MenuCategory } from '../models/MenuCategory';
import { MenuItem, FoodType } from '../models/MenuItem';
import { KitchenStation } from '../models/KitchenStation';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';

const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Jaipur', 'Goa',
  'Udaipur', 'Agra', 'Varanasi', 'Kochi', 'Shimla', 'Manali', 'Pune', 'Ahmedabad',
  'Chandigarh', 'Amritsar', 'Rishikesh', 'Mysuru', 'Ooty', 'Darjeeling', 'Jodhpur', 'Jaisalmer',
  'Leh', 'Srinagar', 'Nainital', 'Mussoorie', 'Coorg', 'Munnar', 'Pondicherry', 'Khajuraho',
  'Bhopal', 'Indore', 'Lucknow', 'Kanpur', 'Patna', 'Bhubaneswar', 'Puri', 'Guwahati',
  'Shillong', 'Gangtok', 'Surat', 'Vadodara', 'Nashik', 'Nagpur', 'Aurangabad', 'Hampi', 'Gokarna', 'Alibaug'
];

const HOTEL_THEMES = [
  'Grand Palace & Resort', 'Heritage Haveli', 'Royal Luxury Suites', 'Ocean Breeze Retreat',
  'Mountain View Villa', 'Emerald Residency', 'Imperial Grand Hotel', 'Tranquil Palms Spa'
];

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║   SPICEHUB INDUSTRIAL SEEDING: 50 HOTELS, 10,000+ GUESTS & 5,000 WAITERS     ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  const startTime = Date.now();
  console.log('⏳ Hashing standard credentials (Argon2)...');
  const defaultPasswordHash = await argon2.hash('SpiceHub@123');
  const defaultPinHash = await argon2.hash('1234');
  console.log('✅ Credentials hashed successfully!\n');

  // =========================================================================
  // 1. ENSURE 50 HOTELS (TENANTS)
  // =========================================================================
  console.log('🏨 Step 1: Provisioning 50 Multi-Tenant Hotels...');
  let existingTenants = await Tenant.find({});
  const targetTenantsCount = 50;

  for (let i = existingTenants.length + 1; i <= targetTenantsCount; i++) {
    const city = INDIAN_CITIES[(i - 1) % INDIAN_CITIES.length];
    const theme = HOTEL_THEMES[(i - 1) % HOTEL_THEMES.length];
    const tenantSlug = `spicehub-hotel-${String(i).padStart(2, '0')}`;

    await Tenant.create({
      name: `SpiceHub ${theme} (${city})`,
      slug: tenantSlug,
      contactEmail: `frontdesk@hotel${i}.spicehub.in`,
      contactPhone: `+91 98000 ${String(10000 + i).slice(1)}`,
      currency: 'INR',
      status: 'ACTIVE',
      address: {
        street: `${i * 10}, Grand Luxury Road`,
        city,
        state: 'India',
        country: 'India',
        pincode: '400001',
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
  }

  const allHotels = await Tenant.find({}).limit(50);
  console.log(`✅ Provisioned ${allHotels.length} Active Multi-Tenant Hotels!\n`);

  // =========================================================================
  // 2. PROVISION 5,000 WAITERS (100 WAITERS PER HOTEL)
  // =========================================================================
  console.log('🤵 Step 2: Provisioning 5,000 Active Waiters (100 per hotel)...');
  const WAITERS_PER_HOTEL = 100;
  let totalNewWaiters = 0;

  for (let hIndex = 0; hIndex < allHotels.length; hIndex++) {
    const hotel = allHotels[hIndex];
    const hotelId = hotel._id as Types.ObjectId;
    const hNum = hIndex + 1;

    const existingWaitersCount = await User.countDocuments({ hotelId, role: UserRole.WAITER });
    const needed = WAITERS_PER_HOTEL - existingWaitersCount;

    if (needed > 0) {
      const waitersToInsert: any[] = [];
      for (let w = existingWaitersCount + 1; w <= WAITERS_PER_HOTEL; w++) {
        waitersToInsert.push({
          hotelId,
          name: `Staff Vikram H${hNum}-${w}`,
          email: `waiter_h${hNum}_w${w}@spicehub.hotel`,
          phone: `+9198${String(hNum).padStart(2, '0')}${String(w).padStart(6, '0')}`,
          passwordHash: defaultPasswordHash,
          pinCodeHash: defaultPinHash,
          role: UserRole.WAITER,
          permissions: ['POS_ORDER_CREATE', 'TABLE_VIEW', 'KDS_VIEW', 'CASH_COLLECT'],
          shiftStatus: ShiftStatus.ON_DUTY,
          isActive: true,
        });
      }
      await User.insertMany(waitersToInsert, { ordered: false });
      totalNewWaiters += waitersToInsert.length;
    }
    process.stdout.write(`\r   -> Hotel ${hNum}/50 seeded with 100 waiters...`);
  }

  const totalWaitersInDB = await User.countDocuments({ role: UserRole.WAITER });
  console.log(`\n✅ Waiters Provisioned: ${totalWaitersInDB} total active waiters in database!\n`);

  // =========================================================================
  // 3. PROVISION 10,500 GUESTS / CUSTOMERS (210 PER HOTEL)
  // =========================================================================
  console.log('👥 Step 3: Provisioning 10,500+ Active Customers / Guests (210 per hotel)...');
  const GUESTS_PER_HOTEL = 210;
  const VIP_TIERS = [VIPTier.REGULAR, VIPTier.SILVER, VIPTier.GOLD, VIPTier.PLATINUM, VIPTier.VIP];
  let totalNewGuests = 0;

  for (let hIndex = 0; hIndex < allHotels.length; hIndex++) {
    const hotel = allHotels[hIndex];
    const hotelId = hotel._id as Types.ObjectId;
    const hNum = hIndex + 1;

    const existingGuestsCount = await GuestProfile.countDocuments({ hotelId });
    const needed = GUESTS_PER_HOTEL - existingGuestsCount;

    if (needed > 0) {
      const guestsToInsert: any[] = [];
      for (let g = existingGuestsCount + 1; g <= GUESTS_PER_HOTEL; g++) {
        const tier = VIP_TIERS[g % VIP_TIERS.length];
        guestsToInsert.push({
          hotelId,
          name: `Guest H${hNum} G${g} Saini`,
          phone: `+9197${String(hNum).padStart(2, '0')}${String(g).padStart(6, '0')}`,
          email: `guest_h${hNum}_g${g}@spiceguest.in`,
          vipTier: tier,
          allergies: g % 5 === 0 ? ['Peanuts'] : g % 7 === 0 ? ['Dairy', 'Gluten'] : [],
          dietaryPreferences: g % 3 === 0 ? ['Jain'] : g % 2 === 0 ? ['Vegetarian'] : ['Non-Vegetarian'],
          totalVisits: (g % 10) + 1,
          totalLifetimeSpend: 2500 + g * 125,
          loyaltyPointsBalance: (g * 50) % 5000,
          pointsEarnedLifetime: (g * 75) % 8000,
          pointsRedeemedLifetime: 0,
          isVerified: true,
          tags: ['Corporate', 'High-Spender'],
        });
      }
      await GuestProfile.insertMany(guestsToInsert, { ordered: false });
      totalNewGuests += guestsToInsert.length;
    }
    process.stdout.write(`\r   -> Hotel ${hNum}/50 seeded with 210 guests...`);
  }

  const totalGuestsInDB = await GuestProfile.countDocuments({});
  console.log(`\n✅ Guests Provisioned: ${totalGuestsInDB} total registered customers in database!\n`);

  // =========================================================================
  // 4. PROVISION OPERATIONAL ASSETS (TABLES, ROOMS, MENUS) PER HOTEL
  // =========================================================================
  console.log('🍽️ Step 4: Provisioning POS Tables, Rooms & Menu Items across all 50 Hotels...');

  for (let hIndex = 0; hIndex < allHotels.length; hIndex++) {
    const hotel = allHotels[hIndex];
    const hotelId = hotel._id as Types.ObjectId;
    const hNum = hIndex + 1;

    // A. Tables (20 tables: T-01 to T-20)
    const existingTables = await DiningTable.find({ hotelId }, { tableNumber: 1 });
    const existingTableNums = new Set(existingTables.map((t) => t.tableNumber));
    if (existingTableNums.size < 20) {
      const tablesToInsert: any[] = [];
      for (let t = 1; t <= 30; t++) {
        const tableNum = `T-${String(t).padStart(2, '0')}`;
        if (!existingTableNums.has(tableNum)) {
          const capacity = t % 4 === 0 ? 6 : t % 2 === 0 ? 4 : 2;
          tablesToInsert.push({
            hotelId,
            tableNumber: tableNum,
            section: t > 15 ? 'ROOFTOP' : t > 10 ? 'COMMUNITY_LOUNGE' : 'AC_HALL',
            capacity,
            currentStatus: TableStatus.AVAILABLE,
            isCommunityTable: t > 10 && t <= 15,
            allowCoDining: t > 10,
            availableSeatsCount: capacity,
            occupiedSeatsCount: 0,
            seats: Array.from({ length: capacity }, (_, s) => ({
              seatNumber: s + 1,
              seatLabel: `Seat ${s + 1}`,
              status: SeatStatus.AVAILABLE,
            })),
          });
          existingTableNums.add(tableNum);
        }
        if (existingTableNums.size >= 20) break;
      }
      if (tablesToInsert.length > 0) {
        await DiningTable.insertMany(tablesToInsert, { ordered: false });
      }
    }

    // B. Kitchen Station, Menu Category & Items (15 items)
    let station = await KitchenStation.findOne({ hotelId });
    if (!station) {
      station = await KitchenStation.create({
        hotelId,
        stationName: 'MAIN_KITCHEN',
        screenToken: `KDS_${hotelId}_MAIN`,
        assignedChefIds: [],
        isOnline: true,
      });
    }

    let category = await MenuCategory.findOne({ hotelId });
    if (!category) {
      category = await MenuCategory.create({
        hotelId,
        name: 'Chef Signature Specials',
        slug: `chef-specials-${hNum}-${Date.now().toString().slice(-4)}`,
        displayOrder: 1,
        kitchenStationId: station._id,
        isActive: true,
      });
    }

    const menuItemsCount = await MenuItem.countDocuments({ hotelId });
    if (menuItemsCount < 15) {
      const sampleDishes = [
        { name: 'Paneer Butter Masala', price: 340, type: FoodType.VEG },
        { name: 'Dal Makhani Bukhara', price: 290, type: FoodType.VEG },
        { name: 'Murgh Tikka Angara', price: 450, type: FoodType.NON_VEG },
        { name: 'Royal Dum Biryani', price: 420, type: FoodType.NON_VEG },
        { name: 'Garlic Butter Naan', price: 85, type: FoodType.VEG },
        { name: 'Tandoori Roti', price: 45, type: FoodType.VEG },
        { name: 'Kadhai Paneer', price: 330, type: FoodType.VEG },
        { name: 'Butter Chicken Roast', price: 480, type: FoodType.NON_VEG },
        { name: 'Gulab Jamun Flambé', price: 160, type: FoodType.VEG },
        { name: 'Masala Chaas', price: 90, type: FoodType.VEG },
        { name: 'Jain Paneer Lababdar', price: 350, type: FoodType.VEG },
        { name: 'Jain Shahi Korma', price: 340, type: FoodType.VEG },
        { name: 'Truffle Mushroom Risotto', price: 550, type: FoodType.VEG },
        { name: 'Avocado Caesar Salad', price: 320, type: FoodType.VEG },
        { name: 'Cold Pressed Mango Lassi', price: 140, type: FoodType.VEG },
      ];
      const itemsToInsert = sampleDishes.slice(menuItemsCount).map((d) => ({
        hotelId,
        categoryId: category!._id,
        kitchenStationId: station!._id,
        name: d.name,
        basePrice: d.price,
        foodType: d.type,
        isAvailable: true,
        prepTimeMinutes: 15,
        variants: [],
        addons: [],
        hasVariants: false,
        images: [],
      }));
      await MenuItem.insertMany(itemsToInsert, { ordered: false });
    }

    // C. Room Types & Rooms (20 rooms: 101 to 120)
    let roomType = await RoomType.findOne({ hotelId });
    if (!roomType) {
      roomType = await RoomType.create({
        hotelId,
        name: 'Deluxe Heritage Room',
        code: `DLX-${hNum}-${Date.now().toString().slice(-4)}`,
        baseCapacityAdults: 2,
        baseCapacityChildren: 1,
        maxCapacity: 3,
        basePriceOvernight: 4500,
        amenities: ['WiFi', 'King Bed', 'AC', 'Mini Bar'],
        images: [],
        totalRoomsCount: 20,
        isActive: true,
      });
    }

    const existingRooms = await Room.find({ hotelId }, { roomNumber: 1 });
    const existingRoomNums = new Set(existingRooms.map((r) => r.roomNumber));
    if (existingRoomNums.size < 20) {
      const roomsToInsert: any[] = [];
      for (let r = 1; r <= 35; r++) {
        const roomNum = `${Math.floor(r / 10) + 1}${String(r % 10).padStart(2, '0')}`;
        if (!existingRoomNums.has(roomNum)) {
          roomsToInsert.push({
            hotelId,
            roomNumber: roomNum,
            roomTypeId: roomType!._id,
            floorNumber: Math.floor(r / 10) + 1,
            wing: 'East Wing',
            status: RoomStatus.AVAILABLE,
            permanentQrCodeHash: `ROOM_QR_HASH_${hotelId}_${roomNum}`,
          });
          existingRoomNums.add(roomNum);
        }
        if (existingRoomNums.size >= 20) break;
      }
      if (roomsToInsert.length > 0) {
        await Room.insertMany(roomsToInsert, { ordered: false });
      }
    }

    process.stdout.write(`\r   -> Hotel ${hNum}/50 assets seeded...`);
  }

  const finalTenants = await Tenant.countDocuments({});
  const finalWaiters = await User.countDocuments({ role: UserRole.WAITER });
  const finalGuests = await GuestProfile.countDocuments({});
  const finalTables = await DiningTable.countDocuments({});
  const finalRooms = await Room.countDocuments({});
  const finalMenuItems = await MenuItem.countDocuments({});

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n\n══════════════════════════════════════════════════════════════════════════════');
  console.log(' 🏆 SEEDING COMPLETE! SUMMARY OF INDUSTRIAL MULTI-TENANT DATABASE:');
  console.log(`   🏨 Total Multi-Tenant Hotels:   ${finalTenants} Properties`);
  console.log(`   🤵 Total Active Waiters:         ${finalWaiters} Staff`);
  console.log(`   👥 Total Registered Customers:   ${finalGuests} Guests`);
  console.log(`   🍽️ Total Dining Tables:          ${finalTables} Tables`);
  console.log(`   🛏️ Total Hotel Guest Rooms:      ${finalRooms} Rooms`);
  console.log(`   📜 Total Menu Items:             ${finalMenuItems} Dishes`);
  console.log(`   ⚡ Total Seeding Time:           ${durationSec}s`);
  console.log('══════════════════════════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Fatal Seeding Error:', err);
  process.exit(1);
});
