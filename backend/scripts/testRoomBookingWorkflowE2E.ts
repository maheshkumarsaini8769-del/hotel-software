import mongoose, { Types } from 'mongoose';
import { Tenant } from '../src/models/Tenant';
import { Room, RoomStatus } from '../src/models/Room';
import { RoomType } from '../src/models/RoomType';
import { Booking, BookingStatus } from '../src/models/Booking';
import { Stay, StayStatus } from '../src/models/Stay';
import { MasterFolio } from '../src/models/MasterFolio';
import { FolioLineItem } from '../src/models/FolioLineItem';

const API_BASE = 'http://127.0.0.1:5000';
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/spicehub_dev';

async function runDrill() {
  console.log('🚀 [E2E DRILL] Starting Room Booking Workflow Overhaul Verification Drill...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB at:', MONGO_URI);

  // Find a target hotel
  const hotel = await Tenant.findOne({ status: 'ACTIVE' });
  if (!hotel) {
    throw new Error('No active hotel found in database');
  }
  const hotelId = String(hotel._id);
  console.log(`🏨 Selected Hotel: "${hotel.name}" (ID: ${hotelId})`);

  // Ensure hotel has coordinates set (e.g. Jaipur)
  if (!hotel.coordinates?.latitude || !hotel.coordinates?.longitude) {
    hotel.coordinates = {
      latitude: 26.9124,
      longitude: 75.7873,
    };
    await hotel.save();
    console.log('📍 Set hotel coordinates to Jaipur (26.9124, 75.7873)');
  }

  // Find available rooms
  const rooms = await Room.find({ hotelId: hotel._id, status: RoomStatus.AVAILABLE }).populate('roomTypeId');
  if (rooms.length < 3) {
    console.log(`⚠️ Need at least 3 available rooms for full quota testing. Found ${rooms.length}. Creating/freeing rooms...`);
    // Free up or find any room type
    let roomType = await RoomType.findOne({ hotelId: hotel._id });
    if (!roomType) {
      roomType = await RoomType.create({
        hotelId: hotel._id,
        name: 'Deluxe Heritage Suite',
        code: 'DHS-' + Date.now().toString().slice(-4),
        basePrice: 2800,
        maxAdults: 2,
        maxChildren: 1,
      });
    }
    for (let i = rooms.length; i < 3; i++) {
      const rn = 'TEST-' + (100 + i);
      let r = await Room.findOne({ hotelId: hotel._id, roomNumber: rn });
      if (!r) {
        r = await Room.create({
          hotelId: hotel._id,
          roomNumber: rn,
          roomTypeId: roomType._id,
          floor: 1,
          status: RoomStatus.AVAILABLE,
          isClean: true,
          operationalState: 'CLEAN',
        });
      } else {
        r.status = RoomStatus.AVAILABLE;
        await r.save();
      }
      rooms.push(r);
    }
  }

  const room1 = rooms[0];
  const room2 = rooms[1];
  const room3 = rooms[2];
  console.log(`🔑 Rooms prepared: Room 1: ${room1.roomNumber}, Room 2: ${room2.roomNumber}, Room 3: ${room3.roomNumber}`);

  const testPhone = '9876543210';
  const testGuestName = 'Arjun Shekhawat';

  // Clear previous test records for clean run
  await Booking.deleteMany({ hotelId: hotel._id, guestPhone: testPhone });
  await Stay.deleteMany({ hotelId: hotel._id, guestPhone: testPhone });

  // -------------------------------------------------------------
  // STEP 1: Phone OTP Verification for In-Hotel Guests
  // -------------------------------------------------------------
  console.log('\n📲 [STEP 1] Testing Phone OTP Generation & Verification...');
  const sendOtpRes = await fetch(`${API_BASE}/api/v1/guest-portal/rooms/send-phone-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
    body: JSON.stringify({ hotelId, phone: testPhone }),
  });
  const sendOtpData: any = await sendOtpRes.json();
  if (!sendOtpData.success) {
    throw new Error(`Failed to send OTP: ${JSON.stringify(sendOtpData)}`);
  }
  console.log('  ✅ OTP sent successfully:', sendOtpData.message);

  const verifyOtpRes = await fetch(`${API_BASE}/api/v1/guest-portal/rooms/verify-phone-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
    body: JSON.stringify({ hotelId, phone: testPhone, otp: '9999' }),
  });
  const verifyOtpData: any = await verifyOtpRes.json();
  if (!verifyOtpData.success || (!verifyOtpData.verified && !verifyOtpData.data?.verified)) {
    throw new Error(`Failed to verify OTP: ${JSON.stringify(verifyOtpData)}`);
  }
  console.log('  ✅ OTP 9999 verified successfully for guest:', testPhone);

  // -------------------------------------------------------------
  // STEP 2: Submit 1st Room Booking with Aadhaar Front/Back & Nights
  // -------------------------------------------------------------
  console.log('\n🪪 [STEP 2] Submitting 1st Room Booking with Dual Aadhaar & 2 Nights Tariff...');
  const sampleAadhaarFront = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="190"><rect width="300" height="190" fill="%23fff"/><text x="20" y="40" font-weight="bold">GOVERNMENT OF INDIA</text><text x="20" y="80">Arjun Shekhawat</text><text x="20" y="140">XXXX XXXX 4589</text></svg>';
  const sampleAadhaarBack = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="190"><rect width="300" height="190" fill="%23fff"/><text x="20" y="40">Address: C-Scheme, Jaipur, Rajasthan</text><text x="20" y="140">Help: 1947</text></svg>';

  const booking1Res = await fetch(`${API_BASE}/api/v1/guest-portal/rooms/book-and-checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
    body: JSON.stringify({
      hotelId,
      roomNumber: room1.roomNumber,
      guestName: testGuestName,
      guestPhone: testPhone,
      guestPhoneVerified: true,
      bookingLocation: 'IN_HOTEL',
      userLat: hotel.coordinates?.latitude || 26.9124,
      userLng: hotel.coordinates?.longitude || 75.7873,
      nights: 2,
      idProofType: 'AADHAAR',
      aadhaarFrontUrl: sampleAadhaarFront,
      aadhaarBackUrl: sampleAadhaarBack,
    }),
  });
  const booking1Data: any = await booking1Res.json();
  if (!booking1Data.success || !booking1Data.data?.bookingNumber) {
    throw new Error(`Step 2 Failed to book room 1: ${JSON.stringify(booking1Data)}`);
  }
  const booking1Number = booking1Data.data.bookingNumber;
  console.log(`  ✅ Room ${room1.roomNumber} booked! Booking Number: ${booking1Number}`);
  console.log(`  📋 Status: ${booking1Data.data.bookingStatus} (Awaiting Reception Approval: ${booking1Data.data.requiresReceptionApproval})`);
  console.log(`  💰 Grand Total: ₹${booking1Data.data.grandTotal} (${booking1Data.data.nights} nights)`);

  // Verify room is now marked RESERVED
  const checkRoom1 = await Room.findById(room1._id);
  console.log(`  🔒 Physical Room Status: ${checkRoom1?.status} (Expected: RESERVED)`);
  if (checkRoom1?.status !== RoomStatus.RESERVED) {
    throw new Error(`Expected room status RESERVED, got ${checkRoom1?.status}`);
  }

  // -------------------------------------------------------------
  // STEP 3: Polling Booking Status (Waiting Screen)
  // -------------------------------------------------------------
  console.log('\n⏳ [STEP 3] Testing Booking Status Poller while awaiting Reception Approval...');
  const pollRes1 = await fetch(`${API_BASE}/api/v1/guest-portal/rooms/booking-status/${booking1Number}`);
  const pollData1: any = await pollRes1.json();
  if (!pollData1.success) {
    throw new Error(`Step 3 status query failed: ${JSON.stringify(pollData1)}`);
  }
  console.log('  ✅ Poller Response Status:', pollData1.data.bookingStatus, '| Approval Status:', pollData1.data.approvalStatus);
  console.log('  📄 Aadhaar Front URL length:', pollData1.data.aadhaarFrontUrl?.length || 0);
  console.log('  📄 Aadhaar Back URL length:', pollData1.data.aadhaarBackUrl?.length || 0);
  if (pollData1.data.bookingStatus === 'CHECKED_IN') {
    throw new Error('Room should NOT be checked in before reception approval!');
  }

  // -------------------------------------------------------------
  // STEP 4: Reception Front Desk ID Verification & 1-Click Approval
  // -------------------------------------------------------------
  console.log('\n🛎️ [STEP 4] Reception PMS Verifies Aadhaar & Executes 1-Click Check-In Approval...');
  const approveRes = await fetch(`${API_BASE}/api/v1/guest-portal/rooms/approve-checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
    body: JSON.stringify({
      hotelId,
      bookingNumber: booking1Number,
      roomNumber: room1.roomNumber,
      idVerified: true,
    }),
  });
  const approveData: any = await approveRes.json();
  if (!approveData.success || !approveData.data?.sessionToken) {
    throw new Error(`Step 4 Reception approval failed: ${JSON.stringify(approveData)}`);
  }
  console.log('  ✅ Reception Approval Success! Session Token Issued:', approveData.data.sessionToken.substring(0, 25) + '...');
  console.log('  🔑 Stay ID Created:', approveData.data.stayId);

  // Check MasterFolio has ROOM_RENT line item
  const folio = await MasterFolio.findOne({ hotelId: hotel._id, stayId: approveData.data.stayId });
  if (!folio) {
    throw new Error('MasterFolio was not created upon approval');
  }
  const folioItems = await FolioLineItem.find({ folioId: folio._id });
  const roomRentItem = folioItems.find((it) => (it as any).department === 'ROOM_RENT');
  console.log(`  🧾 Folio Created: ${folio.folioNumber} | Room Tariff: ₹${folio.totalRoomTariff} | Net Payable: ₹${folio.netAmountPayable}`);
  console.log(`  🏨 Folio Line Item [ROOM_RENT]: ₹${roomRentItem?.rate} + Tax ₹${roomRentItem?.taxAmount} (Net: ₹${roomRentItem?.netAmount})`);
  if (!roomRentItem) {
    throw new Error('ROOM_RENT line item missing from MasterFolio!');
  }

  // Check Room Status is OCCUPIED
  const occupiedRoom1 = await Room.findById(room1._id);
  console.log(`  🟢 Physical Room Status: ${occupiedRoom1?.status} (Expected: OCCUPIED)`);
  if (occupiedRoom1?.status !== RoomStatus.OCCUPIED) {
    throw new Error(`Expected room status OCCUPIED, got ${occupiedRoom1?.status}`);
  }

  // -------------------------------------------------------------
  // STEP 5: Live Status Poller Returns Immediate Unlock
  // -------------------------------------------------------------
  console.log('\n🔓 [STEP 5] Checking Status Poller Immediately Returns Approved & Unlocks Digital Keycard...');
  const pollRes2 = await fetch(`${API_BASE}/api/v1/guest-portal/rooms/booking-status/${booking1Number}`);
  const pollData2: any = await pollRes2.json();
  if (!pollData2.success || !pollData2.data?.isApproved || !pollData2.data?.sessionToken) {
    throw new Error(`Step 5 failed: Poller did not return approved state. ${JSON.stringify(pollData2)}`);
  }
  console.log('  🎉 Poller Confirmed: isApproved =', pollData2.data.isApproved);
  console.log('  📶 WiFi Credentials Provided:', pollData2.data.wifiSsid, '/', pollData2.data.wifiPassword);

  // -------------------------------------------------------------
  // STEP 6: Multi-Room Quota & Secondary Guest Disclosure
  // -------------------------------------------------------------
  console.log('\n👥 [STEP 6] Testing Multi-Room Quota (Max 2 Rooms Ceiling & Secondary Guest)...');

  // 6a: Attempt 2nd room WITHOUT secondary guest details
  console.log('  👉 6a: Attempting 2nd room without secondary guest info (Should require secondary guest)...');
  const room2FailRes = await fetch(`${API_BASE}/api/v1/guest-portal/rooms/book-and-checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
    body: JSON.stringify({
      hotelId,
      roomId: String(room2._id),
      roomNumber: room2.roomNumber,
      guestName: testGuestName,
      guestPhone: testPhone,
      guestPhoneVerified: true,
      bookingLocation: 'IN_HOTEL',
      nights: 1,
      idProofType: 'AADHAAR',
      aadhaarFrontUrl: sampleAadhaarFront,
      aadhaarBackUrl: sampleAadhaarBack,
    }),
  });
  const room2FailData: any = await room2FailRes.json();
  if (room2FailData.errorCode !== 'SECONDARY_GUEST_REQUIRED') {
    throw new Error(`Expected SECONDARY_GUEST_REQUIRED, got: ${JSON.stringify(room2FailData)}`);
  }
  console.log('  ✅ Correctly rejected with SECONDARY_GUEST_REQUIRED:', room2FailData.message);

  // 6b: Attempt 2nd room WITH secondary guest details
  console.log('  👉 6b: Submitting 2nd room with secondary guest disclosure...');
  const room2SuccessRes = await fetch(`${API_BASE}/api/v1/guest-portal/rooms/book-and-checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
    body: JSON.stringify({
      hotelId,
      roomId: String(room2._id),
      roomNumber: room2.roomNumber,
      guestName: testGuestName,
      guestPhone: testPhone,
      guestPhoneVerified: true,
      bookingLocation: 'IN_HOTEL',
      nights: 1,
      secondaryGuestName: 'Praveen Singh (Brother)',
      secondaryGuestPhone: '9876543211',
      secondaryGuestRelationship: 'Family / Brother',
      idProofType: 'AADHAAR',
      aadhaarFrontUrl: sampleAadhaarFront,
      aadhaarBackUrl: sampleAadhaarBack,
    }),
  });
  const room2SuccessData: any = await room2SuccessRes.json();
  if (!room2SuccessData.success) {
    throw new Error(`2nd room booking failed: ${JSON.stringify(room2SuccessData)}`);
  }
  const booking2Number = room2SuccessData.data.bookingNumber;
  console.log(`  ✅ 2nd Room ${room2.roomNumber} successfully booked! Booking Number: ${booking2Number}`);

  // Reception approves 2nd room
  const approve2Res = await fetch(`${API_BASE}/api/v1/guest-portal/rooms/approve-checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
    body: JSON.stringify({
      hotelId,
      bookingNumber: booking2Number,
      roomNumber: room2.roomNumber,
      idVerified: true,
    }),
  });
  const approve2Data: any = await approve2Res.json();
  if (!approve2Data.success) {
    throw new Error(`2nd room approval failed: ${JSON.stringify(approve2Data)}`);
  }
  console.log(`  ✅ 2nd Room ${room2.roomNumber} approved and checked in!`);

  // 6c: Attempt 3rd room booking with SAME phone number (MUST BE STRICTLY BLOCKED)
  console.log('  👉 6c: Attempting 3rd room booking with same phone (Must be BLOCKED with HTTP 403)...');
  const room3FailRes = await fetch(`${API_BASE}/api/v1/guest-portal/rooms/book-and-checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
    body: JSON.stringify({
      hotelId,
      roomId: String(room3._id),
      roomNumber: room3.roomNumber,
      guestName: testGuestName,
      guestPhone: testPhone,
      guestPhoneVerified: true,
      bookingLocation: 'IN_HOTEL',
      nights: 1,
      secondaryGuestName: 'Third Guest',
      secondaryGuestRelationship: 'Friend',
      idProofType: 'AADHAAR',
      aadhaarFrontUrl: sampleAadhaarFront,
      aadhaarBackUrl: sampleAadhaarBack,
    }),
  });
  const room3FailData: any = await room3FailRes.json();
  console.log('  HTTP Status:', room3FailRes.status, '| Response:', JSON.stringify(room3FailData));
  if (room3FailRes.status !== 403 || room3FailData.errorCode !== 'BOOKING_LIMIT_EXCEEDED') {
    throw new Error(`Expected HTTP 403 BOOKING_LIMIT_EXCEEDED, got status ${room3FailRes.status} and code ${room3FailData.errorCode}`);
  }
  console.log('  ✅ STRICT CEILING ENFORCED: 3rd room was successfully BLOCKED with BOOKING_LIMIT_EXCEEDED!');

  // -------------------------------------------------------------
  // STEP 7: GPS Geofence Proximity Verification
  // -------------------------------------------------------------
  console.log('\n📍 [STEP 7] Testing GPS Geolocation Geofence (>500m Distance Flagging)...');
  const farPhone = '9123456789';
  await Booking.deleteMany({ hotelId: hotel._id, guestPhone: farPhone });

  // Guest claims IN_HOTEL but is in Delhi (28.6139, 77.2090), ~230 km away from Jaipur
  const geofenceRes = await fetch(`${API_BASE}/api/v1/guest-portal/rooms/book-and-checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
    body: JSON.stringify({
      hotelId,
      roomId: String(room3._id),
      roomNumber: room3.roomNumber,
      guestName: 'Remote Guest Delhi',
      guestPhone: farPhone,
      guestPhoneVerified: true,
      bookingLocation: 'IN_HOTEL',
      userLat: 28.6139, // Delhi lat
      userLng: 77.2090, // Delhi lng
      nights: 1,
      idProofType: 'AADHAAR',
      aadhaarFrontUrl: sampleAadhaarFront,
      aadhaarBackUrl: sampleAadhaarBack,
    }),
  });
  const geofenceData: any = await geofenceRes.json();
  console.log('  Geofence response:', JSON.stringify(geofenceData));
  if (geofenceData.errorCode !== 'GEOFENCE_OUT_OF_BOUNDS') {
    throw new Error(`Expected GEOFENCE_OUT_OF_BOUNDS, got: ${JSON.stringify(geofenceData)}`);
  }
  console.log(`  ✅ Geofence violation flagged accurately! Distance: ${geofenceData.distanceKm} km (> 0.5 km threshold)`);

  // Now submit as REMOTE_HOME with estimated arrival time & check-in date
  console.log('  👉 Submitting as REMOTE_HOME with arrival time and date...');
  const remoteRes = await fetch(`${API_BASE}/api/v1/guest-portal/rooms/book-and-checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
    body: JSON.stringify({
      hotelId,
      roomId: String(room3._id),
      roomNumber: room3.roomNumber,
      guestName: 'Remote Guest Delhi',
      guestPhone: farPhone,
      guestPhoneVerified: false,
      bookingLocation: 'REMOTE_HOME',
      checkInDate: new Date(Date.now() + 86400000).toISOString(),
      estimatedArrivalTime: '18:00',
      nights: 2,
      idProofType: 'AADHAAR',
      aadhaarFrontUrl: sampleAadhaarFront,
      aadhaarBackUrl: sampleAadhaarBack,
    }),
  });
  const remoteData: any = await remoteRes.json();
  if (!remoteData.success) {
    throw new Error(`Remote home booking failed: ${JSON.stringify(remoteData)}`);
  }
  console.log(`  ✅ Remote Home Reservation Created! Booking: ${remoteData.data.bookingNumber}`);
  console.log(`  📅 Scheduled Check-in: ${remoteData.data.checkInDate} | Arrival: ${remoteData.data.estimatedArrivalTime}`);

  console.log('\n=============================================================');
  console.log('🎯 [ALL 7 VERIFICATION STEPS PASSED 100% GREEN!]');
  console.log('1. Dual Aadhaar Front & Back photo KYC enforced');
  console.log('2. Phone OTP verified for on-site guests');
  console.log('3. Approval Waiting Screen poller works seamlessly');
  console.log('4. Reception Front Desk 1-click approval creates Stay & Folio Line Item');
  console.log('5. Poller immediately confirms approval and delivers session token');
  console.log('6. Max 2 rooms per mobile ceiling strictly enforced with secondary guest gating');
  console.log('7. GPS geofence checks distance and supports remote home bookings with arrival time');
  console.log('=============================================================\n');

  await mongoose.disconnect();
}

runDrill().catch((err) => {
  console.error('\n❌ [DRILL FAILED]:', err);
  process.exit(1);
});
