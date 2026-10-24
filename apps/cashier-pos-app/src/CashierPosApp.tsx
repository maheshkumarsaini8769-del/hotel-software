import React, { useState, useEffect, useRef } from 'react';
import { getPortalUrl } from './config/env';
import {
  CreditCard,
  DollarSign,
  Receipt,
  FileText,
  Clock,
  RotateCcw,
  Scissors,
  CheckCircle2,
  AlertCircle,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  ChevronRight,
  ExternalLink,
  Shield,
  Coffee,
  UtensilsCrossed,
  Sparkles,
  Smartphone,
  Banknote,
  Grid,
  Users,
  Settings,
  X,
  Bell,
  Sun,
  Moon,
  Laptop,
  Building2,
  Crown,
  ArrowUpRight,
  BookOpen
} from 'lucide-react';
import { FastCashierPosApp } from './components/fast-cashier/FastCashierPosApp';
import { SeatBillingApp } from './components/seat-billing/SeatBillingApp';
import { KotVoidAuditApp } from './components/kot-void/KotVoidAuditApp';
import { BlindShiftCloseModal } from './components/billing/BlindShiftCloseModal';
import { SplitBillModal } from './components/billing/SplitBillModal';
import { NightAuditApp } from './components/night-audit/NightAuditApp';
import { QuickPolicyReferenceModal } from '../../../packages/ui/src/pms/QuickPolicyReferenceModal';
import { OpenBillsView } from './views/OpenBillsView';
import { PaymentHistoryView } from './views/PaymentHistoryView';
import { CashDrawerView } from './views/CashDrawerView';
import { ShiftManagementView } from './views/ShiftManagementView';
import { ReceiptsView } from './views/ReceiptsView';
import { CashierTableManagementView } from './views/CashierTableManagementView';
import { RoomChargesPosView } from './views/RoomChargesPosView';
import { ExpensesView } from './views/ExpensesView';
import { CashierReportsView } from './views/CashierReportsView';
import { CashierSettingsView } from './views/CashierSettingsView';
import { API_ORIGIN } from './config/api';
import { getApiClient } from './lib/apiClient';

const API_BASE = API_ORIGIN;

export interface CashierStandaloneAppProps {
  onNavigatePortal?: (portal: 'admin' | 'cashier' | 'reception') => void;
}

type EmbeddedBillTab = 'dine-in' | 'takeaway' | 'room' | 'pending';
interface EmbeddedOpenBill {
  id: string;
  billNo: string;
  table: string;
  items: string;
  amount: number;
  time: string;
  status: 'Open' | 'Pending';
  type: Exclude<EmbeddedBillTab, 'pending'>;
}

interface EmbeddedPayment {
  id: string;
  time: string;
  billNo: string;
  type: string;
  amount: number;
  method: string;
  status: string;
}

interface OrderItem {
  id: string;
  name: string;
  qty: number;
  price: number;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
}

interface SnapshotOpenBill {
  id: string;
  billNo: string;
  table: string;
  itemCount: number;
  amount: number;
  dueAmount: number;
  time: string;
  status: 'Open' | 'Pending';
  type: 'dine-in' | 'takeaway' | 'room';
}

interface SnapshotPayment {
  id: string;
  time: string;
  billNo: string;
  type: string;
  amount: number;
  method: string;
  mode: string;
  status: string;
}

interface CashierShiftSnapshot {
  id: string | null;
  status: string;
  openingFloat: number;
  totalSales: number;
  cashSales: number;
  upiSales: number;
  cardSales: number;
  refunds: number;
  pettyCash?: number;
  pettyCashCount?: number;
  expectedCash?: number;
}

