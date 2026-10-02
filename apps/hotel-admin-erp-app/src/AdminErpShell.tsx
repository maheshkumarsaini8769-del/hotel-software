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
import { MatrixStore } from '../../../packages/ui/src/pms/MatrixStore';

export type ErpModuleKey =
  | 'PMS'
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
  const matrixStore = MatrixStore.getInstance();

  const token = typeof window !== 'undefined' ? (localStorage.getItem('spicehub_token') || localStorage.getItem('token') || '') : '';
  const hotelId = typeof window !== 'undefined' ? (localStorage.getItem('spicehub_hotel_id') || localStorage.getItem('hotelId') || '') : '';

  const currentMod = MODULE_REGISTRY.find((m) => m.key === activeModule) || MODULE_REGISTRY[0];

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
                  alert(errJson?.message || 'Failed to create reservation');
                } else {
                  alert('Quick reservation confirmed successfully!');
                }
              } catch (err: any) {
                console.error('Booking creation error:', err);
                alert(`Error saving booking: ${err?.message || 'Network error'}`);
              }
            }}
          />
        );
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
        return <StaffRosterApp />;
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
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Luxury Sidebar Navigation */}
      <aside
        className={`${
          sidebarCollapsed ? 'w-20' : 'w-72'
        } transition-all duration-300 ease-in-out flex flex-col bg-slate-900/95 border-r border-slate-800/80 backdrop-blur-md select-none shrink-0 z-20`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800/60 bg-slate-950/40">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-amber-900/30 shrink-0">
              S
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                  SpiceHub <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">ERP</span>
                </h1>
                <p className="text-xs text-slate-400 font-medium">Hotel Command Center</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800/60 transition-colors"
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
                onClick={() => setActiveModule(mod.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group text-left ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/20 to-amber-500/5 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-950'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
                title={sidebarCollapsed ? mod.label : undefined}
              >
                <span className="text-lg shrink-0 group-hover:scale-110 transition-transform">{mod.icon}</span>
                {!sidebarCollapsed && (
                  <div className="flex-1 flex items-center justify-between truncate">
                    <span className="truncate">{mod.label}</span>
                    {mod.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
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
        <div className="p-3 border-t border-slate-800/60 bg-slate-950/50">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/60 border border-slate-800/50">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-xs font-bold shrink-0">
              HA
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-slate-200 truncate">Hotel Admin</p>
                <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Live Enterprise
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Workspace Body */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
        {/* Top Navbar */}
        <header className="h-14 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{currentMod.icon}</span>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">{currentMod.label}</h2>
              <p className="text-[11px] text-slate-400">Enterprise Multi-Tenant Operation Suite</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Port 3005 Active
            </div>
            <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 font-semibold">
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
