import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Utensils,
  ShoppingBag,
  ShoppingCart,
  ConciergeBell,
  Sparkles,
  Shirt,
  Wrench,
  PhoneCall,
  Phone,
  FileText,
  Receipt,
  CreditCard,
  CalendarPlus,
  DoorOpen,
  Compass,
  BedDouble,
  Building2,
  Percent,
  Globe,
  CheckCircle2,
  Star,
  QrCode,
  Search,
  ChevronRight,
  ArrowLeft,
  X,
  Plus,
  Minus,
  Heart,
  Trash2,
  Pencil,
  Clock,
  Wifi,
  MapPin,
  Flame,
  Coffee,
  GlassWater,
  Bath,
  Copy,
  Download,
  Share2,
  Info,
  Check,
  AlertCircle,
  Smartphone,
  Monitor,
  Layers,
  ChevronDown,
  ShieldCheck,
  Send,
  Calendar,
  User,
  Coffee as TeaIcon,
  Sun,
  Moon
} from 'lucide-react';
import {
  GuestPortalStore,
  GuestSessionModel,
  LiveRoomOrder,
  FolioSummaryModel,
} from '@spicehub/ui';
import { API_ORIGIN } from './config/api';

const API_BASE = API_ORIGIN;

export interface GuestRoomPortalAppProps {
  store: GuestPortalStore;
  hotelId?: string;
  onConciergeRequest?: (requestType: string, notes?: string, isBillable?: boolean, billableAmount?: number) => Promise<boolean | void> | boolean | void;
  onInRoomOrderPlaced?: (items: { dishId: string; name: string; quantity: number; price: number }[], instructions?: string) => Promise<boolean | void> | boolean | void;
  onExpressCheckout?: (notes?: string, paymentMethod?: string, rating?: number, comment?: string) => Promise<boolean | void> | boolean | void;
  onSettleFolio?: (paymentMode: string, transactionRef?: string) => Promise<{ success: boolean; invoiceNumber?: string; message?: string }>;
  onRefreshOrders?: () => Promise<void> | void;
  onRefreshFolio?: () => Promise<void> | void;
  isCheckoutRequested?: boolean;
  isStayCheckedOut?: boolean;
  checkoutInvoice?: any;
}

export type PortalTab =
  | 'HOME'
  | 'DINING'
  | 'ROOM_SERVICE'
  | 'HOUSEKEEPING'
  | 'BILL'
  | 'TRACKING'
  | 'HOTEL_INFO'
  | 'MORE';

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  image: string;
  customization?: string;
}

interface MenuItem {
  id: string;
  name: string;
  category: 'Recommended' | 'Main Course' | 'Beverages' | 'Quick Bites';
  cuisine: 'Indian' | 'Chinese' | 'Continental';
  price: number;
  rating: number;
  reviewsCount: string;
  isVeg: boolean;
  description: string;
  image: string;
}



