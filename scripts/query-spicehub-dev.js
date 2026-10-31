const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/spicehub_dev');
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  console.log('COLLECTIONS:', collections.map(c => c.name));

  const hotels = await db.collection('tenants').find({}).toArray();
  console.log('ALL HOTELS:', hotels.map(h => ({ _id: h._id, name: h.name, code: h.code })));

  const mahesh = hotels.find(h => h.name && h.name.includes('Mahesh'));
  if (mahesh) {
    const tables = await db.collection('diningtables').find({ hotelId: mahesh._id }).toArray();
    console.log('TABLES:', tables.map(t => ({
      _id: t._id,
      tableNumber: t.tableNumber,
      capacity: t.capacity,
      status: t.status,
      permanentQrCodeHash: t.permanentQrCodeHash,
      qrPayload: t.qrPayload
    })));

    const dishes = await db.collection('menuitems').find({ hotelId: mahesh._id }).toArray();
    console.log('DISHES:', dishes.map(d => ({
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