export const CashierStandaloneApp: React.FC<CashierStandaloneAppProps> = ({ onNavigatePortal }) => {
  const [activeSidebarItem, setActiveSidebarItem] = useState('POS / Billing');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Items');
  const [searchQuery, setSearchQuery] = useState('');
  const [openBillsTab, setOpenBillsTab] = useState<EmbeddedBillTab>('dine-in');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const paymentAttemptRef = useRef<{ signature: string; key: string } | null>(null);

  // Theme State (Dark / Light with persistence)
  const [clock, setClock] = useState(() => new Date());
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('spicehub_cashier_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'light';
  });

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('spicehub_cashier_theme', next);
    }
  };

  const isDark = theme === 'dark';

  // Current Order State
  const [orderTable, setOrderTable] = useState('Table 5 (Dine-in)');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderNote, setOrderNote] = useState('');
  const [notesList, setNotesList] = useState<string[]>([]);

  // Live workspace data
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [openBills, setOpenBills] = useState<EmbeddedOpenBill[]>([]);
  const [recentPayments, setRecentPayments] = useState<EmbeddedPayment[]>([]);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [shiftId, setShiftId] = useState<string | null>(null);

  // Modals
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [receiptModalData, setReceiptModalData] = useState<any | null>(null);
  const [successPaymentToast, setSuccessPaymentToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setSuccessPaymentToast(msg);
    setTimeout(() => setSuccessPaymentToast(null), 4000);
  };

  // Stats / Shift Balance — populated from the live cashier snapshot.
  const [drawerBalance, setDrawerBalance] = useState({
    openingFloat: 0,
    totalSales: 0,
    cashSales: 0,
    upiSales: 0,
    cardSales: 0,
    refunds: 0,
    pettyCash: 0,
    pettyCashCount: 0,
    expectedCash: 0,
  });

  const loadCashierSnapshot = async () => {
    try {
      const response = await getApiClient().request<{
        success: boolean;
        data: {
          openBills: SnapshotOpenBill[];
          recentPayments: SnapshotPayment[];
          shift: CashierShiftSnapshot;
        };
      }>('GET', '/api/v1/fast-cashier/snapshot');

      const openRows = response.data?.openBills || [];
      setOpenBills(
        openRows.map((bill) => ({
          id: bill.id,
          billNo: bill.billNo,
          table: bill.table,
          items: `${bill.itemCount} item${bill.itemCount === 1 ? '' : 's'}`,
          amount: Number(bill.dueAmount || bill.amount || 0),
          time: new Date(bill.time).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          status: bill.status,
          type: bill.type,
        }))
      );

      setRecentPayments(
        (response.data?.recentPayments || []).map((payment) => ({
          id: payment.id,
          time: new Date(payment.time).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          billNo: payment.billNo,
          type: payment.type,
          amount: Number(payment.amount || 0),
          method: payment.method,
          status: payment.status,
        }))
      );

      const shift = response.data?.shift;
      if (shift) {
        setShiftId(shift.id || null);
        setDrawerBalance({
          openingFloat: Number(shift.openingFloat || 0),
          totalSales: Number(shift.totalSales || 0),
          cashSales: Number(shift.cashSales || 0),
          upiSales: Number(shift.upiSales || 0),
          cardSales: Number(shift.cardSales || 0),
          refunds: Number(shift.refunds || 0),
          pettyCash: Number(shift.pettyCash || 0),
          pettyCashCount: Number(shift.pettyCashCount || 0),
          expectedCash: Number(shift.expectedCash || 0),
        });
      }
      setSnapshotError(null);
    } catch (err: any) {
      setSnapshotError(err?.message || 'Live cashier data could not be loaded.');
    }
  };

  const loadMenu = async () => {
    setMenuLoading(true);
    setMenuError(null);
    try {
      const client = getApiClient();
      const hotelId = client.getHotelId();
      if (!hotelId) throw new Error('Hotel context missing. Please sign in again.');
      const response = await client.request<{
        success: boolean;
        data: Array<{
          id: string;
          name: string;
          price?: number;
          basePrice?: number;
          categoryName?: string;
          images?: string[];
          isAvailable?: boolean;
        }>;
      }>('GET', '/api/v1/pos/menu', undefined, { hotelId, inStockOnly: true });
      const rows = response.data || [];
      setMenuItems(
        rows.map((item) => ({
          id: item.id,
          name: item.name,
          price: Number(item.price ?? item.basePrice ?? 0),
          category: item.categoryName || 'Other',
          image:
            item.images?.[0] ||
            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=80',
        }))
      );
    } catch (err: any) {
      setMenuItems([]);
      setMenuError(err?.message || 'Menu could not be loaded.');
    } finally {
      setMenuLoading(false);
    }
  };

  useEffect(() => {
    void loadMenu();
    void loadCashierSnapshot();
    const timer = window.setInterval(() => void loadCashierSnapshot(), 30000);
    return () => window.clearInterval(timer);
  }, []);

  // Calculate Subtotal & Totals
  const subtotal = orderItems.reduce((acc, item) => acc + item.qty * item.price, 0);
  const gst = Math.round(subtotal * 0.05);
  const discount = 0;
  const grandTotal = subtotal + gst - discount;

  const visibleOpenBills = openBills.filter((bill) =>
    openBillsTab === 'pending' ? bill.status === 'Pending' : bill.type === openBillsTab
  );
  const openBillCounts = {
    dineIn: openBills.filter((bill) => bill.type === 'dine-in').length,
    takeaway: openBills.filter((bill) => bill.type === 'takeaway').length,
    room: openBills.filter((bill) => bill.type === 'room').length,
    pending: openBills.filter((bill) => bill.status === 'Pending').length,
  };
  const menuCategories = ['All Items', ...Array.from(new Set(menuItems.map((item) => item.category)))];
  const openTableCount = new Set(
    openBills.filter((bill) => bill.type === 'dine-in').map((bill) => bill.table)
  ).size;
  const paymentTotal = drawerBalance.totalSales;
  const otherSales = Math.max(
    0,
    paymentTotal - drawerBalance.upiSales - drawerBalance.cashSales - drawerBalance.cardSales
  );
  const share = (value: number) =>
    paymentTotal > 0 ? Math.round((value / paymentTotal) * 100) : 0;
  const upiShare = share(drawerBalance.upiSales);
  const cashShare = share(drawerBalance.cashSales);
  const cardShare = share(drawerBalance.cardSales);
  const otherShare = Math.max(0, 100 - upiShare - cashShare - cardShare);
  const currentBill = openBills.find(
    (bill) => orderTable === bill.table || orderTable.startsWith(bill.table)
  );

  // Add Item to Order
  const handleAddItem = (item: MenuItem) => {
    setOrderItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { id: item.id, name: item.name, qty: 1, price: item.price }];
    });
  };

  const handleUpdateQty = (id: string, delta: number) => {
    setOrderItems((prev) =>
      prev
        .map((i) => {
          if (i.id === id) {
            const nextQty = i.qty + delta;
            return nextQty > 0 ? { ...i, qty: nextQty } : null;
          }
          return i;
        })
        .filter(Boolean) as OrderItem[]
    );
  };

  const handleRemoveItem = (id: string) => {
    setOrderItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleClearOrder = () => {
    if (confirm('Clear current order items?')) {
      setOrderItems([]);
    }
  };

  const handleAddNote = () => {
    if (!orderNote.trim()) return;
    setNotesList((prev) => [...prev, orderNote.trim()]);
    setOrderNote('');
  };

  // Process Quick Payment through the authoritative billing API.
  const handleProcessPayment = async (method: 'Cash' | 'UPI' | 'Card' | 'Split') => {
    if (orderItems.length === 0) {
      triggerToast('Order is empty. Add at least one menu item before taking payment.');
      return;
    }

    if (method === 'Split') {
      setIsSplitModalOpen(true);
      return;
    }

    if (isProcessingPayment) return;

    setIsProcessingPayment(true);
    try {
      const readStored = (key: string) =>
        typeof window !== 'undefined' ? localStorage.getItem(key) || '' : '';

      let resolvedHotelId = readStored('spicehub_hotel_id') || readStored('hotelId');
      if (!resolvedHotelId) {
        const ctxRes = await fetch(`${API_BASE}/api/v1/pos/demo-context`);
        const ctxBody = await ctxRes.json().catch(() => null);
        resolvedHotelId = ctxBody?.data?.hotel?.id || '';
      }
      if (!resolvedHotelId) {
        throw new Error('Hotel context missing. Please sign in again.');
      }

      const authToken = readStored('spicehub_token') || readStored('token');
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-hotel-id': resolvedHotelId,
      };
      if (authToken) authHeaders.Authorization = `Bearer ${authToken}`;

      const tableDigits = orderTable.match(/\d+/)?.[0];
      const lookupUrl = new URL(`${API_BASE}/api/v1/pos/table-session/active`);
      lookupUrl.searchParams.set('hotelId', resolvedHotelId);
      lookupUrl.searchParams.set(
        'tableNumber',
        tableDigits ? `Table ${tableDigits}` : orderTable.replace(/\s*\([^)]*\)\s*/g, '').trim()
      );

      const lookupRes = await fetch(lookupUrl.toString(), { headers: authHeaders });
      const lookupBody = await lookupRes.json().catch(() => null);
      if (!lookupRes.ok || !lookupBody?.success || !lookupBody?.data?.tableSessionId) {
        throw new Error(
          lookupBody?.message ||
            `No active guest session found for ${orderTable}. Ask the waiter to seat the table first.`
        );
      }

      const tableSessionId = String(lookupBody.data.tableSessionId);
      const itemSignature = `${tableSessionId}|${orderItems
        .map((item) => `${item.id}:${item.qty}:${item.price}`)
        .join(',')}`;

      if (!paymentAttemptRef.current || paymentAttemptRef.current.signature !== itemSignature) {
        paymentAttemptRef.current = {
          signature: itemSignature,
          key: `POS-${tableSessionId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        };
      }
      const attemptKey = paymentAttemptRef.current.key;

      // 1. Place the current POS items on the authoritative table session.
      const orderRes = await fetch(`${API_BASE}/api/v1/pos/orders/place`, {
        method: 'POST',
        headers: { ...authHeaders, 'x-idempotency-key': attemptKey },
        body: JSON.stringify({
          hotelId: resolvedHotelId,
          tableId: lookupBody.data.tableId,
          tableSessionId,
          guestCount: Number(lookupBody.data.guestCount) || 2,
          orderType: 'DINE_IN',
          items: orderItems.map((item) => ({
            menuItemId: item.id,
            name: item.name,
            price: item.price,
            quantity: item.qty,
          })),
          cookingInstructions: notesList.join(' | '),
          idempotencyKey: attemptKey,
        }),
      });
      const orderBody = await orderRes.json().catch(() => null);
      if (!orderRes.ok || !orderBody?.success) {
        throw new Error(orderBody?.message || 'Kitchen could not accept this order. Payment was not taken.');
      }

      // 2. Generate the locked bill snapshot from server-side order totals.
      const billRes = await fetch(`${API_BASE}/api/v1/billing/bill/generate`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ hotelId: resolvedHotelId, tableSessionId }),
      });
      const billBody = await billRes.json().catch(() => null);
      if (!billRes.ok || !billBody?.success || !billBody?.data) {
        throw new Error(billBody?.message || 'Server could not generate the table bill.');
      }

      const bill = billBody.data;
      const payable = Number(bill.dueAmount ?? bill.grandTotal);
      if (!Number.isFinite(payable) || payable <= 0) {
        throw new Error('This bill has no outstanding balance.');
      }

      // 3. Settle through the payment API. Local state is updated only after success.
      const paymentMode = method === 'Cash' ? 'CASH' : method === 'UPI' ? 'UPI' : 'CARD';
      const settleKey = `PAY-${attemptKey}`;
      const settleRes = await fetch(`${API_BASE}/api/v1/billing/settle`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'x-idempotency-key': settleKey,
          'x-session-token': String(billBody?.sessionToken || ''),
        },
        body: JSON.stringify({
          hotelId: resolvedHotelId,
          billId: bill._id,
          tableSessionId,
          paymentMode,
          amount: payable,
          cashReceived: paymentMode === 'CASH' ? Math.max(payable, grandTotal) : undefined,
          idempotencyKey: settleKey,
        }),
      });
      const settleBody = await settleRes.json().catch(() => null);
      if (!settleRes.ok || !settleBody?.success) {
        throw new Error(settleBody?.message || 'Payment gateway rejected the settlement.');
      }

      const paidAmount = payable;
      const changeReturned = Number(settleBody?.data?.changeReturned) || 0;

      setDrawerBalance((prev) => ({
        ...prev,
        totalSales: prev.totalSales + paidAmount,
        cashSales: method === 'Cash' ? prev.cashSales + paidAmount : prev.cashSales,
        upiSales: method === 'UPI' ? prev.upiSales + paidAmount : prev.upiSales,
        cardSales: method === 'Card' ? prev.cardSales + paidAmount : prev.cardSales,
      }));

      setSuccessPaymentToast(
        `Payment of ₹${paidAmount} settled via ${method}! ${
          changeReturned > 0 ? `Change ₹${changeReturned}. ` : ''
        }Bill ${bill.billNumber || ''} closed.`
      );
      setTimeout(() => setSuccessPaymentToast(null), 5000);

      setReceiptModalData({
        billNo: bill.billNumber || `#B${Date.now().toString().slice(-4)}`,
        table: orderTable,
        items: [...orderItems],
        subtotal: Number(bill.subTotal) || subtotal,
        gst: Number(bill.totalTax) || gst,
        grandTotal: paidAmount,
        method,
        changeReturned,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });

      setOrderItems([]);
      setNotesList([]);
      paymentAttemptRef.current = null;
    } catch (err: any) {
      triggerToast(
        `Payment failed: ${err?.message || 'Unknown error'}. No local drawer/accounting entry was created.`
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Filter food items
  const filteredMenuItems = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === 'All Items' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('spicehub_token') || localStorage.getItem('token') || ''
      : '';
  const hotelId =
    typeof window !== 'undefined'
      ? localStorage.getItem('spicehub_hotel_id') || localStorage.getItem('hotelId') || ''
      : '';
  const cashierName = (() => {
    if (typeof window === 'undefined') return 'Cashier';
    try {
      const raw = localStorage.getItem('spicehub_auth_user');
      if (!raw) return 'Cashier';
      const user = JSON.parse(raw);
      return user?.name || user?.email || 'Cashier';
    } catch {
      return 'Cashier';
    }
  })();

  return (
    <div className={`flex h-screen w-screen overflow-hidden font-sans select-none antialiased transition-colors duration-200 ${
      isDark ? 'bg-[#0f1118] text-slate-100' : 'bg-[#f4f5f8] text-slate-800'
    }`}>
      {/* Toast Notification */}
      {successPaymentToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-3 transition-all duration-200 border border-emerald-500/30">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span className="font-semibold text-sm">{successPaymentToast}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* LEFT SIDEBAR: DARK CHARCOAL EXACT REPLICA                */}
      {/* ======================================================== */}
      <aside className="w-64 bg-[#14151b] text-slate-300 flex flex-col justify-between shrink-0 border-r border-slate-800 shadow-xl z-20">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo & Header */}
          <div className="p-4 flex items-center gap-3 border-b border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-950/40">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-black text-lg text-white tracking-tight flex items-center gap-1.5">
                SpiceHub
              </div>
              <p className="text-[11px] text-amber-500 font-medium">Restaurant & Hotel</p>
            </div>
          </div>

          {/* Nav Items List (Scrollable) */}
          <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1 text-xs font-semibold custom-scrollbar">
            {[
              { label: 'POS / Billing', icon: Receipt },
              { label: 'Open Bills', icon: Clock },
              { label: 'Payment History', icon: FileText },
              { label: 'Split Bills', icon: Scissors },
              { label: 'Refunds & Void', icon: RotateCcw },
              { label: 'Cash Drawer', icon: DollarSign },
              { label: 'Shift Management', icon: Clock },
              { label: 'Receipts', icon: Receipt },
              { label: 'Daily Summary', icon: FileText },
              { label: 'Table Management', icon: Grid },
              { label: 'Room Charges (F&B)', icon: Coffee },
              { label: 'Guest Folio Payment', icon: CreditCard },
              { label: 'Expenses (Front Desk)', icon: Banknote },
              { label: 'Reports', icon: FileText },
              { label: 'Settings', icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeSidebarItem === item.label;
              return (
                <button
                  key={item.label}
                  onClick={() => setActiveSidebarItem(item.label)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${
                    isActive
                      ? 'bg-amber-600 text-white font-bold shadow-md shadow-amber-900/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-amber-200" />}
                </button>
              );
            })}
          </nav>

          {/* Cashier User Box with End Shift Button */}
          <div className="p-3 border-t border-slate-800/80 bg-[#0f1015]">
            <div className="flex items-center gap-3 mb-2.5">
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"
                  alt="Cashier"
                  className="w-9 h-9 rounded-full object-cover border border-amber-500/40"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0f1015]" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">{cashierName}</div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  Cashier <span className="text-emerald-400 font-bold">● Online</span>
                </div>
              </div>
            </div>

            <div className="space-y-0.5 text-[10px] text-slate-400 px-1 mb-2.5 font-medium">
              <div>Shift: {shiftId ? 'Open' : 'Closed'}</div>
              <div>Terminal: Live</div>
              <div>
                Cash in Hand:{' '}
                <span className="text-white font-bold">
                  ₹{(drawerBalance.expectedCash || Math.max(0, drawerBalance.openingFloat + drawerBalance.cashSales - drawerBalance.pettyCash)).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsShiftModalOpen(true)}
              className="w-full py-1.5 rounded-lg text-xs font-bold bg-[#7f1d1d] hover:bg-red-700 text-white transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>End Shift</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* MAIN VIEWPORT: CASHIER BILLING DASHBOARD                 */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className={`px-6 py-2.5 border-b flex items-center justify-between shrink-0 shadow-xs z-10 transition-colors ${
          isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-black">
              <Receipt className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h1 className={`text-lg font-black tracking-tight flex items-center gap-2 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                Cashier (POS & Billing)
              </h1>
              <p className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Quick & Easy Billing • Multiple Payment Options • Split Bills • Dine-in, Takeaway, Room Charges
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Clock */}
            <div className={`hidden md:flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border ${
              isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}>
              <Clock className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
              <span>
                {clock.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                {' | '}
                {clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => {
                const notices = [
                  shiftId ? 'Cashier shift is open.' : 'No cashier shift is open.',
                  snapshotError ? `Data sync issue: ${snapshotError}` : 'Live cashier snapshot is connected.',
                  `${openBills.length} open bill${openBills.length === 1 ? '' : 's'} awaiting settlement.`,
                ];
                triggerToast(`Cashier Notifications: ${notices.join(' ')}`);
              }}
              className={`relative p-2 rounded-lg transition ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
              title="Cashier operational notifications"
            >
              <Bell className="w-4 h-4" />
              {(openBills.length > 0 || !shiftId || snapshotError) && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center">
                  {(openBills.length > 0 ? 1 : 0) + (!shiftId ? 1 : 0) + (snapshotError ? 1 : 0)}
                </span>
              )}
            </button>

            {/* Theme Toggle Button */}
            <button
              data-testid="theme-toggle-btn"
              onClick={toggleTheme}
              className={`p-2 rounded-lg border transition ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-amber-600 hover:bg-slate-200'
              }`}
              title={isDark ? 'Switch to Bright Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Quick Policies & Rules Guide Button */}
            <button
              onClick={() => setIsPolicyModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition shadow-sm"
              title="Open Quick Policy Reference & SOP Manual"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Policies & SOP</span>
            </button>

            {/* Quick Portals Switcher */}
            <button
              onClick={() => {
                window.location.href = getPortalUrl('reception');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-600 hover:text-white transition shadow-sm"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Reception Portal</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>

            <button
              onClick={() => {
                window.location.href = getPortalUrl('admin');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition shadow-sm ${
                isDark
                  ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                  : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              <span>Hotel Admin</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </header>

        {/* Content Body (2 Columns Layout matching image) */}
        <div className="flex-1 flex overflow-hidden min-h-0 p-4 gap-4">
          {/* LEFT 65% COLUMN: Menu Grid & Bills Tables */}
          <div className="flex-1 flex flex-col gap-4 overflow-y-auto min-h-0 pr-1 custom-scrollbar">
            {/* Top 4 Stat / Action Cards */}
            <div className="grid grid-cols-4 gap-3 shrink-0">
              {/* Card 1: New Bill */}
              <button
                onClick={() => {
                  setOrderItems([]);
                  setNotesList([]);
                }}
                className={`p-3 rounded-2xl border flex items-center gap-3 hover:shadow-md transition text-left ${
                  isDark ? 'bg-blue-950/40 border-blue-800/80 hover:bg-blue-950/60' : 'bg-[#eef4ff] border-blue-200'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className={`font-extrabold text-xs ${isDark ? 'text-blue-200' : 'text-blue-950'}`}>New Bill</div>
                  <div className="text-[10px] text-blue-500 font-semibold">Dine-in / Takeaway</div>
                </div>
              </button>

              {/* Card 2: Open Tables */}
              <div
                onClick={() => setActiveSidebarItem('Table Management')}
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition hover:scale-102 ${
                  isDark ? 'bg-emerald-950/40 border-emerald-800/80 hover:bg-emerald-950/60' : 'bg-[#ecfdf5] border-emerald-200'
                }`}
              >
                <div>
                  <div className={`font-extrabold text-xs ${isDark ? 'text-emerald-200' : 'text-emerald-950'}`}>Open Tables</div>
                  <div className="text-[10px] text-emerald-500 font-semibold">View</div>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-black text-xs">
                  {openTableCount}
                </div>
              </div>

              {/* Card 3: Open Room Bills */}
              <div
                onClick={() => setActiveSidebarItem('Room Charges (F&B)')}
                className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition hover:scale-102 ${
                  isDark ? 'bg-purple-950/40 border-purple-800/80 hover:bg-purple-950/60' : 'bg-[#f5f3ff] border-purple-200'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black">
                  <Coffee className="w-5 h-5" />
                </div>
                <div>
                  <div className={`font-extrabold text-xs ${isDark ? 'text-purple-200' : 'text-purple-950'}`}>Open Room Bills</div>
                  <div className="text-[10px] text-purple-500 font-semibold">View</div>
                </div>
              </div>

              {/* Card 4: Pending Payments */}
              <div
                onClick={() => setActiveSidebarItem('Open Bills')}
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition hover:scale-102 ${
                  isDark ? 'bg-rose-950/40 border-rose-800/80 hover:bg-rose-950/60' : 'bg-[#fff1f2] border-rose-200'
                }`}
              >
                <div>
                  <div className={`font-extrabold text-xs ${isDark ? 'text-rose-200' : 'text-rose-950'}`}>Pending Payments</div>
                  <div className="text-[10px] text-rose-500 font-semibold">View</div>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-black text-xs">
                  {openBillCounts.pending} View
                </div>
              </div>
            </div>

            {snapshotError && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-300">
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {snapshotError}
                </span>
                <button
                  onClick={() => void loadCashierSnapshot()}
                  className="font-bold underline whitespace-nowrap"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Sub-view switcher for special tabs */}
            {activeSidebarItem === 'Open Bills' ? (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <OpenBillsView
                  isDark={isDark}
                  onToast={triggerToast}
                  onSelectBillForPos={(tbl) => {
                    setOrderTable(tbl);
                    setActiveSidebarItem('POS / Billing');
                  }}
                  onSettleBill={(_id, tbl, _amt, _mode) => {
                    setOrderTable(tbl);
                    setActiveSidebarItem('POS / Billing');
                    triggerToast(`${tbl} loaded into POS. Use Cash / UPI / Card to settle against the live bill.`);
                  }}
                />
              </div>
            ) : activeSidebarItem === 'Payment History' ? (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <PaymentHistoryView isDark={isDark} onToast={triggerToast} />
              </div>
            ) : activeSidebarItem === 'Split Bills' ? (
              <div className={`flex-1 min-h-0 overflow-y-auto p-4 rounded-2xl border transition-colors ${
                isDark ? 'bg-[#141620] border-slate-800 text-slate-100' : 'bg-white border-slate-200'
              }`}>
                <SeatBillingApp />
              </div>
            ) : activeSidebarItem === 'Refunds & Void' ? (
              <div className={`flex-1 min-h-0 overflow-y-auto p-4 rounded-2xl border transition-colors ${
                isDark ? 'bg-[#141620] border-slate-800 text-slate-100' : 'bg-white border-slate-200'
              }`}>
                <KotVoidAuditApp hotelId={hotelId} />
              </div>
            ) : activeSidebarItem === 'Cash Drawer' ? (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <CashDrawerView
                  isDark={isDark}
                  onToast={triggerToast}
                  drawerBalance={drawerBalance}
                  shiftId={shiftId}
                  onRefresh={loadCashierSnapshot}
                />
              </div>
            ) : activeSidebarItem === 'Shift Management' ? (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <ShiftManagementView
                  isDark={isDark}
                  onToast={triggerToast}
                  onOpenShiftModal={() => setIsShiftModalOpen(true)}
                  drawerBalance={drawerBalance}
                  shiftId={shiftId}
                />
              </div>
            ) : activeSidebarItem === 'Receipts' ? (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <ReceiptsView isDark={isDark} onToast={triggerToast} />
              </div>
            ) : activeSidebarItem === 'Daily Summary' ? (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <NightAuditApp token={token} hotelId={hotelId} />
              </div>
            ) : activeSidebarItem === 'Table Management' ? (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <CashierTableManagementView
                  isDark={isDark}
                  onToast={triggerToast}
                  onSelectTableForBilling={(tbl) => {
                    setOrderTable(tbl);
                    setActiveSidebarItem('POS / Billing');
                  }}
                />
              </div>
            ) : activeSidebarItem === 'Room Charges (F&B)' || activeSidebarItem === 'Guest Folio Payment' ? (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <RoomChargesPosView isDark={isDark} onToast={triggerToast} />
              </div>
            ) : activeSidebarItem === 'Expenses (Front Desk)' ? (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <ExpensesView
                  isDark={isDark}
                  onToast={triggerToast}
                  onExpenseRecorded={loadCashierSnapshot}
                />
              </div>
            ) : activeSidebarItem === 'Reports' ? (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <CashierReportsView
                  isDark={isDark}
                  onToast={triggerToast}
                  drawerBalance={drawerBalance}
                  openBills={openBills}
                  recentPayments={recentPayments}
                />
              </div>
            ) : activeSidebarItem === 'Settings' ? (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <CashierSettingsView isDark={isDark} onToast={triggerToast} />
              </div>
            ) : (
              <>
                {/* Food Menu Section */}
                <div className={`p-4 rounded-2xl border shadow-2xs space-y-3 transition-colors ${
                  isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  {/* Category Pills & Search */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                      {menuCategories.map(
                        (cat) => (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                              selectedCategory === cat
                                ? 'bg-amber-600 text-white shadow-xs'
                                : isDark
                                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {cat}
                          </button>
                        )
                      )}
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className={`w-3.5 h-3.5 absolute left-3 top-2.5 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
                      <input
                        type="text"
                        placeholder="Search food items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                          isDark
                            ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                            : 'bg-slate-100 border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Food Items Grid (4x2 cards) */}
                  {menuLoading ? (
                    <div className="py-10 text-center text-xs font-semibold text-slate-400">
                      Loading live menu…
                    </div>
                  ) : menuError ? (
                    <div className="py-8 text-center text-xs text-rose-400">
                      <p>{menuError}</p>
                      <button onClick={() => void loadMenu()} className="mt-2 font-bold underline">
                        Retry menu
                      </button>
                    </div>
                  ) : filteredMenuItems.length === 0 ? (
                    <div className="py-10 text-center text-xs font-semibold text-slate-400">
                      No available menu items in this category.
                    </div>
                  ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {filteredMenuItems.map((item) => (
                      <div
                        key={item.id}
                        className={`p-2 rounded-xl border transition group flex flex-col justify-between ${
                          isDark
                            ? 'bg-[#1b1e2b] border-slate-800 hover:border-amber-500/50'
                            : 'bg-slate-50 border-slate-200 hover:border-amber-300 hover:shadow-xs'
                        }`}
                      >
                        <div className={`relative w-full h-24 rounded-lg overflow-hidden mb-2 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        </div>
                        <div>
                          <div className={`font-bold text-xs truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.name}</div>
                          <div className="flex items-center justify-between mt-1">
                            <span className={`font-black text-xs ${isDark ? 'text-amber-400' : 'text-slate-800'}`}>₹{item.price}</span>
                            <button
                              onClick={() => handleAddItem(item)}
                              className="w-6 h-6 rounded-md bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center transition shadow-2xs"
                              title="Add to current order"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  )}
                </div>

                {/* Open Bills (Dine-in) Table Section */}
                <div className={`p-4 rounded-2xl border shadow-2xs space-y-3 transition-colors ${
                  isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-extrabold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>Open Bills (Dine-in)</h3>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setOpenBillsTab('dine-in')}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            openBillsTab === 'dine-in'
                              ? 'bg-amber-600 text-white'
                              : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          Dine-in ({openBillCounts.dineIn})
                        </button>
                        <button
                          onClick={() => setOpenBillsTab('takeaway')}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            openBillsTab === 'takeaway'
                              ? 'bg-amber-600 text-white'
                              : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          Takeaway ({openBillCounts.takeaway})
                        </button>
                        <button
                          onClick={() => setOpenBillsTab('room')}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            openBillsTab === 'room'
                              ? 'bg-amber-600 text-white'
                              : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          Room ({openBillCounts.room})
                        </button>
                        <button
                          onClick={() => setOpenBillsTab('pending')}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            openBillsTab === 'pending'
                              ? 'bg-amber-600 text-white'
                              : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          Pending ({openBillCounts.pending})
                        </button>
                      </div>
                    </div>
                    <button className="text-[11px] font-bold text-blue-500 hover:underline">
                      View All
                    </button>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left">
                      <thead className={`font-bold border-b ${
                        isDark ? 'bg-slate-900/80 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-400 border-slate-100'
                      }`}>
                        <tr>
                          <th className="py-2 px-3">Bill No</th>
                          <th className="py-2 px-3">Table</th>
                          <th className="py-2 px-3">Items</th>
                          <th className="py-2 px-3">Amount</th>
                          <th className="py-2 px-3">Time</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                        {visibleOpenBills.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-6 text-center text-slate-400 font-semibold">
                              No {openBillsTab === 'pending' ? 'pending' : openBillsTab} bills right now.
                            </td>
                          </tr>
                        ) : visibleOpenBills.map((b) => (
                          <tr key={b.billNo} className={`transition ${isDark ? 'hover:bg-slate-800/40 text-slate-300' : 'hover:bg-slate-50/80 text-slate-700'}`}>
                            <td className="py-2 px-3 font-semibold">{b.billNo}</td>
                            <td className="py-2 px-3 font-bold text-orange-500">{b.table}</td>
                            <td className="py-2 px-3">{b.items}</td>
                            <td className={`py-2 px-3 font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>₹{b.amount}</td>
                            <td className="py-2 px-3 text-slate-400">{b.time}</td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                {b.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                onClick={() => {
                                  setOrderTable(b.table);
                                }}
                                className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 font-bold hover:bg-blue-600 hover:text-white transition"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Payments Section */}
                <div className={`p-4 rounded-2xl border shadow-2xs space-y-3 transition-colors ${
                  isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <Receipt className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`} />
                    <h3 className={`font-extrabold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>Recent Payments</h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left">
                      <thead className={`font-bold border-b ${
                        isDark ? 'bg-slate-900/80 text-slate-400 border-slate-800' : 'bg-[#fef9f5] text-amber-900/60 border-amber-100'
                      }`}>
                        <tr>
                          <th className="py-2 px-3">Time</th>
                          <th className="py-2 px-3">Bill No</th>
                          <th className="py-2 px-3">Type</th>
                          <th className="py-2 px-3">Amount</th>
                          <th className="py-2 px-3">Method</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                        {recentPayments.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-6 text-center text-slate-400 font-semibold">
                              No settled payments yet.
                            </td>
                          </tr>
                        ) : recentPayments.map((p) => (
                          <tr key={p.id} className={`transition ${isDark ? 'hover:bg-slate-800/40 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}>
                            <td className="py-2 px-3 text-slate-400">{p.time}</td>
                            <td className="py-2 px-3 font-semibold">{p.billNo}</td>
                            <td className="py-2 px-3">{p.type}</td>
                            <td className={`py-2 px-3 font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>₹{p.amount}</td>
                            <td className="py-2 px-3 font-semibold">{p.method}</td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                {p.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                onClick={() =>
                                  setReceiptModalData({
                                    billNo: p.billNo,
                                    table: `${p.type} Counter`,
                                    items: [
                                      { id: '1', name: 'Meal Set', qty: 1, price: p.amount },
                                    ],
                                    subtotal: p.amount,
                                    gst: 0,
                                    grandTotal: p.amount,
                                    method: p.method,
                                    time: p.time,
                                  })
                                }
                                className={`px-2.5 py-1 rounded border font-bold transition ${
                                  isDark
                                    ? 'border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white'
                                    : 'border-blue-200 text-blue-600 hover:bg-blue-50'
                                }`}
                              >
                                Receipt
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* RIGHT 35% COLUMN: only relevant on the POS / Billing workspace */}
          {activeSidebarItem === 'POS / Billing' && (
          <div className="w-96 flex flex-col gap-4 overflow-y-auto pl-1 custom-scrollbar shrink-0">
            {/* Card 1: Current Order */}
            <div className={`p-4 rounded-2xl border shadow-2xs space-y-3 transition-colors ${
              isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              {/* Order Header */}
              <div className={`flex items-center justify-between pb-2 border-b ${
                isDark ? 'border-slate-800' : 'border-slate-100'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{orderTable}</span>
                  <button
                    onClick={() => {
                      const next = prompt('Enter Table Number / Name:', 'Table 5 (Dine-in)');
                      if (next) setOrderTable(next);
                    }}
                    className="text-[11px] font-bold text-blue-500 hover:underline"
                  >
                    Change
                  </button>
                </div>
                <button
                  onClick={handleClearOrder}
                  className="p-1 rounded text-rose-500 hover:bg-rose-500/10 transition"
                  title="Clear order"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Order Items List */}
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                <div className={`grid grid-cols-12 text-[10px] font-bold border-b pb-1 ${
                  isDark ? 'text-slate-400 border-slate-800' : 'text-slate-400 border-slate-100'
                }`}>
                  <span className="col-span-6">Item</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-2 text-right">Price</span>
                  <span className="col-span-2 text-right">Total</span>
                </div>

                {orderItems.length === 0 ? (
                  <div className={`py-6 text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    No items in current order. Click '+' on menu items.
                  </div>
                ) : (
                  orderItems.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 text-xs items-center py-1">
                      <div className={`col-span-6 font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {item.name}
                      </div>
                      <div className="col-span-2 flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleUpdateQty(item.id, -1)}
                          className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                            isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          -
                        </button>
                        <span className={`font-bold text-[11px] ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.qty}</span>
                        <button
                          onClick={() => handleUpdateQty(item.id, 1)}
                          className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                            isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          +
                        </button>
                      </div>
                      <div className={`col-span-2 text-right ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>₹{item.price}</div>
                      <div className={`col-span-2 text-right font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        ₹{item.qty * item.price}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Note */}
              <div className={`flex gap-2 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <input
                  type="text"
                  placeholder="Add Note (e.g. Less Spicy)"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                  className={`flex-1 px-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    isDark
                      ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
                <button
                  onClick={handleAddNote}
                  className={`px-2.5 py-1.5 rounded-lg font-bold text-xs ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  +
                </button>
              </div>

              {/* Order Notes Badges */}
              {notesList.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {notesList.map((n, idx) => (
                    <span
                      key={idx}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        isDark ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {n}
                    </span>
                  ))}
                </div>
              )}

              {/* Breakdown */}
              <div className={`space-y-1.5 pt-2 border-t text-xs ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className={`flex justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>Subtotal</span>
                  <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>₹{subtotal}</span>
                </div>
                <div className={`flex justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>GST (5%)</span>
                  <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>₹{gst}</span>
                </div>
                <div className={`flex justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>Discount</span>
                  <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>₹{discount}</span>
                </div>
                <div className={`flex justify-between text-sm font-black pt-1 border-t ${
                  isDark ? 'text-white border-slate-800' : 'text-slate-900 border-slate-100'
                }`}>
                  <span>Total Amount</span>
                  <span className={`text-base ${isDark ? 'text-amber-400' : 'text-slate-950'}`}>₹{grandTotal}</span>
                </div>
              </div>

              {/* Action Buttons: Split, Hold, Print KOT */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  onClick={() => setIsSplitModalOpen(true)}
                  className={`py-1.5 rounded-lg font-bold text-xs transition ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Split Bill
                </button>
                <button
                  onClick={() => {
                    setOrderItems([]);
                    setNotesList([]);
                    triggerToast('Current bill cleared. No order was sent to the kitchen.');
                  }}
                  className={`py-1.5 rounded-lg font-bold text-xs transition ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Clear Bill
                </button>
                <button
                  onClick={() => {
                    void loadMenu();
                    void loadCashierSnapshot();
                    triggerToast('Menu and live cashier data refreshed.');
                  }}
                  className={`py-1.5 rounded-lg font-bold text-xs transition ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Refresh Data
                </button>
              </div>

              {/* 4 Big Payment Buttons (Exact image match) */}
              {isProcessingPayment && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] font-bold text-amber-500">
                  Processing secure payment… Do not close this screen.
                </div>
              )}
              <div className="grid grid-cols-4 gap-2 pt-1">
                <button
                  onClick={() => handleProcessPayment('Cash')}
                  disabled={isProcessingPayment}
                  className="py-2.5 rounded-xl bg-[#10b981] hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs shadow-sm flex flex-col items-center justify-center gap-0.5 transition"
                >
                  <Banknote className="w-4 h-4" />
                  <span>Cash</span>
                </button>

                <button
                  onClick={() => handleProcessPayment('UPI')}
                  disabled={isProcessingPayment}
                  className="py-2.5 rounded-xl bg-[#8b5cf6] hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs shadow-sm flex flex-col items-center justify-center gap-0.5 transition"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>UPI</span>
                </button>

                <button
                  onClick={() => handleProcessPayment('Card')}
                  disabled={isProcessingPayment}
                  className="py-2.5 rounded-xl bg-[#3b82f6] hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs shadow-sm flex flex-col items-center justify-center gap-0.5 transition"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Card</span>
                </button>

                <button
                  onClick={() => handleProcessPayment('Split')}
                  disabled={isProcessingPayment}
                  className={`py-2.5 rounded-xl font-extrabold text-xs shadow-sm flex flex-col items-center justify-center gap-0.5 transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDark
                      ? 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-600/40'
                      : 'bg-[#ffedd5] hover:bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  <span className="text-sm font-black">⋯</span>
                  <span>More</span>
                </button>
              </div>
            </div>

            {/* Card 2: Payment Methods Today (Donut chart & breakdown) */}
            <div className={`p-4 rounded-2xl border shadow-2xs space-y-3 transition-colors ${
              isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-500" />
                <h3 className={`font-extrabold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>Payment Methods Today</h3>
              </div>

              {paymentTotal === 0 ? (
                <div className="py-8 text-center text-[11px] font-semibold text-slate-400">
                  No payments collected today yet.
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div
                    className="relative w-28 h-28 shrink-0 rounded-full flex items-center justify-center"
                    style={{
                      background: `conic-gradient(#8b5cf6 0 ${upiShare}%, #10b981 ${upiShare}% ${upiShare + cashShare}%, #3b82f6 ${upiShare + cashShare}% ${upiShare + cashShare + cardShare}%, #94a3b8 ${upiShare + cashShare + cardShare}% 100%)`,
                    }}
                  >
                    <div className={`w-20 h-20 rounded-full flex flex-col items-center justify-center text-center ${isDark ? 'bg-[#141620]' : 'bg-white'}`}>
                      <span className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>₹{paymentTotal.toLocaleString('en-IN')}</span>
                      <span className="text-[8px] text-slate-400 font-bold uppercase">Total Collected</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-1 text-[11px]">
                    {[
                      { label: 'UPI', color: '#8b5cf6', pct: upiShare, amount: drawerBalance.upiSales },
                      { label: 'Cash', color: '#10b981', pct: cashShare, amount: drawerBalance.cashSales },
                      { label: 'Card', color: '#3b82f6', pct: cardShare, amount: drawerBalance.cardSales },
                      { label: 'Other', color: '#94a3b8', pct: otherShare, amount: otherSales },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: row.color }} /> {row.label}
                        </span>
                        <span className="text-slate-400">{row.pct}%</span>
                        <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>₹{row.amount.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Card 3: Shift Summary */}
            <div className={`p-4 rounded-2xl border shadow-2xs space-y-2.5 transition-colors ${
              isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className={`font-extrabold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>Shift Summary</h3>
                <button
                  onClick={() => setIsShiftModalOpen(true)}
                  className="text-[11px] font-bold text-blue-500 hover:underline"
                >
                  View Details
                </button>
              </div>

              <div className="space-y-1 text-xs">
                <div className={`flex justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>Opening Cash</span>
                  <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>₹{drawerBalance.openingFloat.toLocaleString('en-IN')}</span>
                </div>
                <div className={`flex justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>Total Sales</span>
                  <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>₹{drawerBalance.totalSales.toLocaleString('en-IN')}</span>
                </div>
                <div className={`flex justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>Cash Received</span>
                  <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>₹{drawerBalance.cashSales.toLocaleString('en-IN')}</span>
                </div>
                <div className={`flex justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>UPI Received</span>
                  <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>₹{drawerBalance.upiSales.toLocaleString('en-IN')}</span>
                </div>
                <div className={`flex justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>Card Received</span>
                  <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>₹{drawerBalance.cardSales.toLocaleString('en-IN')}</span>
                </div>
                <div className={`flex justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>Refunds</span>
                  <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>₹{drawerBalance.refunds}</span>
                </div>
                <div className={`flex justify-between font-black pt-1.5 border-t ${
                  isDark ? 'text-white border-slate-800' : 'text-slate-900 border-slate-100'
                }`}>
                  <span>Current Cash in Hand</span>
                  <span className={`text-sm ${isDark ? 'text-amber-400' : 'text-slate-900'}`}>₹{(drawerBalance.openingFloat + drawerBalance.cashSales).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODALS & INTEGRATIONS                                     */}
      {/* ======================================================== */}
      {/* 1. Thermal Receipt Modal */}
      {receiptModalData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl font-mono text-xs border border-slate-200">
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <div className="font-black text-base text-slate-900 tracking-wider">SPICEHUB LUXURY</div>
              <p className="text-[10px] text-slate-500">Restaurant & Resort • Main Counter</p>
              <p className="text-[10px] text-slate-400">GSTIN: 08AABCS1429B1Z4</p>
            </div>

            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1">
              <div className="flex justify-between">
                <span>Receipt: {receiptModalData.billNo}</span>
                <span>{receiptModalData.time}</span>
              </div>
              <div className="flex justify-between">
                <span>Area: {receiptModalData.table}</span>
                <span>Mode: {receiptModalData.method}</span>
              </div>
            </div>

            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1.5">
              {receiptModalData.items.map((i: any, idx: number) => (
                <div key={idx} className="flex justify-between">
                  <span>
                    {i.qty}x {i.name}
                  </span>
                  <span>₹{i.qty * i.price}</span>
                </div>
              ))}
            </div>

            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 font-bold">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{receiptModalData.subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>GST (5%):</span>
                <span>₹{receiptModalData.gst}</span>
              </div>
              <div className="flex justify-between text-sm pt-1 font-black">
                <span>Total Paid:</span>
                <span>₹{receiptModalData.grandTotal}</span>
              </div>
            </div>

            <div className="pt-3 text-center text-[10px] text-slate-400 space-y-3">
              <p>*** Thank You! Visit Again ***</p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    window.print();
                    setReceiptModalData(null);
                  }}
                  className="flex-1 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Print Thermal
                </button>
                <button
                  onClick={() => setReceiptModalData(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Blind Shift Close Modal */}
      <BlindShiftCloseModal
        cashierName={cashierName}
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        onSubmitShiftClose={async (data) => {
          if (!shiftId) {
            triggerToast('No open cashier shift found. Open a shift before closing it.');
            throw new Error('No open cashier shift found.');
          }

          const actualCountedCash = (data.noteCounts || []).reduce((sum, note) => {
            const lineTotal = Number(note.total);
            return sum + (Number.isFinite(lineTotal) && lineTotal > 0
              ? lineTotal
              : Number(note.denomination) * Number(note.count || 0));
          }, 0);

          try {
            const response = await getApiClient().request<{
              success: boolean;
              message: string;
              shift: {
                shiftNumber?: string;
                expectedCashInDrawer?: number;
                actualCashCounted?: number;
                cashVariance?: number;
              };
            }>('POST', '/api/v1/multi-tender/shift/close', {
              shiftId,
              actualCashCounted: actualCountedCash,
              notes: data.notes || '',
            });

            const shift = response.shift || {};
            const systemExpectedCash = Number(
              shift.expectedCashInDrawer ?? drawerBalance.openingFloat + drawerBalance.cashSales
            );
            const varianceAmount = Number(
              shift.cashVariance ?? actualCountedCash - systemExpectedCash
            );
            const status =
              Math.abs(varianceAmount) < 0.01
                ? 'BALANCED'
                : varianceAmount < 0
                  ? 'SHORTAGE'
                  : 'EXCESS';

            setIsShiftModalOpen(false);
            await loadCashierSnapshot();
            triggerToast(
              `Shift closed. Variance ₹${varianceAmount.toFixed(2)} (${status}).`
            );

            return {
              certificateNumber: `BSC-${shift.shiftNumber || shiftId.slice(-6)}`,
              systemExpectedCash,
              actualCountedCash,
              varianceAmount,
              status,
            };
          } catch (error: any) {
            triggerToast(error?.message || 'Shift close failed. No reconciliation was saved.');
            throw error;
          }
        }}
      />

      {/* 3. Split Bill Modal */}
      <SplitBillModal
        billNumber={currentBill?.billNo || 'Current bill'}
        grandTotal={grandTotal}
        isOpen={isSplitModalOpen}
        onClose={() => setIsSplitModalOpen(false)}
        onConfirmSplit={(splitType, splits) => {
          setIsSplitModalOpen(false);
          const shareLines = splits
            .map((share) => `Guest #${share.personNumber}: ₹${share.amount}`)
            .join(', ');
          triggerToast(
            `Split calculated (${splitType}): ${shareLines}. The bill remains open on the server; ` +
              'collect the shares and settle the full bill through Cash / UPI / Card.'
          );
        }}
      />

      {/* 4. Quick Policy Reference & SOP Modal */}
      <QuickPolicyReferenceModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        isDark={isDark}
      />
    </div>
  );
};
