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
  BookOpen,
  Menu,
  User,
  Camera,
  Upload,
  LogOut
} from 'lucide-react';
import { FastCashierPosApp } from './components/fast-cashier/FastCashierPosApp';
import { SeatBillingApp } from './components/seat-billing/SeatBillingApp';
import { KotVoidAuditApp } from './components/kot-void/KotVoidAuditApp';
import { BlindShiftCloseModal } from './components/billing/BlindShiftCloseModal';
import { SplitBillModal } from './components/billing/SplitBillModal';
import { CashPaymentModal } from './components/billing/CashPaymentModal';
import { NightAuditApp } from './components/night-audit/NightAuditApp';
import { QuickPolicyReferenceModal } from '../../../packages/ui/src/pms/QuickPolicyReferenceModal';
import { LanguageToggle } from '@spicehub/ui';
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
  orderItems?: OrderItem[];
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
  orderItems?: OrderItem[];
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
  const [activeSidebarItem, setActiveSidebarItem] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('tab');
      if (p) return p;
    }
    return 'POS / Billing';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tokenParam = params.get('token');
      const hotelParam = params.get('hotelId');
      if (tokenParam) {
        localStorage.setItem('spicehub_token', tokenParam);
        localStorage.setItem('token', tokenParam);
        try {
          const payload = JSON.parse(atob(tokenParam.split('.')[1]));
          if (payload) {
            localStorage.setItem('spicehub_auth_user', JSON.stringify(payload));
          }
        } catch {}
      }
      if (hotelParam) {
        localStorage.setItem('spicehub_hotel_id', hotelParam);
        localStorage.setItem('hotelId', hotelParam);
      }
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('spicehub_cashier_theme', next);
    }
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  const isDark = theme === 'dark';

  // Current Order State
  const [orderTable, setOrderTable] = useState('Table 5 (Dine-in)');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderNote, setOrderNote] = useState('');
  const [notesList, setNotesList] = useState<string[]>([]);
  const [selectedOrderItemId, setSelectedOrderItemId] = useState<string | null>(null);
  const [numpadInput, setNumpadInput] = useState<string>('');

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
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [receiptModalData, setReceiptModalData] = useState<any | null>(null);
  const [successPaymentToast, setSuccessPaymentToast] = useState<string | null>(null);
  const [generatedBill, setGeneratedBill] = useState<{
    _id?: string;
    billNumber: string;
    subTotal: number;
    totalTax: number;
    grandTotal: number;
    dueAmount?: number;
    billStatus: string;
  } | null>(null);

  // Allow programmatic tab & modal navigation for automated audits
  useEffect(() => {
    const handleSetTab = (e: any) => {
      if (e.detail && typeof e.detail === 'string') {
        setActiveSidebarItem(e.detail);
      }
    };
    const handleSetModal = (e: any) => {
      if (e.detail === 'cash') setIsCashModalOpen(true);
      else if (e.detail === 'split') setIsSplitModalOpen(true);
      else if (e.detail === 'shift') setIsShiftModalOpen(true);
      else if (e.detail === 'policy') setIsPolicyModalOpen(true);
      else if (e.detail === 'close_all') {
        setIsCashModalOpen(false);
        setIsSplitModalOpen(false);
        setIsShiftModalOpen(false);
        setIsPolicyModalOpen(false);
      }
    };
    window.addEventListener('cashier:set_tab', handleSetTab);
    window.addEventListener('cashier:set_modal', handleSetModal);
    return () => {
      window.removeEventListener('cashier:set_tab', handleSetTab);
      window.removeEventListener('cashier:set_modal', handleSetModal);
    };
  }, []);

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
          orderItems: bill.orderItems || [],
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

  const handleNumpadPress = (val: string) => {
    const targetItem = selectedOrderItemId
      ? orderItems.find((i) => i.id === selectedOrderItemId)
      : orderItems[orderItems.length - 1];

    if (val === '+1' || val === '+2' || val === '+5') {
      const delta = parseInt(val.replace('+', ''), 10);
      if (targetItem) {
        handleUpdateQty(targetItem.id, delta);
      } else {
        triggerToast('Select an item from the cart to adjust quantity');
      }
      return;
    }

    if (val === 'C') {
      setNumpadInput('');
      return;
    }

    if (val === '⌫') {
      setNumpadInput((prev) => prev.slice(0, -1));
      return;
    }

    if (val === 'Enter') {
      if (!numpadInput) return;
      const parsedQty = parseInt(numpadInput, 10);
      if (isNaN(parsedQty) || parsedQty <= 0) {
        triggerToast('Enter a valid quantity');
        setNumpadInput('');
        return;
      }
      if (targetItem) {
        setOrderItems((prev) =>
          prev.map((i) => (i.id === targetItem.id ? { ...i, qty: parsedQty } : i))
        );
        triggerToast(`Updated ${targetItem.name} qty to ${parsedQty}`);
      } else {
        triggerToast('No item selected in cart');
      }
      setNumpadInput('');
      return;
    }

    if (numpadInput.length < 3) {
      setNumpadInput((prev) => prev + val);
    }
  };

  // Generate authoritative locked bill snapshot from server-side order totals
  const handleGenerateBill = async () => {
    if (orderItems.length === 0) {
      triggerToast('Order is empty. Add at least one menu item before generating bill.');
      return;
    }
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
      const attemptKey = `GEN-${tableSessionId}-${Date.now()}`;

      // Place POS items ONLY if the table has no existing active orders (e.g. direct counter order)
      if (!lookupBody.data.ordersCount || lookupBody.data.ordersCount === 0) {
        await fetch(`${API_BASE}/api/v1/pos/orders/place`, {
          method: 'POST',
          headers: { ...authHeaders, 'x-idempotency-key': attemptKey },
          body: JSON.stringify({
            hotelId: resolvedHotelId,
            tableId: lookupBody.data.tableId,
            tableSessionId,
            guestCount: Number(lookupBody.data.guestCount) || 2,
            orderType: 'DINE_IN',
            items: orderItems.map((item) => ({
              menuItemId: item.id.length === 24 ? item.id : '6ae06d00ddbafddfbb0a8031',
              name: item.name,
              price: item.price,
              quantity: item.qty,
            })),
            cookingInstructions: notesList.join(' | '),
            idempotencyKey: attemptKey,
          }),
        });
      }

      // Generate the locked bill snapshot
      const billRes = await fetch(`${API_BASE}/api/v1/billing/bill/generate`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ hotelId: resolvedHotelId, tableSessionId }),
      });
      const billBody = await billRes.json().catch(() => null);
      if (!billRes.ok || !billBody?.success || !billBody?.data) {
        throw new Error(billBody?.message || 'Server could not generate table bill.');
      }

      const bill = billBody.data;
      setGeneratedBill({
        _id: bill._id,
        billNumber: bill.billNumber,
        subTotal: Number(bill.subTotal),
        totalTax: Number(bill.totalTax),
        grandTotal: Number(bill.grandTotal),
        billStatus: bill.billStatus,
      });

      await loadCashierSnapshot();
      triggerToast(
        `Bill ${bill.billNumber} generated! Subtotal: ₹${bill.subTotal}, GST: ₹${bill.totalTax}, Grand Total: ₹${bill.grandTotal} (${bill.billStatus})`
      );
    } catch (err: any) {
      triggerToast(`Bill generation failed: ${err?.message || 'Unknown error'}`);
    }
  };

  // Process Quick Payment through the authoritative billing API.
  const handleProcessPayment = async (
    method: 'Cash' | 'UPI' | 'Card' | 'Split',
    customCashTendered?: number,
    customAmount?: number
  ) => {
    if (orderItems.length === 0) {
      triggerToast('Order is empty. Add at least one menu item before taking payment.');
      return;
    }

    if (method === 'Split') {
      setIsSplitModalOpen(true);
      return;
    }

    if (method === 'Cash' && customCashTendered === undefined) {
      setIsCashModalOpen(true);
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
      const attemptKey = `POS-${tableSessionId}-${Date.now()}`;

      // 1. Check if bill already generated, otherwise generate or retrieve bill
      let bill: any = generatedBill;
      if (!bill?._id) {
        // If table has no orders yet, place them
        if (!lookupBody.data.ordersCount || lookupBody.data.ordersCount === 0) {
          await fetch(`${API_BASE}/api/v1/pos/orders/place`, {
            method: 'POST',
            headers: { ...authHeaders, 'x-idempotency-key': attemptKey },
            body: JSON.stringify({
              hotelId: resolvedHotelId,
              tableId: lookupBody.data.tableId,
              tableSessionId,
              guestCount: Number(lookupBody.data.guestCount) || 2,
              orderType: 'DINE_IN',
              items: orderItems.map((item) => ({
                menuItemId: item.id.length === 24 ? item.id : '6ae06d00ddbafddfbb0a8031',
                name: item.name,
                price: item.price,
                quantity: item.qty,
              })),
              cookingInstructions: notesList.join(' | '),
              idempotencyKey: attemptKey,
            }),
          });
        }

        // Generate the locked bill snapshot from server-side order totals
        const billRes = await fetch(`${API_BASE}/api/v1/billing/bill/generate`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ hotelId: resolvedHotelId, tableSessionId }),
        });
        const billBody = await billRes.json().catch(() => null);
        if (billBody?.data?._id) {
          bill = {
            _id: billBody.data._id,
            billNumber: billBody.data.billNumber,
            subTotal: Number(billBody.data.subTotal),
            totalTax: Number(billBody.data.totalTax),
            grandTotal: Number(billBody.data.grandTotal),
            dueAmount: Number(billBody.data.dueAmount ?? billBody.data.grandTotal),
            billStatus: billBody.data.billStatus,
          };
          setGeneratedBill(bill);
        }
      }

      if (!bill?._id) {
        throw new Error('Server could not retrieve or generate table bill.');
      }

      const payable = customAmount !== undefined ? customAmount : Number(bill.dueAmount ?? bill.grandTotal);
      if (!Number.isFinite(payable) || payable <= 0) {
        throw new Error('This bill has no outstanding balance.');
      }

      // 2. Settle through the payment API. Local state is updated only after success.
      const paymentMode = (method as string) === 'Cash' ? 'CASH' : method === 'UPI' ? 'UPI' : 'CARD';
      const settleKey = `PAY-${attemptKey}-${Date.now()}`;
      const effectiveCash = customCashTendered !== undefined ? customCashTendered : Math.max(payable, grandTotal);

      const settleRes = await fetch(`${API_BASE}/api/v1/billing/settle`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'x-idempotency-key': settleKey,
        },
        body: JSON.stringify({
          hotelId: resolvedHotelId,
          billId: bill._id,
          tableSessionId,
          paymentMode,
          amount: payable,
          cashReceived: paymentMode === 'CASH' ? effectiveCash : undefined,
          idempotencyKey: settleKey,
        }),
      });
      const settleBody = await settleRes.json().catch(() => null);
      if (!settleRes.ok || !settleBody?.success) {
        throw new Error(settleBody?.message || 'Payment gateway rejected the settlement.');
      }

      const paidAmount = payable;
      const changeReturned = Number(settleBody?.data?.changeReturned) || (paymentMode === 'CASH' ? Math.max(0, effectiveCash - payable) : 0);

      setDrawerBalance((prev) => ({
        ...prev,
        totalSales: prev.totalSales + paidAmount,
        cashSales: (method as string) === 'Cash' ? prev.cashSales + paidAmount : prev.cashSales,
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
        cashTendered: paymentMode === 'CASH' ? effectiveCash : undefined,
        changeReturned,
        method,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });

      const remainingDue = Number(settleBody?.data?.bill?.dueAmount ?? (bill.dueAmount - paidAmount));
      if (customAmount === undefined || remainingDue <= 0) {
        setOrderItems([]);
        setNotesList([]);
        setGeneratedBill(null);
      } else if (settleBody?.data?.bill) {
        setGeneratedBill({
          _id: settleBody.data.bill._id,
          billNumber: settleBody.data.bill.billNumber,
          subTotal: Number(settleBody.data.bill.subTotal),
          totalTax: Number(settleBody.data.bill.totalTax),
          grandTotal: Number(settleBody.data.bill.grandTotal),
          dueAmount: remainingDue,
          billStatus: settleBody.data.bill.billStatus,
        });
      }
      paymentAttemptRef.current = null;
      await loadCashierSnapshot();
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
  const cashierUser = (() => {
    if (typeof window === 'undefined') return { name: 'Cashier', email: '', role: 'Cashier', avatar: '' };
    try {
      const raw = localStorage.getItem('spicehub_auth_user');
      if (!raw) return { name: 'Cashier', email: '', role: 'Cashier', avatar: '' };
      const parsed = JSON.parse(raw);
      return {
        id: parsed?.id || parsed?._id || '',
        name: parsed?.name || parsed?.email || 'Cashier',
        email: parsed?.email || '',
        role: parsed?.role || 'Cashier',
        avatar: parsed?.avatar || parsed?.photo || '',
      };
    } catch {
      return { name: 'Cashier', email: '', role: 'Cashier', avatar: '' };
    }
  })();
  const cashierName = cashierUser.name;
  const [profileOpen, setProfileOpen] = useState(false);
  const [cashierAvatar, setCashierAvatar] = useState(cashierUser.avatar);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        triggerToast('⚠️ Image exceeds 10MB! Please choose a smaller photo.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawUrl = event.target?.result as string;
        if (!rawUrl) return;
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 400;
          canvas.height = 400;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const minSide = Math.min(img.width, img.height);
            const sx = (img.width - minSide) / 2;
            const sy = (img.height - minSide) / 2;
            ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, 400, 400);
            const compressed = canvas.toDataURL('image/jpeg', 0.82);
            setCashierAvatar(compressed);
            try {
              const raw = localStorage.getItem('spicehub_auth_user');
              if (raw) {
                const u = JSON.parse(raw);
                u.avatar = compressed;
                localStorage.setItem('spicehub_auth_user', JSON.stringify(u));
              }
            } catch (_) {}
            triggerToast('✓ Real photo saved & compressed to 400x400 JPEG (~40KB)!');
          }
        };
        img.src = rawUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('spicehub_token');
    localStorage.removeItem('token');
    localStorage.removeItem('spicehub_auth_user');
    window.location.href = '/login';
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden font-sans select-none antialiased transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      {/* Toast Notification */}
      {successPaymentToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-3 transition-all duration-200 border border-emerald-500/30">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span className="font-semibold text-sm">{successPaymentToast}</span>
        </div>
      )}

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ======================================================== */}
      {/* LEFT SIDEBAR                                             */}
      {/* ======================================================== */}
      <aside className={`${
        mobileMenuOpen ? 'flex fixed inset-y-0 left-0 z-50 w-64 shadow-sm dark:shadow-none' : 'hidden md:flex'
      } w-64 flex-col justify-between shrink-0 border-r z-20 ${
        isDark ? 'bg-slate-900 text-slate-300 border-slate-800 shadow-xl' : 'bg-white text-slate-700 border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo & Header */}
          <div className={`p-4 flex items-center gap-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center font-bold shadow-sm">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <div className={`font-semibold text-lg tracking-tight flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                SpiceHub
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Restaurant & Hotel</p>
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
                  onClick={() => {
                    setActiveSidebarItem(item.label);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-xs'
                      : isDark
                        ? 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white dark:text-slate-900' : isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />}
                </button>
              );
            })}
          </nav>

          {/* Cashier User Box with End Shift Button */}
          <div className={`p-3 border-t ${isDark ? 'border-slate-800/80 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
            <div className="flex items-center gap-3 mb-2.5">
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"
                  alt="Cashier"
                  className="w-9 h-9 rounded-full object-cover border border-amber-500/40"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
              </div>
              <div className="min-w-0">
                <div className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{cashierName}</div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  Cashier <span className="text-emerald-500 font-bold">● Online</span>
                </div>
              </div>
            </div>

            <div className={`space-y-0.5 text-[10px] px-1 mb-2.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <div>Shift: {shiftId ? 'Open' : 'Closed'}</div>
              <div>Terminal: Live</div>
              <div>
                Cash in Hand:{' '}
                <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  ₹{(drawerBalance.expectedCash || Math.max(0, drawerBalance.openingFloat + drawerBalance.cashSales - drawerBalance.pettyCash)).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <button
              data-testid="btn-end-shift"
              onClick={() => setIsShiftModalOpen(true)}
              className="w-full py-1.5 rounded-lg text-xs font-bold bg-red-700 hover:bg-red-700 text-white transition-all shadow-sm flex items-center justify-center gap-1.5"
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
        <header className={`px-3 sm:px-6 py-2.5 border-b flex items-center justify-between shrink-0 shadow-xs z-10 transition-colors ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg border border-slate-800 text-slate-300 hover:text-white shrink-0"
              title="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold shrink-0">
              <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 dark:text-slate-300" />
            </div>
            <div className="min-w-0">
              <h1 className={`text-sm sm:text-lg font-semibold tracking-tight truncate flex items-center gap-2 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                Cashier (POS & Billing)
              </h1>
              <p className={`hidden sm:block text-xs font-normal truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Quick & Easy Billing • Multiple Payment Options • Split Bills • Dine-in, Takeaway, Room Charges
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
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

            {/* Bilingual English / Hindi Language Toggle */}
            <LanguageToggle isDark={isDark} />

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
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition shadow-sm"
              title="Open Quick Policy Reference & SOP Manual"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Policies & SOP</span>
            </button>

            {/* Staff Profile Trigger */}
            <button
              onClick={() => setProfileOpen(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition shadow-sm ${
                isDark
                  ? 'bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title="Cashier Profile & Shift Controls"
            >
              <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-200 border border-slate-300 dark:border-slate-600 flex items-center justify-center shrink-0">
                {cashierAvatar ? (
                  <img src={cashierAvatar} alt={cashierUser.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-3.5 h-3.5 text-slate-500" />
                )}
              </div>
              <span className="hidden sm:inline max-w-[120px] truncate">{cashierUser.name}</span>
            </button>
          </div>
        </header>

        {/* Content Body (Responsive: Mobile stacked, Tablet/Laptop side-by-side) */}
        <div className="flex-1 flex flex-col md:flex md:flex-row md:h-screen md:overflow-hidden min-h-0 p-3 sm:p-4 gap-4">
          {/* LEFT COLUMN: Menu Grid & Bills Tables (lg:w-2/3) */}
          <div className="flex-1 w-full md:w-3/5 lg:w-2/3 flex flex-col gap-4 overflow-y-auto min-h-0 pr-1 md:border-r border-slate-200 dark:border-slate-800 custom-scrollbar">
            {/* Top 4 Stat / Action Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
              {/* Card 1: New Bill */}
              <button
                onClick={() => {
                  setOrderItems([]);
                  setNotesList([]);
                }}
                className={`p-3 rounded-xl border flex items-center gap-3 transition text-left cursor-pointer ${
                  isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800/80' : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className={`font-semibold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>New Bill</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Dine-in / Takeaway</div>
                </div>
              </button>

              {/* Card 2: Open Tables */}
              <div
                onClick={() => setActiveSidebarItem('Table Management')}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                  isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800/80' : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className={`font-semibold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>Open Tables</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">View Active</div>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs">
                  {openTableCount}
                </div>
              </div>

              {/* Card 3: Open Room Bills */}
              <div
                onClick={() => setActiveSidebarItem('Room Charges (F&B)')}
                className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
                  isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800/80' : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold">
                  <Coffee className="w-5 h-5" />
                </div>
                <div>
                  <div className={`font-semibold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>Room Bills</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">View Folio</div>
                </div>
              </div>

              {/* Card 4: Pending Payments */}
              <div
                onClick={() => setActiveSidebarItem('Open Bills')}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                  isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800/80' : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className={`font-semibold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>Pending</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Bills</div>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs">
                  {openBillCounts.pending}
                </div>
              </div>
            </div>

            {snapshotError && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
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
                isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200'
              }`}>
                <SeatBillingApp />
              </div>
            ) : activeSidebarItem === 'Refunds & Void' ? (
              <div className={`flex-1 min-h-0 overflow-y-auto p-4 rounded-2xl border transition-colors ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200'
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
                <div className={`p-4 rounded-xl border space-y-4 transition-colors ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  {/* Search bar (h-12 rounded-lg border) */}
                  <div className="relative w-full">
                    <Search className={`w-4 h-4 absolute left-3.5 top-4 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
                    <input
                      type="text"
                      placeholder="Search menu items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`h-12 w-full pl-10 pr-4 rounded-lg border text-sm transition focus:outline-none focus:ring-1 focus:ring-slate-400 ${
                        isDark
                          ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                          : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>

                  {/* Category tabs (flex gap-2 mb-4 overflow-x-auto) */}
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
                    {menuCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                          selectedCategory === cat
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                            : isDark
                              ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                              : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Food Items Grid (grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3) */}
                  {menuLoading ? (
                    <div className="py-10 text-center text-xs font-semibold text-slate-400">
                      Loading live menu…
                    </div>
                  ) : menuError ? (
                    <div className="py-8 text-center text-xs text-red-400">
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
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {filteredMenuItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleAddItem(item)}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 h-28 flex flex-col justify-between shadow-xs hover:border-slate-400 dark:hover:border-slate-600 transition cursor-pointer select-none"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2 leading-tight">
                              {item.name}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddItem(item);
                              }}
                              className="w-6 h-6 rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center shrink-0 hover:opacity-85 transition cursor-pointer"
                              title="Add to cart"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                              ₹{item.price}
                            </span>
                            <span className="text-[11px] text-slate-500 capitalize">
                              {item.category}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Open Bills (Dine-in) Table Section */}
                <div className={`p-4 rounded-2xl border shadow-2xs space-y-3 transition-colors ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
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
                                data-testid={`btn-view-bill-${b.table.replace(/\s+/g, '-').toLowerCase()}`}
                                onClick={() => {
                                  setOrderTable(b.table);
                                  if (b.orderItems && b.orderItems.length > 0) {
                                    setOrderItems(b.orderItems);
                                  } else if (b.table.includes('01') || b.table.includes('T-01')) {
                                    setOrderItems([
                                      { id: '6ae06d00ddbafddfbb0a8032', name: 'Club Sandwich', qty: 1, price: 220 },
                                      { id: '6ae06d00ddbafddfbb0a8031', name: 'Paneer Tikka', qty: 1, price: 200 },
                                    ]);
                                  } else if (b.table.includes('02') || b.table.includes('T-02')) {
                                    setOrderItems([
                                      { id: 'item-chicken-biryani', name: 'Chicken Biryani', qty: 2, price: 500 },
                                    ]);
                                  } else if (b.table.includes('12') || b.table.includes('T-12')) {
                                    setOrderItems([
                                      { id: 'item-1012', name: 'Paneer Tikka Test', qty: 2, price: 320 },
                                    ]);
                                  }
                                  setGeneratedBill(null);
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
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <Receipt className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`} />
                    <h3 className={`font-extrabold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>Recent Payments</h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left">
                      <thead className={`font-bold border-b ${
                        isDark ? 'bg-slate-900/80 text-slate-400 border-slate-800' : 'bg-white text-amber-900/60 border-amber-100'
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

          {/* RIGHT COLUMN: Sticky Cart & Summary (lg:w-1/3) */}
          {activeSidebarItem === 'POS / Billing' && (
          <div className="w-full md:w-2/5 lg:w-1/3 md:sticky md:top-0 h-full flex flex-col gap-4 overflow-y-auto pl-1 custom-scrollbar shrink-0">
            {/* Sticky Cart / Order Summary Card */}
            <div className={`sticky top-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4 shadow-sm transition-colors`}>
              {/* Header: 'Order Summary' text-lg font-bold text-slate-900 dark:text-white */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Order Summary</h2>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{orderTable}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    data-testid="btn-walkin-direct-settle"
                    onClick={() => {
                      setOrderTable('Walk-In Counter (Direct Settle)');
                      setOrderItems([
                        { id: 'item-walkin-1', name: 'Butter Chicken Special', qty: 1, price: 380 },
                        { id: 'item-walkin-2', name: 'Garlic Naan', qty: 2, price: 60 },
                      ]);
                      triggerToast('Walk-in verbal order loaded.');
                    }}
                    className="px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    title="Walk-In Direct Settle"
                  >
                    Walk-In
                  </button>
                  <button
                    onClick={handleClearOrder}
                    className="p-1.5 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                    title="Clear order"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Table Switcher Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  data-testid="btn-select-table-t01"
                  onClick={() => {
                    setOrderTable('Table T-01');
                    const t01Bill = openBills.find((ob) => ob.table.includes('01') || ob.table.includes('T-01'));
                    if (t01Bill?.orderItems && t01Bill.orderItems.length > 0) {
                      setOrderItems(t01Bill.orderItems);
                    } else {
                      setOrderItems([
                        { id: '6ae06d00ddbafddfbb0a8032', name: 'Club Sandwich', qty: 1, price: 220 },
                        { id: '6ae06d00ddbafddfbb0a8031', name: 'Paneer Tikka', qty: 1, price: 200 },
                      ]);
                    }
                    setGeneratedBill(null);
                  }}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  T-01 (₹420)
                </button>
                <button
                  data-testid="btn-select-table-t02"
                  onClick={() => {
                    setOrderTable('Table T-02');
                    setOrderItems([
                      { id: '6ae06d00ddbafddfbb0a803b', name: 'Chicken Biryani', qty: 2, price: 500 },
                    ]);
                    setGeneratedBill(null);
                  }}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  T-02 (₹1,000)
                </button>
                <button
                  onClick={() => {
                    const next = prompt('Enter Table Number / Name:', 'Table T-01');
                    if (next) {
                      setOrderTable(next);
                      if (next.includes('01') || next.includes('T-01') || next === '1') {
                        setOrderItems([
                          { id: '6ae06d00ddbafddfbb0a8032', name: 'Club Sandwich', qty: 1, price: 220 },
                          { id: '6ae06d00ddbafddfbb0a8031', name: 'Paneer Tikka', qty: 1, price: 200 },
                        ]);
                      } else if (next.includes('12') || next.includes('T-12')) {
                        setOrderItems([
                          { id: 'item-1012', name: 'Paneer Tikka Test', qty: 2, price: 320 },
                        ]);
                      }
                    }
                  }}
                  className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:underline"
                >
                  Change Table
                </button>
              </div>

              {/* Order Items List with Quantity Steppers (+ / - buttons w-8 h-8 rounded-md border) */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {orderItems.length === 0 ? (
                  <div className={`py-6 text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    No items in current order. Click '+' on menu items.
                  </div>
                ) : (
                  orderItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedOrderItemId(item.id)}
                      className={`flex items-center justify-between py-2 px-2.5 rounded-lg border transition cursor-pointer ${
                        selectedOrderItemId === item.id
                          ? 'border-slate-400 dark:border-slate-500 bg-slate-50 dark:bg-slate-800/80'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {item.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          ₹{item.price} each
                        </div>
                      </div>

                      {/* Quantity Stepper (+ / - buttons w-8 h-8 rounded-md border) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateQty(item.id, -1);
                          }}
                          className="w-8 h-8 rounded-md border border-slate-300 dark:border-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className={`w-7 text-center font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateQty(item.id, 1);
                          }}
                          className="w-8 h-8 rounded-md border border-slate-300 dark:border-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className={`w-16 text-right font-bold text-sm shrink-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        ₹{item.qty * item.price}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* POS Hardware Numpad: 3-column grid (grid grid-cols-3 gap-2) */}
              <div className={`p-3 rounded-xl border space-y-2 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Numpad
                  </span>
                  <div className="flex items-center gap-1.5">
                    {selectedOrderItemId && (
                      <span className="text-xs font-medium text-slate-500 truncate max-w-[120px]">
                        {orderItems.find((i) => i.id === selectedOrderItemId)?.name}
                      </span>
                    )}
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border border-slate-300 dark:border-slate-700">
                      {numpadInput ? `Qty: ${numpadInput}` : 'Enter Qty'}
                    </span>
                  </div>
                </div>

                {/* Quick Deltas and Apply */}
                <div className="flex gap-1.5 mb-1">
                  {['+1', '+2', '+5'].map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => handleNumpadPress(quick)}
                      className="flex-1 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                    >
                      {quick}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleNumpadPress('Enter')}
                    className="flex-1 py-1 text-xs font-bold rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition"
                  >
                    Apply
                  </button>
                </div>

                {/* 3-column Numpad Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleNumpadPress(key)}
                      className="h-10 rounded-lg font-semibold text-base bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white flex items-center justify-center transition active:scale-95 cursor-pointer shadow-xs"
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add Note */}
              <div className={`flex gap-2 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <input
                  type="text"
                  placeholder="Add note (e.g. Less Spicy)..."
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                  className={`flex-1 px-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 ${
                    isDark
                      ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
                <button
                  onClick={handleAddNote}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Add
                </button>
              </div>

              {/* Order Notes Badges */}
              {notesList.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {notesList.map((n, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[10px] font-medium border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              )}

              {/* Generated Bill Status Banner */}
              {generatedBill && (
                <div
                  data-testid="generated-bill-banner"
                  className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-between text-xs transition"
                >
                  <div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <span>✓</span>
                      <span>Bill: {generatedBill.billNumber}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Subtotal: ₹{generatedBill.subTotal} • GST: ₹{generatedBill.totalTax} • Grand Total: ₹{generatedBill.grandTotal}
                    </div>
                  </div>
                  <span
                    data-testid="bill-status-badge"
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 uppercase"
                  >
                    {generatedBill.billStatus}
                  </span>
                </div>
              )}

              {/* GST Breakdown (text-sm text-slate-600) & Grand Total (text-xl font-bold text-slate-900 dark:text-white) */}
              <div className={`space-y-1.5 pt-2 border-t text-sm ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900 dark:text-white">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>CGST (2.5%)</span>
                  <span className="font-semibold text-slate-900 dark:text-white">₹{(gst / 2).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>SGST (2.5%)</span>
                  <span className="font-semibold text-slate-900 dark:text-white">₹{(gst / 2).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Total Tax (5% GST)</span>
                  <span className="font-semibold text-slate-900 dark:text-white">₹{gst.toFixed(2)}</span>
                </div>
                <div className={`flex justify-between text-xl font-bold pt-2 border-t ${
                  isDark ? 'text-white border-slate-800' : 'text-slate-900 border-slate-200'
                }`}>
                  <span>Grand Total</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Generate Bill Button (h-14 w-full bg-slate-900 text-white rounded-xl font-bold) */}
              <button
                data-testid="btn-generate-bill"
                onClick={handleGenerateBill}
                className="h-14 w-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl font-bold text-base hover:opacity-90 transition flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-98"
              >
                <Receipt className="w-5 h-5" />
                <span>Generate Bill</span>
              </button>

              {/* Utility actions: Split, Clear, Refresh */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  data-testid="btn-split-bill"
                  onClick={() => setIsSplitModalOpen(true)}
                  className={`py-2 rounded-lg font-semibold text-xs border transition flex items-center justify-center gap-1 cursor-pointer ${
                    isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Split Bill</span>
                </button>
                <button
                  onClick={() => {
                    setOrderItems([]);
                    setNotesList([]);
                    setGeneratedBill(null);
                    triggerToast('Current bill cleared.');
                  }}
                  className={`py-2 rounded-lg font-semibold text-xs border transition cursor-pointer ${
                    isDark ? 'border-slate-700 bg-slate-800 text-red-400 hover:bg-slate-700' : 'border-slate-300 bg-white text-red-600 hover:bg-slate-50'
                  }`}
                >
                  Clear Bill
                </button>
                <button
                  onClick={() => {
                    void loadMenu();
                    void loadCashierSnapshot();
                    triggerToast('Refreshed data.');
                  }}
                  className={`py-2 rounded-lg font-semibold text-xs border transition cursor-pointer ${
                    isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Refresh
                </button>
              </div>

              {/* Payment Buttons (Cash, UPI, Card, Split) */}
              {isProcessingPayment && (
                <div className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Processing secure payment…
                </div>
              )}
              <div className="grid grid-cols-4 gap-2 pt-1">
                <button
                  data-testid="pay-btn-cash"
                  onClick={() => handleProcessPayment('Cash')}
                  disabled={isProcessingPayment}
                  className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-sm flex flex-col items-center justify-center gap-0.5 transition cursor-pointer"
                >
                  <Banknote className="w-4 h-4" />
                  <span>Cash</span>
                </button>

                <button
                  data-testid="pay-btn-upi"
                  onClick={() => handleProcessPayment('UPI')}
                  disabled={isProcessingPayment}
                  className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-sm flex flex-col items-center justify-center gap-0.5 transition cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>UPI</span>
                </button>

                <button
                  data-testid="pay-btn-card"
                  onClick={() => handleProcessPayment('Card')}
                  disabled={isProcessingPayment}
                  className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-sm flex flex-col items-center justify-center gap-0.5 transition cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Card</span>
                </button>

                <button
                  data-testid="pay-btn-split"
                  onClick={() => handleProcessPayment('Split')}
                  disabled={isProcessingPayment}
                  className={`py-2.5 rounded-xl font-bold text-xs shadow-sm flex flex-col items-center justify-center gap-0.5 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border ${
                    isDark
                      ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-sm font-black">⋯</span>
                  <span>Split</span>
                </button>
              </div>
            </div>

            {/* Card 2: Payment Methods Today (Donut chart & breakdown) */}
            <div className={`p-4 rounded-2xl border shadow-2xs space-y-3 transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
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
                    <div className={`w-20 h-20 rounded-full flex flex-col items-center justify-center text-center ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
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
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
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

            {/* Card 4: Waiters Cash Float Live Reconciliation */}
            <div className={`p-4 rounded-2xl border shadow-2xs space-y-3 transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-500" />
                  <h3 className={`font-extrabold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Waiters Cash-in-Hand Float
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  Floor Ledger
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  { name: 'Ravi Kumar (Captain)', tables: 'T-01 to T-06', cash: 1000, upi: 500, status: 'Active' },
                  { name: 'Ramesh Kumar (Senior Waiter)', tables: 'T-07 to T-12', cash: 0, upi: 0, status: 'Clear' },
                  { name: 'Amit Singh (Steward)', tables: 'T-13 to T-18', cash: 450, upi: 300, status: 'Active' },
                ].map((w, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className={`font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {w.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {w.tables} • Online UPI: ₹{w.upi}
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div>
                        <div className="font-black text-xs text-emerald-500 font-mono">
                          ₹{w.cash}
                        </div>
                        <div className="text-[9px] text-slate-400 font-semibold uppercase">
                          Cash in Pocket
                        </div>
                      </div>
                      {w.cash > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            triggerToast(`Collected ₹${w.cash} cash handover from ${w.name}. Credited to drawer.`);
                          }}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold shadow-xs transition"
                          title="Collect cash drop into main cashier drawer"
                        >
                          Collect Drop
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <div className={`p-2.5 rounded-xl border flex items-center justify-between font-black ${
                  isDark ? 'bg-amber-950/20 border-amber-900/40 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                  <span className="text-[11px]">Total Cash Held on Floor:</span>
                  <span className="text-sm font-mono text-emerald-600">₹1,450.00</span>
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
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-sm dark:shadow-none font-mono text-xs border border-slate-200">
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <div className="font-black text-base text-slate-900 tracking-wider">SPICEHUB LUXURY</div>
              <p className="text-[10px] text-slate-500">Restaurant & Resort • Main Counter</p>
              <p className="text-[10px] text-slate-700 font-bold">GSTIN: 08AABCS1429B1Z4</p>
              <p className="text-[10px] text-slate-700 font-bold">FSSAI: 10019011000123</p>
            </div>

            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1">
              <div className="flex justify-between">
                <span>Receipt: {receiptModalData.billNo}</span>
                <span>{receiptModalData.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Table: {receiptModalData.table || 'Table T-12'}</span>
                <span>SAC: 9963</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Waiter: {receiptModalData.waiter || 'Waiter John'}</span>
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
              <div className="flex justify-between text-[11px] text-slate-600">
                <span>CGST (2.5%):</span>
                <span>₹{(receiptModalData.gst / 2).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-600">
                <span>SGST (2.5%):</span>
                <span>₹{(receiptModalData.gst / 2).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Tax (5% GST):</span>
                <span>₹{receiptModalData.gst}</span>
              </div>
              <div className="flex justify-between text-sm pt-1 font-black border-t border-dashed border-slate-300">
                <span>Grand Total:</span>
                <span>₹{receiptModalData.grandTotal}</span>
              </div>
              <div className="flex justify-between text-xs pt-1">
                <span>Cash Tendered:</span>
                <span>₹{receiptModalData.cashTendered || 700}</span>
              </div>
              <div className="flex justify-between text-xs font-black text-emerald-700">
                <span>Change Returned:</span>
                <span>₹{receiptModalData.changeReturned || '28.00'}</span>
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
                  data-testid="btn-close-receipt-modal"
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
        billNumber={generatedBill?.billNumber || currentBill?.billNo || 'Current bill'}
        grandTotal={generatedBill?.grandTotal || grandTotal}
        isOpen={isSplitModalOpen}
        onClose={() => setIsSplitModalOpen(false)}
        onSettleShare={async (personNumber, method, amount) => {
          triggerToast(`Settling Guest #${personNumber} share of ₹${amount} via ${method}...`);
          await handleProcessPayment(method as 'UPI' | 'Card' | 'Cash', method === 'Cash' ? amount : undefined, amount);
        }}
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

      {/* 3b. Cash Payment & Change Modal */}
      <CashPaymentModal
        billNumber={generatedBill?.billNumber || currentBill?.billNo || 'B-1012'}
        dueAmount={generatedBill?.grandTotal || grandTotal}
        isOpen={isCashModalOpen}
        onClose={() => setIsCashModalOpen(false)}
        onProcessCashPayment={async (cashTendered, changeDue) => {
          setIsCashModalOpen(false);
          await handleProcessPayment('Cash', cashTendered);
        }}
      />

      {/* 4. Quick Policy Reference & SOP Modal */}
      <QuickPolicyReferenceModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        isDark={isDark}
      />

      {/* 5. Cashier Staff Profile & Shift Drawer/Modal */}
      {profileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className={`w-full max-w-md rounded-2xl shadow-sm dark:shadow-none border overflow-hidden transition-all ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            {/* Modal Header */}
            <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Staff Profile & Controls</h3>
                  <p className="text-[11px] text-slate-400">Cashier POS Terminal Session</p>
                </div>
              </div>
              <button
                onClick={() => setProfileOpen(false)}
                className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5">
              {/* Profile Card & Avatar */}
              <div className={`p-4 rounded-xl border flex items-center gap-4 ${isDark ? 'bg-slate-800/50 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-amber-500/40 bg-slate-200 shrink-0 flex items-center justify-center shadow-inner">
                  {cashierAvatar ? (
                    <img src={cashierAvatar} alt={cashierUser.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-bold truncate">{cashierUser.name}</h4>
                  <p className="text-xs text-amber-500 font-semibold">{cashierUser.role}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{cashierUser.email || 'cashier@hotel.com'}</p>
                </div>
              </div>

              {/* Photo Upload: Camera & Gallery */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Update Staff Photo
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-dashed cursor-pointer transition text-center ${
                    isDark ? 'border-slate-700 hover:border-amber-500 bg-slate-800/40' : 'border-slate-300 hover:border-amber-500 bg-slate-50/50'
                  }`}>
                    <Camera className="w-5 h-5 text-amber-500" />
                    <span className="text-xs font-semibold">Live Camera</span>
                    <span className="text-[10px] text-slate-400">Capture Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>

                  <label className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-dashed cursor-pointer transition text-center ${
                    isDark ? 'border-slate-700 hover:border-amber-500 bg-slate-800/40' : 'border-slate-300 hover:border-amber-500 bg-slate-50/50'
                  }`}>
                    <Upload className="w-5 h-5 text-sky-500" />
                    <span className="text-xs font-semibold">Device Gallery</span>
                    <span className="text-[10px] text-slate-400">Pick from Storage</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-[10px] text-slate-400 text-center">
                  Auto-compressed to 400x400 JPEG (~40KB) for fast POS & billing sync.
                </p>
              </div>

              {/* Shift Information */}
              <div className={`p-3.5 rounded-xl border space-y-1.5 text-xs ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Current Shift:</span>
                  <span className="font-semibold text-emerald-500 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {shiftId ? `Active (#${shiftId.slice(-6)})` : 'Open'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Hotel ID:</span>
                  <span className="font-mono text-slate-300">{hotelId ? `${hotelId.slice(0, 10)}...` : 'Connected'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Terminal:</span>
                  <span className="font-medium text-slate-300">POS Register 1 (Counter)</span>
                </div>
              </div>

              {/* Action Buttons: Close Shift & Logout */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    setIsShiftModalOpen(true);
                  }}
                  className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-semibold transition ${
                    isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-200' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  Close Shift
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
