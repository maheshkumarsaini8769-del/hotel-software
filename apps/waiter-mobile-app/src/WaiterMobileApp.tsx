import React, { useState, useEffect } from 'react';
import { WaiterHeader } from './components/WaiterHeader';
import { ServiceRequestCard } from './components/ServiceRequestCard';
import { QuickKotPunchSheet } from './components/QuickKotPunchSheet';
import { WaiterCashFloatCard } from './components/cash-float/WaiterCashFloatCard';
import { DynamicUpiQrModal } from './components/dynamic-upi/DynamicUpiQrModal';
import { FoodPickupCard } from './components/food-pickup/FoodPickupCard';
import { WaiterStore, WaiterServiceRequestModel, DraftOrderItem, WaiterCashFloatDto, DynamicUpiQrDto, FoodPickupTicketDTO } from '@spicehub/ui';
import { ShiftStatus, MenuItemDTO } from '@spicehub/shared-types';

export type WaiterNavTab = 'CALLS' | 'FOOD_PICKUP' | 'CASH_FLOAT' | 'COLLECT_PAYMENT';

export interface WaiterMobileAppProps {
  store: WaiterStore;
  menuItems?: MenuItemDTO[];
  waiterFloat?: WaiterCashFloatDto;
  pickupTickets?: FoodPickupTicketDTO[];
  activeUpiQr?: DynamicUpiQrDto | null;
  onAcceptRequest?: (requestId: string) => Promise<void> | void;
  onCompleteRequest?: (requestId: string) => Promise<void> | void;
  onShiftChange?: (newStatus: ShiftStatus) => Promise<void> | void;
  onFireKot?: (tableId: string, items: DraftOrderItem[], instructions?: string) => Promise<void> | void;
  onRequestCashDrop?: (actualCash: number, reason?: string) => Promise<void>;
  onSnoozePickup?: (ticketId: string) => Promise<void> | void;
  onConfirmPickup?: (ticketId: string) => Promise<void> | void;
  onGenerateUpiQr?: (tableNumber: string, amount: number) => Promise<void>;
  onCancelUpiQr?: (transactionRef: string) => Promise<void>;
  onCheckUpiStatus?: (transactionRef: string) => Promise<void>;
}

