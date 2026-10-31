const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/hotel_erp');
  const db = mongoose.connection.db;

  const hotel = await db.collection('tenants').findOne({ name: 'Mahesh Palace' });
  console.log('HOTEL:', hotel ? { _id: hotel._id, name: hotel.name, code: hotel.code } : null);

  if (hotel) {
    const tables = await db.collection('diningtables').find({ hotelId: hotel._id }).toArray();
    console.log('TABLES IN DB:', tables.map(t => ({
      _id: t._id,
      tableNumber: t.tableNumber,
      capacity: t.capacity,
      status: t.status,
      permanentQrCodeHash: t.permanentQrCodeHash,
      qrPayload: t.qrPayload
    })));

    const dishes = await db.collection('menuitems').find({ hotelId: hotel._id }).toArray();
    console.log('DISHES IN DB:', dishes.map(d => ({
      _id: d._id,
      name: d.name,
      price: d.price,
      category: d.category,
      isAvailable: d.isAvailable
    })));
  }

  await mongoose.disconnect();
}

main().catch(console.error);
