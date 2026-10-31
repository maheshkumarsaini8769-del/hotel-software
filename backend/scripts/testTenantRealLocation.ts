import mongoose from 'mongoose';
import { Tenant } from '../src/models/Tenant';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/spicehub_dev';

async function runTest() {
  console.log('🌍 [TEST] Starting Tenant Real Location & Google Maps Integration Verification...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB at:', MONGO_URI);

  let hotel = await Tenant.findOne({ status: 'ACTIVE' });
  if (!hotel) {
    hotel = await Tenant.findOne();
  }
  if (!hotel) {
    hotel = new Tenant({
      name: 'SpiceHub Test Heritage Hotel',
      slug: 'test-heritage-hotel',
      contactEmail: 'admin@test-heritage.com',
      contactPhone: '9876543210',
      status: 'ACTIVE',
    });
    await hotel.save();
    console.log('🏨 Created new test hotel');
  }

  console.log(`🏨 Selected Hotel: "${hotel.name}" (ID: ${hotel._id})`);

  // Step 1: Update to Jaipur Real Location
  const jaipurLat = 26.9124;
  const jaipurLng = 75.7873;
  const jaipurStreet = 'Hawa Mahal Road, Badi Choupad';
  const jaipurCity = 'Jaipur';
  const jaipurState = 'Rajasthan';
  const jaipurPincode = '302002';
  const jaipurMapUrl = `https://www.google.com/maps/search/?api=1&query=${jaipurLat},${jaipurLng}`;
  const jaipurNotes = 'Heritage Zone, near City Palace';

  hotel.coordinates = { latitude: jaipurLat, longitude: jaipurLng };
  (hotel as any).latitude = jaipurLat;
  (hotel as any).longitude = jaipurLng;
  hotel.address = {
    street: jaipurStreet,
    city: jaipurCity,
    state: jaipurState,
    country: 'India',
    pincode: jaipurPincode,
  };
  hotel.googleMapUrl = jaipurMapUrl;
  hotel.locationNotes = jaipurNotes;
  await hotel.save();

  // Re-fetch from DB to verify persistence
  const fetchedHotel = await Tenant.findById(hotel._id);
  if (!fetchedHotel) throw new Error('Tenant not found');

  if (fetchedHotel.coordinates?.latitude !== jaipurLat || fetchedHotel.coordinates?.longitude !== jaipurLng) {
    throw new Error(`Coordinates mismatch: got ${fetchedHotel.coordinates?.latitude}, ${fetchedHotel.coordinates?.longitude}`);
  }
  if (fetchedHotel.address?.street !== jaipurStreet || fetchedHotel.address?.city !== jaipurCity) {
    throw new Error(`Address mismatch: got ${fetchedHotel.address?.street}, ${fetchedHotel.address?.city}`);
  }
  if (fetchedHotel.googleMapUrl !== jaipurMapUrl) {
    throw new Error(`Google Maps URL mismatch: got ${fetchedHotel.googleMapUrl}`);
  }
  console.log('✅ Stage 1 PASSED: Jaipur real coordinates and Google Maps URL persisted accurately!');
  console.log(`   📍 Coords: ${fetchedHotel.coordinates.latitude}, ${fetchedHotel.coordinates.longitude}`);
  console.log(`   🏢 Address: ${fetchedHotel.address.street}, ${fetchedHotel.address.city}, ${fetchedHotel.address.state} - ${fetchedHotel.address.pincode}`);
  console.log(`   🌐 Google Maps: ${fetchedHotel.googleMapUrl}`);

  // Step 2: Update to Jodhpur (Mehrangarh Fort)
  const jodhpurLat = 26.2978;
  const jodhpurLng = 73.0185;
  const jodhpurStreet = 'Fort Road, Sodagaran Mohalla';
  const jodhpurCity = 'Jodhpur';
  const jodhpurState = 'Rajasthan';
  const jodhpurPincode = '342001';
  const jodhpurMapUrl = `https://www.google.com/maps/search/?api=1&query=${jodhpurLat},${jodhpurLng}`;

  fetchedHotel.coordinates = { latitude: jodhpurLat, longitude: jodhpurLng };
  (fetchedHotel as any).latitude = jodhpurLat;
  (fetchedHotel as any).longitude = jodhpurLng;
  fetchedHotel.address = {
    street: jodhpurStreet,
    city: jodhpurCity,
    state: jodhpurState,
    country: 'India',
    pincode: jodhpurPincode,
  };
  fetchedHotel.googleMapUrl = jodhpurMapUrl;
  await fetchedHotel.save();

  const refetched = await Tenant.findById(hotel._id);
  if (!refetched) throw new Error('Tenant not found');

  if (refetched.coordinates?.latitude !== jodhpurLat || refetched.coordinates?.longitude !== jodhpurLng) {
    throw new Error('Jodhpur coordinates update failed');
  }
  if (refetched.address?.street !== jodhpurStreet) {
    throw new Error('Jodhpur street update failed');
  }
  console.log('✅ Stage 2 PASSED: Jodhpur real location update verified!');
  console.log(`   📍 Coords: ${refetched.coordinates?.latitude}, ${refetched.coordinates?.longitude}`);
  console.log(`   🏢 Address: ${refetched.address?.street}, ${refetched.address?.city}`);
  console.log(`   🌐 Google Maps: ${refetched.googleMapUrl}`);

  await mongoose.disconnect();
  console.log('\n🎉 ALL REAL LOCATION TESTS PASSED (100%)!');
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