export const GuestRoomPortalApp: React.FC<GuestRoomPortalAppProps> = ({
  store,
  onConciergeRequest,
  onInRoomOrderPlaced,
  hotelId,
  onExpressCheckout,
  onSettleFolio,
  onRefreshOrders,
  onRefreshFolio,
  isCheckoutRequested = false,
  isStayCheckedOut = false,
  checkoutInvoice = null,
}) => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<PortalTab>('HOME');
  const [selectedLanguage, setSelectedLanguage] = useState<'EN' | 'HI'>('EN');

  // Theme State (Dark / Light with persistence)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('spicehub_guest_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'dark';
  });

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('spicehub_guest_theme', next);
    }
  };

  const isDark = theme === 'dark';

  // Dining Menu Filters & Search
  const [menuSearch, setMenuSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [vegFilterOnly, setVegFilterOnly] = useState<boolean>(false);

  // Cart starts empty; menu items are loaded from this hotel's catalog.
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartSpecialInstructions, setCartSpecialInstructions] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Live Store Synchronization
  const [liveOrders, setLiveOrders] = useState<LiveRoomOrder[]>([]);
  const [staySession, setStaySession] = useState<GuestSessionModel | null>(null);
  const [folioSummary, setFolioSummary] = useState<FolioSummaryModel | null>(null);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!store) return;
    const syncFromStore = () => {
      setLiveOrders(store.getLiveOrders());
      setStaySession(store.getSession());
      setFolioSummary(store.getFolioSummary());
      setRecentRequests(store.getRecentRequests());
    };
    syncFromStore();
    return store.subscribe(syncFromStore);
  }, [store]);

  const roomNumber = staySession?.roomNumber || '';
  const roomType = staySession?.roomType || 'Room';
  const guestName = staySession?.guestName || 'Valued Guest';
  const wifiSsid = staySession?.wifiSsid || 'SpiceHub_Guest';
  const wifiPass = staySession?.wifiPassword || '';
  const formatStayDate = (value?: string) =>
    value
      ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';
  const activeLiveOrder =
    liveOrders.find((order) => order.orderStatus !== 'SERVED' && order.orderStatus !== 'CANCELLED') ||
    liveOrders[0];
  const folioNet = Number(folioSummary?.netAmountPayable || 0);
  const folioDue = Math.max(0, Number(folioSummary?.dueAmount ?? folioSummary?.netAmountPayable ?? 0));
  const isFolioSettled = Boolean(
    folioSummary && (folioSummary.folioStatus === 'SETTLED' || folioDue === 0)
  );

  // Hotel-specific menu catalog (real Mongo menuItemIds for ordering)
  const [menuCatalog, setMenuCatalog] = useState<MenuItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const url = hotelId
          ? `${API_BASE}/api/v1/pos/menu?hotelId=${encodeURIComponent(hotelId)}`
          : `${API_BASE}/api/v1/pos/demo-context`;
        const res = await fetch(url);
        const body = await res.json().catch(() => null);
        const rawItems: any[] = hotelId
          ? (Array.isArray(body?.data) ? body.data : [])
          : (Array.isArray(body?.data?.menuItems) ? body.data.menuItems : []);
        if (cancelled || rawItems.length === 0) return;

        const mapped: MenuItem[] = rawItems.map((item: any) => {
          const name = String(item.name || 'Menu Item');
          const categoryText = String(item.categoryName || item.category || '').toLowerCase();
          const searchText = `${name} ${categoryText}`.toLowerCase();

          let category: MenuItem['category'] = 'Main Course';
          if (/beverage|coffee|tea|juice|shake|lassi|drink/.test(searchText)) category = 'Beverages';
          else if (/snack|starter|quick|fries|naan|dosa|tikka|soup|salad/.test(searchText)) category = 'Quick Bites';
          else if (/recommended|chef|signature|popular/.test(searchText)) category = 'Recommended';

          const cuisine: MenuItem['cuisine'] = /chinese|noodle|manchurian|chilli|schezwan/.test(searchText)
            ? 'Chinese'
            : /continental|pasta|pizza|grilled|sandwich/.test(searchText)
              ? 'Continental'
              : 'Indian';

          return {
            id: String(item.id || item._id),
            name,
            category,
            cuisine,
            price: Number(item.price || item.basePrice || 0),
            rating: 0,
            reviewsCount: '',
            isVeg: String(item.foodType || '').toUpperCase() === 'VEG',
            description: item.description || 'Freshly prepared by our in-house kitchen.',
            image:
              (Array.isArray(item.images) && item.images[0]) ||
              'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
          };
        });

        if (!cancelled && mapped.length > 0) {
          setMenuCatalog(mapped);
          setDishToCustomize((current) =>
            mapped.some((item) => item.id === current.id) ? current : mapped[0]
          );
        }
      } catch (err) {
        console.warn('[Guest Portal] Menu catalog load note:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hotelId]);

  // Dish Customization Modal
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [dishToCustomize, setDishToCustomize] = useState<MenuItem>({
    id: '',
    name: '',
    category: 'Main Course',
    cuisine: 'Indian',
    price: 0,
    rating: 0,
    reviewsCount: '',
    isVeg: true,
    description: '',
    image: '',
  });
  const [spiceLevel, setSpiceLevel] = useState<'Mild' | 'Medium' | 'Spicy'>('Mild');
  const [addons, setAddons] = useState<{ [key: string]: boolean }>({
    'Extra Paneer': false,
    'Extra Gravy': false,
    'Extra Butter': false,
  });
  const [dishQty, setDishQty] = useState<number>(1);

  // Housekeeping & Laundry View
  const [hkTab, setHkTab] = useState<'Housekeeping' | 'Laundry' | 'Maintenance'>('Housekeeping');
  const [selectedHkOption, setSelectedHkOption] = useState<string>('Room Cleaning');
  const [selectedLaundryOption, setSelectedLaundryOption] = useState<string>('Ironing Service');
  const [selectedMaintOption, setSelectedMaintOption] = useState<string>('Air Conditioner Issue');
  const [hkInstructions, setHkInstructions] = useState<string>('');

  // Bill & Folio View
  const [billTab, setBillTab] = useState<'Current Stay' | 'Past Bills'>('Current Stay');

  // Modals
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'CARD' | 'NETBANKING' | 'ROOM_FOLIO'>('UPI');
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [extendNights, setExtendNights] = useState<number>(1);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isOffersModalOpen, setIsOffersModalOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Cart Calculations (Matching Image: Items ₹500 + GST 5% ₹25 = Total ₹525)
  const cartSubtotal = cartItems.reduce((acc, it) => acc + it.price * it.qty, 0);
  const gstAmount = Math.round(cartSubtotal * 0.05);
  const totalAmount = cartSubtotal + gstAmount;
  const totalCartCount = cartItems.reduce((acc, it) => acc + it.qty, 0);

  const handleUpdateQty = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((it) => {
          if (it.id === id) {
            const next = it.qty + delta;
            return next > 0 ? { ...it, qty: next } : null;
          }
          return it;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleAddDish = (dish: MenuItem) => {
    setCartItems((prev) => {
      const ex = prev.find((i) => i.name === dish.name);
      if (ex) {
        return prev.map((i) => (i.name === dish.name ? { ...i, qty: i.qty + 1 } : i));
      }
      return [
        ...prev,
        {
          id: dish.id,
          name: dish.name,
          price: dish.price,
          qty: 1,
          image: dish.image,
        },
      ];
    });
    showToast(`Added ${dish.name} to cart!`);
  };

  const handleOpenCustomize = (dish: MenuItem) => {
    setDishToCustomize(dish);
    setSpiceLevel('Mild');
    setAddons({
      'Extra Paneer': false,
      'Extra Gravy': false,
      'Extra Butter': false,
    });
    setDishQty(1);
    setIsCustomizeOpen(true);
  };

  const handleSaveCustomization = () => {
    let extra = 0;
    if (addons['Extra Paneer']) extra += 80;
    if (addons['Extra Gravy']) extra += 40;
    if (addons['Extra Butter']) extra += 30;

    const unit = dishToCustomize.price + extra;

    setCartItems((prev) => {
      const ex = prev.find((i) => i.name === dishToCustomize.name);
      if (ex) {
        return prev.map((i) => (i.name === dishToCustomize.name ? { ...i, qty: i.qty + dishQty } : i));
      }
      return [
        ...prev,
        {
          id: dishToCustomize.id,
          name: dishToCustomize.name,
          price: unit,
          qty: dishQty,
          image: dishToCustomize.image,
          customization: `Spice: ${spiceLevel}`,
        },
      ];
    });

    setIsCustomizeOpen(false);
    showToast(`Added customized ${dishToCustomize.name} to cart!`);
  };

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      showToast('Your cart is empty');
      return;
    }
    if (!onInRoomOrderPlaced || isPlacingOrder) {
      showToast('Ordering is temporarily unavailable. Please call the front desk.');
      return;
    }

    try {
      setIsPlacingOrder(true);
      const accepted = await onInRoomOrderPlaced(
        cartItems.map((c) => ({
          dishId: c.id,
          name: c.name,
          quantity: c.qty,
          price: c.price,
        })),
        cartSpecialInstructions
      );
      if (accepted === false) {
        showToast('Order could not be placed. Your cart is saved — please retry.');
        return;
      }

      setCartItems([]);
      setCartSpecialInstructions('');
      setIsMobileCartOpen(false);
      showToast('✅ Order placed successfully! Your room-service order is with the kitchen.');
      setActiveTab('TRACKING');
    } catch (err: any) {
      showToast(err?.message || 'Order could not be placed. Please retry.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleSendService = async (serviceType: string, note?: string) => {
    if (!onConciergeRequest) {
      showToast('Service requests are temporarily unavailable. Please call the front desk.');
      return;
    }
    const accepted = await onConciergeRequest(serviceType, note || 'Guest requested service');
    if (accepted === false) {
      showToast(`Request for "${serviceType}" could not be sent. Please retry or call reception.`);
      return;
    }
    showToast(`🛎️ Request for "${serviceType}" sent to hotel team!`);
  };

  const handleCopyWifi = () => {
    if (!wifiPass) {
      showToast('WiFi password is not available yet. Please contact the front desk.');
      return;
    }
    navigator.clipboard?.writeText(wifiPass);
    showToast(`Copied WiFi password: ${wifiPass}`);
  };

  const [isSettlingPayment, setIsSettlingPayment] = useState(false);

  const handleSettleFolio = async () => {
    try {
      setIsSettlingPayment(true);
      const payableAmount =
        folioSummary?.dueAmount !== undefined && folioSummary.dueAmount > 0
          ? folioSummary.dueAmount
          : (folioSummary?.netAmountPayable || 0);

      if (!onSettleFolio) {
        showToast('Payment is temporarily unavailable. Please contact the front desk.');
        return;
      }
      if (payableAmount <= 0) {
        showToast('No outstanding folio balance to settle.');
        return;
      }

      const res = await onSettleFolio(
        paymentMode,
        `${paymentMode}-${Date.now().toString().slice(-6)}`
      );
      if (res.success) {
        showToast(
          res.invoiceNumber
            ? `🎉 Payment of ₹${payableAmount} settled via ${paymentMode}! Official GST Tax Invoice ${res.invoiceNumber} generated.`
            : res.message || `Payment of ₹${payableAmount} recorded via ${paymentMode}.`
        );
        if (onRefreshFolio) await onRefreshFolio();
        setIsPaymentModalOpen(false);
        return;
      }

      showToast(res.message || 'Payment could not be settled. No amount was charged.');
    } catch (e: any) {
      showToast(`Settlement failed: ${e.message || 'Please retry or contact the front desk.'}`);
    } finally {
      setIsSettlingPayment(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!isFolioSettled) {
      showToast('Tax invoice unlocks after the full folio is settled. Please use Pay Now first.');
      return;
    }
    try {
      showToast('Generating official GST Tax Invoice...');
      const headers: Record<string, string> = {};
      if (hotelId) headers['x-hotel-id'] = hotelId;
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('spicehub_token') || localStorage.getItem('token') || ''
          : '';
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/api/v1/pms/frontdesk/tax-invoice/${roomNumber}`, { headers });
      const json = await res.json();
      if (json.success && json.data) {
        const inv = json.data;
        const html = `<!DOCTYPE html>
<html>
<head>
  <title>Tax Invoice - ${inv.invoiceNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #111; max-width: 800px; margin: auto; }
    .header { border-bottom: 2px solid #222; padding-bottom: 20px; margin-bottom: 20px; }
    .title { font-size: 24px; font-weight: 800; color: #1e293b; }
    .badge { display: inline-block; padding: 4px 12px; background: #ecfdf5; color: #047857; border: 1px solid #10b981; border-radius: 9999px; font-weight: bold; font-size: 12px; }
    .grid { display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 13px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
    th { background: #f8fafc; border-bottom: 2px solid #cbd5e1; padding: 10px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
    .totals { margin-top: 24px; text-align: right; font-size: 14px; }
    .totals div { margin: 6px 0; }
    .grand { font-size: 18px; font-weight: 800; color: #b45309; border-top: 2px solid #cbd5e1; padding-top: 8px; }
    .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div class="title">${inv.hotel.name}</div>
        <div style="color: #64748b; font-size: 12px;">${inv.hotel.brand} • GSTIN: ${inv.hotel.gstin}</div>
        <div style="color: #64748b; font-size: 12px;">${inv.hotel.address}</div>
      </div>
      <div style="text-align: right;">
        <span class="badge">OFFICIAL GST TAX INVOICE</span>
        <div style="font-weight: 800; font-size: 16px; margin-top: 6px;">${inv.invoiceNumber}</div>
        <div style="font-size: 12px; color: #64748b;">Date: ${new Date(inv.invoiceDate).toLocaleDateString()}</div>
      </div>
    </div>
  </div>

  <div class="grid">
    <div>
      <strong>Billed To:</strong><br>
      ${inv.guest.name}<br>
      Room Number: ${inv.guest.roomNumber} (${inv.guest.roomType})<br>
      Check-in: ${formatStayDate(inv.guest.checkInDate)}<br>
      Check-out: ${formatStayDate(inv.guest.checkOutDate)}
    </div>
    <div style="text-align: right;">
      <strong>Payment Details:</strong><br>
      Folio: ${inv.billing.folioNumber}<br>
      Status: <strong>${inv.billing.folioStatus}</strong><br>
      Mode: ${inv.billing.paymentMode}<br>
      HSN/SAC: ${inv.hotel.hsnSacCode}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Department</th>
        <th style="text-align: right;">Rate (₹)</th>
        <th style="text-align: right;">Tax (₹)</th>
        <th style="text-align: right;">Total (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${(inv.lineItems && inv.lineItems.length > 0
        ? inv.lineItems.map((it: any) => `
        <tr>
          <td>${it.description}</td>
          <td>${it.department}</td>
          <td style="text-align: right;">₹${it.rate}</td>
          <td style="text-align: right;">₹${it.taxAmount || 0}</td>
          <td style="text-align: right; font-weight: bold;">₹${it.netAmount}</td>
        </tr>
      `).join('')
        : '<tr><td colspan="5" style="text-align:center;color:#64748b;">No itemized charges posted.</td></tr>')}
    </tbody>
  </table>

  <div class="totals">
    <div>Subtotal: <strong>₹${inv.billing.subtotal}</strong></div>
    <div>CGST (2.5%): <strong>₹${inv.billing.cgst}</strong></div>
    <div>SGST (2.5%): <strong>₹${inv.billing.sgst}</strong></div>
    <div class="grand">Grand Total: ₹${inv.billing.grandTotal}</div>
    <div style="color: #047857; font-weight: bold;">Amount Paid: ₹${inv.billing.paidAmount}</div>
    <div>Balance Due: <strong>₹${inv.billing.balanceDue}</strong></div>
  </div>

  <div class="footer">
    This is a computer-generated GST tax invoice authorized by SpiceHub Hospitality PMS.<br>
    Thank you for choosing ${inv.hotel.name}! We look forward to welcoming you back.
  </div>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TaxInvoice_${inv.invoiceNumber}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`Tax Invoice #${inv.invoiceNumber} downloaded!`);
      } else {
        showToast(json?.message || 'Tax invoice is not available yet. It is generated after folio settlement.');
      }
    } catch (e: any) {
      showToast(e?.message || 'Could not download the tax invoice. Please retry.');
    }
  };

  // Translations
  const t = {
    title: selectedLanguage === 'HI' ? 'स्पाइसहब गेस्ट पोर्टल' : 'SpiceHub Guest Portal',
    room: selectedLanguage === 'HI' ? `कमरा ${roomNumber || '—'} ${roomType}` : `Room ${roomNumber || '—'} ${roomType}`,
    welcome: selectedLanguage === 'HI' ? 'आपके प्रवास में हार्दिक स्वागत है' : 'Welcome to Your Stay',
    subWelcome:
      selectedLanguage === 'HI'
        ? 'स्वादिष्ट भोजन और 5-स्टार आतिथ्य सत्कार आपके कमरे में'
        : 'Good Food, Great Comfort Right at Your Room',
    food: selectedLanguage === 'HI' ? 'खाना व पेय' : 'Food & Beverages',
    roomService: selectedLanguage === 'HI' ? 'रूम सर्विस' : 'Room Service',
    housekeeping: selectedLanguage === 'HI' ? 'हाउसकीपिंग' : 'Housekeeping',
    bill: selectedLanguage === 'HI' ? 'मेरा बिल' : 'My Bill',
    tracking: selectedLanguage === 'HI' ? 'आर्डर ट्रैकिंग' : 'Live Tracking',
    hotelInfo: selectedLanguage === 'HI' ? 'होटल जानकारी' : 'Hotel Info',
  };

  // Filtered menu catalog
  const filteredMenu = menuCatalog.filter((item) => {
    if (selectedCategory !== 'All') {
      if (selectedCategory === 'Recommended' && item.category !== 'Recommended') return false;
      if (selectedCategory === 'Midnight Snacks' && !/snack|sandwich|coffee|tea|quick|burger|toast|fries/i.test(`${item.name} ${item.category}`)) return false;
      if (selectedCategory === 'Main Course' && item.category !== 'Main Course') return false;
      if (selectedCategory === 'Beverages' && item.category !== 'Beverages') return false;
      if (selectedCategory === 'Quick Bites' && item.category !== 'Quick Bites') return false;
      if (selectedCategory === 'Indian' && item.cuisine !== 'Indian') return false;
      if (selectedCategory === 'Chinese' && item.cuisine !== 'Chinese') return false;
    }
    if (vegFilterOnly && !item.isVeg) return false;
    if (menuSearch && !item.name.toLowerCase().includes(menuSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div className={`min-h-screen flex flex-col font-sans selection:bg-amber-600 selection:text-white antialiased transition-colors duration-200 ${
      isDark ? 'bg-[#0e1017] text-slate-100' : 'bg-[#f8fafc] text-slate-900'
    }`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-2xl text-white font-bold text-xs shadow-2xl border flex items-center gap-2.5 animate-bounce ${
          isDark ? 'bg-[#4a2e1b] border-amber-500/40' : 'bg-amber-800 border-amber-600'
        }`}>
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. TOP RESPONSIVE LUXURY NAVBAR (FULL DESKTOP & MOBILE)  */}
      {/* ======================================================== */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors ${
        isDark ? 'bg-[#131620]/95 border-slate-800' : 'bg-white/95 border-slate-200 shadow-xs'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-950/40">
                <UtensilsCrossed className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`font-black text-lg sm:text-xl tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>SpiceHub</span>
                  <span className="hidden md:inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-500 border border-amber-500/30">
                    In-Room Portal
                  </span>
                </div>
                <p className="text-xs text-amber-600 font-semibold hidden sm:block">Hotel & Luxury Suites</p>
              </div>
            </div>

            {/* Room 305 Status & Guest Info Pill (Desktop / Tablet) */}
            <div className={`hidden lg:flex items-center gap-4 px-4 py-1.5 rounded-2xl border text-xs ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className={`font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Room {roomNumber}</span>
                <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'} font-medium`}>({roomType})</span>
              </div>
              <div className={`w-px h-4 ${isDark ? 'bg-slate-800' : 'bg-slate-300'}`} />
              <div className={`${isDark ? 'text-slate-300' : 'text-slate-600'} font-medium`}>
                Guest: <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{guestName}</span>
              </div>
              <div className={`w-px h-4 ${isDark ? 'bg-slate-800' : 'bg-slate-300'}`} />
              <button
                onClick={handleCopyWifi}
                className="flex items-center gap-1.5 text-amber-500 hover:text-amber-600 font-semibold"
                title="Click to copy WiFi password"
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>WiFi: {wifiPass}</span>
              </button>
            </div>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Call Reception Button */}
              <button
                onClick={() => setIsCallModalOpen(true)}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition border ${
                  isDark
                    ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-400'
                    : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-800'
                }`}
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call Reception</span>
              </button>

              {/* Cart Button */}
              <button
                data-testid="cart-header-btn"
                onClick={() => {
                  if (activeTab === 'DINING') {
                    setIsMobileCartOpen(true);
                  } else {
                    setActiveTab('DINING');
                    setIsMobileCartOpen(true);
                  }
                }}
                className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-white font-bold text-xs shadow-md transition ${
                  isDark ? 'bg-[#4a2e1b] hover:bg-[#3d2414] shadow-stone-900/30' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-900/20'
                }`}
              >
                <ShoppingCart className="w-4 h-4 text-amber-300" />
                <span className="hidden sm:inline">Cart</span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                  {totalCartCount}
                </span>
                <span className="hidden md:inline text-amber-200 font-extrabold">₹{totalAmount}</span>
              </button>

              {/* Theme Toggle Button */}
              <button
                data-testid="theme-toggle-btn"
                onClick={toggleTheme}
                className={`p-2 rounded-xl border flex items-center justify-center transition shadow-xs ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800'
                    : 'bg-slate-100 border-slate-200 text-amber-600 hover:bg-slate-200'
                }`}
                title={isDark ? 'Switch to Bright Light Mode' : 'Switch to Dark Mode'}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Language Switcher */}
              <div className={`flex items-center border rounded-xl p-0.5 text-xs font-bold ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}>
                <button
                  onClick={() => setSelectedLanguage('EN')}
                  className={`px-2 py-1 rounded-lg transition ${
                    selectedLanguage === 'EN'
                      ? 'bg-amber-600 text-white'
                      : isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => setSelectedLanguage('HI')}
                  className={`px-2 py-1 rounded-lg transition ${
                    selectedLanguage === 'HI'
                      ? 'bg-amber-600 text-white'
                      : isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  HI
                </button>
              </div>
            </div>
          </div>

          {/* Secondary Desktop Navigation Links */}
          <nav className={`hidden lg:flex items-center gap-1 py-2 border-t text-xs font-bold overflow-x-auto ${
            isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-600'
          }`}>
            {[
              { id: 'HOME', label: 'Overview & Stay', icon: BedDouble },
              { id: 'DINING', label: 'Food & In-Room Dining', icon: Utensils },
              { id: 'ROOM_SERVICE', label: 'Room Service (Water, Towel, etc.)', icon: ConciergeBell },
              { id: 'HOUSEKEEPING', label: 'Housekeeping & Laundry', icon: Sparkles },
              { id: 'BILL', label: 'My Bill & Folio', icon: Receipt },
              { id: 'TRACKING', label: 'Live Order Tracking', icon: Clock },
              { id: 'HOTEL_INFO', label: 'Hotel Information & Amenities', icon: Building2 },
              { id: 'MORE', label: 'Concierge, Offers & More', icon: Layers },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as PortalTab)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition ${
                    isActive
                      ? isDark
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-amber-50 text-amber-800 border border-amber-300 shadow-xs'
                      : isDark
                        ? 'hover:text-white hover:bg-slate-800/60'
                        : 'hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. MAIN RESPONSIVE VIEWPORT CONTAINER                     */}
      {/* ======================================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24 lg:pb-12">
        {/* ===================================================== */}
        {/* VIEW 1: HOME / OVERVIEW & STAY                        */}
        {/* ===================================================== */}
        {activeTab === 'HOME' && (
          <div className="space-y-6">
            {/* Full-Width Luxury Hero Banner */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-stone-900 border border-slate-800 h-64 sm:h-80 lg:h-96">
              <img
                src="https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1600&auto=format&fit=crop&q=80"
                alt="Deluxe Room Interior"
                className="w-full h-full object-cover opacity-75"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent p-6 sm:p-10 flex flex-col justify-end">
                <div className="max-w-2xl space-y-2">
                  <div data-testid="guest-welcome-screen" className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-bold">
                    <BedDouble className="w-3.5 h-3.5" />
                    <span>Room {roomNumber} • {roomType}</span>
                    <span className="text-amber-500/60">•</span>
                    <span data-testid="guest-name" className="text-white font-extrabold">{guestName}</span>
                  </div>
                  <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-md">
                    {t.welcome}
                  </h1>
                  <p className="text-sm sm:text-base text-slate-200 drop-shadow-sm font-medium">
                    {t.subWelcome}
                  </p>
                </div>

                {/* Stay Badges Bar */}
                <div className="mt-4 flex flex-wrap items-center gap-3 pt-3 border-t border-white/10 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span>
                      Check-in: {formatStayDate(staySession?.checkInDate)} | Check-out:{' '}
                      {formatStayDate(staySession?.checkOutDate || staySession?.expectedCheckOutDate)}
                    </span>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-600 hidden sm:block" />
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Wifi className="w-4 h-4 text-sky-400" />
                    <span>WiFi: {wifiSsid}</span>
                    <button
                      onClick={handleCopyWifi}
                      className="text-amber-400 hover:text-amber-300 underline font-bold ml-1"
                    >
                      (Copy Pass)
                    </button>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-600 hidden sm:block" />
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Daily Housekeeping Included</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 6 Key Responsive Service Tiles (Grid 2 on mobile, 3 on tablet, 6 on desktop) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base sm:text-lg font-black text-white">Guest Services Directory</h2>
                <span className="text-xs text-amber-400 font-bold">Available 24/7 in Room {roomNumber || '—'}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {/* 1. Order Food & Beverages */}
                <button
                  onClick={() => setActiveTab('DINING')}
                  className="p-4 sm:p-5 rounded-2xl bg-[#181a24] hover:bg-[#202330] border border-orange-500/20 hover:border-orange-500/50 transition flex flex-col items-center justify-center text-center gap-3 group shadow-lg"
                >
                  <div className="w-12 h-12 rounded-2xl bg-orange-600/20 text-orange-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-orange-600 group-hover:text-white transition">
                    <Utensils className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-white">Food & Dining</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Order to room</div>
                  </div>
                </button>

                {/* 2. Room Service Request */}
                <button
                  onClick={() => setActiveTab('ROOM_SERVICE')}
                  className="p-4 sm:p-5 rounded-2xl bg-[#181a24] hover:bg-[#202330] border border-blue-500/20 hover:border-blue-500/50 transition flex flex-col items-center justify-center text-center gap-3 group shadow-lg"
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition">
                    <ConciergeBell className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-white">Room Service</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Water, towels, ice</div>
                  </div>
                </button>

                {/* 3. Housekeeping */}
                <button
                  onClick={() => {
                    setHkTab('Housekeeping');
                    setActiveTab('HOUSEKEEPING');
                  }}
                  className="p-4 sm:p-5 rounded-2xl bg-[#181a24] hover:bg-[#202330] border border-emerald-500/20 hover:border-emerald-500/50 transition flex flex-col items-center justify-center text-center gap-3 group shadow-lg"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-white">Housekeeping</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Cleaning, bedsheet</div>
                  </div>
                </button>

                {/* 4. Laundry */}
                <button
                  onClick={() => {
                    setHkTab('Laundry');
                    setActiveTab('HOUSEKEEPING');
                  }}
                  className="p-4 sm:p-5 rounded-2xl bg-[#181a24] hover:bg-[#202330] border border-purple-500/20 hover:border-purple-500/50 transition flex flex-col items-center justify-center text-center gap-3 group shadow-lg"
                >
                  <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition">
                    <Shirt className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-white">Laundry Service</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Pressing, wash & fold</div>
                  </div>
                </button>

                {/* 5. Maintenance */}
                <button
                  onClick={() => {
                    setHkTab('Maintenance');
                    setActiveTab('HOUSEKEEPING');
                  }}
                  className="p-4 sm:p-5 rounded-2xl bg-[#181a24] hover:bg-[#202330] border border-rose-500/20 hover:border-rose-500/50 transition flex flex-col items-center justify-center text-center gap-3 group shadow-lg"
                >
                  <div className="w-12 h-12 rounded-2xl bg-rose-600/20 text-rose-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-rose-600 group-hover:text-white transition">
                    <Wrench className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-white">Maintenance</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">AC, TV, plumbing</div>
                  </div>
                </button>

                {/* 6. Call Reception */}
                <button
                  onClick={() => setIsCallModalOpen(true)}
                  className="p-4 sm:p-5 rounded-2xl bg-[#181a24] hover:bg-[#202330] border border-amber-500/20 hover:border-amber-500/50 transition flex flex-col items-center justify-center text-center gap-3 group shadow-lg"
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-600/20 text-amber-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition">
                    <PhoneCall className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-white">Call Reception</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Direct 24/7 assist</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Quick Overview Widgets (3-column layout on Desktop) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Widget 1: Stay Folio & Current Bill Preview */}
              <div className="p-5 rounded-3xl bg-[#141620] border border-slate-800 shadow-xl flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-amber-400" />
                      <h3 className="font-black text-sm text-white">Room {roomNumber || '—'} Folio Summary</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      folioSummary?.folioStatus === 'SETTLED' || folioDue === 0
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {folioSummary?.folioStatus || (folioSummary ? 'OPEN' : 'LOADING')}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Room Charges:</span>
                      <span className="font-bold text-white">₹{Number(folioSummary?.totalRoomTariff || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Food & Beverages:</span>
                      <span className="font-bold text-white">₹{Number(folioSummary?.totalFoodAndBeverage || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Incidental Services:</span>
                      <span className="font-bold text-white">₹{Number((folioSummary?.totalLaundry || 0) + (folioSummary?.totalPaidServices || 0)).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Taxes:</span>
                      <span className="font-bold text-white">₹{Number(folioSummary?.totalTaxes || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                    <span className="font-bold text-xs text-slate-300">Total Net Amount</span>
                    <span className="font-black text-lg text-amber-400">₹{folioNet.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setActiveTab('BILL')}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
                  >
                    View Full Folio
                  </button>
                  <button
                    onClick={() => setIsPaymentModalOpen(true)}
                    disabled={folioDue <= 0 || isStayCheckedOut || isCheckoutRequested}
                    className="flex-1 py-2.5 rounded-xl bg-[#4a2e1b] hover:bg-[#3d2414] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs transition"
                  >
                    {folioDue > 0 ? `Pay ₹${folioDue.toLocaleString('en-IN')} Now` : 'Nothing Due'}
                  </button>
                </div>
              </div>

              {/* Widget 2: Live In-Room Order Tracking Preview */}
              <div className="p-5 rounded-3xl bg-[#141620] border border-slate-800 shadow-xl flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-teal-400" />
                      <h3 className="font-black text-sm text-white">
                        {activeLiveOrder ? `Active Order ${activeLiveOrder.orderNumber}` : 'No Active Order'}
                      </h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      activeLiveOrder
                        ? 'bg-teal-500/20 text-teal-300 animate-pulse'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {activeLiveOrder?.orderStatus || 'NONE'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {activeLiveOrder
                      ? 'Your order is being tracked live from the kitchen to your room.'
                      : 'Place an in-room dining order to see live kitchen status here.'}
                  </p>
                  <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs">
                    {activeLiveOrder && activeLiveOrder.items.length > 0 ? (
                      activeLiveOrder.items.slice(0, 3).map((item, idx) => (
                        <div key={`${item.menuItemId}-${idx}`} className="flex justify-between font-bold text-white">
                          <span>{item.name} ({item.quantity}x)</span>
                          <span>₹{Number(item.subtotal || item.unitPrice * item.quantity).toLocaleString('en-IN')}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-400">No items yet.</div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Order Total:</span>
                    <span className="font-black text-amber-400">
                      ₹{Number(activeLiveOrder?.grandTotal || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('TRACKING')}
                  className="mt-4 w-full py-2.5 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/30 text-teal-300 font-bold text-xs transition flex items-center justify-center gap-2"
                >
                  <Compass className="w-4 h-4" /> Open Live Order Stepper
                </button>
              </div>

              {/* Widget 3: Dining Highlights & Timings */}
              <div className="p-5 rounded-3xl bg-[#141620] border border-slate-800 shadow-xl flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UtensilsCrossed className="w-5 h-5 text-orange-400" />
                      <h3 className="font-black text-sm text-white">Restaurant & Bar Hours</h3>
                    </div>
                    <span className="text-[10px] text-amber-400 font-bold">Today</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between">
                      <div>
                        <div className="font-bold text-white">Breakfast Buffet</div>
                        <div className="text-[10px] text-slate-400">The Grand Dining Hall</div>
                      </div>
                      <span className="text-amber-400 font-semibold">7:00 - 10:30 AM</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between">
                      <div>
                        <div className="font-bold text-white">All-Day In-Room Dining</div>
                        <div className="text-[10px] text-slate-400">Delivered hot to room</div>
                      </div>
                      <span className="text-emerald-400 font-semibold">24 Hours Live</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between">
                      <div>
                        <div className="font-bold text-white">Rooftop Lounge & Bar</div>
                        <div className="text-[10px] text-slate-400">Happy Hours (1+1 Free)</div>
                      </div>
                      <span className="text-purple-400 font-semibold">5:00 - 11:30 PM</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsOffersModalOpen(true)}
                  className="mt-4 w-full py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 font-bold text-xs transition"
                >
                  View Special Guest Offers (20% Off)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================== */}
        {/* VIEW 2: FOOD & BEVERAGES (RESPONSIVE SPLIT ON DESKTOP) */}
        {/* ===================================================== */}
        {activeTab === 'DINING' && (
          <div className="space-y-6">
            {/* Dining Header & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141620] p-5 rounded-3xl border border-slate-800">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white">In-Room Dining Menu</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Freshly cooked gourmet dishes delivered straight to Room {roomNumber || '—'}
                </p>
              </div>

              {/* Search & Veg Toggle */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search dishes..."
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <button
                  onClick={() => setVegFilterOnly(!vegFilterOnly)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition ${
                    vegFilterOnly
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Veg Only</span>
                </button>
              </div>
            </div>

            {/* Category Pills Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
              {['All', 'Midnight Snacks', 'Recommended', 'Main Course', 'Beverages', 'Quick Bites', 'Indian', 'Chinese'].map(
                (cat) => (
                  <button
                    key={cat}
                    data-testid={`category-pill-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-[#4a2e1b] text-white shadow-md border border-amber-600/40'
                        : 'bg-[#181a24] text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>

            {/* Desktop 2-Column Layout (Dishes Grid on Left, Sticky Cart on Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
              {/* Dish Cards Grid */}
              <div className="lg:col-span-2 xl:col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredMenu.length === 0 && (
                  <div className="col-span-full rounded-3xl border border-slate-800 bg-[#141620] p-8 text-center">
                    <UtensilsCrossed className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                    <div className="text-sm font-black text-white">Menu is loading or currently unavailable</div>
                    <p className="mt-1 text-xs text-slate-400">
                      Please retry in a moment or call the front desk for assistance.
                    </p>
                  </div>
                )}
                {filteredMenu.map((dish) => (
                  <div
                    key={dish.id}
                    data-testid={`dish-card-${dish.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    className="bg-[#141620] rounded-3xl overflow-hidden border border-slate-800 hover:border-slate-700 transition shadow-lg flex flex-col justify-between group"
                  >
                    <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                      <img
                        src={dish.image}
                        alt={dish.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-xs text-[10px] font-bold text-white">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            dish.isVeg ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                        />
                        <span>{dish.isVeg ? 'VEG' : 'NON-VEG'}</span>
                      </div>
                      <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[10px] font-bold text-amber-400">
                        ⭐ {dish.rating}
                      </div>
                    </div>

                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="font-black text-sm text-white line-clamp-1">{dish.name}</div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {dish.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-slate-500 font-semibold">Price</div>
                          <div className="font-black text-base text-amber-400">₹{dish.price}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenCustomize(dish)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                            title="Customize spice & add-ons"
                          >
                            Customize
                          </button>
                          <button
                            data-testid={`dish-add-${dish.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                            onClick={() => handleAddDish(dish)}
                            className="w-8 h-8 rounded-xl bg-[#4a2e1b] hover:bg-[#3d2414] text-white flex items-center justify-center font-bold shadow-md transition"
                            title="Quick Add to Cart"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sticky Cart Sidebar on Desktop */}
              <div className="hidden lg:block lg:col-span-1 sticky top-28 bg-[#141620] rounded-3xl border border-slate-800 p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-amber-400" />
                    <h3 className="font-black text-sm text-white">Your Room Cart</h3>
                  </div>
                  <span className="text-xs text-amber-400 font-bold">{totalCartCount} Items</span>
                </div>

                {/* Items List */}
                {cartItems.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 space-y-2">
                    <ShoppingBag className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="text-xs font-semibold">Your dining cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                    {cartItems.map((it) => (
                      <div
                        key={it.id}
                        className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={it.image}
                            alt={it.name}
                            className="w-10 h-10 rounded-xl object-cover shrink-0"
                          />
                          <div>
                            <div className="font-bold text-xs text-white leading-tight line-clamp-1">
                              {it.name}
                            </div>
                            <div className="text-xs font-bold text-amber-400">₹{it.price}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleUpdateQty(it.id, -1)}
                            className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-black text-xs text-white w-4 text-center">{it.qty}</span>
                          <button
                            onClick={() => handleUpdateQty(it.id, 1)}
                            className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Special Instructions */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-300">Special Instructions / Delivery Time</span>
                  <input
                    type="text"
                    data-testid="input-special-instructions"
                    placeholder="e.g. Please deliver by 11:30 PM, less spicy..."
                    value={cartSpecialInstructions}
                    onChange={(e) => setCartSpecialInstructions(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Payment Option: Charge to Room Folio */}
                <div
                  data-testid="charge-to-room-folio-preview"
                  className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-amber-400" />
                      <span>Payment Method: Charge to Room Folio</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      Pre-Authorized
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-300 border-t border-amber-500/20 pt-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Master Folio:</span>
                      <span className="font-mono font-bold text-white">{folioSummary?.folioNumber || 'FOLIO-201-9871'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Current Room Balance:</span>
                      <span className="font-mono font-bold text-white">₹{Number(folioSummary?.dueAmount || folioSummary?.netAmountPayable || 5080).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">This Order (incl. 5% GST):</span>
                      <span className="font-mono font-bold text-amber-400">+₹{totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-amber-500/20 pt-1 font-bold text-amber-300">
                      <span>Updated Folio Total:</span>
                      <span className="font-mono text-xs text-emerald-400">₹{(Number(folioSummary?.dueAmount || folioSummary?.netAmountPayable || 5080) + totalAmount).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Bill Summary */}
                <div className="pt-3 border-t border-slate-800 space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Items Total:</span>
                    <span className="font-bold text-white">₹{cartSubtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">GST (5%):</span>
                    <span className="font-bold text-white">₹{gstAmount}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center font-black text-white text-sm">
                    <span>Total Amount</span>
                    <span className="text-amber-400 text-base">₹{totalAmount}</span>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="btn-place-in-room-order"
                  onClick={handlePlaceOrder}
                  disabled={cartItems.length === 0}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-500 hover:brightness-110 disabled:opacity-50 text-white font-black text-xs shadow-xl transition flex items-center justify-center gap-2"
                >
                  <span>Place In-Room Order • Charge ₹{totalAmount} to Room {roomNumber || '201'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================== */}
        {/* VIEW 3: ROOM SERVICE REQUEST (WATER, TOWEL, ETC.)     */}
        {/* ===================================================== */}
        {activeTab === 'ROOM_SERVICE' && (
          <div className="space-y-6">
            <div className="bg-[#141620] p-5 rounded-3xl border border-slate-800">
              <h1 className="text-xl sm:text-2xl font-black text-white">In-Room Service Requests</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Complimentary room replenishment dispatched to Room {roomNumber || '—'} within 5-10 minutes
              </p>
            </div>

            {/* 3x3 Grid on Tablet / 5 Columns on Desktop */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { name: 'Water Bottle', icon: GlassWater, desc: 'Chilled packaged water bottles (2x)' },
                { name: 'Extra Towel', icon: Layers, desc: 'Fresh sanitized bath & face towels' },
                { name: 'Extra Pillow', icon: BedDouble, desc: 'Hypoallergenic soft feather pillow' },
                { name: 'Toiletries Kit', icon: Bath, desc: 'Shampoo, conditioner, soap, moisturizer' },
                { name: 'Tissue Paper', icon: FileText, desc: 'Soft 2-ply tissue box refill' },
                { name: 'Room Cleaning', icon: Sparkles, desc: 'Quick refresh & dusting service' },
                { name: 'Ice Bucket', icon: Coffee, desc: 'Bucket with fresh clear ice cubes' },
                { name: 'Extra Blanket', icon: Layers, desc: 'Warm fleece comforter / quilt' },
                { name: 'Dental Kit', icon: ShieldCheck, desc: 'Toothbrush & herbal toothpaste' },
                { name: 'Other Assistance', icon: ConciergeBell, desc: 'Luggage help or custom request' },
              ].map((card, idx) => {
                const Icon = card.icon;
                return (
                  <div
                    key={idx}
                    className="p-5 rounded-3xl bg-[#141620] border border-slate-800 hover:border-slate-700 transition shadow-lg flex flex-col justify-between gap-4 group"
                  >
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-sky-600/20 text-sky-400 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white">{card.name}</div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{card.desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSendService(card.name, 'Quick guest request')}
                      className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-[#4a2e1b] text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" /> Request
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Live request history from PMS, not a static confirmation */}
            <div className="rounded-3xl border border-slate-800 bg-[#141620] p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-white">Your Recent Requests</h2>
                <span className="text-[11px] font-semibold text-slate-400">
                  {recentRequests.length} total
                </span>
              </div>
              {recentRequests.length === 0 ? (
                <p className="mt-3 text-xs text-slate-400">
                  No service requests yet. Tap any request card above and it will appear here with live status.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {recentRequests.slice(0, 5).map((request: any, idx: number) => {
                    const status = String(request.status || 'PENDING');
                    const statusClass =
                      /COMPLETE|DONE|DELIVERED/i.test(status)
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : /ACCEPT|ASSIGN|PROGRESS/i.test(status)
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : 'bg-sky-500/15 text-sky-300 border-sky-500/30';
                    return (
                      <div
                        key={request.id || request._id || idx}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-white">
                            {request.requestType || request.type || 'Service request'}
                          </div>
                          <div className="mt-0.5 truncate text-[10px] text-slate-400">
                            {request.notes || 'Requested from in-room portal'}
                          </div>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black ${statusClass}`}>
                          {status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================== */}
        {/* VIEW 4: HOUSEKEEPING & LAUNDRY                        */}
        {/* ===================================================== */}
        {activeTab === 'HOUSEKEEPING' && (
          <div className="space-y-6">
            <div className="bg-[#141620] p-5 rounded-3xl border border-slate-800">
              <h1 className="text-xl sm:text-2xl font-black text-white">Housekeeping, Laundry & Maintenance</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Professional hotel housekeeping, dry cleaning, and technical support
              </p>
            </div>

            {/* Tab Selector */}
            <div className="flex items-center gap-2 p-1 rounded-2xl bg-[#141620] border border-slate-800 w-full sm:w-fit">
              {(['Housekeeping', 'Laundry', 'Maintenance'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setHkTab(tab)}
                  className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-bold transition ${
                    hkTab === tab
                      ? 'bg-[#4a2e1b] text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {hkTab === 'Housekeeping' &&
                [
                  { title: 'Room Cleaning', desc: 'Full room vacuum, dusting and surface sanitization.' },
                  { title: 'Change Bedsheet', desc: 'Fresh 400-thread count Egyptian cotton sheets.' },
                  { title: 'Bathroom Cleaning', desc: 'Complete bathroom wipe, disinfection and fresh mats.' },
                  { title: 'Garbage Disposal', desc: 'Trash bin emptying and eco-friendly bin lining.' },
                ].map((opt) => (
                  <label
                    key={opt.title}
                    onClick={() => setSelectedHkOption(opt.title)}
                    className={`p-5 rounded-3xl border cursor-pointer transition flex flex-col justify-between gap-3 ${
                      selectedHkOption === opt.title
                        ? 'bg-[#4a2e1b]/20 border-amber-600 ring-1 ring-amber-600'
                        : 'bg-[#141620] border-slate-800 hover:bg-slate-800/60'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm text-white">{opt.title}</div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{opt.desc}</p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <span className="text-[10px] text-amber-400 font-bold">Select Service</span>
                      <input
                        type="radio"
                        checked={selectedHkOption === opt.title}
                        onChange={() => setSelectedHkOption(opt.title)}
                        className="text-amber-600 focus:ring-0"
                      />
                    </div>
                  </label>
                ))}

              {hkTab === 'Laundry' &&
                [
                  { title: 'Ironing Service', desc: 'Crisp hot-steam press for shirts, trousers and suits.' },
                  { title: 'Dry Cleaning', desc: 'Delicate care dry cleaning for ethnic and formal wear.' },
                  { title: 'Wash & Fold', desc: 'Everyday laundry wash, tumble dry and folded packing.' },
                  { title: 'Express 2-Hour Laundry', desc: 'High priority fast laundry service delivered to room.' },
                ].map((opt) => (
                  <label
                    key={opt.title}
                    onClick={() => setSelectedLaundryOption(opt.title)}
                    className={`p-5 rounded-3xl border cursor-pointer transition flex flex-col justify-between gap-3 ${
                      selectedLaundryOption === opt.title
                        ? 'bg-[#4a2e1b]/20 border-amber-600 ring-1 ring-amber-600'
                        : 'bg-[#141620] border-slate-800 hover:bg-slate-800/60'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm text-white">{opt.title}</div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{opt.desc}</p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <span className="text-[10px] text-amber-400 font-bold">Select Service</span>
                      <input
                        type="radio"
                        checked={selectedLaundryOption === opt.title}
                        onChange={() => setSelectedLaundryOption(opt.title)}
                        className="text-amber-600 focus:ring-0"
                      />
                    </div>
                  </label>
                ))}

              {hkTab === 'Maintenance' &&
                [
                  { title: 'Air Conditioner Issue', desc: 'AC temperature control, cooling or airflow concern.' },
                  { title: 'TV & Entertainment', desc: 'Smart TV, HDMI, Netflix or remote battery replacement.' },
                  { title: 'Geyser / Hot Water', desc: 'Bathroom shower hot water temperature adjustment.' },
                  { title: 'Plumbing & Taps', desc: 'Water pressure, faucet or drainage maintenance.' },
                ].map((opt) => (
                  <label
                    key={opt.title}
                    onClick={() => setSelectedMaintOption(opt.title)}
                    className={`p-5 rounded-3xl border cursor-pointer transition flex flex-col justify-between gap-3 ${
                      selectedMaintOption === opt.title
                        ? 'bg-[#4a2e1b]/20 border-amber-600 ring-1 ring-amber-600'
                        : 'bg-[#141620] border-slate-800 hover:bg-slate-800/60'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm text-white">{opt.title}</div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{opt.desc}</p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <span className="text-[10px] text-amber-400 font-bold">Select Service</span>
                      <input
                        type="radio"
                        checked={selectedMaintOption === opt.title}
                        onChange={() => setSelectedMaintOption(opt.title)}
                        className="text-amber-600 focus:ring-0"
                      />
                    </div>
                  </label>
                ))}
            </div>

            {/* Special Instructions & Submit */}
            <div className="p-5 rounded-3xl bg-[#141620] border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-white">Special Instructions / Preferred Time</span>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="e.g. Please service room after 2:00 PM while we are out..."
                  value={hkInstructions}
                  onChange={(e) => setHkInstructions(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button
                  onClick={() => {
                    const sel =
                      hkTab === 'Housekeeping'
                        ? selectedHkOption
                        : hkTab === 'Laundry'
                        ? selectedLaundryOption
                        : selectedMaintOption;
                    handleSendService(`${hkTab}: ${sel}`, hkInstructions);
                    setHkInstructions('');
                  }}
                  className="px-6 py-2.5 rounded-xl bg-[#4a2e1b] hover:bg-[#3d2414] text-white font-bold text-xs shadow-md transition whitespace-nowrap"
                >
                  Send Request
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================== */}
        {/* VIEW 5: MY BILL (LIVE FOLIO BREAKDOWN)               */}
        {/* ===================================================== */}
        {activeTab === 'BILL' && (
          <div className="space-y-6">
            {isStayCheckedOut && (
              <div data-testid="stay-checked-out-banner" className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                  <div>
                    <div className="text-sm font-black text-emerald-300">Stay checked out successfully</div>
                    <p className="mt-1 text-xs text-emerald-100/80">
                      {checkoutInvoice?.invoiceNumber
                        ? `Tax invoice ${checkoutInvoice.invoiceNumber} has been generated.`
                        : 'Your departure has been completed at the front desk.'}
                      {checkoutInvoice?.totalPaid
                        ? ` Total paid: ₹${Number(checkoutInvoice.totalPaid).toLocaleString('en-IN')}.`
                        : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!isStayCheckedOut && isCheckoutRequested && (
              <div data-testid="checkout-requested-banner" className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                  <div>
                    <div className="text-sm font-black text-amber-300">Express checkout requested</div>
                    <p className="mt-1 text-xs text-amber-100/80">
                      The front desk is reviewing your folio. You can continue viewing live charges until checkout is completed.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-[#141620] p-5 rounded-3xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-white">Guest Room Folio & Invoice</h1>
                  {folioSummary?.folioStatus === 'SETTLED' || (folioSummary && folioSummary.dueAmount === 0) ? (
                    <span data-testid="folio-settled-badge" className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      ✓ SETTLED & PAID
                    </span>
                  ) : (
                    <span data-testid="folio-pending-badge" className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/40">
                      PENDING SETTLEMENT
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live itemized billing for Room {roomNumber || '—'} ({formatStayDate(staySession?.checkInDate)} – {isStayCheckedOut ? formatStayDate(staySession?.checkOutDate || staySession?.expectedCheckOutDate) : 'Present'})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  data-testid="bill-pay-now-btn"
                  onClick={() => setIsPaymentModalOpen(true)}
                  disabled={isStayCheckedOut || isCheckoutRequested}
                  className={`px-4 py-2 rounded-xl font-bold text-xs shadow-md transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    folioSummary?.folioStatus === 'SETTLED' || (folioSummary && folioSummary.dueAmount === 0)
                      ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
                      : 'bg-[#4a2e1b] hover:bg-[#3d2414] text-white'
                  }`}
                >
                  {isStayCheckedOut
                    ? 'Stay Closed'
                    : isCheckoutRequested
                      ? 'Checkout in Progress'
                      : folioSummary?.folioStatus === 'SETTLED' || (folioSummary && folioSummary.dueAmount === 0)
                        ? `Folio Settled (₹${Number(folioSummary?.paidAmount || folioSummary?.netAmountPayable || 0).toLocaleString('en-IN')})`
                        : `Pay Now (₹${Number(folioSummary?.dueAmount || 0).toLocaleString('en-IN')})`}
                </button>
                <button
                  data-testid="download-tax-invoice-btn"
                  onClick={handleDownloadInvoice}
                  disabled={!isFolioSettled}
                  title={
                    isFolioSettled
                      ? 'Download the official GST tax invoice'
                      : 'Available after the full folio is settled'
                  }
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-slate-800"
                >
                  <Download className="w-3.5 h-3.5" /> {isFolioSettled ? 'Download Tax Invoice' : 'Invoice after Payment'}
                </button>
              </div>
            </div>

            {/* Detailed Table Card */}
            <div className="p-6 rounded-3xl bg-[#141620] border border-slate-800 shadow-xl space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500">Guest Name</span>
                  <div className="font-bold text-white mt-0.5">{guestName}</div>
                </div>
                <div>
                  <span className="text-slate-500">Room & Category</span>
                  <div className="font-bold text-white mt-0.5">Room {roomNumber} ({roomType})</div>
                </div>
                <div>
                  <span className="text-slate-500">Folio Number</span>
                  <div data-testid="live-folio-number" className="font-bold text-amber-400 mt-0.5">
                    {folioSummary?.folioNumber || '—'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Check-in / Check-out</span>
                  <div className="font-bold text-white mt-0.5">
                    {formatStayDate(staySession?.checkInDate)} – {formatStayDate(staySession?.checkOutDate || staySession?.expectedCheckOutDate)}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto border-t border-slate-800 pt-4">
                <table className="w-full text-xs text-left">
                  <thead className="text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-2">Department / Category</th>
                      <th className="py-3 px-2">Description</th>
                      <th className="py-3 px-2">Units / Details</th>
                      <th className="py-3 px-2 text-right">Net Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {folioSummary?.lineItems && folioSummary.lineItems.length > 0 ? (
                      folioSummary.lineItems.map((li, idx) => (
                        <tr key={li.id || idx}>
                          <td className="py-3 px-2 font-bold text-white">{li.department || 'INCIDENTAL'}</td>
                          <td className="py-3 px-2 text-slate-300">{li.description}</td>
                          <td className="py-3 px-2 text-slate-400">
                            {li.createdAt ? new Date(li.createdAt).toLocaleDateString() : 'Active Stay'}
                          </td>
                          <td className="py-3 px-2 text-right font-bold text-white">₹{li.netAmount}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400">
                          No itemized charges posted to this folio yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Total Calculation */}
              <div className="border-t border-slate-800 pt-4 flex flex-col items-end space-y-1.5 text-xs">
                <div className="w-64 flex justify-between text-slate-400">
                  <span>Subtotal Amount:</span>
                  <span className="font-bold text-white">
                    ₹{Number((folioSummary?.totalRoomTariff || 0) + (folioSummary?.totalFoodAndBeverage || 0) + (folioSummary?.totalLaundry || 0) + (folioSummary?.totalPaidServices || 0)).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="w-64 flex justify-between text-slate-400">
                  <span>Goods & Services Tax:</span>
                  <span className="font-bold text-white">₹{Number(folioSummary?.totalTaxes || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="w-64 flex justify-between text-slate-400">
                  <span>Service Charge:</span>
                  <span className="font-bold text-white">₹0 (Waived)</span>
                </div>
                <div className="w-64 pt-2 border-t border-slate-800 flex justify-between text-base font-black">
                  <span className="text-white">Grand Total Payable:</span>
                  <span className="text-amber-400">₹{folioNet.toLocaleString('en-IN')}</span>
                </div>
                <div className="w-64 flex justify-between text-xs text-emerald-400">
                  <span>Total Amount Paid:</span>
                  <span data-testid="live-paid-amount" className="font-bold">₹{folioSummary?.paidAmount || 0}</span>
                </div>
                <div className="w-64 flex justify-between text-xs font-bold text-white">
                  <span>Balance Due:</span>
                  <span data-testid="live-balance-due" className={folioSummary?.dueAmount === 0 ? 'text-emerald-400' : 'text-amber-400'}>
                    ₹{folioDue.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================== */}
        {/* VIEW 6: LIVE ORDER TRACKING (DYNAMIC LINKED)          */}
        {/* ===================================================== */}
        {activeTab === 'TRACKING' && (() => {
          const currentActiveOrder = store?.getSelectedLiveOrder() || liveOrders[0];
          const orderNum = currentActiveOrder?.orderNumber || '—';
          const orderStatus = currentActiveOrder?.orderStatus || 'PLACED';
          const stepNumber =
            orderStatus === 'SERVED' ? 4 :
            orderStatus === 'READY' ? 3 :
            orderStatus === 'PREPARING' || orderStatus === 'ACCEPTED' ? 2 : 1;

          return (
            <div data-testid="live-order-tracker" className="space-y-6">
              <div data-testid="kod-delivery-room-banner" className="bg-[#141620] p-5 rounded-3xl border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
                <div>
                  <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase block">
                    Kitchen Order Dispatch (KOD) Generated
                  </span>
                  <h1 data-testid="live-order-title" className="text-xl sm:text-2xl font-black text-white">
                    {currentActiveOrder ? `Order #${orderNum}` : 'In-Room Dining Tracker'}
                  </h1>
                  <p data-testid="kod-delivery-room" className="text-xs text-amber-300 font-bold mt-0.5">
                    {currentActiveOrder
                      ? `KOD Ticket Tagged • Delivery Target: Room #${roomNumber || '201'} (${guestName || 'Rohit Sharma'})`
                      : 'No active in-room order right now'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Room #{roomNumber || '201'}
                  </span>
                  <div
                    data-testid="order-progress-label"
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      stepNumber === 4 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                      stepNumber === 3 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse' :
                      stepNumber === 2 ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 animate-pulse' :
                      'bg-blue-500/20 text-blue-300 border-blue-500/40 animate-pulse'
                    }`}
                  >
                    {stepNumber === 4 ? 'Delivered to Room' :
                     stepNumber === 3 ? 'Out for Delivery' :
                     stepNumber === 2 ? 'Preparing in Kitchen' :
                     'Order Placed'}
                  </div>
                </div>
              </div>

              {liveOrders.length > 1 && (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-[#141620] p-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Your active orders:</span>
                  {liveOrders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => store.openOrderTracker(order)}
                      className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold transition ${
                        currentActiveOrder?.id === order.id
                          ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
                          : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {order.orderNumber} · {order.orderStatus}
                    </button>
                  ))}
                </div>
              )}

              {!currentActiveOrder && (
                <div className="rounded-2xl border border-slate-800 bg-[#141620] p-6 text-center text-sm text-slate-400">
                  Place an in-room dining order and its live status will appear here.
                </div>
              )}

              {/* 2-Column Responsive Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Stepper Card */}
                <div className="p-6 rounded-3xl bg-[#141620] border border-slate-800 shadow-xl space-y-6">
                  <h2 className="text-sm font-black text-white uppercase tracking-wider">
                    Live Preparation Timeline
                  </h2>
                  <div className="space-y-6 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-800">
                    {/* Step 1: Order Placed */}
                    <div data-testid="stepper-step-1" className="flex items-start gap-4 relative">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 shadow-lg ${
                        stepNumber >= 1 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'
                      }`}>
                        <Check className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${stepNumber >= 1 ? 'text-white' : 'text-slate-500'}`}>Order Placed</span>
                          <span className="text-xs text-slate-500 font-semibold">
                            {currentActiveOrder?.placedAt ? new Date(currentActiveOrder.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Your order was received and ticket {orderNum} sent to the culinary kitchen.
                        </p>
                      </div>
                    </div>

                    {/* Step 2: Preparing in Kitchen */}
                    <div data-testid="stepper-step-2" className="flex items-start gap-4 relative">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 shadow-lg ${
                        stepNumber > 2 ? 'bg-emerald-600 text-white' :
                        stepNumber === 2 ? 'bg-teal-600 text-white animate-pulse' :
                        'bg-slate-800 text-slate-500'
                      }`}>
                        <Utensils className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${
                            stepNumber === 2 ? 'text-teal-300 font-bold' :
                            stepNumber > 2 ? 'text-white' : 'text-slate-500'
                          }`}>Preparing in Kitchen</span>
                          <span className="text-xs text-teal-400 font-semibold">
                            {stepNumber >= 2 ? (currentActiveOrder?.preparedAt ? new Date(currentActiveOrder.preparedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'In Progress') : 'Pending'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Executive chef is simmering gourmet dishes and baking fresh naans.
                        </p>
                      </div>
                    </div>

                    {/* Step 3: Out for Room Delivery */}
                    <div data-testid="stepper-step-3" className="flex items-start gap-4 relative">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 shadow-lg ${
                        stepNumber > 3 ? 'bg-emerald-600 text-white' :
                        stepNumber === 3 ? 'bg-amber-500 text-slate-950 font-black animate-pulse' :
                        'bg-slate-800 text-slate-500'
                      }`}>
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${
                            stepNumber === 3 ? 'text-amber-300 font-bold' :
                            stepNumber > 3 ? 'text-white' : 'text-slate-500'
                          }`}>Out for Delivery</span>
                          <span className="text-xs text-amber-400 font-semibold">
                            {stepNumber >= 3 ? (currentActiveOrder?.readyAt ? new Date(currentActiveOrder.readyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ready for Butler') : 'Estimated 15m'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          In-room dining butler brings the covered food trolley directly to Room {roomNumber}.
                        </p>
                      </div>
                    </div>

                    {/* Step 4: Delivered at Room */}
                    <div data-testid="stepper-step-4" className="flex items-start gap-4 relative">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 shadow-lg ${
                        stepNumber >= 4 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'
                      }`}>
                        <BedDouble className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${stepNumber >= 4 ? 'text-emerald-300 font-bold' : 'text-slate-500'}`}>Delivered</span>
                          <span className="text-xs text-emerald-400 font-semibold">
                            {stepNumber >= 4 ? (currentActiveOrder?.servedAt ? new Date(currentActiveOrder.servedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Delivered') : 'Pending'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Order served fresh at Room {roomNumber}. Enjoy your meal!</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex gap-3">
                    <button
                      onClick={() => setIsCallModalOpen(true)}
                      className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                    >
                      Call Kitchen Desk
                    </button>
                    <button
                      onClick={() => setActiveTab('DINING')}
                      className="flex-1 py-2.5 rounded-xl bg-[#4a2e1b] hover:bg-[#3d2414] text-white font-bold text-xs"
                    >
                      Order More Dishes
                    </button>
                  </div>
                </div>

                {/* Kitchen Photo & Chef Card */}
                <div className="rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between">
                  <div className="relative h-72 w-full bg-black">
                    <img
                      src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=900&auto=format&fit=crop&q=80"
                      alt="Chef cooking in kitchen"
                      className="w-full h-full object-cover opacity-85"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-xs text-xs font-bold text-white border border-white/10">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span>Freshly Prepared Just for You</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <h3 className="font-bold text-sm text-white">Items in Order {orderNum}:</h3>
                    <div className="space-y-1.5 text-xs text-slate-300">
                      {currentActiveOrder && currentActiveOrder.items && currentActiveOrder.items.length > 0 ? (
                        currentActiveOrder.items.map((it: any, idx: number) => (
                          <div key={idx} className="flex justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                            <span>{it.name} ({it.quantity}x)</span>
                            <span className="font-bold text-white">₹{it.subtotal || ((it.unitPrice || it.price || 0) * (it.quantity || 1))}</span>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-slate-400">
                          No items to display for this order.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ===================================================== */}
        {/* VIEW 7: HOTEL INFORMATION & AMENITIES                 */}
        {/* ===================================================== */}
        {activeTab === 'HOTEL_INFO' && (
          <div className="space-y-6">
            <div className="bg-[#141620] p-5 rounded-3xl border border-slate-800">
              <h1 className="text-xl sm:text-2xl font-black text-white">Hotel Information & Guide</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Everything you need to know about SpiceHub Hotel & Restaurant amenities
              </p>
            </div>

            {/* 3-Column Grid on Desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Card 1: Amenities */}
              <div className="p-5 rounded-3xl bg-[#141620] border border-slate-800 space-y-3">
                <div className="flex items-center gap-2.5 text-purple-400">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-white">Hotel Amenities</h3>
                </div>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="p-2 rounded-xl bg-slate-900">🏊 Heated Infinity Swimming Pool (Level 4)</div>
                  <div className="p-2 rounded-xl bg-slate-900">🏋️ 24/7 Wellness Health Club & Gym (Level 3)</div>
                  <div className="p-2 rounded-xl bg-slate-900">💆 Ayurvedic Herbal Spa & Sauna (Level 4)</div>
                  <div className="p-2 rounded-xl bg-slate-900">🚗 Valet Parking & Airport Shuttle Service</div>
                </div>
              </div>

              {/* Card 2: Restaurant Timings */}
              <div className="p-5 rounded-3xl bg-[#141620] border border-slate-800 space-y-3">
                <div className="flex items-center gap-2.5 text-blue-400">
                  <Clock className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-white">Dining Hours</h3>
                </div>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="p-2 rounded-xl bg-slate-900">🍳 Breakfast: 7:00 AM - 10:30 AM</div>
                  <div className="p-2 rounded-xl bg-slate-900">🍛 Lunch Buffet: 12:30 PM - 3:30 PM</div>
                  <div className="p-2 rounded-xl bg-slate-900">🍷 Dinner & Lounge: 7:30 PM - 11:30 PM</div>
                  <div className="p-2 rounded-xl bg-slate-900">🛎️ In-Room Night Dining: 11:30 PM - 6:00 AM</div>
                </div>
              </div>

              {/* Card 3: WiFi Details */}
              <div className="p-5 rounded-3xl bg-[#141620] border border-slate-800 space-y-3">
                <div className="flex items-center gap-2.5 text-sky-400">
                  <Wifi className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-white">High-Speed WiFi Access</h3>
                </div>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-slate-500">Network SSID:</span>
                    <div className="font-bold text-white text-sm">{wifiSsid}</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-slate-500">Password:</span>
                      <div className="font-bold text-amber-400 text-sm">{wifiPass}</div>
                    </div>
                    <button
                      onClick={handleCopyWifi}
                      className="px-3 py-1.5 rounded-xl bg-[#4a2e1b] text-white font-bold text-xs"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 4: Policies & Rules */}
              <div className="p-5 rounded-3xl bg-[#141620] border border-slate-800 space-y-3">
                <div className="flex items-center gap-2.5 text-amber-400">
                  <FileText className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-white">Policies & Rules</h3>
                </div>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <p>• Standard Check-in: 2:00 PM | Check-out: 11:00 AM.</p>
                  <p>• Strictly Non-Smoking in guest rooms (Designated smoking lounge on Terrace).</p>
                  <p>• Visitors allowed till 9:00 PM with valid Govt ID verification.</p>
                </div>
              </div>

              {/* Card 5: Nearby Places */}
              <div className="p-5 rounded-3xl bg-[#141620] border border-slate-800 space-y-3">
                <div className="flex items-center gap-2.5 text-emerald-400">
                  <MapPin className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-white">Nearby Attractions</h3>
                </div>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <p>• Historic City Palace — 2.1 km (10 mins drive)</p>
                  <p>• Lake Pichola Boat Jetty — 3.4 km (15 mins)</p>
                  <p>• Heritage Bazaar & Handicrafts — 1.2 km (5 mins)</p>
                </div>
              </div>

              {/* Card 6: Contacts */}
              <div className="p-5 rounded-3xl bg-[#141620] border border-slate-800 space-y-3">
                <div className="flex items-center gap-2.5 text-rose-400">
                  <PhoneCall className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-white">Important Extensions</h3>
                </div>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <p>• Frontdesk Reception: <span className="font-bold text-white">Dial 9</span></p>
                  <p>• In-Room Dining Kitchen: <span className="font-bold text-white">Dial 101</span></p>
                  <p>• Housekeeping Butler: <span className="font-bold text-white">Dial 102</span></p>
                  <p>• Hotel Security / Emergency: <span className="font-bold text-white">Dial 0</span></p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================== */}
        {/* VIEW 8: CONCIERGE, OFFERS & MORE                      */}
        {/* ===================================================== */}
        {activeTab === 'MORE' && (
          <div className="space-y-6">
            <div className="bg-[#141620] p-5 rounded-3xl border border-slate-800">
              <h1 className="text-xl sm:text-2xl font-black text-white">Concierge & Guest Options</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Extend stay, express checkout, special discounts and reviews
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Extend Stay */}
              <button
                onClick={() => setIsExtendModalOpen(true)}
                className="p-5 rounded-3xl bg-[#141620] border border-slate-800 hover:border-slate-700 transition flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-pink-600/20 text-pink-400 flex items-center justify-center group-hover:bg-pink-600 group-hover:text-white transition">
                    <CalendarPlus className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">Extend Stay</div>
                    <div className="text-xs text-slate-400">Request additional nights in Room {roomNumber || '—'}</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </button>

              {/* Express Checkout */}
              <button
                onClick={() => setIsCheckoutModalOpen(true)}
                className="p-5 rounded-3xl bg-[#141620] border border-slate-800 hover:border-slate-700 transition flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-600/20 text-amber-400 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition">
                    <DoorOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">Express Checkout</div>
                    <div className="text-xs text-slate-400">Request bellboy & early invoice</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </button>

              {/* Call Reception */}
              <button
                onClick={() => setIsCallModalOpen(true)}
                className="p-5 rounded-3xl bg-[#141620] border border-slate-800 hover:border-slate-700 transition flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition">
                    <PhoneCall className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">Call Reception</div>
                    <div className="text-xs text-slate-400">Direct intercom with frontdesk</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </button>

              {/* Feedback & Ratings */}
              <button
                onClick={() => setIsFeedbackModalOpen(true)}
                className="p-5 rounded-3xl bg-[#141620] border border-slate-800 hover:border-slate-700 transition flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
                    <Star className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">Stay Feedback & Ratings</div>
                    <div className="text-xs text-slate-400">Rate your experience with us</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </button>

              {/* Special Offers */}
              <button
                onClick={() => setIsOffersModalOpen(true)}
                className="p-5 rounded-3xl bg-[#141620] border border-slate-800 hover:border-slate-700 transition flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition">
                    <Percent className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">Exclusive Offers</div>
                    <div className="text-xs text-slate-400">Spa 20% off, happy hour perks</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </button>

              {/* Language Toggle */}
              <div className="p-5 rounded-3xl bg-[#141620] border border-slate-800 flex items-center justify-between text-left">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-sky-600/20 text-sky-400 flex items-center justify-center">
                    <Globe className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">Portal Language</div>
                    <div className="text-xs text-slate-400">Choose between English and हिंदी</div>
                  </div>
                </div>
                <div className="flex items-center bg-slate-900 p-1 rounded-xl text-xs font-bold border border-slate-800">
                  <button
                    onClick={() => setSelectedLanguage('EN')}
                    className={`px-3 py-1 rounded-lg transition ${
                      selectedLanguage === 'EN' ? 'bg-amber-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setSelectedLanguage('HI')}
                    className={`px-3 py-1 rounded-lg transition ${
                      selectedLanguage === 'HI' ? 'bg-amber-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    हिंदी
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* 3. MOBILE STICKY BOTTOM NAVIGATION BAR (lg:hidden)        */}
      {/* ======================================================== */}
      <div className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md border-t px-4 py-2 flex items-center justify-around text-[10px] font-bold transition-colors ${
        isDark ? 'bg-[#131620]/95 border-slate-800 text-slate-400' : 'bg-white/95 border-slate-200 text-slate-600 shadow-lg'
      }`}>
        <button
          onClick={() => setActiveTab('HOME')}
          className={`flex flex-col items-center gap-1 ${
            activeTab === 'HOME'
              ? 'text-amber-500 font-black'
              : isDark ? 'hover:text-white' : 'hover:text-slate-900'
          }`}
        >
          <BedDouble className="w-4 h-4" />
          <span>Home</span>
        </button>
        <button
          data-testid="mobile-nav-dining"
          onClick={() => setActiveTab('DINING')}
          className={`flex flex-col items-center gap-1 ${
            activeTab === 'DINING'
              ? 'text-amber-500 font-black'
              : isDark ? 'hover:text-white' : 'hover:text-slate-900'
          }`}
        >
          <Utensils className="w-4 h-4" />
          <span>Dining</span>
        </button>
        <button
          onClick={() => setActiveTab('ROOM_SERVICE')}
          className={`flex flex-col items-center gap-1 ${
            activeTab === 'ROOM_SERVICE' || activeTab === 'HOUSEKEEPING'
              ? 'text-amber-500 font-black'
              : isDark ? 'hover:text-white' : 'hover:text-slate-900'
          }`}
        >
          <ConciergeBell className="w-4 h-4" />
          <span>Services</span>
        </button>
        <button
          onClick={() => setActiveTab('BILL')}
          className={`flex flex-col items-center gap-1 ${
            activeTab === 'BILL'
              ? 'text-amber-500 font-black'
              : isDark ? 'hover:text-white' : 'hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Bill</span>
        </button>
        <button
          data-testid="mobile-nav-tracking"
          onClick={() => setActiveTab('TRACKING')}
          className={`flex flex-col items-center gap-1 ${
            activeTab === 'TRACKING'
              ? 'text-amber-500 font-black'
              : isDark ? 'hover:text-white' : 'hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Order</span>
        </button>
        <button
          onClick={() => setActiveTab('MORE')}
          className={`flex flex-col items-center gap-1 ${
            activeTab === 'MORE' || activeTab === 'HOTEL_INFO'
              ? 'text-amber-500 font-black'
              : isDark ? 'hover:text-white' : 'hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>More</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 4. MODALS & DRAWERS                                      */}
      {/* ======================================================== */}

      {/* Dish Customization Modal */}
      {isCustomizeOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#141620] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
            <div className="relative h-48 w-full bg-slate-900 shrink-0">
              <img
                src={dishToCustomize.image}
                alt={dishToCustomize.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setIsCustomizeOpen(false)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-lg text-white">{dishToCustomize.name}</h3>
                  <span className="font-black text-lg text-amber-400">₹{dishToCustomize.price}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold text-amber-400">
                    ⭐ {dishToCustomize.rating} ({dishToCustomize.reviewsCount})
                  </span>
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      dishToCustomize.isVeg ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">{dishToCustomize.description}</p>
              </div>

              {/* Spice Level */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-white">Select Spice Level</span>
                <div className="flex items-center gap-2">
                  {(['Mild', 'Medium', 'Spicy'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setSpiceLevel(lvl)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                        spiceLevel === lvl
                          ? 'bg-[#4a2e1b] text-white border border-amber-600/40'
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                      }`}
                    >
                      {lvl === 'Mild' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                      {lvl === 'Medium' && <Flame className="w-3.5 h-3.5 text-orange-400" />}
                      {lvl === 'Spicy' && <Flame className="w-3.5 h-3.5 text-red-500" />}
                      <span>{lvl}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Add-ons */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-white">Add-ons (Optional)</span>
                <div className="space-y-1.5">
                  {[
                    { name: 'Extra Paneer', price: 80 },
                    { name: 'Extra Gravy', price: 40 },
                    { name: 'Extra Butter', price: 30 },
                  ].map((ad) => (
                    <label
                      key={ad.name}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-800/80"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={addons[ad.name] || false}
                          onChange={(e) => setAddons({ ...addons, [ad.name]: e.target.checked })}
                          className="rounded text-amber-600 focus:ring-0"
                        />
                        <span className="font-semibold text-white">{ad.name}</span>
                      </div>
                      <span className="font-bold text-amber-400">+₹{ad.price}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-white">Quantity</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDishQty(Math.max(1, dishQty - 1))}
                    className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-white"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-black text-base text-white">{dishQty}</span>
                  <button
                    onClick={() => setDishQty(dishQty + 1)}
                    className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-white"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/50 shrink-0">
              <button
                onClick={handleSaveCustomization}
                className="w-full py-3 rounded-2xl bg-[#4a2e1b] hover:bg-[#3d2414] text-white font-bold text-xs shadow-xl transition"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Cart Drawer Modal */}
      {isMobileCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-[#141620] border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm text-white">Your Room Cart ({totalCartCount})</h3>
              </div>
              <button
                onClick={() => setIsMobileCartOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {cartItems.map((it) => (
                <div
                  key={it.id}
                  className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5">
                    <img src={it.image} alt={it.name} className="w-10 h-10 rounded-xl object-cover" />
                    <div>
                      <div className="font-bold text-xs text-white">{it.name}</div>
                      <div className="text-xs font-bold text-amber-400">₹{it.price}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateQty(it.id, -1)}
                      className="w-6 h-6 rounded-lg bg-slate-800 text-white font-bold flex items-center justify-center"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-black text-xs text-white">{it.qty}</span>
                    <button
                      onClick={() => handleUpdateQty(it.id, 1)}
                      className="w-6 h-6 rounded-lg bg-slate-800 text-white font-bold flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Special Instructions */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-300">Special Instructions / Delivery Time</span>
              <input
                type="text"
                data-testid="input-special-instructions"
                placeholder="e.g. Please deliver by 11:30 PM, less spicy..."
                value={cartSpecialInstructions}
                onChange={(e) => setCartSpecialInstructions(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Payment Option: Charge to Room Folio */}
            <div
              data-testid="charge-to-room-folio-preview"
              className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-amber-400" />
                  <span>Payment: Charge to Room Folio</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  Pre-Authorized
                </span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-300 border-t border-amber-500/20 pt-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Master Folio:</span>
                  <span className="font-mono font-bold text-white">{folioSummary?.folioNumber || 'FOLIO-201-9871'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Balance:</span>
                  <span className="font-mono font-bold text-white">₹{Number(folioSummary?.dueAmount || folioSummary?.netAmountPayable || 5080).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">This Order (incl. 5% GST):</span>
                  <span className="font-mono font-bold text-amber-400">+₹{totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-amber-500/20 pt-1 font-bold text-amber-300">
                  <span>Updated Folio Total:</span>
                  <span className="font-mono text-xs text-emerald-400">₹{(Number(folioSummary?.dueAmount || folioSummary?.netAmountPayable || 5080) + totalAmount).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <div className="pt-2 border-t border-slate-800 space-y-1 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Items Subtotal:</span>
                <span className="font-bold text-white">₹{cartSubtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>GST (5%):</span>
                <span className="font-bold text-white">₹{gstAmount}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between font-black text-base text-white">
                <span>Total Amount</span>
                <span className="text-amber-400">₹{totalAmount}</span>
              </div>
            </div>

            <button
              data-testid="confirm-place-order-btn"
              onClick={handlePlaceOrder}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-500 hover:brightness-110 text-white font-black text-xs shadow-xl transition flex items-center justify-center gap-2"
            >
              <span>Confirm & Charge ₹{totalAmount} to Room {roomNumber || '201'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Call Reception Modal */}
      {isCallModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#141620] border border-slate-800 rounded-3xl p-5 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-white">Call Reception Desk</h3>
              </div>
              <button
                onClick={() => setIsCallModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Our 24/7 Frontdesk Concierge is ready to assist Room {roomNumber || '—'} with baggage, transport, or inquiries.
            </p>
            <div className="space-y-2">
              <a
                href="tel:9"
                onClick={() => {
                  showToast('Connecting to Reception Ext 9...');
                  setIsCallModalOpen(false);
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" /> Dial Frontdesk (Ext 9)
              </a>
              <button
                onClick={async () => {
                  if (!onConciergeRequest) {
                    showToast('Callback requests are unavailable. Please dial the front desk directly.');
                    return;
                  }
                  const accepted = await onConciergeRequest(
                    'Immediate Callback',
                    `Guest requested urgent callback to Room ${roomNumber || '—'}`
                  );
                  if (accepted === false) {
                    showToast('Callback request could not be placed. Please dial the front desk directly.');
                    return;
                  }
                  showToast('Callback request placed. Reception will call your room shortly.');
                  setIsCallModalOpen(false);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Request Intercom Callback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Settlement Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#141620] border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-sm text-white">Settle Room {roomNumber} Folio</h3>
                <span className="text-xs text-amber-400 font-bold">
                  Total Net Payable: ₹{folioDue.toLocaleString('en-IN')}
                </span>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { id: 'UPI', label: 'Instant UPI / QR Scan (GooglePay, PhonePe, Paytm)', desc: 'Zero transaction fee, instant settle' },
                { id: 'CARD', label: 'Credit / Debit Card Online', desc: 'Visa, Mastercard, RuPay, Amex' },
                { id: 'NETBANKING', label: 'Netbanking / NEFT', desc: 'All Indian major banks supported' },
                { id: 'ROOM_FOLIO', label: 'Pay at Frontdesk Checkout', desc: 'Pay with cash or card upon departure' },
              ].map((opt) => (
                <label
                  key={opt.id}
                  onClick={() => setPaymentMode(opt.id as any)}
                  className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                    paymentMode === opt.id
                      ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500'
                      : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/60'
                  }`}
                >
                  <div>
                    <div className="font-bold text-white">{opt.label}</div>
                    <div className="text-[10px] text-slate-400">{opt.desc}</div>
                  </div>
                  <input
                    type="radio"
                    name="payMode"
                    checked={paymentMode === opt.id}
                    onChange={() => setPaymentMode(opt.id as any)}
                    className="text-amber-500 focus:ring-0"
                  />
                </label>
              ))}
            </div>

            <button
              data-testid="confirm-settle-folio-btn"
              disabled={isSettlingPayment}
              onClick={handleSettleFolio}
              className="w-full py-3 rounded-2xl bg-[#4a2e1b] hover:bg-[#3d2414] disabled:opacity-50 text-white font-bold text-xs shadow-xl transition flex items-center justify-center gap-2"
            >
              {isSettlingPayment
                ? 'Processing Settlement...'
                : `Authorize & Pay ₹${folioDue.toLocaleString('en-IN')}`}
            </button>
          </div>
        </div>
      )}

      {/* Stay Extension Modal */}
      {isExtendModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#141620] border border-slate-800 rounded-3xl p-5 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-sm text-white">Extend Stay (Room {roomNumber || '—'})</h3>
              <button
                onClick={() => setIsExtendModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Current Check-out: <span className="font-bold text-white">27 Oct 2026, 11:00 AM</span>. Select additional nights:
            </p>
            <div className="flex items-center justify-center gap-4 py-2">
              <button
                onClick={() => setExtendNights(Math.max(1, extendNights - 1))}
                className="w-9 h-9 rounded-xl bg-slate-800 text-white font-bold flex items-center justify-center"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="text-center">
                <div className="text-2xl font-black text-amber-400">+{extendNights}</div>
                <span className="text-[10px] text-slate-400">Night(s)</span>
              </div>
              <button
                onClick={() => setExtendNights(extendNights + 1)}
                className="w-9 h-9 rounded-xl bg-slate-800 text-white font-bold flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
              Additional nights are charged at the applicable room rate plus taxes. The front desk will confirm availability and pricing.
            </div>
            <button
              onClick={async () => {
                if (!onConciergeRequest) {
                  showToast('Extension requests are unavailable. Please call the front desk.');
                  return;
                }
                const accepted = await onConciergeRequest(
                  'Stay Extension',
                  `Guest requested +${extendNights} night(s) extension`
                );
                if (accepted === false) {
                  showToast('Extension request could not be sent. Please contact the front desk.');
                  return;
                }
                showToast(`Extension request for +${extendNights} night(s) sent to frontdesk!`);
                setIsExtendModalOpen(false);
              }}
              className="w-full py-2.5 rounded-xl bg-[#4a2e1b] hover:bg-[#3d2414] text-white font-bold text-xs"
            >
              Submit Extension Request
            </button>
          </div>
        </div>
      )}

      {/* Express Checkout Modal */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#141620] border border-slate-800 rounded-3xl p-5 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-sm text-white">Express Checkout Request</h3>
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Departing today? Let us know your departure time so bellboy can collect your luggage.
            </p>
            <div className="space-y-2 text-xs text-slate-300">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded text-amber-600 focus:ring-0" />
                <span>Need Bellboy for Luggage Pickup</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded text-amber-600 focus:ring-0" />
                <span>Send Final GST Invoice via WhatsApp / Email</span>
              </label>
            </div>
            <button
              onClick={async () => {
                if (!onExpressCheckout) {
                  showToast('Checkout requests are unavailable. Please contact the front desk.');
                  return;
                }
                const accepted = await onExpressCheckout(
                  'Guest requested early checkout from in-room portal'
                );
                if (accepted === false) {
                  showToast('Checkout request could not be sent. Please contact the front desk.');
                  return;
                }
                showToast('Checkout requested! Frontdesk & Bellboy notified.');
                setIsCheckoutModalOpen(false);
              }}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
            >
              Confirm Checkout Notification
            </button>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {isFeedbackModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#141620] border border-slate-800 rounded-3xl p-5 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-sm text-white">Guest Stay Feedback</h3>
              <button
                onClick={() => setIsFeedbackModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-center space-y-2">
              <p className="text-xs text-slate-300">How is your experience in Room {roomNumber || '—'}?</p>
              <div className="flex items-center justify-center gap-2 py-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setFeedbackRating(star)}
                    className="p-1 hover:scale-110 transition"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= feedbackRating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <textarea
              rows={3}
              placeholder="Tell us what you loved or how we can make your stay better..."
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <button
              onClick={() => {
                showToast(`Thank you for your ${feedbackRating}-star rating!`);
                setIsFeedbackModalOpen(false);
              }}
              className="w-full py-2.5 rounded-xl bg-[#4a2e1b] hover:bg-[#3d2414] text-white font-bold text-xs"
            >
              Submit Review
            </button>
          </div>
        </div>
      )}

      {/* Special Offers Modal */}
      {isOffersModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#141620] border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-purple-400" />
                <h3 className="font-black text-sm text-white">Exclusive Room {roomNumber || '—'} Offers</h3>
              </div>
              <button
                onClick={() => setIsOffersModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 space-y-1">
                <div className="flex justify-between font-black text-white">
                  <span>Ayurvedic Spa Treatment</span>
                  <span className="text-purple-400">20% OFF</span>
                </div>
                <p className="text-slate-300">Valid on all 60-min therapeutic massage sessions at 4th Floor Spa.</p>
              </div>
              <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 space-y-1">
                <div className="flex justify-between font-black text-white">
                  <span>Rooftop Lounge Happy Hours</span>
                  <span className="text-amber-400">1 + 1 Free</span>
                </div>
                <p className="text-slate-300">5:00 PM to 7:30 PM on all mocktails & chef specialty starters.</p>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-1">
                <div className="flex justify-between font-black text-white">
                  <span>Late Night Room Dining</span>
                  <span className="text-emerald-400">15% OFF</span>
                </div>
                <p className="text-slate-300">Automatically applied on orders placed between 11 PM - 3 AM.</p>
              </div>
            </div>
            <button
              onClick={() => setIsOffersModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
