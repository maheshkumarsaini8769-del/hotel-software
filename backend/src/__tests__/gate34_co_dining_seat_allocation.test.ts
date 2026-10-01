import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { DiningTable, TableStatus, SeatStatus } from '../models/DiningTable';
import { TableSession } from '../models/TableSession';

describe('--- SHIFT 34 / GATE 34: SMART TABLE AVAILABILITY & CO-DINING SEAT-LEVEL BOOKING ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let communityTableId: string;
  let party1SessionId: string;
  let party2SessionId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5114;
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        resolve();
      });
    });

    // 1. Setup Tenant A (Bustling Food Hall & Lounge)
    const tenantA = await Tenant.create({
      name: 'CyberCity Social Hub',
      slug: `social-hub-${Date.now()}`,
      contactEmail: `social_${Date.now()}@spicehub.in`,
      contactPhone: '9855500001',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    // 2. Setup Tenant B (Competitor Cafe)
    const tenantB = await Tenant.create({
      name: 'Metro Cafe & Lounge',
      slug: `metro-cafe-${Date.now()}`,
      contactEmail: `metro_${Date.now()}@spicehub.in`,
      contactPhone: '9855500002',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    // 3. Create 4-Seater Table for Tenant A
    const table = await DiningTable.create({
      hotelId: tenantA._id,
      tableNumber: 'COMM-01',
      section: 'COMMUNITY_LOUNGE',
      capacity: 4,
      currentStatus: TableStatus.AVAILABLE,
      isCommunityTable: false,
    });
    communityTableId = table._id.toString();
  });

  afterAll(async () => {
    await server.close();
    await mongoose.connection.close();
  });

  it('1. POST /api/v1/co-dining/table/:tableId/enable-sharing enables community table mode with 4 open seats', async () => {
    const res = await request(app)
      .post(`/api/v1/co-dining/table/${communityTableId}/enable-sharing`)
      .set('x-hotel-id', tenantAId)
      .send({
        allowCoDining: true,
        customSeatLabels: ['Seat 1 (Window)', 'Seat 2 (Window)', 'Seat 3 (Aisle)', 'Seat 4 (Aisle)'],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.table.isCommunityTable).toBe(true);
    expect(res.body.table.allowCoDining).toBe(true);
    expect(res.body.table.seats.length).toBe(4);
    expect(res.body.table.availableSeatsCount).toBe(4);
    expect(res.body.table.occupiedSeatsCount).toBe(0);
    expect(res.body.table.seats[0].seatLabel).toBe('Seat 1 (Window)');
    expect(res.body.table.seats[0].status).toBe(SeatStatus.AVAILABLE);
  });

  it('2. GET /api/v1/co-dining/tables retrieves all community tables with live seat availability', async () => {
    const res = await request(app)
      .get('/api/v1/co-dining/tables?communityOnly=true')
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(1);
    expect(res.body.tables[0].tableNumber).toBe('COMM-01');
    expect(res.body.tables[0].availableSeatsCount).toBe(4);
    expect(res.body.tables[0].hasOpenSeats).toBe(true);
  });

  it('3. POST /api/v1/co-dining/allocate-seat seats a pair of diners on Seats 1 & 2 -> PARTIALLY_OCCUPIED', async () => {
    const res = await request(app)
      .post('/api/v1/co-dining/allocate-seat')
      .set('x-hotel-id', tenantAId)
      .send({
        tableId: communityTableId,
        seatNumbers: [1, 2],
        guestName: 'Rohan & Neha',
        guestPhone: '9811122233',
        guestCount: 2,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.tableStatus).toBe(TableStatus.PARTIALLY_OCCUPIED);
    expect(res.body.availableSeatsRemaining).toBe(2);
    expect(res.body.occupiedSeatsTotal).toBe(2);
    expect(res.body.sessionId).toBeDefined();

    party1SessionId = res.body.sessionId;

    // Verify TableSession was created with seat numbers
    const session = await TableSession.findById(party1SessionId);
    expect(session).not.toBeNull();
    expect(session!.customerName).toBe('Rohan & Neha');
    expect(session!.seatNumbers).toEqual([1, 2]);
    expect(session!.isCoDining).toBe(true);
  });

  it('4. POST /api/v1/co-dining/allocate-seat rejects duplicate seat booking for occupied Seat 2', async () => {
    const res = await request(app)
      .post('/api/v1/co-dining/allocate-seat')
      .set('x-hotel-id', tenantAId)
      .send({
        tableId: communityTableId,
        seatNumbers: [2],
        guestName: 'Intruder Diner',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Seat 2 is already OCCUPIED');
  });

  it('5. POST /api/v1/co-dining/allocate-seat seats a solo diner on Seat 3 leaving 1 open seat on 4-seater', async () => {
    const res = await request(app)
      .post('/api/v1/co-dining/allocate-seat')
      .set('x-hotel-id', tenantAId)
      .send({
        tableId: communityTableId,
        seatNumbers: [3],
        guestName: 'Amit Verma (Solo Diner)',
        guestCount: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.tableStatus).toBe(TableStatus.PARTIALLY_OCCUPIED);
    expect(res.body.availableSeatsRemaining).toBe(1); // Exactly 1 seat open on 4-seater!
    expect(res.body.occupiedSeatsTotal).toBe(3);

    party2SessionId = res.body.sessionId;
  });

  it('6. GET /api/v1/co-dining/table/:tableId/seats queries real-time layout showing 3 occupied and 1 open', async () => {
    const res = await request(app)
      .get(`/api/v1/co-dining/table/${communityTableId}/seats`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.currentStatus).toBe(TableStatus.PARTIALLY_OCCUPIED);
    expect(res.body.availableSeatsCount).toBe(1);
    expect(res.body.occupiedSeatsCount).toBe(3);

    // Seats 1, 2, 3 occupied; Seat 4 available
    const seat4 = res.body.seats.find((s: any) => s.seatNumber === 4);
    expect(seat4.status).toBe(SeatStatus.AVAILABLE);

    const seat3 = res.body.seats.find((s: any) => s.seatNumber === 3);
    expect(seat3.status).toBe(SeatStatus.OCCUPIED);
    expect(seat3.guestName).toBe('Amit Verma (Solo Diner)');
  });

  it('7. POST /api/v1/co-dining/allocate-seat seats 4th guest filling the table -> OCCUPIED (Full Table)', async () => {
    const res = await request(app)
      .post('/api/v1/co-dining/allocate-seat')
      .set('x-hotel-id', tenantAId)
      .send({
        tableId: communityTableId,
        seatNumbers: [4],
        guestName: 'Pooja Iyer (Solo Diner)',
        guestCount: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.tableStatus).toBe(TableStatus.OCCUPIED); // Full table!
    expect(res.body.availableSeatsRemaining).toBe(0);
    expect(res.body.occupiedSeatsTotal).toBe(4);
  });

  it('8. POST /api/v1/co-dining/release-seat releases Party 1 (Seats 1 & 2) -> PARTIALLY_OCCUPIED with 2 open', async () => {
    const res = await request(app)
      .post('/api/v1/co-dining/release-seat')
      .set('x-hotel-id', tenantAId)
      .send({
        tableId: communityTableId,
        sessionId: party1SessionId,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tableStatus).toBe(TableStatus.PARTIALLY_OCCUPIED);
    expect(res.body.availableSeatsRemaining).toBe(2);
    expect(res.body.occupiedSeatsTotal).toBe(2);

    // Verify Party 1 session is CLOSED
    const closedSession = await TableSession.findById(party1SessionId);
    expect(closedSession!.status).toBe('CLOSED');
  });

  it('9. POST /api/v1/co-dining/release-seat releases remaining seats -> Table returns to AVAILABLE with 4 open', async () => {
    const res = await request(app)
      .post('/api/v1/co-dining/release-seat')
      .set('x-hotel-id', tenantAId)
      .send({
        tableId: communityTableId,
        seatNumbers: [3, 4],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tableStatus).toBe(TableStatus.AVAILABLE);
    expect(res.body.availableSeatsRemaining).toBe(4);
    expect(res.body.occupiedSeatsTotal).toBe(0);
  });

  it('10. Strict Multi-Tenant Isolation: Tenant B cannot view or allocate seats on Tenant A tables', async () => {
    const res = await request(app)
      .get(`/api/v1/co-dining/table/${communityTableId}/seats`)
      .set('x-hotel-id', tenantBId);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);

    const allocRes = await request(app)
      .post('/api/v1/co-dining/allocate-seat')
      .set('x-hotel-id', tenantBId)
      .send({
        tableId: communityTableId,
        seatNumbers: [1],
      });

    expect(allocRes.status).toBe(404);
  });
});
