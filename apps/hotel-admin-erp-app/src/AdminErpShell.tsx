import React, { useState } from 'react';
import {
  PmsReservationMatrixApp,
  HousekeepingTurnaroundApp,
  LiveReservationManagerApp,
} from './index';
import { FastCashierPosApp } from './components/fast-cashier/FastCashierPosApp';
import { BanquetManagementApp } from './components/banquet/BanquetManagementApp';
import { CorporateMasterFolioApp } from './components/corporate/CorporateMasterFolioApp';
import { InventoryPoApp } from './components/inventory-po/InventoryPoApp';
import { StoreRequisitionApp } from './components/store-requisition/StoreRequisitionApp';
import { InventoryAuditApp } from './components/inventory-audit/InventoryAuditApp';
import { MenuEngineeringApp } from './components/menu-engineering/MenuEngineeringApp';
import { RecipeCostingApp } from './components/recipe-costing/RecipeCostingApp';
import { StaffRosterApp } from './components/staff-roster/StaffRosterApp';
import { NightAuditApp } from './components/night-audit/NightAuditApp';
import { RevenueManagerApp } from './components/revenue-manager/RevenueManagerApp';
import { SeatBillingApp } from './components/seat-billing/SeatBillingApp';
import { KotVoidAuditApp } from './components/kot-void/KotVoidAuditApp';
import { FrontDeskCheckInApp } from './components/front-desk/FrontDeskCheckInApp';
import { LostAndFoundVaultApp } from './components/lost-and-found/LostAndFoundVaultApp';
import { MatrixStore } from '../../../packages/ui/src/pms/MatrixStore';

export type ErpModuleKey =
  | 'PMS'
  | 'FRONT_DESK_CHECKIN'
  | 'LOST_AND_FOUND'
  | 'FAST_CASHIER'
  | 'HOUSEKEEPING'
  | 'RESERVATIONS'
  | 'BANQUETS'
  | 'CORPORATE'
  | 'INVENTORY_PO'
  | 'STORE_REQUISITION'
  | 'INVENTORY_AUDIT'
  | 'MENU_ENGINEERING'
  | 'RECIPE_COSTING'
  | 'STAFF_ROSTER'
  | 'NIGHT_AUDIT'
  | 'REVENUE_MANAGER'
  | 'SEAT_BILLING'
  | 'KOT_VOID';

interface ErpModuleDef {
  key: ErpModuleKey;
  label: string;
  category: 'FRONT_DESK' | 'FB_DINING' | 'INVENTORY' | 'OPS_FINANCE';
  icon: string;
  badge?: string;
}

const MODULE_REGISTRY: ErpModuleDef[] = [
  // Front Desk & Rooms
  { key: 'PMS', label: 'PMS Room Grid', category: 'FRONT_DESK', icon: '🏨' },
  { key: 'FRONT_DESK_CHECKIN', label: '1-Click Check-In & KYC', category: 'FRONT_DESK', icon: '🛎️', badge: 'KYC / DOCS' },
  { key: 'LOST_AND_FOUND', label: 'Lost & Found Vault', category: 'FRONT_DESK', icon: '🔐', badge: 'DISPATCH' },
  { key: 'HOUSEKEEPING', label: 'Housekeeping Turnaround', category: 'FRONT_DESK', icon: '🧹' },
  { key: 'RESERVATIONS', label: 'Dining & Room Arrivals', category: 'FRONT_DESK', icon: '📅' },
  { key: 'CORPORATE', label: 'Corporate & Groups', category: 'FRONT_DESK', icon: '🏢' },

  // F&B & Dining
  { key: 'FAST_CASHIER', label: 'Express Cashier POS', category: 'FB_DINING', icon: '⚡', badge: 'HIGH SPEED' },
  { key: 'KOT_VOID', label: 'KOT Void & Waste Security', category: 'FB_DINING', icon: '🛡️', badge: 'ANTI-THEFT' },
  { key: 'BANQUETS', label: 'Banquet & Events', category: 'FB_DINING', icon: '🎪' },
  { key: 'SEAT_BILLING', label: 'Seat & Split Billing', category: 'FB_DINING', icon: '💺' },
  { key: 'MENU_ENGINEERING', label: 'Menu Engineering (BCG)', category: 'FB_DINING', icon: '📊' },
  { key: 'RECIPE_COSTING', label: 'Recipe Costing & Yields', category: 'FB_DINING', icon: '🍲' },

  // Inventory & Procurement
  { key: 'INVENTORY_PO', label: 'Purchase Orders & GRN', category: 'INVENTORY', icon: '📦' },
  { key: 'STORE_REQUISITION', label: 'Store Requisitions & FEFO', category: 'INVENTORY', icon: '🏬' },
  { key: 'INVENTORY_AUDIT', label: 'Stock Audit & Variance', category: 'INVENTORY', icon: '🔍' },

  // Operations & Finance
  { key: 'STAFF_ROSTER', label: 'Staff Roster & Time Clock', category: 'OPS_FINANCE', icon: '👥' },
  { key: 'NIGHT_AUDIT', label: 'Night Audit & EOD Roll', category: 'OPS_FINANCE', icon: '🌙', badge: 'EOD' },
  { key: 'REVENUE_MANAGER', label: 'Revenue Manager & RevPAR', category: 'OPS_FINANCE', icon: '📈' },
];

