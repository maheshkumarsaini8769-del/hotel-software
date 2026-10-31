import mongoose from 'mongoose';
import argon2 from 'argon2';

async function seed() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;

  const tenants = await db.collection('tenants').find({}).toArray();
  console.log(`Found ${tenants.length} tenants in database.`);

  const defaultPinHash = await argon2.hash('1234');
  const defaultPasswordHash = await argon2.hash('SpiceHub@2026');

  const staffProfiles = [
    {
      email: 'maheshkumarsaini8769@gmail.com',
      name: 'Mahesh Kumar Saini',
      phone: '+91 87690 12345',
      role: 'HOTEL_ADMIN',
      shift: 'General Management Shift (09:00 AM - 07:00 PM)',
      assignedSection: 'Executive Suite & Management',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      permissions: ['ALL', 'HOTEL_CONFIG', 'STAFF_MANAGEMENT', 'ROOM_MANAGEMENT', 'BILLING_AUDIT', 'WAITER_SERVICE'],
      assignedTableStart: 1,
      assignedTableEnd: 24,
    },
    {
      email: 'maheshsaini10101@gmail.com',
      name: 'Mahesh Saini',
      phone: '+91 98290 10101',
      role: 'RECEPTIONIST',
      shift: 'Morning Front Desk (07:00 AM - 03:00 PM)',
      assignedSection: 'Reception Lobby & Guest Check-in',
      assignedStation: 'Reception Desk 1',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      permissions: ['RECEPTION_CHECKIN', 'ROOM_FOLIO', 'KEYCARD_ISSUANCE', 'GUEST_SERVICES', 'RESERVATION_VIEW'],
      assignedTableStart: 1,
      assignedTableEnd: 10,
    },
    {
      email: 'ashishsaini8saini@gmail.com',
      name: 'Ashish Saini',
      phone: '+91 98290 88888',
      role: 'CASHIER',
      shift: 'Day Shift (10:00 AM - 06:00 PM)',
      assignedSection: 'Main Billing & POS Counter',
      assignedCounter: 'Billing Counter #1',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
      permissions: ['BILL_SETTLEMENT', 'CASH_FLOAT', 'DISCOUNT_APPROVE', 'PAYMENT_COLLECTION', 'FAST_CASHIER'],
      assignedTableStart: 1,
      assignedTableEnd: 24,
    },
    {
      email: 'praveensinghshekhawat43@gmail.com',
      name: 'Praveen Singh Shekhawat',
      phone: '+91 94140 43434',
      role: 'CHEF',
      shift: 'Head Chef Kitchen Shift (11:00 AM - 11:00 PM)',
      assignedSection: 'Main Hot Kitchen & Tandoor Station',
      assignedStation: 'Kitchen Line KDS 1',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
      permissions: ['KDS_VIEW', 'KOT_PREPARE', 'MENU_86', 'DISH_BUMP', 'RECIPE_COSTING'],
      assignedTableStart: 1,
      assignedTableEnd: 24,
    },
    {
      email: 'maheshsaini774273@gmail.com',
      name: 'Mahesh Saini (Captain)',
      phone: '+91 77427 30001',
      role: 'WAITER',
      shift: 'Evening Dining Shift (03:00 PM - 11:30 PM)',
      assignedSection: 'Indoor AC Fine Dining Hall',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
      permissions: ['KOT_PUNCH', 'TABLE_ASSIGN', 'WAITER_SERVICE', 'BILL_REQUEST', 'TABLE_TRANSFER'],
      assignedTableStart: 1,
      assignedTableEnd: 6,
    },
    {
      email: 'ashishsaini774273@gmail.com',
      name: 'Ashish Saini (Steward)',
      phone: '+91 77427 30002',
      role: 'WAITER',
      shift: 'Evening Dining Shift (04:00 PM - 12:00 AM)',
      assignedSection: 'Lounge & Rooftop Terrace',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
      permissions: ['KOT_PUNCH', 'WAITER_SERVICE', 'BILL_REQUEST', 'FOOD_PICKUP'],
      assignedTableStart: 7,
      assignedTableEnd: 12,
    },
    {
      email: 'maheshkumarsaini774273@gmail.com',
      name: 'Mahesh Kumar Saini (HK)',
      phone: '+91 77427 30003',
      role: 'HOUSEKEEPING',
      shift: 'Morning Housekeeping (08:00 AM - 04:00 PM)',
      assignedSection: '1st & 2nd Floor Room Wings',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80',
      permissions: ['ROOM_CLEANING', 'INVENTORY_REFILL', 'MAINTENANCE_TICKET', 'LINEN_CHANGE'],
      assignedTableStart: 1,
      assignedTableEnd: 10,
    },
    {
      email: 'maheshmaheshsaini8769@gmail.com',
      name: 'Mahesh Saini (Supervisor)',
      phone: '+91 87690 99999',
      role: 'MAINTENANCE',
      shift: 'All-Day Operations Support (10:00 AM - 08:00 PM)',
      assignedSection: 'HVAC & Property Maintenance',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
      permissions: ['EQUIPMENT_REPAIR', 'MAINTENANCE_INSPECTION', 'SAFETY_CHECK', 'ASSET_AUDIT'],
      assignedTableStart: 1,
      assignedTableEnd: 24,
    },
  ];

  for (const tenant of tenants) {
    console.log(`\n--- Provisioning staff for hotel: ${tenant.name} (${tenant._id}) ---`);
    for (const staff of staffProfiles) {
      const existing = await db.collection('users').findOne({
        hotelId: tenant._id,
        email: staff.email.toLowerCase(),
      });

      const doc = {
        hotelId: tenant._id,
        name: staff.name,
        email: staff.email.toLowerCase(),
        phone: staff.phone,
        passwordHash: defaultPasswordHash,
        pinCodeHash: defaultPinHash,
        pinApprovedByAdmin: true,
        pinStatus: 'ACTIVE',
        role: staff.role,
        permissions: staff.permissions,
        shiftStatus: 'ON_DUTY',
        isActive: true,
        avatar: staff.avatar,
        shift: staff.shift,
        assignedSection: staff.assignedSection,
        assignedStation: staff.assignedStation || '',
        assignedCounter: staff.assignedCounter || '',
        assignedTableStart: staff.assignedTableStart,
        assignedTableEnd: staff.assignedTableEnd,
        updatedAt: new Date(),
      };

      if (existing) {
        await db.collection('users').updateOne(
          { _id: existing._id },
          { $set: doc }
        );
        console.log(`[UPDATED] ${staff.role} | ${staff.email} (${staff.name})`);
      } else {
        doc.createdAt = new Date();
        const res = await db.collection('users').insertOne(doc);
        console.log(`[CREATED] ${staff.role} | ${staff.email} (${staff.name}) -> ID: ${res.insertedId}`);
      }
    }
  }

  console.log('\nAll 8 staff accounts successfully provisioned with active PINs and avatars!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
