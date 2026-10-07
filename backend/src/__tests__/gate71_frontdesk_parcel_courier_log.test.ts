import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import {
  GuestParcelLog,
  ParcelDirection,
  CourierPartner,
  ParcelPackageType,
  ParcelStatus,
} from '../models/GuestParcelLog';

describe('Gate #71: Front Desk Parcel & Courier Inward/Outward Log, Guest Signature & Digital Delivery Acknowledgment Loop', () => {
  let hotelIdA: Types.ObjectId;
  let hotelIdB: Types.ObjectId;
  let conciergeStaffAId: Types.ObjectId;
  let tokenA: string = '';
  let tokenB: string = '';
  let jwtSecret: string;

  beforeAll(async () => {
    jwtSecret = process.env.JWT_SECRET || 'test_jwt_secret_key_12345';
    process.env.JWT_SECRET = jwtSecret;

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev');
    }

    hotelIdA = new Types.ObjectId();
    hotelIdB = new Types.ObjectId();
    conciergeStaffAId = new Types.ObjectId();

    await Tenant.create([
      {
        _id: hotelIdA,
        name: 'Grand Palace Hotel & Residences',
        slug: `palace-parcels-${Date.now()}`,
        status: 'ACTIVE',
        contactPhone: '+91 9999900011',
        contactEmail: 'concierge-a@palace.com',
      },
      {
        _id: hotelIdB,
        name: 'The Oberoi Sky Resort & Spa',
        slug: `oberoi-parcels-${Date.now()}`,
        status: 'ACTIVE',
        contactPhone: '+91 9999900012',
        contactEmail: 'concierge-b@oberoi.com',
      },
    ]);

    tokenA = jwt.sign(
      {
        userId: conciergeStaffAId.toString(),
        hotelId: hotelIdA.toString(),
        role: 'HOTEL_ADMIN',
        name: 'Concierge Anita Sharma',
        email: 'concierge@palace.com',
      },
      jwtSecret,
      { expiresIn: '1h' }
    );

    tokenB = jwt.sign(
      {
        userId: new Types.ObjectId().toString(),
        hotelId: hotelIdB.toString(),
        role: 'HOTEL_ADMIN',
        name: 'Front Desk Rajesh (Tenant B)',
        email: 'rajesh@oberoi.com',
      },
      jwtSecret,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await GuestParcelLog.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await Tenant.deleteMany({ _id: { $in: [hotelIdA, hotelIdB] } });
  });

  let createdParcelTag: string = '';
  let parcelOtpPin: string = '';

  // 1. Log Inward Parcel
  it('1. POST /api/v1/pms/frontdesk/parcels/inward - Logs Amazon Box for Room 204 with auto-generated tag & OTP PIN', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/parcels/inward')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        courierPartner: CourierPartner.AMAZON,
        trackingAwb: 'AMZ-IN-99214488',
        senderInfo: {
          name: 'Amazon Prime Fulfilment Center',
          organization: 'Amazon India',
          contactPhone: '+91 1800 3000 9009',
        },
        recipientInfo: {
          guestName: 'Karan Mehra',
          roomNumber: '204',
          guestPhone: '+91 98765 11223',
          guestEmail: 'karan.m@gmail.com',
        },
        packageType: ParcelPackageType.BOX,
        pieceCount: 1,
        isHighValue: false,
        storageLocation: 'PARCEL-BAY-03',
        receivedByStaffName: 'Concierge Anita Sharma',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.parcel).toBeDefined();
    expect(res.body.parcel.parcelTag).toMatch(/^PCL-\d{4}-\d{4}$/);
    expect(res.body.parcel.verificationPin).toHaveLength(4);
    expect(res.body.parcel.status).toBe(ParcelStatus.RECEIVED_AT_DESK);
    expect(res.body.parcel.recipientInfo.guestName).toBe('Karan Mehra');
    expect(res.body.parcel.auditTrail).toHaveLength(1);

    createdParcelTag = res.body.parcel.parcelTag;
    parcelOtpPin = res.body.parcel.verificationPin;
  });

  // 2. Reject Inward Parcel with Missing Required Fields
  it('2. POST /api/v1/pms/frontdesk/parcels/inward - Strictly rejects payload missing AWB or recipient info (400)', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/parcels/inward')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        courierPartner: CourierPartner.FEDEX,
        // missing trackingAwb
        recipientInfo: { guestName: 'Incomplete' },
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // 3. Notify Guest of Arrival
  it('3. POST /api/v1/pms/frontdesk/parcels/:parcelTag/notify - Dispatches SMS/Portal arrival notice -> GUEST_NOTIFIED', async () => {
    const res = await request(app)
      .post(`/api/v1/pms/frontdesk/parcels/${createdParcelTag}/notify`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ staffName: 'Concierge Anita Sharma' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.parcel.status).toBe(ParcelStatus.GUEST_NOTIFIED);
    expect(res.body.parcel.auditTrail.length).toBeGreaterThanOrEqual(2);
  });

  // 4. Dispatch Bellboy for Room Delivery
  it('4. POST /api/v1/pms/frontdesk/parcels/:parcelTag/dispatch-room - Dispatches porter to Room 204 -> OUT_FOR_ROOM_DELIVERY', async () => {
    const res = await request(app)
      .post(`/api/v1/pms/frontdesk/parcels/${createdParcelTag}/dispatch-room`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        porterName: 'Porter Rajesh Kumar',
        notes: 'Deliver before 5:00 PM',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.parcel.status).toBe(ParcelStatus.OUT_FOR_ROOM_DELIVERY);
    expect(res.body.parcel.dispatchInfo.porterName).toBe('Porter Rajesh Kumar');
    expect(res.body.parcel.dispatchInfo.targetLocation).toBe('Room 204');
  });

  // 5. Reject Handover if OTP PIN is incorrect
  it('5. POST /api/v1/pms/frontdesk/parcels/:parcelTag/complete-delivery - Rejects delivery when wrong OTP PIN is provided (400 INVALID_VERIFICATION_PIN)', async () => {
    const res = await request(app)
      .post(`/api/v1/pms/frontdesk/parcels/${createdParcelTag}/complete-delivery`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        verificationPin: '0000', // incorrect PIN
        recipientAcknowledgedBy: 'Karan Mehra',
        deliveredByStaffName: 'Porter Rajesh Kumar',
        verificationMethod: 'OTP_PIN',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('INVALID_VERIFICATION_PIN');
  });

  // 6. Complete Handover with Valid PIN and Digital Signature
  it('6. POST /api/v1/pms/frontdesk/parcels/:parcelTag/complete-delivery - Completes handover with valid OTP PIN & signature -> DELIVERED_TO_GUEST', async () => {
    const res = await request(app)
      .post(`/api/v1/pms/frontdesk/parcels/${createdParcelTag}/complete-delivery`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        verificationPin: parcelOtpPin,
        signatureDataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0xMCwxMCBMMjAsMjAiLz48L3N2Zz4=',
        recipientAcknowledgedBy: 'Karan Mehra',
        deliveredByStaffName: 'Porter Rajesh Kumar',
        handoverMode: 'ROOM_DELIVERY',
        verificationMethod: 'OTP_PIN',
        notes: 'Handed over directly to guest inside Room 204',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.parcel.status).toBe(ParcelStatus.DELIVERED_TO_GUEST);
    expect(res.body.parcel.deliveryInfo).toBeDefined();
    expect(res.body.parcel.deliveryInfo.handoverMode).toBe('ROOM_DELIVERY');
    expect(res.body.parcel.deliveryInfo.recipientAcknowledgedBy).toBe('Karan Mehra');
    expect(res.body.parcel.deliveryInfo.signatureDataUrl).toContain('data:image');
  });

  // 7. Counter Handover for Medicine / Perishable Package
  it('7. POST Inward Medicine Parcel and Complete Counter Handover with ID_VERIFIED', async () => {
    // 7a. Log urgent medicine parcel
    const inwardRes = await request(app)
      .post('/api/v1/pms/frontdesk/parcels/inward')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        courierPartner: CourierPartner.BLUE_DART,
        trackingAwb: 'BLUEDART-MED-77112',
        senderInfo: {
          name: 'MedPlus Specialty Pharmacy',
          contactPhone: '+91 40 6700 6700',
        },
        recipientInfo: {
          guestName: 'Rohit Verma',
          roomNumber: '410',
          guestPhone: '+91 98220 33445',
        },
        packageType: ParcelPackageType.MEDICINE_PERISHABLE,
        isHighValue: true,
        storageLocation: 'CONCIERGE-COOLER-02',
        receivedByStaffName: 'Front Desk Rajesh Kumar',
      });

    expect(inwardRes.status).toBe(201);
    const medTag = inwardRes.body.parcel.parcelTag;

    // 7b. Deliver directly at Front Desk Counter
    const deliverRes = await request(app)
      .post(`/api/v1/pms/frontdesk/parcels/${medTag}/complete-delivery`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        verificationMethod: 'ID_VERIFIED',
        recipientAcknowledgedBy: 'Rohit Verma (Self)',
        deliveredByStaffName: 'Front Desk Rajesh Kumar',
        handoverMode: 'FRONT_DESK_COUNTER',
        signatureDataUrl: 'SIGNATURE_VERIFIED_ON_COUNTER',
        notes: 'Aadhaar ID matched and temperature checked',
      });

    expect(deliverRes.status).toBe(200);
    expect(deliverRes.body.parcel.status).toBe(ParcelStatus.DELIVERED_TO_GUEST);
    expect(deliverRes.body.parcel.deliveryInfo.handoverMode).toBe('FRONT_DESK_COUNTER');
  });

  // 8. Book Outward Courier for Guest with Folio Billing
  it('8. POST /api/v1/pms/frontdesk/parcels/outward - Books outward express courier for guest with ₹1,800 Folio posting', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/parcels/outward')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        guestName: 'Pooja Hegde',
        roomNumber: '204',
        guestPhone: '+91 97777 88899',
        destinationAddress: 'Nariman Point Express Towers, 14th Floor, Mumbai 400021',
        recipientName: 'Reliance Capital Legal Cell',
        courierPartner: CourierPartner.DHL,
        trackingAwb: 'DHL-DOM-332901',
        packageType: ParcelPackageType.DOCUMENT,
        pieceCount: 1,
        isHighValue: true,
        estimatedCharge: 1800,
        postToFolio: true,
        staffName: 'Concierge Anita Sharma',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.parcel.direction).toBe(ParcelDirection.OUTWARD);
    expect(res.body.parcel.parcelTag).toMatch(/^OUT-\d{4}-\d{4}$/);
    expect(res.body.parcel.outwardDetails.estimatedCharge).toBe(1800);
    expect(res.body.parcel.outwardDetails.folioPosted).toBe(true);
  });

  // 9. Query Front Desk Parcel Workspace & Verify KPI Metrics
  it('9. GET /api/v1/pms/frontdesk/parcels - Retrieves active parcel directory and computes accurate front desk KPIs', async () => {
    const res = await request(app)
      .get('/api/v1/pms/frontdesk/parcels')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.parcels)).toBe(true);
    expect(res.body.parcels.length).toBeGreaterThanOrEqual(3);
    expect(res.body.metrics).toBeDefined();
    expect(typeof res.body.metrics.todayDelivered).toBe('number');
    expect(typeof res.body.metrics.totalOutward).toBe('number');
    expect(res.body.metrics.totalOutward).toBeGreaterThanOrEqual(1);
  });

  // 10. Strict Multi-Tenant Boundary Isolation
  it('10. Strict Multi-Tenant Isolation - Tenant B cannot view, dispatch or complete Tenant A parcels', async () => {
    // 10a. Tenant B attempting to access Tenant A parcel list
    const getRes = await request(app)
      .get('/api/v1/pms/frontdesk/parcels')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(getRes.status).toBe(200);
    const tenantBParcelTags = getRes.body.parcels.map((p: any) => p.parcelTag);
    expect(tenantBParcelTags).not.toContain(createdParcelTag);

    // 10b. Tenant B attempting to complete delivery on Tenant A parcel
    const hackRes = await request(app)
      .post(`/api/v1/pms/frontdesk/parcels/${createdParcelTag}/complete-delivery`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        verificationPin: parcelOtpPin,
        recipientAcknowledgedBy: 'Intruder',
      });

    expect(hackRes.status).toBe(404);
    expect(hackRes.body.error).toBe('Parcel not found');
  });
});
