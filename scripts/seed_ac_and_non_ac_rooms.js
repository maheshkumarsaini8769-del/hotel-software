const mongoose = require('mongoose');
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/spicehub_dev';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB:', MONGO_URI);

  const Tenant = mongoose.model(
    'Tenant',
    new mongoose.Schema({}, { strict: false }),
    'tenants'
  );
  const RoomType = mongoose.model(
    'RoomType',
    new mongoose.Schema({}, { strict: false }),
    'roomtypes'
  );
  const Room = mongoose.model(
    'Room',
    new mongoose.Schema({}, { strict: false }),
    'rooms'
  );

  const tenants = await Tenant.find({}).toArray ? await Tenant.find({}).toArray() : await Tenant.find({});
  console.log(`Found ${tenants.length} tenants`);

  for (const tenant of tenants) {
    const hotelId = tenant._id;
    const hotelName = tenant.name || tenant.hotelName || 'Hotel';
    console.log(`\n=== Processing ${hotelName} (${hotelId}) ===`);

    // 1. Ensure AC Room Types
    let deluxeAc = await RoomType.findOne({ hotelId, code: 'DLX' });
    if (!deluxeAc) {
      deluxeAc = await RoomType.create({
        hotelId,
        name: 'Deluxe AC Room',
        code: 'DLX',
        baseCapacityAdults: 2,
        baseCapacityChildren: 1,
        maxCapacity: 3,
        basePriceOvernight: 2800,
        weekendPrice: 3400,
        gstRate: 12,
        isAc: true,
        isActive: true,
        totalRoomsCount: 10,
        amenities: ['Climate Control AC', 'King Bed', 'Free Wi-Fi', 'Smart TV', 'Attached Bath'],
        photos: ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&auto=format&fit=crop&q=80'],
      });
      console.log('  Created Deluxe AC Room type');
    } else {
      await RoomType.updateOne({ _id: deluxeAc._id }, { $set: { name: 'Deluxe AC Room', isAc: true } });
      console.log('  Updated Deluxe AC Room type');
    }

    let suiteAc = await RoomType.findOne({ hotelId, code: 'STE' });
    if (!suiteAc) {
      suiteAc = await RoomType.create({
        hotelId,
        name: 'Executive AC Suite',
        code: 'STE',
        baseCapacityAdults: 3,
        baseCapacityChildren: 2,
        maxCapacity: 4,
        basePriceOvernight: 4500,
        weekendPrice: 5200,
        gstRate: 12,
        isAc: true,
        isActive: true,
        totalRoomsCount: 10,
        amenities: ['Dual Climate AC', 'Balcony View', 'King Bed', 'Free Wi-Fi', 'Smart 55" TV', 'Mini Bar'],
        photos: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80'],
      });
      console.log('  Created Executive AC Suite type');
    } else {
      await RoomType.updateOne({ _id: suiteAc._id }, { $set: { name: 'Executive AC Suite', isAc: true } });
    }

    // 2. Ensure Non-AC Room Types
    let standardNonAc = await RoomType.findOne({ hotelId, code: 'NAC' });
    if (!standardNonAc) {
      standardNonAc = await RoomType.create({
        hotelId,
        name: 'Standard Non-AC Room',
        code: 'NAC',
        baseCapacityAdults: 2,
        baseCapacityChildren: 1,
        maxCapacity: 3,
        basePriceOvernight: 1600,
        weekendPrice: 1900,
        gstRate: 12,
        isAc: false,
        isActive: true,
        totalRoomsCount: 10,
        amenities: ['High-Speed Ceiling Fan', 'Desert Air Cooler', 'Queen Bed', 'Free Wi-Fi', 'Attached Bath'],
        photos: ['https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&auto=format&fit=crop&q=80'],
      });
      console.log('  Created Standard Non-AC Room type');
    } else {
      await RoomType.updateOne({ _id: standardNonAc._id }, { $set: { name: 'Standard Non-AC Room', isAc: false } });
    }

    let economyNonAc = await RoomType.findOne({ hotelId, code: 'ECO' });
    if (!economyNonAc) {
      economyNonAc = await RoomType.create({
        hotelId,
        name: 'Economy Non-AC Room',
        code: 'ECO',
        baseCapacityAdults: 2,
        baseCapacityChildren: 0,
        maxCapacity: 2,
        basePriceOvernight: 1200,
        weekendPrice: 1400,
        gstRate: 12,
        isAc: false,
        isActive: true,
        totalRoomsCount: 10,
        amenities: ['Ceiling Fan', 'Double Bed', 'Attached Bath', 'Free Wi-Fi'],
        photos: ['https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&auto=format&fit=crop&q=80'],
      });
      console.log('  Created Economy Non-AC Room type');
    } else {
      await RoomType.updateOne({ _id: economyNonAc._id }, { $set: { name: 'Economy Non-AC Room', isAc: false } });
    }

    // 3. Update Existing Rooms to be balanced between AC and Non-AC
    const rooms = await Room.find({ hotelId }).sort({ roomNumber: 1 });
    console.log(`  Updating ${rooms.length} physical rooms for ${hotelName}...`);

    for (const rm of rooms) {
      const num = parseInt(rm.roomNumber) || 101;
      let targetType = deluxeAc;
      let isAc = true;

      if (num >= 101 && num <= 110) {
        targetType = deluxeAc;
        isAc = true;
      } else if (num >= 111 && num <= 120) {
        targetType = suiteAc;
        isAc = true;
      } else if (num >= 121 && num <= 130) {
        targetType = standardNonAc;
        isAc = false;
      } else {
        targetType = economyNonAc;
        isAc = false;
      }

      await Room.updateOne(
        { _id: rm._id },
        {
          $set: {
            roomTypeId: targetType._id,
            isAc: isAc,
          },
        }
      );
    }

    const acCount = await Room.countDocuments({ hotelId, isAc: true });
    const nonAcCount = await Room.countDocuments({ hotelId, isAc: false });
    console.log(`  Summary for ${hotelName}: Total Rooms=${rooms.length}, AC=${acCount}, Non-AC=${nonAcCount}`);
  }

  await mongoose.disconnect();
  console.log('\nSeeding completed successfully!');
}

seed().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
