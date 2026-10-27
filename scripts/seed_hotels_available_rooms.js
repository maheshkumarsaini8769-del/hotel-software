const mongoose = require('mongoose');
const crypto = require('crypto');

async function seedHotelsRooms() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/spicehub_dev');

  const Tenant = mongoose.model('Tenant', new mongoose.Schema({}, { strict: false }));
  const Room = mongoose.model('Room', new mongoose.Schema({}, { strict: false }));
  const RoomType = mongoose.model('RoomType', new mongoose.Schema({}, { strict: false }));

  const tenants = await Tenant.find({}).lean();
  console.log(`Found ${tenants.length} tenants in DB`);

  for (const tenant of tenants) {
    const hotelId = tenant._id;
    console.log(`Processing hotel: ${tenant.name} (${hotelId})`);

    // 1. Ensure Standard, Deluxe, and Suite RoomTypes exist
    let standardType = await RoomType.findOne({ hotelId, code: 'STD' });
    if (!standardType) {
      standardType = await RoomType.create({
        hotelId,
        name: 'Standard AC Room',
        code: 'STD',
        basePriceOvernight: 2200,
        gstRate: 12,
        amenities: ['Queen Bed', 'Air Conditioning', 'Free Wi-Fi', 'Smart TV', 'Hot Water Shower'],
        maxCapacity: 2,
      });
      console.log(`Created STD RoomType for ${tenant.name}`);
    }

    let deluxeType = await RoomType.findOne({ hotelId, code: 'DLX' });
    if (!deluxeType) {
      deluxeType = await RoomType.create({
        hotelId,
        name: 'Executive Deluxe King',
        code: 'DLX',
        basePriceOvernight: 3500,
        gstRate: 12,
        amenities: ['King Size Bed', 'Balcony View', 'Air Conditioning', 'High-Speed Wi-Fi', 'Coffee Maker', 'Mini Bar', 'Work Desk'],
        maxCapacity: 3,
      });
      console.log(`Created DLX RoomType for ${tenant.name}`);
    }

    let suiteType = await RoomType.findOne({ hotelId, code: 'STE' });
    if (!suiteType) {
      suiteType = await RoomType.create({
        hotelId,
        name: 'Royal Heritage Suite',
        code: 'STE',
        basePriceOvernight: 5500,
        gstRate: 12,
        amenities: ['Private Living Room', 'Jacuzzi Bath', 'King Bed', 'City Skyline View', 'Butler Service', 'Complimentary Breakfast', 'High-Speed Wi-Fi'],
        maxCapacity: 4,
      });
      console.log(`Created STE RoomType for ${tenant.name}`);
    }

    // 2. Desired Room Configurations for this hotel
    const desiredRooms = [
      { roomNumber: '101', floorNumber: 1, roomTypeId: standardType._id, status: 'AVAILABLE' },
      { roomNumber: '102', floorNumber: 1, roomTypeId: standardType._id, status: 'AVAILABLE' },
      { roomNumber: '103', floorNumber: 1, roomTypeId: standardType._id, status: 'AVAILABLE' },
      { roomNumber: '104', floorNumber: 1, roomTypeId: standardType._id, status: 'CLEANING' },
      { roomNumber: '201', floorNumber: 2, roomTypeId: deluxeType._id, status: 'AVAILABLE' },
      { roomNumber: '202', floorNumber: 2, roomTypeId: deluxeType._id, status: 'AVAILABLE' },
      { roomNumber: '203', floorNumber: 2, roomTypeId: deluxeType._id, status: 'AVAILABLE' },
      { roomNumber: '204', floorNumber: 2, roomTypeId: deluxeType._id, status: 'AVAILABLE' },
      { roomNumber: '205', floorNumber: 2, roomTypeId: deluxeType._id, status: 'CLEANING' },
      { roomNumber: '301', floorNumber: 3, roomTypeId: suiteType._id, status: 'AVAILABLE' },
      { roomNumber: '302', floorNumber: 3, roomTypeId: suiteType._id, status: 'AVAILABLE' },
      { roomNumber: '303', floorNumber: 3, roomTypeId: suiteType._id, status: 'OCCUPIED' },
    ];

    for (const r of desiredRooms) {
      const existing = await Room.findOne({ hotelId, roomNumber: r.roomNumber });
      if (existing) {
        await Room.updateOne({ _id: existing._id }, { $set: { status: r.status, roomTypeId: r.roomTypeId } });
      } else {
        const hash = crypto.createHash('sha256').update(`${hotelId}_${r.roomNumber}_${Date.now()}`).digest('hex');
        await Room.create({
          hotelId,
          roomNumber: r.roomNumber,
          roomTypeId: r.roomTypeId,
          floorNumber: r.floorNumber,
          status: r.status,
          permanentQrCodeHash: hash,
        });
        console.log(`Created Room ${r.roomNumber} (${r.status}) for ${tenant.name}`);
      }
    }

    const availableCount = await Room.countDocuments({ hotelId, status: 'AVAILABLE' });
    console.log(`✅ Hotel ${tenant.name} now has ${availableCount} AVAILABLE rooms!`);
  }

  await mongoose.disconnect();
  console.log('🎉 Room seeding complete for all hotels!');
}

seedHotelsRooms().catch(console.error);
