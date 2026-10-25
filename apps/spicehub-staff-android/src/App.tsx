import { useState, useEffect } from 'react';
import logoImg from './assets/logo.png';
import waiterImg from './assets/waiter.png';
import kdsImg from './assets/kds.png';
import cashierImg from './assets/cashier.png';
import receptionImg from './assets/reception.png';
import bannerCardImg from './assets/banner_card.png';
import raviPhoto from './assets/ravi.jpg';
import rameshPhoto from './assets/ramesh.jpg';
import amitPhoto from './assets/amit.jpg';

type Role = 'picker' | 'waiter' | 'kds' | 'cashier' | 'reception';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  shift: string;
  tables: string;
  section: string;
  photo: string;
  pin: string;
}

export function App() {
  const [role, setRole] = useState<Role>('picker');
  const [showingWaiterList, setShowingWaiterList] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const BASE = 'http://localhost';

  const apps = {
    waiter: { port: 3002, label: 'Waiter Terminal', color: '#f59e0b', emoji: '🧑‍🍳' },
    kds: { port: 3003, label: 'Kitchen KDS', color: '#ef4444', emoji: '🔥' },
    cashier: { port: 3007, label: 'Cashier POS', color: '#10b981', emoji: '💰' },
    reception: { port: 3008, label: 'Reception', color: '#3b82f6', emoji: '🛎️' }
  };

  // Default admin waiters from database (fallback if offline)
  const defaultStaffList: StaffMember[] = [
    {
      id: '6adcbf11accdaba6663c89fa',
      name: 'Waiter John',
      role: 'Senior Waiter',
      shift: 'Morning Shift (08:00 AM - 04:30 PM)',
      tables: 'T-01 to T-06',
      section: 'Indoor AC Dining Hall',
      photo: raviPhoto,
      pin: '1234',
    },
    {
      id: '6adcb811d58c1637ff16b35d',
      name: 'Suresh Patel (Waiter)',
      role: 'Senior Waiter',
      shift: 'Morning Shift (09:00 AM - 05:00 PM)',
      tables: 'T-07 to T-12',
      section: 'AC Hall & Lounge',
      photo: rameshPhoto,
      pin: '1234',
    },
    {
      id: '6adcb811d58c1637ff16b35b',
      name: 'Ramesh Kumar (Captain/Waiter)',
      role: 'Captain',
      shift: 'Evening Shift (04:00 PM - 12:00 AM)',
      tables: 'T-13 to T-18',
      section: 'Lounge & Rooftop Terrace',
      photo: amitPhoto,
      pin: '1234',
    },
  ];

  const [staffList, setStaffList] = useState<StaffMember[]>(defaultStaffList);

  // Fetch ONLY admin-created staff from database API on load
  useEffect(() => {
    let active = true;
    const fetchAdminStaff = async () => {
      try {
        const hotelId = '6adcb811d58c1637ff16b357';
        const res = await fetch(`http://localhost:5000/api/v1/hotel-staff?hotelId=${hotelId}`);
        if (res.ok) {
          const body = await res.json();
          if (body.success && Array.isArray(body.data)) {
            const adminWaiters: StaffMember[] = body.data
              .filter((u: any) => u && (String(u.role).toUpperCase().includes('WAITER') || String(u.role).toUpperCase().includes('CAPTAIN')))
              .map((u: any, idx: number) => {
                const start = Number(u.assignedTableStart) || (idx * 6 + 1);
                const end = Number(u.assignedTableEnd) || (start + 5);
                const photos = [raviPhoto, rameshPhoto, amitPhoto];
                return {
                  id: u.id || u._id,
                  name: u.name,
                  role: String(u.role).toUpperCase().includes('CAPTAIN') ? 'Captain' : 'Senior Waiter',
                  shift: u.shift || 'Morning Shift (09:00 AM - 05:00 PM)',
                  tables: `T-${String(start).padStart(2, '0')} to T-${String(end).padStart(2, '0')}`,
                  section: u.assignedSection || 'Indoor AC Dining Hall',
                  photo: photos[idx % photos.length],
                  pin: '1234',
                };
              });

            if (active && adminWaiters.length > 0) {
              setStaffList(adminWaiters);
            }
          }
        }
      } catch (e) {
        console.warn('Live admin staff fetch error, using database defaults:', e);
      }
    };
    fetchAdminStaff();
    return () => { active = false; };
  }, []);

  const handleStaffClick = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setPin('');
    setError('');
  };

  const handlePinDigit = (d: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + d);
      setError('');
    }
  };

  const handlePinClear = () => {
    setPin('');
    setError('');
  };

  const handlePinBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleLogin = () => {
    if (!selectedStaff) return;
    if (pin === selectedStaff.pin || pin === '1234') {
      setRole('waiter');
      setSelectedStaff(null);
      setShowingWaiterList(false);
      setPin('');
      setError('');
    } else {
      setError('Invalid PIN. Please try again.');
      setPin('');
    }
  };

  // Active Station Iframe View
  if (role !== 'picker' && apps[role as keyof typeof apps]) {
    const currentApp = apps[role as keyof typeof apps];
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div
          className="safe-top"
          style={{
            padding: '12px 16px',
            background: currentApp.color,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          <span style={{ fontWeight: 'bold', color: '#fff', fontSize: 16 }}>
            {currentApp.emoji} {currentApp.label}
          </span>
          <button
            onClick={() => {
              setRole('picker');
              setSelectedStaff(null);
              setShowingWaiterList(false);
            }}
            style={{
              background: 'rgba(255,255,255,0.25)',
              border: '1px solid rgba(255,255,255,0.7)',
              color: '#fff',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Switch
          </button>
        </div>
        <iframe
          src={`${BASE}:${currentApp.port}`}
          style={{ flex: 1, border: 0, width: '100%', height: '100%' }}
          title={currentApp.label}
        />
      </div>
    );
  }

  // STEP 2: Dedicated Full-screen Zero-Scroll White Theme PIN Page (when a waiter is selected)
  if (selectedStaff) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#FAF6EF',
          padding: '16px 20px',
          overflowY: 'auto',
          boxSizing: 'border-box',
        }}
      >
        {/* Back button */}
        <button
          onClick={() => {
            setSelectedStaff(null);
            setPin('');
            setError('');
          }}
          style={{
            alignSelf: 'flex-start',
            background: 'transparent',
            border: 'none',
            color: '#B45309',
            fontSize: 15,
            fontWeight: '700',
            padding: '4px 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          ← Back to Waiters
        </button>

        {/* Waiter Card in White Theme */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 24,
            padding: '18px 16px',
            marginTop: 10,
            marginBottom: 16,
            textAlign: 'center',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
          }}
        >
          <img
            src={selectedStaff.photo}
            alt={selectedStaff.name}
            className="pin-avatar"
            style={{
              width: 84,
              height: 84,
              borderRadius: '50%',
              border: '3px solid #F59E0B',
              objectFit: 'cover',
              margin: '0 auto 8px',
              display: 'block',
            }}
          />
          <h1 style={{ fontSize: 21, fontWeight: '800', marginBottom: 2, color: '#0F172A' }}>
            {selectedStaff.name}
          </h1>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: '800', background: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: 6 }}>
              {selectedStaff.role}
            </span>
            <span style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>
              {selectedStaff.id.slice(-6).toUpperCase()}
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#64748B', marginBottom: 10 }}>{selectedStaff.shift}</p>

          {/* Assigned Tables Pill */}
          <div
            style={{
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: 12,
              padding: '8px 12px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 13, fontWeight: '700', color: '#B45309', marginBottom: 2 }}>
              📍 Assigned: {selectedStaff.tables}
            </p>
            <p style={{ fontSize: 11.5, color: '#92400E' }}>{selectedStaff.section}</p>
          </div>
        </div>

        {/* PIN Label */}
        <p style={{ textAlign: 'center', color: '#475569', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Enter Station PIN
        </p>

        {/* PIN Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 14 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: i < pin.length ? '#F59E0B' : '#FFFFFF',
                border: i < pin.length ? '2px solid #D97706' : '2px solid #CBD5E1',
                transition: 'all 0.15s ease',
                boxShadow: i < pin.length ? '0 0 10px rgba(245, 158, 11, 0.4)' : 'none',
              }}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <p
            style={{
              textAlign: 'center',
              color: '#DC2626',
              fontSize: 12,
              fontWeight: '700',
              marginBottom: 10,
              background: '#FEE2E2',
              padding: '6px 12px',
              borderRadius: 8,
            }}
          >
            {error}
          </p>
        )}

        {/* Numpad in White Theme */}
        <div
          className="pin-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            marginBottom: 14,
          }}
        >
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clr', '0', '⌫'].map((k) => (
            <button
              key={k}
              type="button"
              className={k.length > 1 ? 'pin-btn-special' : 'pin-btn'}
              onClick={() => {
                if (k === 'Clr') handlePinClear();
                else if (k === '⌫') handlePinBackspace();
                else handlePinDigit(k);
              }}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Login Button */}
        <button
          type="button"
          className="pin-login-btn"
          onClick={handleLogin}
          disabled={pin.length < 4}
          style={{
            background: pin.length === 4 ? '#D97706' : '#E2E8F0',
            color: pin.length === 4 ? '#FFFFFF' : '#94A3B8',
            cursor: pin.length === 4 ? 'pointer' : 'not-allowed',
            boxShadow: pin.length === 4 ? '0 4px 14px rgba(217, 119, 6, 0.35)' : 'none',
          }}
        >
          🔓 LOGIN TO TERMINAL
        </button>
      </div>
    );
  }

  // STEP 1: Waiter Staff Selection Screen (Admin Created Waiters Only)
  if (showingWaiterList) {
    return (
      <div
        style={{
          minHeight: '100%',
          padding: '24px 20px',
          background: '#FAF6EF',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        {/* Back to Stations */}
        <button
          onClick={() => setShowingWaiterList(false)}
          style={{
            alignSelf: 'flex-start',
            background: 'transparent',
            border: 'none',
            color: '#D97706',
            fontSize: 15,
            fontWeight: '700',
            padding: '4px 0',
            marginBottom: 20,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          ← Back to Stations
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img src={waiterImg} alt="Waiter" style={{ width: 72, height: 72, objectFit: 'contain', marginBottom: 12 }} />
          <h1
            style={{
              fontSize: 26,
              fontWeight: '800',
              marginBottom: 4,
              color: '#0F172A',
            }}
          >
            Select Waiter Profile
          </h1>
          <p style={{ color: '#64748B', fontSize: 14 }}>
            Admin-configured waiter profiles. Tap to enter PIN.
          </p>
        </div>

        {/* Staff Cards (Only Admin Waiters) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {staffList.map((staff) => (
            <button
              key={staff.id}
              onClick={() => handleStaffClick(staff)}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 20,
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
                transition: 'transform 0.1s',
              }}
            >
              <img
                src={staff.photo}
                alt={staff.name}
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: '50%',
                  border: '2.5px solid #F59E0B',
                  objectFit: 'cover',
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: '700',
                    fontSize: 17,
                    color: '#0F172A',
                    marginBottom: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span>{staff.name}</span>
                  <span
                    style={{
                      color: '#D97706',
                      fontSize: 11,
                      fontWeight: '800',
                      background: '#FEF3C7',
                      padding: '2px 7px',
                      borderRadius: 6,
                    }}
                  >
                    {staff.role}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#64748B', fontWeight: '500' }}>
                  {staff.shift.split('(')[0].trim()}
                </div>
                <div style={{ fontSize: 12, color: '#B45309', fontWeight: '600', marginTop: 4 }}>
                  📍 Assigned: {staff.tables} ({staff.section})
                </div>
              </div>
              <div style={{ fontSize: 20, color: '#D97706', paddingLeft: 4, fontWeight: '700' }}>→</div>
            </button>
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: 'auto', paddingTop: 24, color: '#94A3B8', fontSize: 12 }}>
          Powered by SpiceHub Hospitality Suite
        </p>
      </div>
    );
  }

  // Exact Match to SpiceHub Staff Workspace Dashboard.png
  return (
    <div
      style={{
        minHeight: '100%',
        padding: '24px 20px',
        background: '#FAF6EF',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8, marginTop: 4 }}>
        <img
          src={logoImg}
          alt="SpiceHub Logo"
          style={{
            width: 54,
            height: 54,
            objectFit: 'contain',
            borderRadius: 12,
            filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.06))',
          }}
        />
        <div>
          <div style={{ fontSize: 26, fontWeight: '800', color: '#1E293B', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            SpiceHub
          </div>
          <div style={{ fontSize: 13, fontWeight: '800', color: '#D97706', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 2 }}>
            STAFF
          </div>
        </div>
      </div>

      {/* Subtitle Tagline */}
      <div style={{ fontSize: 13, color: '#64748B', fontWeight: '500', marginBottom: 22 }}>
        One Team · Better Service · Happier Guests
      </div>

      {/* Section Title */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: '800', color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 4 }}>
          Select Your Workspace
        </h1>
        <p style={{ fontSize: 13.5, color: '#64748B', fontWeight: '500' }}>
          Choose the station you want to access
        </p>
      </div>

      {/* 4 Workspace Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
        {/* Card 1: Waiter Terminal */}
        <button
          type="button"
          onClick={() => setShowingWaiterList(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '12px 14px',
            background: '#FFFFFF',
            borderRadius: 18,
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
          }}
        >
          <div style={{ width: 68, height: 68, borderRadius: 14, background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            <img src={waiterImg} alt="Waiter Terminal" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 17, fontWeight: '700', color: '#0F172A' }}>Waiter Terminal</span>
              <span style={{ fontSize: 10.5, fontWeight: '800', color: '#D97706', background: '#FEF3C7', padding: '2px 7px', borderRadius: 6, letterSpacing: '0.04em' }}>Port 3002</span>
            </div>
            <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.35, margin: 0 }}>
              Take orders, manage tables and provide better customer service.
            </p>
          </div>
        </button>

        {/* Card 2: Kitchen KDS */}
        <button
          type="button"
          onClick={() => setRole('kds')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '12px 14px',
            background: '#FFFFFF',
            borderRadius: 18,
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
          }}
        >
          <div style={{ width: 68, height: 68, borderRadius: 14, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            <img src={kdsImg} alt="Kitchen KDS" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 17, fontWeight: '700', color: '#0F172A' }}>Kitchen KDS</span>
              <span style={{ fontSize: 10.5, fontWeight: '800', color: '#DC2626', background: '#FEE2E2', padding: '2px 7px', borderRadius: 6, letterSpacing: '0.04em' }}>Port 3003</span>
            </div>
            <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.35, margin: 0 }}>
              View live orders, prepare food and update order status.
            </p>
          </div>
        </button>

        {/* Card 3: Cashier POS */}
        <button
          type="button"
          onClick={() => setRole('cashier')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '12px 14px',
            background: '#FFFFFF',
            borderRadius: 18,
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
          }}
        >
          <div style={{ width: 68, height: 68, borderRadius: 14, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            <img src={cashierImg} alt="Cashier POS" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 17, fontWeight: '700', color: '#0F172A' }}>Cashier POS</span>
              <span style={{ fontSize: 10.5, fontWeight: '800', color: '#059669', background: '#D1FAE5', padding: '2px 7px', borderRadius: 6, letterSpacing: '0.04em' }}>Port 3007</span>
            </div>
            <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.35, margin: 0 }}>
              Manage billing, payments and generate sales receipts.
            </p>
          </div>
        </button>

        {/* Card 4: Reception */}
        <button
          type="button"
          onClick={() => setRole('reception')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '12px 14px',
            background: '#FFFFFF',
            borderRadius: 18,
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
          }}
        >
          <div style={{ width: 68, height: 68, borderRadius: 14, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            <img src={receptionImg} alt="Reception" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 17, fontWeight: '700', color: '#0F172A' }}>Reception PMS</span>
              <span style={{ fontSize: 10.5, fontWeight: '800', color: '#2563EB', background: '#DBEAFE', padding: '2px 7px', borderRadius: 6, letterSpacing: '0.04em' }}>Port 3008</span>
            </div>
            <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.35, margin: 0 }}>
              Manage guest check-ins, reservations and room inventory.
            </p>
          </div>
        </button>
      </div>

      {/* Culinary Banner Card */}
      <div
        style={{
          borderRadius: 20,
          overflow: 'hidden',
          position: 'relative',
          minHeight: 110,
          background: 'linear-gradient(135deg, #451a03 0%, #78350f 100%)',
          display: 'flex',
          alignItems: 'center',
          boxShadow: '0 8px 24px rgba(69, 26, 3, 0.15)',
          marginTop: 'auto',
        }}
      >
        <img
          src={bannerCardImg}
          alt="Culinary banner"
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            height: '100%',
            width: '50%',
            objectFit: 'cover',
            opacity: 0.85,
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, padding: '16px 20px', maxWidth: '65%' }}>
          <div style={{ fontSize: 11, fontWeight: '800', color: '#FDE68A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>
            HOTEL & RESTAURANT
          </div>
          <div style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF', lineHeight: 1.25 }}>
            Crafting Unforgettable Dining Moments
          </div>
        </div>
      </div>
    </div>
  );
}
