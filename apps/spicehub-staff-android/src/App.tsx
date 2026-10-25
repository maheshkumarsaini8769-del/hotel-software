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

export interface ActiveHotel {
  id: string;
  name: string;
  slug: string;
  city: string;
  state?: string;
  logoUrl?: string;
  enabledPortals?: string[];
  contactPhone?: string;
}

type Role = 'picker' | 'waiter' | 'kds' | 'cashier' | 'reception' | 'admin';

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
  const [hotels, setHotels] = useState<ActiveHotel[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<ActiveHotel | null>(null);
  const [hotelSearch, setHotelSearch] = useState('');
  const [showHotelPicker, setShowHotelPicker] = useState(false);

  // Authentication State
  const [authModalRole, setAuthModalRole] = useState<Role | null>(null);
  const [authMode, setAuthMode] = useState<'pin' | 'email'>('pin');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<any>(null);

  // PIN Self-Request Modal State
  const [showRequestPinModal, setShowRequestPinModal] = useState(false);
  const [reqStaffEmail, setReqStaffEmail] = useState('');
  const [reqStaffPhone, setReqStaffPhone] = useState('');
  const [reqStaffPin, setReqStaffPin] = useState('');
  const [reqStaffRole, setReqStaffRole] = useState('WAITER');
  const [reqStatusMessage, setReqStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Staff members for quick profile tap
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  const BASE = 'http://localhost';

  const apps = {
    waiter: { port: 3002, label: 'Waiter Terminal', color: '#f59e0b', emoji: '🧑‍🍳' },
    kds: { port: 3003, label: 'Kitchen KDS', color: '#ef4444', emoji: '🔥' },
    cashier: { port: 3007, label: 'Cashier POS', color: '#10b981', emoji: '💰' },
    reception: { port: 3008, label: 'Reception PMS', color: '#3b82f6', emoji: '🛎️' },
    admin: { port: 3005, label: 'Hotel Admin ERP', color: '#8b5cf6', emoji: '👔' },
  };

  // 1. Fetch Active Hotels on Mount
  useEffect(() => {
    let active = true;
    const fetchHotels = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/v1/auth/active-hotels');
        if (res.ok) {
          const body = await res.json();
          if (body.success && Array.isArray(body.data) && body.data.length > 0) {
            if (active) {
              setHotels(body.data);
              const saved = localStorage.getItem('spicehub_staff_hotel');
              const matched = saved ? body.data.find((h: ActiveHotel) => h.id === saved || h.slug === saved) : null;
              setSelectedHotel(matched || body.data[0]);
            }
          }
        }
      } catch (err) {
        console.warn('Active hotels fetch fallback:', err);
      }
    };
    fetchHotels();
    return () => { active = false; };
  }, []);

  // 2. Fetch Staff Roster for Selected Hotel
  useEffect(() => {
    if (!selectedHotel) return;
    let active = true;
    const fetchStaff = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/v1/hotel-staff?hotelId=${selectedHotel.id}`);
        if (res.ok) {
          const body = await res.json();
          if (body.success && Array.isArray(body.data)) {
            const photos = [raviPhoto, rameshPhoto, amitPhoto];
            const mapped: StaffMember[] = body.data.map((u: any, idx: number) => {
              const start = Number(u.assignedTableStart) || (idx * 6 + 1);
              const end = Number(u.assignedTableEnd) || (start + 5);
              return {
                id: u.id || u._id,
                name: u.name,
                role: u.role || 'Staff',
                shift: u.shift || 'General Shift',
                tables: `T-${String(start).padStart(2, '0')} to T-${String(end).padStart(2, '0')}`,
                section: u.assignedSection || 'Main Dining Hall',
                photo: photos[idx % photos.length],
                pin: '••••',
              };
            });
            if (active && mapped.length > 0) {
              setStaffList(mapped);
            }
          }
        }
      } catch (err) {
        console.warn('Hotel staff fetch error:', err);
      }
    };
    fetchStaff();
    return () => { active = false; };
  }, [selectedHotel]);

  // Handle Station Card Click -> Open Dual Login Gate
  const handleSelectStation = (targetRole: Role) => {
    setAuthModalRole(targetRole);
    setPin('');
    setEmail('');
    setPassword('');
    setAuthError('');
    setAuthSuccess('');
  };

  // Handle PIN Keypad input
  const handlePinDigit = (digit: string) => {
    if (pin.length < 4) {
      const next = pin + digit;
      setPin(next);
      setAuthError('');
      if (next.length === 4) {
        executePinLogin(next);
      }
    }
  };

  const executePinLogin = async (enteredPin: string) => {
    if (!selectedHotel) return;
    setIsSubmitting(true);
    setAuthError('');
    try {
      const res = await fetch('http://localhost:5000/api/v1/auth/waiter-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: enteredPin,
          hotelSlug: selectedHotel.slug,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.data?.token) {
        localStorage.setItem('spicehub_token', data.data.token);
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('spicehub_hotel_id', selectedHotel.id);
        localStorage.setItem('hotelId', selectedHotel.id);
        setLoggedInUser(data.data.user);
        setRole(authModalRole || 'waiter');
        setAuthModalRole(null);
      } else {
        if (data.errorCode === 'PIN_PENDING_ADMIN_APPROVAL') {
          setAuthError('⏳ PIN Pending Approval: Your 4-digit PIN is awaiting Hotel Admin approval.');
        } else {
          setAuthError(data.message || 'Invalid 4-digit staff PIN. Please try again.');
        }
        setPin('');
      }
    } catch (err: any) {
      setAuthError('Network error connecting to login service.');
      setPin('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHotel || !email || !password) return;
    setIsSubmitting(true);
    setAuthError('');
    try {
      const res = await fetch('http://localhost:5000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          hotelSlug: selectedHotel.slug,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.data?.token) {
        localStorage.setItem('spicehub_token', data.data.token);
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('spicehub_hotel_id', selectedHotel.id);
        localStorage.setItem('hotelId', selectedHotel.id);
        setLoggedInUser(data.data.user);
        setRole(authModalRole || 'waiter');
        setAuthModalRole(null);
      } else {
        setAuthError(data.message || 'Invalid email or password.');
      }
    } catch (err: any) {
      setAuthError('Network error during email login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHotel || !reqStaffPin || (!reqStaffEmail && !reqStaffPhone)) return;
    try {
      const res = await fetch('http://localhost:5000/api/v1/auth/request-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId: selectedHotel.id,
          hotelSlug: selectedHotel.slug,
          email: reqStaffEmail.trim().toLowerCase() || undefined,
          phone: reqStaffPhone.trim() || undefined,
          pin: reqStaffPin,
          role: reqStaffRole,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReqStatusMessage({
          type: 'success',
          text: '✅ 4-Digit PIN submitted! Awaiting Hotel Admin approval in Admin ERP.',
        });
        setTimeout(() => {
          setShowRequestPinModal(false);
          setReqStatusMessage(null);
          setReqStaffPin('');
        }, 2200);
      } else {
        setReqStatusMessage({ type: 'error', text: data.message || 'Error requesting PIN' });
      }
    } catch (err: any) {
      setReqStatusMessage({ type: 'error', text: 'Failed to submit PIN request.' });
    }
  };

  // Screen 1: Active Workstation Iframe View
  if (role !== 'picker' && apps[role as keyof typeof apps]) {
    const currentApp = apps[role as keyof typeof apps];
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            padding: '10px 16px',
            background: currentApp.color,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>{currentApp.emoji}</span>
            <div>
              <span style={{ fontWeight: '800', color: '#fff', fontSize: 14 }}>
                {currentApp.label}
              </span>
              {selectedHotel && (
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', display: 'block' }}>
                  🏨 {selectedHotel.name}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              setRole('picker');
              setLoggedInUser(null);
            }}
            style={{
              background: 'rgba(255,255,255,0.25)',
              border: '1px solid rgba(255,255,255,0.7)',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            Switch Station
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

  // Filtered Hotels list for Hotel Selector Modal
  const filteredHotels = hotels.filter(
    (h) =>
      h.name.toLowerCase().includes(hotelSearch.toLowerCase()) ||
      h.city.toLowerCase().includes(hotelSearch.toLowerCase()) ||
      h.slug.toLowerCase().includes(hotelSearch.toLowerCase())
  );

  return (
    <div
      style={{
        minHeight: '100%',
        padding: '20px 18px',
        background: '#FAF6EF',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src={logoImg}
            alt="SpiceHub Logo"
            style={{
              width: 48,
              height: 48,
              objectFit: 'contain',
              borderRadius: 12,
              filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.08))',
            }}
          />
          <div>
            <div style={{ fontSize: 24, fontWeight: '800', color: '#1E293B', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              SpiceHub
            </div>
            <div style={{ fontSize: 11, fontWeight: '800', color: '#D97706', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              STAFF WORKSTATION APP
            </div>
          </div>
        </div>

        {/* Hotel Badge Pill */}
        {selectedHotel && (
          <button
            onClick={() => setShowHotelPicker(true)}
            style={{
              background: '#FFFFFF',
              border: '1px solid #FDE68A',
              padding: '6px 10px',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            }}
          >
            <span style={{ fontSize: 9.5, color: '#B45309', fontWeight: '800', textTransform: 'uppercase' }}>
              🏨 Active Hotel
            </span>
            <span style={{ fontSize: 12, color: '#1E293B', fontWeight: '700', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedHotel.name}
            </span>
          </button>
        )}
      </div>

      {/* Subtitle */}
      <div style={{ fontSize: 12.5, color: '#64748B', fontWeight: '500', marginBottom: 16 }}>
        Official Hospitality Suite · Role-Based Staff Launchpad
      </div>

      {/* Section Title */}
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 20, fontWeight: '800', color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 2 }}>
          Select Your Workstation Role
        </h1>
        <p style={{ fontSize: 12.5, color: '#64748B', fontWeight: '500', margin: 0 }}>
          Launch instant floor, kitchen, cashier or reception terminal
        </p>
      </div>

      {/* Workspace Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 18 }}>
        {/* Card 1: Waiter */}
        <button
          type="button"
          onClick={() => handleSelectStation('waiter')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '11px 13px',
            background: '#FFFFFF',
            borderRadius: 16,
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)',
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
          }}
        >
          <div style={{ width: 60, height: 60, borderRadius: 12, background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            <img src={waiterImg} alt="Waiter" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>Waiter Handheld Terminal</span>
              <span style={{ fontSize: 10, fontWeight: '800', color: '#D97706', background: '#FEF3C7', padding: '2px 6px', borderRadius: 6 }}>Port 3002</span>
            </div>
            <p style={{ fontSize: 11.5, color: '#64748B', lineHeight: 1.3, margin: 0 }}>
              Punch orders, customize dishes, cross-table service & split payments.
            </p>
          </div>
        </button>

        {/* Card 2: Cashier */}
        <button
          type="button"
          onClick={() => handleSelectStation('cashier')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '11px 13px',
            background: '#FFFFFF',
            borderRadius: 16,
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)',
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
          }}
        >
          <div style={{ width: 60, height: 60, borderRadius: 12, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            <img src={cashierImg} alt="Cashier POS" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>Cashier POS & Float Ledger</span>
              <span style={{ fontSize: 10, fontWeight: '800', color: '#059669', background: '#D1FAE5', padding: '2px 6px', borderRadius: 6 }}>Port 3007</span>
            </div>
            <p style={{ fontSize: 11.5, color: '#64748B', lineHeight: 1.3, margin: 0 }}>
              Direct walk-in punching, split tracking & waiter cash drawer reconciliation.
            </p>
          </div>
        </button>

        {/* Card 3: Kitchen KDS */}
        <button
          type="button"
          onClick={() => handleSelectStation('kds')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '11px 13px',
            background: '#FFFFFF',
            borderRadius: 16,
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)',
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
          }}
        >
          <div style={{ width: 60, height: 60, borderRadius: 12, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            <img src={kdsImg} alt="Kitchen KDS" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>Kitchen KDS Display</span>
              <span style={{ fontSize: 10, fontWeight: '800', color: '#DC2626', background: '#FEE2E2', padding: '2px 6px', borderRadius: 6 }}>Port 3003</span>
            </div>
            <p style={{ fontSize: 11.5, color: '#64748B', lineHeight: 1.3, margin: 0 }}>
              Live KOT order flow, cooking notes (Kam namak, mirchi) & station dispatch.
            </p>
          </div>
        </button>

        {/* Card 4: Reception */}
        <button
          type="button"
          onClick={() => handleSelectStation('reception')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '11px 13px',
            background: '#FFFFFF',
            borderRadius: 16,
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)',
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
          }}
        >
          <div style={{ width: 60, height: 60, borderRadius: 12, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            <img src={receptionImg} alt="Reception" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>Reception Front Desk</span>
              <span style={{ fontSize: 10, fontWeight: '800', color: '#2563EB', background: '#DBEAFE', padding: '2px 6px', borderRadius: 6 }}>Port 3008</span>
            </div>
            <p style={{ fontSize: 11.5, color: '#64748B', lineHeight: 1.3, margin: 0 }}>
              Guest check-ins, room inventory, printable QR codes & folio management.
            </p>
          </div>
        </button>

        {/* Card 5: Hotel Admin ERP */}
        <button
          type="button"
          onClick={() => handleSelectStation('admin')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '11px 13px',
            background: '#FFFFFF',
            borderRadius: 16,
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)',
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
          }}
        >
          <div style={{ width: 60, height: 60, borderRadius: 12, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            <span style={{ fontSize: 28 }}>👔</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>Hotel Admin & ERP</span>
              <span style={{ fontSize: 10, fontWeight: '800', color: '#7C3AED', background: '#EDE9FE', padding: '2px 6px', borderRadius: 6 }}>Port 3005</span>
            </div>
            <p style={{ fontSize: 11.5, color: '#64748B', lineHeight: 1.3, margin: 0 }}>
              Approve staff PINs, menu configuration, billing audit & printable QR studio.
            </p>
          </div>
        </button>
      </div>

      {/* Culinary Banner */}
      <div
        style={{
          borderRadius: 16,
          overflow: 'hidden',
          position: 'relative',
          minHeight: 96,
          background: 'linear-gradient(135deg, #451a03 0%, #78350f 100%)',
          display: 'flex',
          alignItems: 'center',
          boxShadow: '0 6px 18px rgba(69, 26, 3, 0.12)',
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
            width: '45%',
            objectFit: 'cover',
            opacity: 0.85,
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, padding: '14px 16px', maxWidth: '65%' }}>
          <div style={{ fontSize: 10, fontWeight: '800', color: '#FDE68A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
            HOTEL WORKFORCE ECOSYSTEM
          </div>
          <div style={{ fontSize: 13.5, fontWeight: '800', color: '#FFFFFF', lineHeight: 1.25 }}>
            Synchronized Staff Terminal & Instant Floor Auth
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: HOTEL SELECTION MODAL                                 */}
      {/* ------------------------------------------------------------- */}
      {showHotelPicker && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 420,
              background: '#FFFFFF',
              borderRadius: 20,
              padding: 20,
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', margin: 0 }}>
                🏨 Select Hotel Property
              </h2>
              <button
                onClick={() => setShowHotelPicker(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, color: '#64748B', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 12px' }}>
              Only active hotels provisioned by SuperAdmin are displayed.
            </p>

            <input
              type="text"
              placeholder="Search hotel by name or city..."
              value={hotelSearch}
              onChange={(e) => setHotelSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 10,
                border: '1px solid #CBD5E1',
                fontSize: 13,
                marginBottom: 12,
                boxSizing: 'border-box',
              }}
            />

            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredHotels.map((h) => (
                <button
                  key={h.id}
                  onClick={() => {
                    setSelectedHotel(h);
                    localStorage.setItem('spicehub_staff_hotel', h.id);
                    setShowHotelPicker(false);
                  }}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: selectedHotel?.id === h.id ? '2px solid #D97706' : '1px solid #E2E8F0',
                    background: selectedHotel?.id === h.id ? '#FFFBEB' : '#FFFFFF',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '700', fontSize: 14, color: '#0F172A' }}>{h.name}</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>📍 {h.city || 'India'}</div>
                  </div>
                  {selectedHotel?.id === h.id && (
                    <span style={{ fontSize: 11, fontWeight: '800', color: '#D97706', background: '#FEF3C7', padding: '2px 8px', borderRadius: 6 }}>
                      ACTIVE
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: DUAL LOGIN GATE (4-Digit PIN or Email/Password)      */}
      {/* ------------------------------------------------------------- */}
      {authModalRole && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(4px)',
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 380,
              background: '#FFFFFF',
              borderRadius: 24,
              padding: '20px 18px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>{apps[authModalRole].emoji}</span>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: '800', color: '#0F172A', margin: 0 }}>
                    {apps[authModalRole].label}
                  </h2>
                  <span style={{ fontSize: 11, color: '#B45309', fontWeight: '700' }}>
                    {selectedHotel?.name}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setAuthModalRole(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, color: '#64748B', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Dual Login Toggle */}
            <div
              style={{
                display: 'flex',
                background: '#F1F5F9',
                borderRadius: 12,
                padding: 3,
                marginBottom: 16,
              }}
            >
              <button
                type="button"
                onClick={() => { setAuthMode('pin'); setAuthError(''); }}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  borderRadius: 10,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: '700',
                  cursor: 'pointer',
                  background: authMode === 'pin' ? '#FFFFFF' : 'transparent',
                  color: authMode === 'pin' ? '#D97706' : '#64748B',
                  boxShadow: authMode === 'pin' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                🔢 4-Digit Quick PIN
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('email'); setAuthError(''); }}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  borderRadius: 10,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: '700',
                  cursor: 'pointer',
                  background: authMode === 'email' ? '#FFFFFF' : 'transparent',
                  color: authMode === 'email' ? '#D97706' : '#64748B',
                  boxShadow: authMode === 'email' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                📧 Email & Password
              </button>
            </div>

            {/* Error Message */}
            {authError && (
              <div
                style={{
                  background: authError.includes('Pending') ? '#FEF3C7' : '#FEE2E2',
                  border: authError.includes('Pending') ? '1px solid #FCD34D' : '1px solid #FCA5A5',
                  color: authError.includes('Pending') ? '#92400E' : '#B91C1C',
                  fontSize: 11.5,
                  fontWeight: '700',
                  padding: '8px 12px',
                  borderRadius: 10,
                  marginBottom: 14,
                  lineHeight: 1.35,
                }}
              >
                {authError}
              </div>
            )}

            {/* MODE 1: 4-DIGIT PIN */}
            {authMode === 'pin' ? (
              <div>
                <p style={{ textAlign: 'center', color: '#64748B', fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Enter 4-Digit Staff PIN
                </p>

                {/* PIN Dots */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 16 }}>
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
                        boxShadow: i < pin.length ? '0 0 10px rgba(245, 158, 11, 0.35)' : 'none',
                      }}
                    />
                  ))}
                </div>

                {/* Numpad */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 8,
                    marginBottom: 14,
                  }}
                >
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clr', '0', '⌫'].map((k) => (
                    <button
                      key={k}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        if (k === 'Clr') setPin('');
                        else if (k === '⌫') setPin((p) => p.slice(0, -1));
                        else handlePinDigit(k);
                      }}
                      style={{
                        padding: '12px 0',
                        fontSize: k.length > 1 ? 13 : 18,
                        fontWeight: '700',
                        borderRadius: 12,
                        border: '1px solid #E2E8F0',
                        background: k.length > 1 ? '#F1F5F9' : '#FFFFFF',
                        color: k === 'Clr' ? '#DC2626' : '#0F172A',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      }}
                    >
                      {k}
                    </button>
                  ))}
                </div>

                {/* Set/Generate 4-Digit PIN Button */}
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowRequestPinModal(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#B45309',
                      fontSize: 12,
                      fontWeight: '700',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    ✨ Set / Generate New 4-Digit PIN
                  </button>
                </div>
              </div>
            ) : (
              /* MODE 2: EMAIL & PASSWORD */
              <form onSubmit={executeEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                    Staff Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. waiter@royalpalm.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid #CBD5E1',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid #CBD5E1',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: '#D97706',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '12px 0',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: '700',
                    cursor: 'pointer',
                    marginTop: 6,
                    boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)',
                  }}
                >
                  {isSubmitting ? 'Verifying...' : '🔓 Sign In to Workstation'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: SELF-REQUEST 4-DIGIT PIN WITH ADMIN APPROVAL         */}
      {/* ------------------------------------------------------------- */}
      {showRequestPinModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(5px)',
            zIndex: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 380,
              background: '#FFFFFF',
              borderRadius: 24,
              padding: 20,
              boxShadow: '0 24px 48px rgba(0,0,0,0.35)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', margin: 0 }}>
                🔑 Set / Generate 4-Digit PIN
              </h3>
              <button
                onClick={() => setShowRequestPinModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, color: '#64748B', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: 11.5, color: '#64748B', margin: '0 0 14px', lineHeight: 1.4 }}>
              Submit your desired 4-digit PIN. For security, it activates once your Hotel Admin or Reception approves it.
            </p>

            {reqStatusMessage && (
              <div
                style={{
                  background: reqStatusMessage.type === 'success' ? '#ECFDF5' : '#FEE2E2',
                  border: reqStatusMessage.type === 'success' ? '1px solid #A7F3D0' : '1px solid #FCA5A5',
                  color: reqStatusMessage.type === 'success' ? '#047857' : '#B91C1C',
                  fontSize: 11.5,
                  fontWeight: '700',
                  padding: '8px 12px',
                  borderRadius: 10,
                  marginBottom: 12,
                }}
              >
                {reqStatusMessage.text}
              </div>
            )}

            <form onSubmit={handleRequestPinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>
                  Staff Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. suresh@royalpalm.com"
                  value={reqStaffEmail}
                  onChange={(e) => setReqStaffEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 9,
                    border: '1px solid #CBD5E1',
                    fontSize: 12.5,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>
                  Or Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9820011223"
                  value={reqStaffPhone}
                  onChange={(e) => setReqStaffPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 9,
                    border: '1px solid #CBD5E1',
                    fontSize: 12.5,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>
                  Desired 4-Digit PIN *
                </label>
                <input
                  type="password"
                  required
                  maxLength={4}
                  placeholder="e.g. 5566"
                  value={reqStaffPin}
                  onChange={(e) => setReqStaffPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 9,
                    border: '1px solid #CBD5E1',
                    fontSize: 14,
                    fontWeight: '700',
                    letterSpacing: '0.15em',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>
                  Staff Role
                </label>
                <select
                  value={reqStaffRole}
                  onChange={(e) => setReqStaffRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 9,
                    border: '1px solid #CBD5E1',
                    fontSize: 12.5,
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="WAITER">Waiter / Steward</option>
                  <option value="CASHIER">Cashier POS</option>
                  <option value="CHEF">Kitchen Chef</option>
                  <option value="MANAGER">Reception / Manager</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={reqStaffPin.length < 4}
                style={{
                  background: reqStaffPin.length === 4 ? '#D97706' : '#E2E8F0',
                  color: reqStaffPin.length === 4 ? '#FFFFFF' : '#94A3B8',
                  border: 'none',
                  padding: '11px 0',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: '700',
                  cursor: reqStaffPin.length === 4 ? 'pointer' : 'not-allowed',
                  marginTop: 6,
                }}
              >
                Submit PIN for Admin Approval
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