export const AdminErpShell: React.FC = () => {
  const [activeModule, setActiveModule] = useState<ErpModuleKey>('PMS');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('spicehub_erp_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('spicehub_erp_theme', nextTheme);
    }
  };

  const matrixStore = MatrixStore.getInstance();

  const token = typeof window !== 'undefined' ? (localStorage.getItem('spicehub_token') || localStorage.getItem('token') || '') : '';
  const hotelId = typeof window !== 'undefined' ? (localStorage.getItem('spicehub_hotel_id') || localStorage.getItem('hotelId') || '') : '';

  const currentMod = MODULE_REGISTRY.find((m) => m.key === activeModule) || MODULE_REGISTRY[0];

  React.useEffect(() => {
    if (!matrixStore.getData()) {
      const dates: any[] = [];
      const base = new Date('2026-10-03');
      for (let i = 0; i < 14; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        const dateStr = d.toISOString().slice(0, 10);
        const dayOfWeek = d.getDay();
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek];
        const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
        dates.push({
          date: dateStr,
          dayOfWeek,
          dayName,
          dayNumber: d.getDate(),
          monthName,
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        });
      }

      matrixStore.setData({
        window: {
          startDate: '2026-10-03',
          endDate: dates[dates.length - 1].date,
          totalDays: 14,
        },
        dates,
        kpis: {
          totalRooms: 5,
          arrivalsToday: 2,
          departuresToday: 1,
          occupancyRate: 60,
          activeBookingsCount: 3,
        },
        roomTypes: [
          {
            id: 'rt-deluxe',
            name: 'Deluxe Heritage Room',
            code: 'DLX',
            basePrice: 4500,
            rooms: [
              { id: 'rm-101', roomNumber: '101', floorNumber: 1, wing: 'East Heritage', status: 'OCCUPIED' },
              { id: 'rm-102', roomNumber: '102', floorNumber: 1, wing: 'East Heritage', status: 'AVAILABLE' },
              { id: 'rm-103', roomNumber: '103', floorNumber: 1, wing: 'East Heritage', status: 'DIRTY' },
            ],
          },
          {
            id: 'rt-suite',
            name: 'Royal Maharaja Suite',
            code: 'STE',
            basePrice: 9500,
            rooms: [
              { id: 'rm-201', roomNumber: '201', floorNumber: 2, wing: 'Royal Palace', status: 'OCCUPIED' },
              { id: 'rm-202', roomNumber: '202', floorNumber: 2, wing: 'Royal Palace', status: 'AVAILABLE' },
            ],
          },
        ],
        bookings: [
          {
            id: 'bk-1',
            bookingNumber: 'RES-8821',
            guestName: 'Rohit Khanna (VIP)',
            guestPhone: '+91 98230 11223',
            guestEmail: 'rohit.khanna@tcs.com',
            checkInDate: '2026-10-01',
            checkOutDate: '2026-10-06',
            bookingStatus: 'IN_HOUSE',
            allocatedRoomId: 'rm-101',
            roomTypeId: 'rt-deluxe',
            roomTypeName: 'Deluxe Heritage Room',
            grandTotal: 22500,
            advancePaymentAmount: 22500,
            paymentStatus: 'PAID',
          },
          {
            id: 'bk-2',
            bookingNumber: 'RES-8834',
            guestName: 'Ananya Sharma',
            guestPhone: '+91 99100 44556',
            guestEmail: 'ananya@gmail.com',
            checkInDate: '2026-10-03',
            checkOutDate: '2026-10-07',
            bookingStatus: 'IN_HOUSE',
            allocatedRoomId: 'rm-201',
            roomTypeId: 'rt-suite',
            roomTypeName: 'Royal Maharaja Suite',
            grandTotal: 38000,
            advancePaymentAmount: 20000,
            paymentStatus: 'PARTIAL',
          },
          {
            id: 'bk-3',
            bookingNumber: 'RES-8845',
            guestName: 'Vikramaditya Singhania',
            guestPhone: '+91 97110 99887',
            checkInDate: '2026-10-05',
            checkOutDate: '2026-10-09',
            bookingStatus: 'CONFIRMED',
            allocatedRoomId: 'rm-102',
            roomTypeId: 'rt-deluxe',
            roomTypeName: 'Deluxe Heritage Room',
            grandTotal: 18000,
            advancePaymentAmount: 5000,
            paymentStatus: 'PARTIAL',
          },
        ],
      });
    }
  }, []);

  const renderActiveModule = () => {
    switch (activeModule) {
      case 'PMS':
        return (
          <PmsReservationMatrixApp
            store={matrixStore}
            onConfirmBooking={async (booking) => {
              console.log(`🏨 [Hotel Admin] Creating quick booking:`, booking);
              try {
                const res = await fetch('http://localhost:5000/api/v1/pms/quick-reserve', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    'x-hotel-id': hotelId,
                  },
                  body: JSON.stringify({
                    hotelId,
                    ...booking,
                  }),
                });
                if (!res.ok) {
                  const errJson = await res.json().catch(() => null);
                  console.warn('Booking creation failed:', errJson?.message);
                } else {
                  console.log('✅ [Hotel Admin] Quick reservation confirmed successfully!');
                }
              } catch (err: any) {
                console.error('Booking creation error:', err);
              }
            }}
          />
        );
      case 'FRONT_DESK_CHECKIN':
        return <FrontDeskCheckInApp authToken={token} hotelId={hotelId} />;
      case 'LOST_AND_FOUND':
        return <LostAndFoundVaultApp authToken={token} hotelId={hotelId} />;
      case 'FAST_CASHIER':
        return <FastCashierPosApp token={token} />;
      case 'HOUSEKEEPING':
        return <HousekeepingTurnaroundApp />;
      case 'RESERVATIONS':
        return <LiveReservationManagerApp />;
      case 'BANQUETS':
        return <BanquetManagementApp token={token} hotelId={hotelId} />;
      case 'CORPORATE':
        return <CorporateMasterFolioApp token={token} hotelId={hotelId} />;
      case 'INVENTORY_PO':
        return <InventoryPoApp token={token} />;
      case 'STORE_REQUISITION':
        return <StoreRequisitionApp token={token} />;
      case 'INVENTORY_AUDIT':
        return <InventoryAuditApp />;
      case 'MENU_ENGINEERING':
        return <MenuEngineeringApp />;
      case 'RECIPE_COSTING':
        return <RecipeCostingApp token={token} />;
      case 'STAFF_ROSTER':
        return <StaffRosterApp authToken={token} hotelId={hotelId} />;
      case 'NIGHT_AUDIT':
        return <NightAuditApp token={token} hotelId={hotelId} />;
      case 'REVENUE_MANAGER':
        return <RevenueManagerApp token={token} hotelId={hotelId} />;
      case 'SEAT_BILLING':
        return <SeatBillingApp />;
      case 'KOT_VOID':
        return <KotVoidAuditApp hotelId={hotelId} />;
      default:
        return <div>Select a module from the sidebar</div>;
    }
  };

  return (
    <div
      className={`flex h-screen w-screen overflow-hidden font-sans transition-colors duration-200 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
      }`}
    >
      {/* Luxury Sidebar Navigation */}
      <aside
        className={`${
          sidebarCollapsed ? 'w-20' : 'w-72'
        } transition-all duration-300 ease-in-out flex flex-col backdrop-blur-md select-none shrink-0 z-20 ${
          theme === 'dark'
            ? 'bg-slate-900/95 border-r border-slate-800/80 text-slate-100'
            : 'bg-white/95 border-r border-slate-200 text-slate-700 shadow-sm'
        }`}
      >
        {/* Brand Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            theme === 'dark' ? 'border-slate-800/60 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-amber-900/30 shrink-0">
              S
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1
                  className={`text-base font-bold tracking-tight flex items-center gap-1.5 ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  SpiceHub{' '}
                  <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 border border-amber-500/40 font-semibold">
                    ERP
                  </span>
                </h1>
                <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Hotel Command Center
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`p-1.5 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'text-slate-400 hover:text-amber-300 hover:bg-slate-800/60'
                : 'text-slate-500 hover:text-amber-600 hover:bg-slate-200/60'
            }`}
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        {/* Module Links */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          {MODULE_REGISTRY.map((mod) => {
            const isActive = activeModule === mod.key;
            return (
              <button
                key={mod.key}
                data-testid={`module-nav-${mod.key}`}
                onClick={() => setActiveModule(mod.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group text-left ${
                  isActive
                    ? theme === 'dark'
                      ? 'bg-gradient-to-r from-amber-500/20 to-amber-500/5 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-950 font-semibold'
                      : 'bg-amber-100 text-amber-900 border border-amber-400/80 shadow-sm font-semibold'
                    : theme === 'dark'
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                }`}
                title={sidebarCollapsed ? mod.label : undefined}
              >
                <span className="text-lg shrink-0 group-hover:scale-110 transition-transform">{mod.icon}</span>
                {!sidebarCollapsed && (
                  <div className="flex-1 flex items-center justify-between truncate">
                    <span className="truncate">{mod.label}</span>
                    {mod.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30 uppercase">
                        {mod.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* User Session Footer */}
        <div
          className={`p-3 border-t ${
            theme === 'dark' ? 'border-slate-800/60 bg-slate-950/50' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div
            className={`flex items-center gap-3 p-2 rounded-xl border ${
              theme === 'dark'
                ? 'bg-slate-900/60 border-slate-800/50'
                : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 flex items-center justify-center text-xs font-bold shrink-0">
              HA
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <p className={`text-xs font-semibold truncate ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                  Hotel Admin
                </p>
                <p className="text-[11px] text-emerald-500 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live Enterprise
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Workspace Body */}
      <main
        className={`flex-1 flex flex-col h-full overflow-hidden transition-colors duration-200 ${
          theme === 'dark' ? 'bg-slate-950' : 'bg-slate-100/70'
        }`}
      >
        {/* Top Navbar */}
        <header
          className={`h-14 border-b backdrop-blur-md px-6 flex items-center justify-between shrink-0 transition-colors duration-200 ${
            theme === 'dark'
              ? 'border-slate-800/80 bg-slate-900/50 text-white'
              : 'border-slate-200 bg-white/90 text-slate-800 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{currentMod.icon}</span>
            <div>
              <h2
                className={`text-base font-bold tracking-tight ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}
              >
                {currentMod.label}
              </h2>
              <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Enterprise Multi-Tenant Operation Suite
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Shift 71: Bright / Dark Theme Switcher Button */}
            <button
              data-testid="theme-toggle-btn"
              onClick={toggleTheme}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 border shadow-sm ${
                theme === 'dark'
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700 hover:border-amber-500/50'
                  : 'bg-white hover:bg-slate-50 text-amber-700 border-slate-300 hover:border-amber-400'
              }`}
              title={`Switch to ${theme === 'dark' ? 'Bright / Light Mode' : 'Night / Dark Mode'}`}
            >
              <span>{theme === 'dark' ? '🌙 Dark Mode' : '☀️ Bright Mode'}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  theme === 'dark' ? 'bg-amber-400' : 'bg-emerald-500'
                } animate-pulse`}
              ></span>
            </button>

            <div
              className={`px-3 py-1 rounded-full border text-xs font-medium flex items-center gap-2 ${
                theme === 'dark'
                  ? 'bg-slate-800/80 border-slate-700/60 text-slate-300'
                  : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Port 3005 Active
            </div>
            <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs text-amber-500 font-semibold">
              Live SaaS Connected
            </div>
          </div>
        </header>

        {/* Active Module Container */}
        <div className="flex-1 overflow-y-auto">
          {renderActiveModule()}
        </div>
      </main>
    </div>
  );
};