export const WaiterMobileApp: React.FC<WaiterMobileAppProps> = ({
  store,
  menuItems = [],
  waiterFloat,
  pickupTickets = [],
  activeUpiQr,
  onAcceptRequest,
  onCompleteRequest,
  onShiftChange,
  onFireKot,
  onRequestCashDrop,
  onSnoozePickup,
  onConfirmPickup,
  onGenerateUpiQr,
  onCancelUpiQr,
  onCheckUpiStatus,
}) => {
  const [profile, setProfile] = useState(store.getProfile());
  const [requests, setRequests] = useState<WaiterServiceRequestModel[]>(store.getActiveRequests());
  const [currentNav, setCurrentNav] = useState<WaiterNavTab>('CALLS');
  const [requestFilter, setRequestFilter] = useState<'ACTIVE' | 'ALL'>('ACTIVE');
  const [draftKot, setDraftKot] = useState(store.getDraftKot());

  // Dynamic UPI Modal state
  const [isUpiModalOpen, setIsUpiModalOpen] = useState(false);
  const [selectedTableForPayment, setSelectedTableForPayment] = useState('Table 4');
  const [paymentAmountInput, setPaymentAmountInput] = useState('1450');

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setProfile(store.getProfile());
      setRequests(requestFilter === 'ACTIVE' ? store.getActiveRequests() : store.getRequests());
      setDraftKot(store.getDraftKot());
    });
    return () => unsubscribe();
  }, [store, requestFilter]);

  const handleToggleShift = async (newStatus: ShiftStatus) => {
    store.setShiftStatus(newStatus);
    if (onShiftChange) {
      await onShiftChange(newStatus);
    }
  };

  const handleAccept = async (requestId: string) => {
    store.markAccepted(requestId);
    if (onAcceptRequest) {
      await onAcceptRequest(requestId);
    }
  };

  const handleComplete = async (requestId: string) => {
    store.markCompleted(requestId);
    if (onCompleteRequest) {
      await onCompleteRequest(requestId);
    }
  };

  const handleFireKot = async (instructions?: string) => {
    if (!draftKot) return;
    if (onFireKot) {
      await onFireKot(draftKot.tableId, draftKot.items, instructions);
    }
    store.clearDraftKot();
  };

  const handleOpenUpiModal = async () => {
    const amt = Number(paymentAmountInput) || 0;
    if (amt > 0 && onGenerateUpiQr) {
      await onGenerateUpiQr(selectedTableForPayment, amt);
    }
    setIsUpiModalOpen(true);
  };

  // Default simulated float if none passed
  const activeFloat: WaiterCashFloatDto = waiterFloat || {
    _id: 'sample-float-1',
    hotelId: 'tenant-1',
    waiterUserId: profile.userId,
    waiterName: profile.name,
    shiftDate: new Date().toISOString().split('T')[0],
    openingFloat: 1000,
    totalCashCollected: 2500,
    totalChangeGiven: 200,
    expectedCashInHand: 3300,
    status: 'OPEN' as any,
  };

  // Sample fallback UPI QR if none passed
  const sampleQr: DynamicUpiQrDto = activeUpiQr || {
    _id: 'upi-1',
    hotelId: 'tenant-1',
    billId: 'bill-1',
    tableNumber: selectedTableForPayment,
    waiterUserId: profile.userId,
    waiterName: profile.name,
    amount: Number(paymentAmountInput) || 1450,
    currency: 'INR',
    merchantVpa: 'spicehub@upi',
    merchantName: 'HotelTaj',
    transactionRef: `SPICE-${Date.now()}`,
    upiUri: `upi://pay?pa=spicehub@upi&pn=HotelTaj&am=${paymentAmountInput}&cu=INR&tr=SPICE-${Date.now()}`,
    status: 'PENDING' as any,
    expiresAt: new Date(Date.now() + 600000).toISOString(),
    soundboxNotified: false,
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans pb-24">
      {/* Waiter Profile Header */}
      <WaiterHeader profile={profile} onToggleShift={handleToggleShift} />

      {/* Main 4-Tab Navigation Bar */}
      <div className="bg-slate-950 border-b border-slate-800 px-2 py-2 flex gap-1 sticky top-0 z-20">
        <button
          onClick={() => setCurrentNav('CALLS')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex flex-col items-center justify-center min-h-[48px] ${
            currentNav === 'CALLS'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/30'
              : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          <span>🛎️ Calls</span>
          <span className="text-[10px] font-normal">
            ({store.getActiveRequests().length} active)
          </span>
        </button>

        <button
          onClick={() => setCurrentNav('FOOD_PICKUP')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex flex-col items-center justify-center min-h-[48px] ${
            currentNav === 'FOOD_PICKUP'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30'
              : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          <span>🍳 Food Ready</span>
          <span className="text-[10px] font-normal">
            ({pickupTickets.length} ready)
          </span>
        </button>

        <button
          onClick={() => setCurrentNav('CASH_FLOAT')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex flex-col items-center justify-center min-h-[48px] ${
            currentNav === 'CASH_FLOAT'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
              : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          <span>💼 Cash Float</span>
          <span className="text-[10px] font-normal">
            ₹{activeFloat.expectedCashInHand.toFixed(0)}
          </span>
        </button>

        <button
          onClick={() => setCurrentNav('COLLECT_PAYMENT')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex flex-col items-center justify-center min-h-[48px] ${
            currentNav === 'COLLECT_PAYMENT'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/30'
              : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          <span>📱 UPI & Bill</span>
          <span className="text-[10px] font-normal">Table Pay</span>
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 space-y-4 overflow-y-auto max-w-lg mx-auto w-full">
        {/* TAB 1: GUEST CALLS & SERVICE REQUESTS */}
        {currentNav === 'CALLS' && (
          <div className="space-y-3">
            {/* Filter Toggle for Active vs All */}
            <div className="flex bg-slate-800/80 p-1 rounded-xl">
              <button
                onClick={() => {
                  setRequestFilter('ACTIVE');
                  setRequests(store.getActiveRequests());
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition min-h-[38px] ${
                  requestFilter === 'ACTIVE'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Active Calls ({store.getActiveRequests().length})
              </button>
              <button
                onClick={() => {
                  setRequestFilter('ALL');
                  setRequests(store.getRequests());
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition min-h-[38px] ${
                  requestFilter === 'ALL'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All History ({store.getRequests().length})
              </button>
            </div>

            {requests.length === 0 ? (
              <div className="py-20 text-center text-slate-500">
                <span className="text-4xl block mb-2">☕</span>
                <p className="text-sm font-medium">No pending guest service calls.</p>
                <p className="text-xs text-slate-600 mt-1">Water, cutlery and bill calls will pop up here with gentle chime alert.</p>
              </div>
            ) : (
              requests.map((req) => (
                <ServiceRequestCard
                  key={req.id}
                  request={req}
                  onAccept={handleAccept}
                  onComplete={handleComplete}
                />
              ))
            )}
          </div>
        )}

        {/* TAB 2: FOOD READY PICKUP QUEUE */}
        {currentNav === 'FOOD_PICKUP' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Kitchen Ready Tickets</h3>
              <span className="text-xs text-indigo-400 font-semibold">10-Minute SLA Target</span>
            </div>

            {pickupTickets.length === 0 ? (
              <div className="py-20 text-center text-slate-500">
                <span className="text-4xl block mb-2">👨‍🍳</span>
                <p className="text-sm font-medium">Kitchen has no pending food orders ready for pickup.</p>
                <p className="text-xs text-slate-600 mt-1">When chefs click 'Ready' on KDS tablets, tickets alert your phone here.</p>
              </div>
            ) : (
              pickupTickets.map((t) => (
                <FoodPickupCard
                  key={t._id}
                  ticket={t}
                  onSnooze={(id) => onSnoozePickup && onSnoozePickup(id)}
                  onConfirmPickup={(id) => onConfirmPickup && onConfirmPickup(id)}
                />
              ))
            )}
          </div>
        )}

        {/* TAB 3: WAITER CASH FLOAT & RUNNING BALANCE */}
        {currentNav === 'CASH_FLOAT' && (
          <div className="space-y-3">
            <WaiterCashFloatCard
              float={activeFloat}
              onRequestDrop={async (actual, reason) => {
                if (onRequestCashDrop) {
                  await onRequestCashDrop(actual, reason);
                }
              }}
            />
          </div>
        )}

        {/* TAB 4: TABLE PAYMENT & DYNAMIC UPI QR */}
        {currentNav === 'COLLECT_PAYMENT' && (
          <div className="space-y-4">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💳</span>
                  <div>
                    <h3 className="text-sm font-bold text-white">Table Bill Collection</h3>
                    <p className="text-xs text-slate-400">Generate locked dynamic UPI QR code</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 rounded-full font-bold">
                  NPCI Locked
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Select Table</label>
                <select
                  value={selectedTableForPayment}
                  onChange={(e) => setSelectedTableForPayment(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none min-h-[48px]"
                >
                  <option value="Table 1">Table 1 (Family Dine-in)</option>
                  <option value="Table 2">Table 2 (Couple Table)</option>
                  <option value="Table 3">Table 3 (Patio View)</option>
                  <option value="Table 4">Table 4 (VIP Corner)</option>
                  <option value="Table 5">Table 5 (Bar Counter)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Bill Amount (₹)</label>
                <input
                  type="number"
                  value={paymentAmountInput}
                  onChange={(e) => setPaymentAmountInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-lg font-bold text-cyan-400 focus:ring-2 focus:ring-cyan-500 focus:outline-none min-h-[48px]"
                  placeholder="Enter amount"
                />
              </div>

              <button
                onClick={handleOpenUpiModal}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl shadow-lg hover:brightness-110 active:scale-[0.98] transition flex items-center justify-center gap-2 min-h-[48px]"
              >
                <span>📱</span>
                <span>Generate Dynamic Locked UPI QR</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Floating Bottom Quick Action: Punch KOT Button */}
      <div className="fixed bottom-4 left-0 right-0 max-w-lg mx-auto px-4 z-30 pointer-events-none">
        <button
          onClick={() => {
            store.initDraftKot('table-4', 'Table 4');
          }}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-extrabold rounded-2xl shadow-2xl hover:brightness-110 active:scale-[0.98] transition flex items-center justify-center gap-2 pointer-events-auto min-h-[48px]"
        >
          <span className="text-lg">⚡</span>
          <span>Quick 3-Click KOT Punch</span>
        </button>
      </div>

      {/* Quick Punch Sheet Drawer */}
      <QuickKotPunchSheet
        draftKot={draftKot}
        menuItems={menuItems}
        onAddItem={(item) => store.addItemToKot(item)}
        onUpdateQuantity={(menuItemId, delta) => store.updateKotItemQuantity(menuItemId, delta)}
        onFireKot={handleFireKot}
        onCancel={() => store.clearDraftKot()}
      />

      {/* Dynamic Locked UPI QR Modal */}
      {isUpiModalOpen && (
        <DynamicUpiQrModal
          qr={sampleQr}
          isOpen={isUpiModalOpen}
          onClose={() => setIsUpiModalOpen(false)}
          onCancelQr={async (ref) => {
            if (onCancelUpiQr) await onCancelUpiQr(ref);
            setIsUpiModalOpen(false);
          }}
          onCheckStatus={async (ref) => {
            if (onCheckUpiStatus) await onCheckUpiStatus(ref);
          }}
        />
      )}
    </div>
  );
};
