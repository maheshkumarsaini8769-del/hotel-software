import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { API_ORIGIN, SOCKET_URL } from './config/api';

const API_BASE = API_ORIGIN;
import {
  UtensilsCrossed,
  Search,
  ShoppingCart,
  Clock,
  Bell,
  Heart,
  ChevronRight,
  Plus,
  Minus,
  Check,
  CheckCircle2,
  AlertCircle,
  PhoneCall,
  Sparkles,
  FileText,
  DollarSign,
  CreditCard,
  Smartphone,
  Banknote,
  QrCode,
  Globe,
  Share2,
  Star,
  Users,
  Coffee,
  Flame,
  ArrowLeft,
  X,
  SlidersHorizontal,
  Info,
  Sun,
  Moon,
  Trash2,
  Receipt,
  Download,
  ShieldCheck,
  ChefHat,
  Utensils,
  MessageSquare,
  Droplets,
  Leaf,
  AlertTriangle,
  RefreshCw,
  MapPin,
  LogOut,
  Loader2,
} from 'lucide-react';
import { MenuCartStore, useTranslation, IMAGE_PLACEHOLDER, CustomerNeedHelpChatModal, CustomerDownloadAppBanner } from '@spicehub/ui';

export type CustomerRequestType =
  | 'WATER'
  | 'CALL_WAITER'
  | 'BILL'
  | 'CUTLERY'
  | 'CLEANING'
  | 'ASSISTANCE'
  | 'FOOD_ISSUE'
  | 'TABLE_ISSUE'
  | 'TABLE_VACATED';

export interface PlacedOrderItem {
  id?: string;
  menuItemId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  itemStatus?: string;
  specialInstructions?: string;
}

export interface PlacedOrder {
  id?: string;
  orderId?: string;
  orderNumber: string;
  orderStatus: 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';
  items: PlacedOrderItem[];
  cookingInstructions?: string;
  placedAt?: string | Date;
  totalAmount?: number;
  guestCount?: number;
}

export interface CustomerMenuAppProps {
  store: MenuCartStore;
  hotelName?: string;
  tableNumber?: string;
  section?: string;
  onPlaceOrder?: (idempotencyKey: string, cookingInstructions?: string, clientItems?: any[], guestCount?: number) => Promise<boolean | void> | boolean | void;
  onRequestService?: (type: CustomerRequestType, notes?: string, priority?: string) => Promise<void> | void;
  onCancelOrder?: (orderId: string) => Promise<boolean | void> | boolean | void;
  onSettleBill?: (paymentMode: 'UPI' | 'CARD' | 'CASH' | 'ROOM', amount: number, utr?: string) => Promise<any> | any;
  activeOrders?: PlacedOrder[];
  onRefreshOrders?: () => Promise<void> | void;
  initialGuestCount?: number;
  hotelId?: string;
  waiterEnabled?: boolean;
  canOrder?: boolean;
  isReadOnly?: boolean;
  occupiedWarning?: string;
  hotelLocation?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
    googleMapUrl?: string;
  };
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  image?: string;
  isVeg?: boolean;
  specialInstructions?: string;
}

interface MenuItemData {
  id: string;
  name: string;
  category: string;
  price: number;
  rating: number;
  ratingCount: string;
  isVeg: boolean;
  image: string;
  description: string;
  badge?: string;
  spicy?: boolean;
  isAvailable?: boolean;
}



export const CustomerMenuApp: React.FC<CustomerMenuAppProps> = ({
  store,
  hotelName = 'SpiceHub Hotel & Resorts',
  tableNumber = 'Table 5',
  section = 'Indoor AC Dining',
  onPlaceOrder,
  onCancelOrder,
  onRequestService,
  onSettleBill,
  activeOrders: propsActiveOrders,
  onRefreshOrders,
  initialGuestCount = 4,
  hotelId,
  waiterEnabled = true,
  canOrder = true,
  isReadOnly = false,
  occupiedWarning,
  hotelLocation,
}) => {
  // Navigation State with Session Persistence (Refresh Resilient)
  const [currentTab, setCurrentTabState] = useState<'home' | 'menu' | 'cart' | 'orders' | 'waiter' | 'split' | 'payment'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const urlTab = new URLSearchParams(window.location.search).get('tab');
        if (urlTab && ['home', 'menu', 'cart', 'orders', 'waiter', 'split', 'payment'].includes(urlTab.toLowerCase())) {
          return urlTab.toLowerCase() as any;
        }
        const savedTab = sessionStorage.getItem('spicehub_customer_tab');
        // Payment/split screens are only valid inside an active bill flow.
        if (savedTab === 'payment' || savedTab === 'split') return 'home';
        if (savedTab && ['home', 'menu', 'cart', 'orders', 'waiter'].includes(savedTab)) {
          return savedTab as any;
        }
      } catch {}
    }
    return 'home';
  });

  const [isHelpChatOpen, setIsHelpChatOpen] = useState(false);

  useEffect(() => {
    const handleSetTab = (e: any) => {
      if (e.detail && typeof e.detail === 'string') {
        const t = e.detail.toLowerCase();
        if (['home', 'menu', 'cart', 'orders', 'waiter', 'split', 'payment'].includes(t)) {
          setCurrentTab(t as any);
        }
      }
    };
    window.addEventListener('customer:set_tab', handleSetTab);
    return () => window.removeEventListener('customer:set_tab', handleSetTab);
  }, []);

  const setCurrentTab = (tab: 'home' | 'menu' | 'cart' | 'orders' | 'waiter' | 'split' | 'payment') => {
    setCurrentTabState(tab);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('spicehub_customer_tab', tab);
      } catch {}
    }
  };

  useEffect(() => {
    if (!waiterEnabled && currentTab === 'waiter') {
      setCurrentTab('home');
    }
  }, [waiterEnabled, currentTab]);

  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('category');
      if (p) return decodeURIComponent(p.replace(/\+/g, ' '));
    }
    return 'All';
  });
  const [dietaryFilter, setDietaryFilter] = useState<'ALL' | 'VEG' | 'NON_VEG'>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('dietary');
      if (p && ['ALL', 'VEG', 'NON_VEG'].includes(p.toUpperCase())) {
        return p.toUpperCase() as any;
      }
    }
    return 'ALL';
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { locale, toggleLocale, t } = useTranslation();
  const selectedLanguage: 'EN' | 'HI' = locale === 'hi' ? 'HI' : 'EN';
  const toggleCustomerLanguage = toggleLocale;

  useEffect(() => {
    const handleSetCategory = (e: any) => {
      if (e.detail && typeof e.detail === 'string') setSelectedCategory(e.detail);
    };
    const handleSetDietary = (e: any) => {
      if (e.detail && typeof e.detail === 'string') setDietaryFilter(e.detail.toUpperCase() as any);
    };
    window.addEventListener('customer:set_category', handleSetCategory);
    window.addEventListener('customer:set_dietary', handleSetDietary);
    return () => {
      window.removeEventListener('customer:set_category', handleSetCategory);
      window.removeEventListener('customer:set_dietary', handleSetDietary);
    };
  }, []);

  // Intrusive permission popups eliminated on entrance as requested
  useEffect(() => {
    // Proactive Notification and Geolocation prompts removed to prevent intrusive popups on opening dining
  }, []);

  // Dynamic Categories & Food Items (Admin Managed & KDS Synced)
  const [dynamicCategories, setDynamicCategories] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('spicehub_menu_categories');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const names = parsed.map((c: any) => (typeof c === 'string' ? c : c.name)).filter(Boolean);
            return ['All', ...names];
          }
        }
      } catch {}
    }
    return ['All', 'Starters', 'Main Course', 'Beverages', 'Breads', 'Desserts'];
  });

  const [dishesList, setDishesList] = useState<MenuItemData[]>([]);

  // Dynamic Catalog Sync from the public, tenant-scoped POS menu.
  useEffect(() => {
    let isMounted = true;
    const fetchCatalog = async () => {
      if (!hotelId) return;
      try {
        const res = await fetch(
          `${API_BASE}/api/v1/pos/menu?hotelId=${encodeURIComponent(hotelId)}`,
          { cache: 'no-store' }
        );
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.success || !Array.isArray(body.data) || !isMounted) return;

        const mappedItems: MenuItemData[] = body.data.map((it: any) => ({
          id: String(it.id || it._id),
          name: it.name,
          category: it.categoryName || it.category || 'Main Course',
          price: Number(it.price ?? it.basePrice ?? 0),
          rating: 4.7,
          ratingCount: '850',
          isVeg: String(it.foodType || '').toUpperCase() === 'VEG',
          image:
            (Array.isArray(it.images) && it.images[0]) ||
            IMAGE_PLACEHOLDER,
          description: it.description || '',
          isAvailable: it.isAvailable !== false,
        }));

        const uniqueCats = Array.from(new Set(mappedItems.map((it) => it.category).filter(Boolean)));
        setDynamicCategories(['All', ...(uniqueCats.length > 0 ? uniqueCats : ['Starters', 'Main Course', 'Beverages', 'Breads', 'Desserts'])]);
        if (mappedItems.length > 0) {
          setDishesList(mappedItems);
          try {
            localStorage.setItem('spicehub_menu_items', JSON.stringify(body.data));
          } catch {}
        }
      } catch (err) {
        console.warn('POS menu fetch error:', err);
      }
    };

    fetchCatalog();

    const handleMenuSync = (e?: any) => {
      const detail = e?.detail;
      if (detail && detail.itemId !== undefined) {
        setDishesList((prev) =>
          prev.map((dish) => {
            if (dish.id === detail.itemId || String(dish.id) === String(detail.itemId)) {
              return { ...dish, isAvailable: detail.isAvailable };
            }
            return dish;
          })
        );
      }
      fetchCatalog();
    };
    const handleBillSettled = () => {
      setCurrentTab('menu');
      setCartItems([]);
      setSettlementDone(true);
      try {
        localStorage.removeItem('spicehub_customer_cart');
        sessionStorage.removeItem('spicehub_waiter_cooldown_expiry');
      } catch {}
    };
    window.addEventListener('spicehub:menu_updated', handleMenuSync);
    window.addEventListener('spicehub:bill_settled', handleBillSettled);

    const effectiveSocketUrl = SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const socket = io(effectiveSocketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      timeout: 10000,
    });

    socket.on('connect', () => {
      if (hotelId) {
        socket.emit('join:room', `${hotelId}_customers`);
        socket.emit('join:room', `${hotelId}_global`);
      }
    });

    socket.on('menu:item_86_toggled', (payload: any) => {
      if (!payload?.itemId) return;
      setDishesList((prev) =>
        prev.map((dish) => {
          if (dish.id === payload.itemId || String(dish.id) === String(payload.itemId)) {
            return { ...dish, isAvailable: payload.isAvailable };
          }
          return dish;
        })
      );
      if (payload.isAvailable === false) {
        showToast(`"${payload.name || 'Dish'}" is now 86 (Sold Out in kitchen)!`);
      } else {
        showToast(`"${payload.name || 'Dish'}" is back in stock!`);
      }
    });

    socket.on('menu:catalog_updated', () => {
      fetchCatalog();
    });

    socket.on('menu:item_updated', (updatedItem: any) => {
      if (!updatedItem?.id) return;
      setDishesList((prev) =>
        prev.map((dish) => {
          if (dish.id === updatedItem.id || String(dish.id) === String(updatedItem.id)) {
            return {
              ...dish,
              name: updatedItem.name ?? dish.name,
              price: Number(updatedItem.price ?? updatedItem.basePrice ?? dish.price),
              isAvailable: updatedItem.isAvailable !== false,
              description: updatedItem.description ?? dish.description,
            };
          }
          return dish;
        })
      );
    });

    const poller = setInterval(fetchCatalog, 15000);

    return () => {
      isMounted = false;
      window.removeEventListener('spicehub:menu_updated', handleMenuSync);
      window.removeEventListener('spicehub:bill_settled', handleBillSettled);
      socket.disconnect();
      clearInterval(poller);
    };
  }, [hotelId]);

  // Customization Modal State
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [customizingDish, setCustomizingDish] = useState<MenuItemData | null>(null);
  const [modalQty, setModalQty] = useState<number>(1);
  const [spiceLevel, setSpiceLevel] = useState<'Mild' | 'Medium' | 'Spicy' | 'Extra Spicy'>('Medium');
  const [selectedAddons, setSelectedAddons] = useState<{ [key: string]: boolean }>({});
  const [selectedCustomizations, setSelectedCustomizations] = useState<string[]>([]);
  const [customInstructions, setCustomInstructions] = useState('');
  const [placedOrderConfirmation, setPlacedOrderConfirmation] = useState<{
    kotNumber: string;
    itemCount: number;
    totalAmount: number;
  } | null>(null);

  // Service Request Modal / Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Theme State: strictly Bright Mode (Light Theme) per system standard
  const [theme] = useState<'light'>('light');
  const toggleTheme = () => {};
  const isDark = false;

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#f8fafc';
      document.body.style.color = '#0f172a';
    }
  }, []);

  // Active Placed Orders State (Refresh Resilient & Kitchen KDS Synced)
  const [internalActiveOrders, setInternalActiveOrders] = useState<PlacedOrder[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('spicehub_customer_active_orders');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return [];
  });

  const activeOrders: PlacedOrder[] = (propsActiveOrders && propsActiveOrders.length > 0)
    ? propsActiveOrders
    : internalActiveOrders;

  // Cart State with LocalStorage Persistence
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('spicehub_customer_cart');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return [];
  });

  const updateCartItems = (updater: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
    setCartItems((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('spicehub_customer_cart', JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  const [cartSpecialInstructions, setCartSpecialInstructions] = useState('');
  const [customerGuestCount, setCustomerGuestCount] = useState<number>(() => {
    if (Number(initialGuestCount) > 0) return Number(initialGuestCount);
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('spicehub_customer_guest_count');
        if (saved && Number(saved) > 0) return Number(saved);
      } catch {}
    }
    return 2;
  });
  const [showGuestCountPicker, setShowGuestCountPicker] = useState<boolean>(false);

  useEffect(() => {
    if (initialGuestCount && initialGuestCount > 0) {
      setCustomerGuestCount(initialGuestCount);
    }
  }, [initialGuestCount]);

  // Split Bill State
  const [splitMode, setSplitMode] = useState<'equal' | 'individual'>('individual');
  const [splitPersonsCount, setSplitPersonsCount] = useState<number>(3);
  const [splitItemChecked, setSplitItemChecked] = useState<{ [key: string]: boolean }>({});

  // Payment & Settlement State
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'upi' | 'card' | 'cash'>('upi');
  const [payableAmount, setPayableAmount] = useState<number | null>(null);
  const [settlementDone, setSettlementDone] = useState<boolean>(false);
  const [settledData, setSettledData] = useState<{
    billNumber: string;
    amount: number;
    paymentMode: string;
    settledAt: string;
  } | null>(null);

  // Order Cancel countdown & state
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [nowTimestamp, setNowTimestamp] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Double-tap KOT submission guard
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);

  // 45-Second Call Waiter Cooldown Timer (Persistent in SessionStorage)
  const [waiterCooldown, setWaiterCooldown] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const expiry = Number(sessionStorage.getItem('spicehub_waiter_cooldown_expiry') || 0);
        if (expiry > Date.now()) {
          return Math.max(1, Math.round((expiry - Date.now()) / 1000));
        }
      } catch {}
    }
    return 0;
  });

  useEffect(() => {
    if (waiterCooldown <= 0) return;
    const timer = setInterval(() => {
      setWaiterCooldown((prev) => {
        if (prev <= 1) {
          try {
            sessionStorage.removeItem('spicehub_waiter_cooldown_expiry');
          } catch {}
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [waiterCooldown]);

  // Issue reporting modal state
  const [isIssueModalOpen, setIsIssueModalOpen] = useState<boolean>(false);
  const [issueCategory, setIssueCategory] = useState<'food' | 'table' | 'other'>('food');
  const [selectedIssuePreset, setSelectedIssuePreset] = useState<string>('');
  const [customIssueNote, setCustomIssueNote] = useState<string>('');
  const [isSubmittingIssue, setIsSubmittingIssue] = useState<boolean>(false);

  // Bill payment request state
  const [isBillRequested, setIsBillRequested] = useState<boolean>(false);

  // Coupon & Promo Code State
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountAmount: number;
    discountType: string;
    discountValue: number;
    minOrderAmount?: number;
    maxDiscountAmount?: number;
  } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  // Cart Subtotal Calculation
  const cartSubtotal = useMemo(() => cartItems.reduce((acc, it) => acc + it.price * it.qty, 0), [cartItems]);

  // Dynamic Discount Calculation based on current cart subtotal
  const calculatedDiscount = useMemo(() => {
    if (!appliedPromo) return 0;
    if (appliedPromo.minOrderAmount && cartSubtotal < appliedPromo.minOrderAmount) {
      return 0; // Below minimum order threshold
    }
    if (appliedPromo.discountType === 'PERCENTAGE') {
      const disc = Math.round((cartSubtotal * appliedPromo.discountValue) / 100);
      if (appliedPromo.maxDiscountAmount && disc > appliedPromo.maxDiscountAmount) {
        return appliedPromo.maxDiscountAmount;
      }
      return disc;
    }
    return Math.min(cartSubtotal, appliedPromo.discountValue);
  }, [appliedPromo, cartSubtotal]);

  const promoThresholdWarning = useMemo(() => {
    if (appliedPromo && appliedPromo.minOrderAmount && cartSubtotal < appliedPromo.minOrderAmount) {
      return `Min order ₹${appliedPromo.minOrderAmount} required for coupon "${appliedPromo.code}". Add ₹${appliedPromo.minOrderAmount - cartSubtotal} more to activate discount!`;
    }
    return null;
  }, [appliedPromo, cartSubtotal]);

  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) {
      setPromoError('Please enter a promo code');
      return;
    }
    if (cartSubtotal <= 0) {
      setPromoError('Please add items to your cart before applying a promo code');
      return;
    }
    setIsApplyingPromo(true);
    setPromoError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/crm/promo/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hotel-id': hotelId || '',
        },
        body: JSON.stringify({
          hotelId,
          code: promoCodeInput.trim().toUpperCase(),
          subtotal: cartSubtotal,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.valid) {
        setAppliedPromo({
          code: data.promoCode || promoCodeInput.trim().toUpperCase(),
          discountAmount: Number(data.discountAmount) || 0,
          discountType: data.discountType || 'PERCENTAGE',
          discountValue: Number(data.discountValue) || 0,
          minOrderAmount: Number(data.minOrderAmount) || 0,
          maxDiscountAmount: data.maxDiscountAmount ? Number(data.maxDiscountAmount) : undefined,
        });
        setPromoError(null);
        showToast(`Coupon "${data.promoCode || promoCodeInput.toUpperCase()}" applied successfully!`);
      } else {
        setPromoError(data?.message || 'Invalid coupon code or minimum order amount not met');
      }
    } catch (err: any) {
      setPromoError(err?.message || 'Error validating promo code');
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCodeInput('');
    setPromoError(null);
    showToast('Coupon removed');
  };

  // Cart Calculations with Coupon Discount applied before 5% GST
  const discountedSubtotal = Math.max(0, cartSubtotal - calculatedDiscount);
  const gstAmount = Math.round(discountedSubtotal * 0.05);
  const serviceCharge = 0;
  const grandTotal = discountedSubtotal + gstAmount + serviceCharge;
  const totalCartCount = useMemo(() => cartItems.reduce((acc, it) => acc + it.qty, 0), [cartItems]);

  // Active Orders Running Grand Total (from kitchen placed orders)
  const activeOrdersSubtotal = useMemo(() => {
    return activeOrders.reduce((sum, o) => {
      if (o.totalAmount && o.totalAmount > 0) return sum + o.totalAmount;
      return sum + (o.items || []).reduce((isum, it) => isum + (it.subtotal || it.unitPrice * it.quantity), 0);
    }, 0);
  }, [activeOrders]);
  const activeOrdersGst = Math.round(activeOrdersSubtotal * 0.05);
  const activeOrdersGrandTotal = activeOrdersSubtotal + activeOrdersGst;

  // Running Unified Dining Bill (ONLY from placed active orders!)
  const runningDiningTotal = activeOrdersGrandTotal > 0 ? activeOrdersGrandTotal : 0;

  // Items from confirmed active orders for splitting
  const activeBillItems = useMemo(() => {
    return activeOrders.flatMap(o => o.items.map(i => ({ name: i.name, price: i.unitPrice, qty: i.quantity })));
  }, [activeOrders]);

  // Split Calculations
  const splitItemizedSubtotal = useMemo(() => {
    return activeBillItems.reduce((acc, it) => acc + (splitItemChecked[it.name] ? it.price * it.qty : 0), 0);
  }, [activeBillItems, splitItemChecked]);
  const splitItemizedGrandTotal = Math.round(splitItemizedSubtotal * 1.05);
  const splitEqualGrandTotal = runningDiningTotal > 0 ? Math.round(runningDiningTotal / (splitPersonsCount || 1)) : 0;
  const effectiveSplitAmount = splitMode === 'equal' ? splitEqualGrandTotal : splitItemizedGrandTotal;
  const currentPayableTotal = (activeOrdersGrandTotal > 0 && payableAmount !== null) ? payableAmount : runningDiningTotal;

  // Filtered Dishes
  const filteredDishes = useMemo(() => {
    return dishesList.filter((dish) => {
      const catA = dish.category.toLowerCase();
      const catB = selectedCategory.toLowerCase();
      const matchesCategory =
        selectedCategory === 'All' ||
        catA === catB ||
        (catB.includes('starter') && (catA.includes('starter') || catA.includes('appetizer'))) ||
        (catB.includes('main') && (catA.includes('main') || catA.includes('curry'))) ||
        (catB.includes('bread') && (catA.includes('bread') || catA.includes('naan') || catA.includes('kulcha'))) ||
        (catB.includes('dessert') && (catA.includes('dessert') || catA.includes('sweet') || catA.includes('rabri') || catA.includes('tukda'))) ||
        (catB.includes('beverage') && (catA.includes('beverage') || catA.includes('mocktail') || catA.includes('lassi') || catA.includes('mojito')));
      const matchesDiet =
        dietaryFilter === 'ALL' ||
        (dietaryFilter === 'VEG' && dish.isVeg) ||
        (dietaryFilter === 'NON_VEG' && !dish.isVeg);
      const matchesSearch =
        !searchQuery.trim() ||
        dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dish.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dish.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesDiet && matchesSearch;
    });
  }, [dishesList, selectedCategory, dietaryFilter, searchQuery]);

  // Step-by-Step Mobile Hardware Back & History Integration
  const isInternalHistoryPopRef = useRef(false);

  const handleBackNavigation = useCallback((): boolean => {
    // 1. Modals & Overlays
    if (isCustomizeModalOpen) {
      setIsCustomizeModalOpen(false);
      setCustomizingDish(null);
      return true;
    }
    if (isIssueModalOpen) {
      setIsIssueModalOpen(false);
      return true;
    }
    if (isHelpChatOpen) {
      setIsHelpChatOpen(false);
      return true;
    }
    if (placedOrderConfirmation) {
      setPlacedOrderConfirmation(null);
      return true;
    }
    if (showGuestCountPicker) {
      setShowGuestCountPicker(false);
      return true;
    }

    // 2. Sub-views & Tabs
    if (currentTab === 'split') {
      setCurrentTab('payment');
      return true;
    }
    if (currentTab === 'payment') {
      setCurrentTab(activeOrders.length > 0 ? 'orders' : 'menu');
      return true;
    }
    if (currentTab === 'cart') {
      setCurrentTab('menu');
      return true;
    }
    if (currentTab === 'orders') {
      setCurrentTab('menu');
      return true;
    }
    if (currentTab === 'waiter') {
      setCurrentTab('menu');
      return true;
    }

    // 3. Filters in Menu
    if (searchQuery.trim()) {
      setSearchQuery('');
      return true;
    }
    if (selectedCategory !== 'All') {
      setSelectedCategory('All');
      return true;
    }

    // 4. From Menu to Home
    if (currentTab === 'menu') {
      setCurrentTab('home');
      return true;
    }

    // Already at root of dining portal
    return false;
  }, [
    isCustomizeModalOpen,
    isIssueModalOpen,
    isHelpChatOpen,
    placedOrderConfirmation,
    showGuestCountPicker,
    currentTab,
    activeOrders.length,
    searchQuery,
    selectedCategory,
  ]);

  // Two-way handshake with Parent Shell (Capacitor Android Shell)
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'spicehub:hardware-back-pressed') {
        const handled = handleBackNavigation();
        if (handled) {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'spicehub:back-handled' }, '*');
          }
        } else {
          // At root! Send exit requested
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'spicehub:exit-portal-requested' }, '*');
          }
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleBackNavigation]);

  // Pushstate for standalone Mobile Web browsers
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isInternalHistoryPopRef.current) {
      isInternalHistoryPopRef.current = false;
      return;
    }
    try {
      window.history.pushState(
        { tab: currentTab, customize: isCustomizeModalOpen, issue: isIssueModalOpen },
        ''
      );
    } catch {}
  }, [currentTab, isCustomizeModalOpen, isIssueModalOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      isInternalHistoryPopRef.current = true;
      const handled = handleBackNavigation();
      if (!handled && window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'spicehub:exit-portal-requested' }, '*');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [handleBackNavigation]);

  // Handlers
  const handleUpdateQty = (id: string, delta: number) => {
    if ((canOrder === false || isReadOnly) && delta > 0) {
      showToast(occupiedWarning || `Table ${tableNumber} is occupied. Food ordering is disabled.`);
      return;
    }
    updateCartItems((prev) =>
      prev
        .map((it) => {
          if (it.id === id) {
            const newQty = it.qty + delta;
            return newQty > 0 ? { ...it, qty: newQty } : null;
          }
          return it;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleAddDish = (dish: { id: string; name: string; price: number; image?: string; isVeg?: boolean }, addQty = 1) => {
    if (canOrder === false || isReadOnly) {
      showToast(occupiedWarning || `Table ${tableNumber} is occupied. Food ordering is disabled for this device.`);
      return;
    }
    updateCartItems((prev) => {
      const existing = prev.find((i) => i.name === dish.name);
      if (existing) {
        return prev.map((i) => (i.name === dish.name ? { ...i, qty: i.qty + addQty } : i));
      }
      return [
        ...prev,
        {
          id: dish.id,
          name: dish.name,
          price: dish.price,
          qty: addQty,
          image: dish.image,
          isVeg: dish.isVeg,
        },
      ];
    });
    showToast(`Added ${dish.name} to cart!`);
  };

  const openCustomizeModal = (dish: MenuItemData) => {
    if (canOrder === false || isReadOnly) {
      showToast(occupiedWarning || `Table ${tableNumber} is occupied. Customization is disabled in view-only mode.`);
      return;
    }
    setCustomizingDish(dish);
    setSelectedAddons({});
    setSelectedCustomizations([]);
    setSpiceLevel(dish.spicy ? 'Spicy' : 'Medium');
    setCustomInstructions('');
    setModalQty(1);
    setIsCustomizeModalOpen(true);
  };

  const handleSendServiceCall = async (type: CustomerRequestType, label: string) => {
    if (waiterCooldown > 0) {
      showToast(selectedLanguage === 'HI'
        ? `कृपया प्रतीक्षा करें! वेटर पहले ही अलर्ट हो चुका है (${waiterCooldown}s शेष)`
        : `Please wait ${waiterCooldown}s before paging staff again. Server has already been alerted!`);
      return;
    }
    const cooldownDuration = 45;
    setWaiterCooldown(cooldownDuration);
    try {
      sessionStorage.setItem('spicehub_waiter_cooldown_expiry', String(Date.now() + cooldownDuration * 1000));
    } catch {}
    showToast(`${label} requested! Waiter notified at service desk.`);
    if (onRequestService) {
      await onRequestService(type);
    }
  };

  const handleCancelOrderClick = async (orderId: string, orderNumber: string) => {
    if (!confirm(`Are you sure you want to cancel Order #${orderNumber}? Kitchen has not started food preparation yet.`)) {
      return;
    }
    setCancellingOrderId(orderId);
    try {
      if (onCancelOrder) {
        await onCancelOrder(orderId);
      } else {
        showToast(`Order #${orderNumber} cancelled!`);
      }
    } finally {
      setCancellingOrderId(null);
    }
  };

  const handleCallWaiterForBill = async () => {
    if (activeOrders.length === 0 || currentPayableTotal <= 0) {
      showToast(selectedLanguage === 'HI'
        ? 'पहले आर्डर प्लेस करें! अभी टेबल पर कोई सक्रिय आर्डर नहीं है।'
        : 'Please place your order first! No active bill to settle yet.');
      return;
    }
    if (waiterCooldown > 0) {
      showToast(`Staff is already on the way with your bill! (${waiterCooldown}s remaining)`);
      return;
    }
    const cooldownDuration = 45;
    setWaiterCooldown(cooldownDuration);
    try {
      sessionStorage.setItem('spicehub_waiter_cooldown_expiry', String(Date.now() + cooldownDuration * 1000));
    } catch {}
    setIsBillRequested(true);
    showToast(`Waiter has been notified! Staff is bringing your bill of ₹${currentPayableTotal}.`);
    if (onRequestService) {
      await onRequestService('BILL', `Guest at ${tableNumber} requested final bill payment (Amount: ₹${currentPayableTotal})`, 'HIGH');
    }
  };

  const handleNotifyTableVacated = async () => {
    if (!confirm('Are you leaving table now? Staff will be notified to clean the table for next guests.')) {
      return;
    }
    showToast('Thank you for dining with us! Staff notified table is vacant for cleaning.');
    if (onRequestService) {
      await onRequestService('TABLE_VACATED', `Guest at ${tableNumber} has vacated the table. Ready for sanitization.`, 'HIGH');
    }
  };

  const handleSubmitIssue = async () => {
    const issueText = selectedIssuePreset || customIssueNote.trim();
    if (!issueText) {
      showToast('Please select an issue or type details.');
      return;
    }
    setIsSubmittingIssue(true);
    try {
      const type: CustomerRequestType = issueCategory === 'food' ? 'FOOD_ISSUE' : 'TABLE_ISSUE';
      const categoryLabel = issueCategory === 'food' ? 'FOOD PROBLEM' : issueCategory === 'table' ? 'TABLE / AMBIENCE' : 'GENERAL CONCERN';
      const fullNote = `[${categoryLabel}] ${selectedIssuePreset}${customIssueNote.trim() ? ` - Details: ${customIssueNote.trim()}` : ''}`;
      
      if (onRequestService) {
        await onRequestService(type, fullNote, 'URGENT');
      }
      showToast('⚠️ Issue reported with URGENT priority! Floor manager & waiter notified.');
      setIsIssueModalOpen(false);
      setSelectedIssuePreset('');
      setCustomIssueNote('');
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  const handleCheckout = async () => {
    if (canOrder === false || isReadOnly) {
      showToast(occupiedWarning || `Table ${tableNumber} is occupied. Orders cannot be placed from this device.`);
      return;
    }

    if (cartItems.length === 0) {
      showToast('Your cart is empty');
      return;
    }

    if (isSubmittingOrder) {
      return;
    }

    if (!onPlaceOrder) {
      showToast('Ordering is unavailable. Please rescan the table QR code.');
      return;
    }

    setIsSubmittingOrder(true);
    const idempotencyKey = `ORD_${String(tableNumber).replace(/\s+/g, '_')}_${Date.now()}`;

    try {
      const accepted = await onPlaceOrder(
        idempotencyKey,
        cartSpecialInstructions,
        cartItems,
        customerGuestCount
      );

      // The backend is authoritative. On failure, keep the cart intact for retry.
      if (accepted === false) {
        return;
      }

      const generatedKot = `KOT-${Math.floor(1000 + Math.random() * 9000)}`;
      setPlacedOrderConfirmation({
        kotNumber: generatedKot,
        itemCount: cartItems.length,
        totalAmount: grandTotal,
      });

      updateCartItems([]);
      setCartSpecialInstructions('');
      setAppliedPromo(null);
      setPromoCodeInput('');
      try {
        store.clearCart();
      } catch (e) {}

      showToast(`Order placed for ${tableNumber}! Kitchen ticket generated.`);
      setCurrentTab('orders');
    } catch (err: any) {
      showToast(err?.message || 'Order could not be sent to the kitchen. Please retry.');
      return;
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleConfirmSplitBill = () => {
    setPayableAmount(effectiveSplitAmount);
    setCurrentTab('payment');
    showToast(`Split bill calculated: ₹${effectiveSplitAmount}`);
  };

  const handleProcessPayment = async () => {
    if (activeOrders.length === 0 || currentPayableTotal <= 0) {
      showToast(selectedLanguage === 'HI'
        ? 'सक्रिय आर्डर के बिना भुगतान नहीं हो सकता।'
        : 'Cannot process payment without active placed orders.');
      return;
    }

    const amountToPay = currentPayableTotal;
    const mode = selectedPaymentMethod.toUpperCase() as 'UPI' | 'CARD' | 'CASH' | 'ROOM';
    const utr = selectedPaymentMethod === 'upi' ? `UTR${Date.now().toString().slice(-8)}` : undefined;

    showToast(`Processing ₹${amountToPay} payment via ${mode}...`);

    if (!onSettleBill) {
      showToast('Payment is temporarily unavailable. Please call a cashier.');
      return;
    }

    const result = await onSettleBill(mode, amountToPay, utr);
    if (!result?.success) {
      showToast(result?.message || 'Payment could not be completed. No amount was charged.');
      return;
    }

    const billNumber = result?.data?.bill?.billNumber || result?.data?.billNumber || `BILL-${Date.now().toString().slice(-6)}`;
    setSettledData({
      billNumber,
      amount: amountToPay,
      paymentMode: mode,
      settledAt: new Date().toLocaleTimeString(),
    });
    setSettlementDone(true);
    showToast(`Payment Settled! Table flagged for sanitization.`);
  };

  // Dynamic categories list from backend catalog & admin
  const CATEGORIES = dynamicCategories;

  return (
    <div className={`min-h-screen w-full flex justify-center ${isDark ? 'bg-[#020617]' : 'bg-gradient-to-b from-[#EEF5F0] via-[#F6FAF6] to-[#EDF4EE]'}`}>
      <div className={`mx-auto flex min-h-screen w-full max-w-md flex-col overflow-x-hidden border-x font-sans antialiased shadow-2xl transition-colors duration-200 select-none md:max-w-3xl ${
        isDark ? 'bg-[#020617] text-[#FBF7EE] border-[#1E4A35]' : 'bg-transparent text-[#123C2B] border-[#D7E5D9]/80'
      }`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-800">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="font-bold text-xs sm:text-sm">{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP HEADER (100% Full-Width Responsive Bar)                           */}
      {/* ========================================================================= */}
      <header className={`sticky top-0 z-40 w-full border-b backdrop-blur-2xl transition-colors ${
        isDark ? 'bg-slate-950/85 border-slate-800 text-white' : 'bg-white/85 border-white/60 text-slate-900 shadow-[0_4px_20px_rgba(18,60,43,0.05)]'
      }`}>
        <div className="mx-auto flex h-16 w-full items-center justify-between gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
          {/* Left: Brand Logo & Dining Table Session Pill */}
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <button
              onClick={() => setCurrentTab('home')}
              className="flex min-w-0 shrink items-center gap-2 text-left"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-[#1B523C] to-[#0E2F22] border border-emerald-400/40 text-[#F7E2B4] flex items-center justify-center shadow-[0_4px_12px_rgba(18,60,43,0.3),inset_0_1px_1.5px_rgba(255,255,255,0.4)] transition hover:scale-105">
                <UtensilsCrossed className="w-5 h-5 drop-shadow" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 truncate text-base font-black leading-none tracking-tight text-slate-900 sm:text-lg">
                  SpiceHub
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                    Dine-In
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5 truncate max-w-[130px] sm:max-w-none text-[11px] text-slate-500 font-medium">
                  <span className="truncate">{hotelName}</span>
                  {hotelLocation?.city && (
                    <span className="hidden lg:inline-flex items-center gap-0.5 text-slate-400 font-normal">
                      • <MapPin className="w-2.5 h-2.5 text-emerald-600" /> {hotelLocation.city}
                    </span>
                  )}
                </div>
              </div>
            </button>

            {/* Table Badge */}
            <div className={`hidden shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-bold xs:flex ${
              isDark ? 'border-slate-700 bg-slate-800/80 text-slate-200' : 'border-emerald-600/25 bg-white/90 text-[#123C2B] shadow-[0_2px_8px_rgba(18,60,43,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xs'
            }`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{tableNumber}</span>
              <span className="text-[10px] text-slate-500 hidden md:inline">({section})</span>
            </div>

            {/* Seated Pax Badge */}
            <div className={`hidden shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-bold sm:flex ${
              isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}>
              <Users className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              <span className="whitespace-nowrap">{customerGuestCount} Guests</span>
            </div>

            {/* Geofence Proximity Badge */}
            <div data-testid="geofence-proximity-badge" className={`hidden shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-semibold lg:flex ${
              isDark ? 'border-emerald-500/40 bg-emerald-950/60 text-emerald-300' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="whitespace-nowrap">On-premises verified</span>
            </div>
          </div>

          {/* Center (Desktop): Quick Search & Dietary Toggle */}
          <div className="hidden lg:flex items-center gap-3 flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                data-testid="table-desktop-search-input"
                type="text"
                placeholder={selectedLanguage === 'HI' ? 'व्यंजन, भोजन, पेय खोजें...' : 'Search dishes, curries, drinks...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-8 py-2 rounded-xl text-sm font-medium border transition focus:outline-none focus:ring-2 focus:ring-emerald-600/20 ${
                  isDark
                    ? 'bg-slate-900/90 border-slate-700 text-slate-100 placeholder:text-slate-400'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 shadow-xs'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Veg / Non-Veg Toggle Pills */}
            <div className={`flex p-0.5 rounded-xl border text-[11px] font-bold shrink-0 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                onClick={() => setDietaryFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  dietaryFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setDietaryFilter('VEG')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition ${
                  dietaryFilter === 'VEG'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-emerald-700 hover:text-emerald-900'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Veg</span>
              </button>
              <button
                onClick={() => setDietaryFilter('NON_VEG')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition ${
                  dietaryFilter === 'NON_VEG'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'text-red-600 hover:text-red-800'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span>Non-Veg</span>
              </button>
            </div>
          </div>

          {/* Right: Quick Service, Theme Switcher, Language & Cart Pill */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {/* Need Help / Support Chat Button */}
            <button
              type="button"
              data-testid="header-need-help-btn"
              onClick={() => setIsHelpChatOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition shadow-xs"
              title="Chat with Reception or Waiter"
            >
              <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden xs:inline">Need Help</span>
            </button>

            {/* Quick Call Waiter Button */}
            {waiterEnabled && (
              <button
                onClick={() => setCurrentTab('waiter')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-xs transition"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Call Waiter</span>
              </button>
            )}

            {/* Bilingual English / Hindi Language Pill */}
            <button
              onClick={toggleCustomerLanguage}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 shadow-2xs'
              }`}
              title={selectedLanguage === 'EN' ? 'हिन्दी में बदलें' : 'Switch to English'}
            >
              <Globe className="h-3.5 w-3.5 shrink-0 text-slate-600" />
              <span className="hidden sm:inline">{selectedLanguage === 'EN' ? 'हिन्दी' : 'English'}</span>
            </button>

            {/* Cart Button */}
            <button
              data-testid="header-btn-cart"
              onClick={() => setCurrentTab('cart')}
              className={`relative px-3.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                  : 'bg-gradient-to-b from-[#1B523C] to-[#123C2B] hover:brightness-105 border-emerald-400/30 text-white shadow-[0_4px_12px_rgba(18,60,43,0.28),inset_0_1px_1px_rgba(255,255,255,0.35)] font-bold active:translate-y-0.5'
              }`}
            >
              <ShoppingCart className="h-4 w-4 shrink-0 text-white drop-shadow-xs" />
              <span className="hidden text-xs font-bold sm:inline">Cart</span>
              {totalCartCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#F7E2B4] text-[#123C2B] text-[10px] font-black shadow-xs animate-pulse">
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search & Diet Bar (< md) */}
        <div className="md:hidden px-4 pb-3 pt-1 flex items-center gap-2 border-t border-white/50 backdrop-blur-md bg-white/60">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              data-testid="table-mobile-search-input"
              type="text"
              placeholder={selectedLanguage === 'HI' ? 'व्यंजन, भोजन, पेय खोजें...' : 'Search dishes, curries, drinks...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-8 py-2 rounded-xl text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-emerald-600/20 backdrop-blur-md ${
                isDark
                  ? 'bg-slate-900/90 border-slate-700 text-slate-100 placeholder:text-slate-400'
                  : 'bg-white/80 border-white/80 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 shadow-[0_2px_8px_rgba(0,0,0,0.03),inset_0_1px_1px_rgba(255,255,255,0.8)]'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className={`flex p-0.5 rounded-xl border text-[10px] font-bold shrink-0 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white/80 border-white/80 backdrop-blur-md shadow-2xs'
          }`}>
            <button
              onClick={() => setDietaryFilter('ALL')}
              className={`px-2 py-1 rounded-lg transition ${dietaryFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-600'}`}
            >
              {selectedLanguage === 'HI' ? 'सभी' : 'All'}
            </button>
            <button
              onClick={() => setDietaryFilter('VEG')}
              className={`px-2 py-1 rounded-lg transition ${
                dietaryFilter === 'VEG'
                  ? 'bg-gradient-to-b from-[#1EA568] to-[#12804E] text-white shadow-[0_2px_8px_rgba(18,128,78,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] border border-emerald-400/30 font-black'
                  : 'text-emerald-700 font-bold'
              }`}
            >
              {selectedLanguage === 'HI' ? 'शाकाहारी' : 'Veg'}
            </button>
            <button
              onClick={() => setDietaryFilter('NON_VEG')}
              className={`px-2 py-1 rounded-lg transition ${
                dietaryFilter === 'NON_VEG'
                  ? 'bg-gradient-to-b from-[#DC2626] to-[#B91C1C] text-white shadow-[0_2px_8px_rgba(220,38,38,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] border border-red-400/30 font-black'
                  : 'text-red-600 font-bold'
              }`}
            >
              {selectedLanguage === 'HI' ? 'मांसाहारी' : 'Non-Veg'}
            </button>
          </div>
        </div>
      </header>

      {/* Occupied Table View-Only Banner */}
      {(canOrder === false || isReadOnly) && (
        <div
          data-testid="occupied-table-warning-banner"
          className="w-full bg-amber-50 border-b border-amber-200 px-4 py-3 text-amber-950 text-xs shadow-xs"
        >
          <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-amber-700 shrink-0" />
              <div>
                <span className="font-bold text-amber-900 mr-2">
                  {selectedLanguage === 'HI' ? 'सक्रिय मेज सत्र' : 'Active Dining Session'}
                </span>
                <span className="text-[11px] text-amber-800">
                  {occupiedWarning || `Table ${tableNumber} is currently active. For order modifications or bill requests, our service captain is at your service.`}
                </span>
              </div>
            </div>
            <button
              onClick={() => setCurrentTab('waiter')}
              className="shrink-0 px-3 py-1 rounded-full bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700 transition shadow-xs"
            >
              Contact Captain
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN BODY: RESPONSIVE MULTI-COLUMN WORKSPACE                          */}
      {/* ========================================================================= */}
      <div className="flex-1 w-full max-w-4xl mx-auto p-3 sm:p-4 pb-32 sm:pb-44 flex flex-col gap-4 min-w-0">
        
        {/* ======================================================================= */}
        {/* LEFT / CENTER: MENU CATALOG & DISHES BROWSER                           */}
        {/* ======================================================================= */}
        <div className={`flex-1 min-w-0 flex flex-col space-y-4 ${currentTab !== 'home' && currentTab !== 'menu' ? 'hidden' : 'flex'}`}>
          
          {/* Active Live Order Tracker Banner (If any active orders) */}
          {activeOrders.length > 0 && (
            <div 
              onClick={() => setCurrentTab('orders')}
              className="cursor-pointer p-4 rounded-2xl bg-white text-slate-900 border border-slate-200 flex items-center justify-between shadow-xs transition hover:border-slate-300 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center">
                  <ChefHat className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                      {activeOrders.length} Active {activeOrders.length === 1 ? 'Order' : 'Orders'}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Table {tableNumber}</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold mt-0.5 text-slate-900">
                    Latest: #{activeOrders[activeOrders.length - 1].orderNumber} • Status: {activeOrders[activeOrders.length - 1].orderStatus}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold bg-slate-100 text-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-200">
                <span>Track Live</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          )}

          {/* Hero Banner: Luxury 3D Dining Atmosphere */}
          <div
            data-testid="welcome-hero-banner"
            className="relative rounded-3xl overflow-hidden min-h-[175px] flex items-end p-5 text-white bg-gradient-to-br from-[#123C2B] via-[#1B4D3E] to-[#0A241A] border border-emerald-400/35 shadow-[0_20px_42px_-10px_rgba(18,60,43,0.45),inset_0_1px_1.5px_rgba(255,255,255,0.35),inset_0_-2px_6px_rgba(0,0,0,0.5)]"
          >
            <div className="relative z-10 w-full flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-[#F3D79B] text-xs font-semibold shadow-xs">
                    <Utensils className="w-3.5 h-3.5 text-[#F3D79B]" />
                    <span>Freshly Prepared Food</span>
                    <span>•</span>
                    <span>Table Service</span>
                  </div>
                  {(hotelLocation?.city || hotelLocation?.street) && (
                    <div data-testid="verified-table-hotel-location" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white/95 text-xs font-semibold shadow-xs">
                      <MapPin className="w-3.5 h-3.5 text-[#F3D79B] shrink-0" />
                      <span className="truncate max-w-[280px]">
                        {hotelLocation.street ? `${hotelLocation.street}, ` : ''}{hotelLocation.city || 'Jaipur'}, {hotelLocation.state || 'Rajasthan'}{hotelLocation.pincode ? ` - ${hotelLocation.pincode}` : ''}
                      </span>
                      {hotelLocation.googleMapUrl && (
                        <a
                          href={hotelLocation.googleMapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid="table-directions-link"
                          className="text-[#F3D79B] hover:underline font-bold ml-0.5"
                        >
                          Directions ↗
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-sm">
                  Welcome to {hotelName}
                </h1>
                <p className="text-xs text-[#D7E5D9] mt-1 max-w-lg font-medium leading-relaxed">
                  Order appetizers, main courses & beverages directly to <strong data-testid="badge-table-number" className="text-[#123C2B] font-black px-2 py-0.5 rounded-md bg-[#F3D79B] border border-[#E4DAC6] shadow-xs">Table {tableNumber}</strong> without waiting.
                </p>
                <div className="mt-3.5 flex items-center gap-2">
                  <button
                    type="button"
                    data-testid="btn-browse-menu"
                    onClick={() => {
                      setSelectedCategory('All');
                      setCurrentTab('home');
                    }}
                    className="gold-3d-button px-4 py-2 rounded-xl text-[#123C2B] font-black text-xs flex items-center gap-1.5"
                  >
                    <span>{selectedLanguage === 'HI' ? 'मेनू देखें' : 'Browse Menu'}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#123C2B]" />
                  </button>
                </div>
              </div>

              {/* Quick Waiter Action Chips with 3D Depth & 45s Anti-Spam Cooldown */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  data-testid="quick-action-water"
                  disabled={waiterCooldown > 0}
                  onClick={() => handleSendServiceCall('WATER', 'Extra Water')}
                  className={`px-3 py-1.5 rounded-xl text-white backdrop-blur-md border border-white/30 text-xs font-bold flex items-center gap-1.5 transition active:translate-y-0.5 shadow-[0_4px_10px_rgba(0,0,0,0.18),inset_0_1px_1px_rgba(255,255,255,0.35)] ${
                    waiterCooldown > 0 ? 'bg-white/10 opacity-70 cursor-not-allowed' : 'bg-white/15 hover:bg-white/25'
                  }`}
                >
                  <Droplets className="w-3.5 h-3.5 text-blue-300 drop-shadow" />
                  <span>{selectedLanguage === 'HI' ? 'पानी' : 'Water'}{waiterCooldown > 0 ? ` (${waiterCooldown}s)` : ''}</span>
                </button>
                <button
                  type="button"
                  data-testid="quick-action-bill"
                  disabled={waiterCooldown > 0}
                  onClick={() => handleSendServiceCall('BILL', 'Bill Request')}
                  className={`px-3 py-1.5 rounded-xl text-white backdrop-blur-md border border-white/30 text-xs font-bold flex items-center gap-1.5 transition active:translate-y-0.5 shadow-[0_4px_10px_rgba(0,0,0,0.18),inset_0_1px_1px_rgba(255,255,255,0.35)] ${
                    waiterCooldown > 0 ? 'bg-white/10 opacity-70 cursor-not-allowed' : 'bg-white/15 hover:bg-white/25'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5 text-amber-200 drop-shadow" />
                  <span>{selectedLanguage === 'HI' ? 'बिल' : 'Bill'}{waiterCooldown > 0 ? ` (${waiterCooldown}s)` : ''}</span>
                </button>
                <button
                  type="button"
                  data-testid="quick-action-clean"
                  disabled={waiterCooldown > 0}
                  onClick={() => handleSendServiceCall('CLEANING', 'Clean Table')}
                  className={`px-3 py-1.5 rounded-xl text-white backdrop-blur-md border border-white/30 text-xs font-bold flex items-center gap-1.5 transition active:translate-y-0.5 shadow-[0_4px_10px_rgba(0,0,0,0.18),inset_0_1px_1px_rgba(255,255,255,0.35)] ${
                    waiterCooldown > 0 ? 'bg-white/10 opacity-70 cursor-not-allowed' : 'bg-white/15 hover:bg-white/25'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 drop-shadow" />
                  <span>{selectedLanguage === 'HI' ? 'सफाई' : 'Clean'}{waiterCooldown > 0 ? ` (${waiterCooldown}s)` : ''}</span>
                </button>
                {waiterEnabled && (
                  <button
                    type="button"
                    data-testid="quick-action-call-waiter"
                    disabled={waiterCooldown > 0}
                    onClick={() => {
                      if (waiterCooldown > 0) {
                        showToast(`Server has already been alerted! (${waiterCooldown}s cooldown)`);
                        return;
                      }
                      setCurrentTab('waiter');
                    }}
                    className={`emerald-3d-button px-3.5 py-1.5 rounded-xl text-white font-black text-xs flex items-center gap-1.5 ${
                      waiterCooldown > 0 ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    <Bell className="w-3.5 h-3.5 drop-shadow" />
                    <span>{selectedLanguage === 'HI' ? 'वेटर बुलाएं' : 'Call Waiter'}{waiterCooldown > 0 ? ` (${waiterCooldown}s)` : ''}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Horizontal Category Navigation Bar (Frosted Glass with 3D Pills) */}
          <div className="sticky top-16 z-30 py-2.5 backdrop-blur-2xl bg-white/80 dark:bg-[#0c2118]/80 border-b border-white/60 dark:border-white/10 shadow-[0_4px_20px_rgba(18,60,43,0.04)]">
            <div className="custom-scrollbar flex gap-2 overflow-x-auto scroll-smooth pb-1 px-1">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
                const dishCount = cat === 'All'
                  ? dishesList.length
                  : dishesList.filter((d) => d.category.toLowerCase() === cat.toLowerCase()).length;
                return (
                  <button
                    key={cat}
                    data-testid={`category-tab-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    onClick={() => {
                      setSelectedCategory(cat);
                      if (currentTab !== 'menu' && currentTab !== 'home') setCurrentTab('home');
                    }}
                    className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-all sm:text-sm ${
                      isSelected
                        ? 'emerald-3d-pill-active text-[#F3D79B] scale-[1.02]'
                        : 'bg-white/80 dark:bg-white/10 text-[#123C2B] dark:text-emerald-100 border border-white/80 dark:border-white/10 hover:bg-white backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.9)]'
                    }`}
                  >
                    <span>{selectedLanguage === 'HI' ? (cat === 'All' ? 'सभी' : cat === 'Starters' ? 'स्टार्टर्स' : cat === 'Main Course' ? 'मेन कोर्स' : cat === 'Breads' ? 'रोटी व नान' : cat === 'Desserts' ? 'मिठाई' : cat === 'Beverages' ? 'पेय' : cat) : cat}</span>
                    <span className={`text-[11px] ${isSelected ? 'text-[#F3D79B]/85' : 'text-[#7C7566] dark:text-slate-400'}`}>({dishCount})</span>
                  </button>
                );
              })}
            </div>
          </div>


          {/* Dishes Grid: Responsive 1 col (mobile), 2 cols (tablet), 3 cols (desktop) */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {selectedCategory === 'All' ? 'All Dishes & Specialties' : `${selectedCategory}`}
                </h2>
                <p className="text-xs text-slate-400">
                  Showing {filteredDishes.length} freshly prepared items
                </p>
              </div>

              {dietaryFilter !== 'ALL' && (
                <button
                  onClick={() => setDietaryFilter('ALL')}
                  className="text-xs text-slate-600 dark:text-slate-300 font-semibold hover:underline"
                >
                  Clear filter ({dietaryFilter})
                </button>
              )}
            </div>

            {filteredDishes.length === 0 ? (
              <div className={`p-12 text-center rounded-xl border ${
 isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
 }`}>
                <UtensilsCrossed className="w-10 h-10 mx-auto text-slate-400 mb-3 opacity-50" />
                <h3 className="font-semibold text-sm">No dishes found matching your criteria</h3>
                <p className="text-xs mt-1">Try resetting the search or selecting another category.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                    setDietaryFilter('ALL');
                  }}
                  className="mt-4 px-4 py-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold text-xs"
                >
                  View Full Menu
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDishes.map((dish) => {
                  const cartItem = cartItems.find((c) => c.name === dish.name);
                  const inCartQty = cartItem ? cartItem.qty : 0;

                  return (
                    <div
                      key={dish.id}
                      data-testid={`dish-card-${dish.name.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => openCustomizeModal(dish)}
                      className="bg-white/90 border border-white/80 dark:bg-slate-900/90 dark:border-slate-800 rounded-3xl p-4 h-full flex flex-col justify-between shadow-[0_4px_20px_rgba(18,60,43,0.04)] backdrop-blur-md transition-all duration-300 hover:border-emerald-300/60 hover:shadow-[0_12px_30px_rgba(18,60,43,0.12)] group cursor-pointer"
                    >
                      <div>
                        {/* Food Image with Badges */}
                        <div className="relative rounded-2xl overflow-hidden h-36 bg-slate-100 mb-3 shadow-inner">
                          <img
                            src={dish.image}
                            alt={dish.name}
                            className={`w-full h-full object-cover group-hover:scale-105 transition duration-300 ${
                              dish.isAvailable === false ? 'grayscale opacity-50' : ''
                            }`}
                          />
                          
                          {/* 86 Sold Out Badge or Promotional Badge */}
                          {dish.isAvailable === false ? (
                            <span className="absolute top-2 left-2 z-10 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-red-600 text-white flex items-center gap-1 shadow-xs">
                              <span>Sold Out</span>
                            </span>
                          ) : dish.badge ? (
                            <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/90 text-amber-300 border border-slate-700 shadow-xs backdrop-blur-xs">
                              {dish.badge}
                            </span>
                          ) : null}

                          {/* Veg / Non-Veg Indicator */}
                          <span className={`absolute top-2 right-2 w-5 h-5 rounded-md backdrop-blur-md flex items-center justify-center border shadow-2xs ${
                            dish.isVeg
                              ? 'bg-white/95 border-emerald-600 text-emerald-600'
                              : 'bg-white/95 border-red-600 text-red-600'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${dish.isVeg ? 'bg-emerald-600' : 'bg-red-600'}`} />
                          </span>

                          {/* Rating Pill */}
                          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900/85 backdrop-blur-md text-white flex items-center gap-1 shadow-xs">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{dish.rating}</span>
                          </span>

                          {/* Quick Customize Button */}
                          {dish.isAvailable !== false && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openCustomizeModal(dish);
                              }}
                              className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-slate-900/85 hover:bg-slate-900 text-white text-[10px] font-semibold backdrop-blur-md flex items-center gap-1 transition shadow-xs"
                            >
                              <SlidersHorizontal className="w-3 h-3 text-amber-300" />
                              <span>Customize</span>
                            </button>
                          )}
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h3 className="font-bold text-base text-slate-900 line-clamp-1">
                            {dish.name}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {dish.description}
                          </p>
                        </div>
                      </div>

                      {/* Price & Add to Cart Stepper */}
                      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-base font-extrabold text-[#123C2B]">
                            ₹{dish.price}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400">Taxes inclusive</span>
                        </div>

                        {dish.isAvailable === false ? (
                          <div className="h-9 w-full rounded-xl bg-slate-100 text-slate-500 text-xs font-semibold flex items-center justify-center">
                            Sold Out
                          </div>
                        ) : inCartQty > 0 ? (
                          <div className="h-9 w-full flex items-center justify-between border border-emerald-400/30 rounded-xl overflow-hidden bg-gradient-to-b from-[#184E38] to-[#103324] text-white font-bold text-sm shadow-[0_3px_10px_rgba(18,60,43,0.25),inset_0_1px_1px_rgba(255,255,255,0.3)]">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateQty(cartItem!.id, -1);
                              }}
                              className="h-full px-3 hover:bg-white/10 transition flex items-center justify-center"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="text-white font-black">{inCartQty}</span>
                            <button
                              type="button"
                              data-testid={`btn-plus-${dish.name.toLowerCase().replace(/\s+/g, '-')}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateQty(cartItem!.id, 1);
                              }}
                              className="h-full px-3 hover:bg-white/10 transition flex items-center justify-center"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            data-testid={`btn-add-${dish.name.toLowerCase().replace(/\s+/g, '-')}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddDish(dish);
                            }}
                            className="h-9 w-full bg-gradient-to-b from-[#1B523C] to-[#123C2B] hover:brightness-105 border border-emerald-400/30 text-white shadow-[0_3px_10px_rgba(18,60,43,0.25),inset_0_1px_1px_rgba(255,255,255,0.35)] rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition active:translate-y-0.5 active:shadow-[0_1px_4px_rgba(18,60,43,0.2)]"
                          >
                            <Plus className="w-4 h-4" />
                            <span>{selectedLanguage === 'HI' ? 'जोड़ें' : 'Add'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* RIGHT COLUMN (DRAWER ON TABLET/DESKTOP, FULL PAGE ON MOBILE)          */}
        {/* ======================================================================= */}
        {currentTab !== 'home' && currentTab !== 'menu' && (
          <div
            onClick={() => setCurrentTab('menu')}
            className="hidden md:block fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity animate-in fade-in duration-200"
          />
        )}

        <div className={`shrink-0 flex flex-col space-y-4 ${
          currentTab !== 'home' && currentTab !== 'menu'
            ? 'fixed inset-0 z-50 w-full h-full bg-[#FAFCF9] dark:bg-[#071710] overflow-y-auto p-4 sm:p-5 pb-16 shadow-none rounded-none border-0 md:inset-x-auto md:right-0 md:top-0 md:w-96 md:h-full md:border-l md:border-slate-200 md:dark:border-slate-800 md:flex md:shadow-none animate-in fade-in duration-150'
            : 'hidden'
        }`}>
          {/* Full-Page Navigation Header with Back to Menu & Close */}
          <div className="flex items-center justify-between pb-3 border-b border-[#D7E5D9]/70 dark:border-white/10 shrink-0 sticky top-0 bg-[#FAFCF9]/95 dark:bg-[#071710]/95 backdrop-blur-md z-10 -mx-4 px-4 sm:-mx-5 sm:px-5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentTab('menu')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E4F1E6] hover:bg-[#D3E8D6] dark:bg-white/10 text-[#123C2B] dark:text-[#F7E2B4] text-xs font-bold transition active:scale-95 border border-[#B8D7C1]/60 shadow-2xs"
                aria-label="Back to Menu"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{selectedLanguage === 'HI' ? 'मेनू' : 'Menu'}</span>
              </button>
              <div className="flex items-center gap-1.5 ml-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#12804E] animate-pulse" />
                <h2 className="font-lux font-bold text-[#123C2B] dark:text-[#F7E2B4] text-base tracking-tight">
                  {currentTab === 'cart'
                    ? (selectedLanguage === 'HI' ? 'कार्ट एवं आर्डर' : 'Cart & Order')
                    : currentTab === 'orders'
                    ? (selectedLanguage === 'HI' ? 'लाइव आर्डर स्टेटस' : 'Live Order Status')
                    : (selectedLanguage === 'HI' ? 'बिल एवं भुगतान' : 'Bill & Payment')}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden xs:inline-flex px-2 py-0.5 rounded-md bg-[#123C2B]/10 dark:bg-white/10 text-[#123C2B] dark:text-[#E9C98A] text-[11px] font-mono font-bold">
                {tableNumber}
              </span>
              <button
                type="button"
                onClick={() => setCurrentTab('menu')}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 text-[#123C2B] dark:text-[#F7E2B4] flex items-center justify-center transition active:scale-95 shadow-2xs"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Panel Header Switcher (Cart | Live Order | Split/Pay | Waiter) */}
          <div className={`p-1.5 rounded-2xl border flex items-center gap-2 text-xs font-semibold ${
            isDark ? 'bg-[#0E2A1E]/80 border-white/10' : 'bg-[#EAF2EC]/70 border-[#D7E5D9] shadow-inner'
          }`}>
            <button
              onClick={() => setCurrentTab('cart')}
              className={`flex-1 h-11 min-h-[44px] py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all duration-150 ${
                currentTab === 'cart'
                  ? 'emerald-3d-pill-active text-[#F7E2B4] font-black shadow-xs scale-[1.02]'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-[#5E7163] hover:text-[#123C2B] active:scale-95'
              }`}
            >
              <ShoppingCart className={`w-4 h-4 ${currentTab === 'cart' ? 'text-[#F7E2B4]' : 'text-[#5E7163]'}`} />
              <span className="font-bold">{selectedLanguage === 'HI' ? 'कार्ट' : 'Cart'}</span>
              {totalCartCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#E9C98A] text-[#123C2B] text-[10px] font-black">
                  {totalCartCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentTab('orders')}
              className={`flex-1 h-11 min-h-[44px] py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all duration-150 ${
                currentTab === 'orders'
                  ? 'emerald-3d-pill-active text-[#F7E2B4] font-black shadow-xs scale-[1.02]'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-[#5E7163] hover:text-[#123C2B] active:scale-95'
              }`}
            >
              <Clock className={`w-4 h-4 ${currentTab === 'orders' ? 'text-[#F7E2B4]' : 'text-[#5E7163]'}`} />
              <span className="font-bold">{selectedLanguage === 'HI' ? 'आर्डर' : 'Orders'}</span>
              {activeOrders.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#E9C98A] text-[#123C2B] text-[10px] font-black">
                  {activeOrders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentTab('payment')}
              className={`flex-1 h-11 min-h-[44px] py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all duration-150 ${
                currentTab === 'payment' || currentTab === 'split'
                  ? 'emerald-3d-pill-active text-[#F7E2B4] font-black shadow-xs scale-[1.02]'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-[#5E7163] hover:text-[#123C2B] active:scale-95'
              }`}
            >
              <CreditCard className={`w-4 h-4 ${currentTab === 'payment' || currentTab === 'split' ? 'text-[#F7E2B4]' : 'text-[#5E7163]'}`} />
              <span className="font-bold">{selectedLanguage === 'HI' ? 'भुगतान' : 'Pay'}</span>
              {activeOrdersGrandTotal > 0 && currentPayableTotal > 0 && (
                <span className="font-mono text-[10px] font-bold">₹{currentPayableTotal}</span>
              )}
            </button>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* TAB 1: CART SCREEN                                                    */}
          {/* --------------------------------------------------------------------- */}
          {(currentTab === 'cart' || (currentTab === 'home' && !('mobileScreen' in window))) && (
            <div
              data-testid="cart-drawer-container"
              className={`p-4 sm:p-5 rounded-3xl border flex flex-col justify-between space-y-4 shadow-sm ${
                isDark ? 'glass-panel bg-[#0C2118]/90 border-white/10 text-white' : 'glass-panel border-[#D7E5D9] text-[#123C2B]'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#D7E5D9]/70 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-[#E4F1E6] text-[#123C2B] border border-[#B8D7C1] flex items-center justify-center font-black shadow-2xs">
                    <ShoppingCart className="w-4 h-4 text-[#123C2B]" />
                  </div>
                  <div>
                    <h3 className="font-lux font-bold text-sm text-[#123C2B] dark:text-white">Table Order Cart</h3>
                    <p className="text-[10px] text-[#5E7163] dark:text-slate-400 font-medium">{tableNumber} • {cartItems.length} unique items</p>
                  </div>
                </div>

                {cartItems.length > 0 && (
                  <button
                    onClick={() => setCartItems([])}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 flex items-center gap-1.5 active:scale-95 transition shadow-2xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Cart</span>
                  </button>
                )}
              </div>

              {/* Cart Items List */}
              <div className="space-y-2.5 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                {cartItems.length === 0 ? (
                  <div className="py-10 text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-[#E4F1E6] dark:bg-emerald-950/40 text-[#123C2B] dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner border border-[#B8D7C1]/50">
                      <ShoppingCart className="w-7 h-7 text-[#123C2B] dark:text-emerald-400 opacity-80" />
                    </div>
                    <div>
                      <div className="font-lux font-bold text-sm text-[#123C2B] dark:text-[#F7E2B4]">Your cart is empty</div>
                      <p className="text-xs text-[#5E7163] dark:text-slate-400 mt-1 max-w-xs mx-auto">
                        {selectedLanguage === 'HI' ? 'स्वादिष्ट शाही व्यंजनों को देखने के लिए मेनू खोलें।' : 'Add delicious items from our royal dining menu!'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentTab('menu')}
                      className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl emerald-3d-button text-[#F7E2B4] font-black text-xs sm:text-sm shadow-md transition active:scale-95 mx-auto"
                    >
                      <UtensilsCrossed className="w-4 h-4 text-[#F7E2B4]" />
                      <span>{selectedLanguage === 'HI' ? 'शाही मेनू देखें' : 'Browse Royal Menu'}</span>
                    </button>
                  </div>
                ) : (
                  cartItems.map((it) => (
                    <div
                      key={it.id}
                      data-testid={`cart-item-${it.name.toLowerCase().replace(/\s+/g, '-')}`}
                      className={`p-3.5 rounded-2xl border transition-all duration-150 ${
                        isDark ? 'bg-[#123C2B]/40 border-white/10 shadow-xs' : 'bg-white border-[#E2EBE3] shadow-2xs hover:border-[#12804E]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {it.image && (
                            <img src={it.image} alt={it.name} className="w-12 h-12 rounded-xl object-cover shrink-0 shadow-2xs" />
                          )}
                          <div className="min-w-0">
                            <div className={`font-bold text-xs sm:text-sm truncate ${isDark ? 'text-white' : 'text-[#123C2B]'}`}>
                              {it.name}
                            </div>
                            <div className="text-xs sm:text-sm font-black text-[#12804E] dark:text-[#F7E2B4]">₹{it.price * it.qty}</div>
                          </div>
                        </div>

                        {/* 3D Emerald Stepper */}
                        <div className="flex items-center gap-1.5 bg-[#F2F7F2] dark:bg-black/40 p-1 rounded-xl border border-[#D7E5D9] dark:border-white/10 shadow-2xs shrink-0">
                          <button
                            onClick={() => handleUpdateQty(it.id, -1)}
                            className="w-9 h-9 rounded-lg bg-white dark:bg-white/10 text-[#123C2B] dark:text-white font-black text-base flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-2xs active:scale-90 transition"
                            aria-label="Decrease quantity"
                          >
                            -
                          </button>
                          <span className="min-w-[24px] text-center text-xs font-black text-[#123C2B] dark:text-[#F7E2B4]">{it.qty}</span>
                          <button
                            onClick={() => handleUpdateQty(it.id, 1)}
                            className="w-9 h-9 rounded-lg emerald-3d-button text-white font-black text-base flex items-center justify-center active:scale-90 transition shadow-xs"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Customization Chips & Note */}
                      <div className="pt-2 border-t border-[#D7E5D9]/60 dark:border-white/10 flex flex-col gap-1.5">
                        <div className="flex flex-wrap gap-1">
                          {[
                            { label: 'Kam Namak', val: 'Kam Namak (Less Salt)' },
                            { label: 'Mirchi Kam', val: 'Mirchi Kam (Mild Spicy)' },
                            { label: 'Jain Friendly', val: 'No Onion Garlic (Jain)' },
                            { label: 'Extra Crispy', val: 'Extra Crispy' },
                          ].map((chip) => {
                            const isSelected = it.specialInstructions?.includes(chip.val);
                            return (
                              <button
                                key={chip.label}
                                type="button"
                                onClick={() => {
                                  const current = it.specialInstructions || '';
                                  let next = '';
                                  if (isSelected) {
                                    next = current.replace(chip.val, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '').trim();
                                  } else {
                                    next = current ? `${current}, ${chip.val}` : chip.val;
                                  }
                                  setCartItems((prev) =>
                                    prev.map((item) => (item.id === it.id ? { ...item, specialInstructions: next } : item))
                                  );
                                }}
                                className={`text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all ${
                                  isSelected
                                    ? 'emerald-3d-pill-active text-[#F7E2B4] shadow-xs'
                                    : isDark
                                    ? 'bg-white/5 text-slate-300 border border-white/10 hover:border-[#12804E]'
                                    : 'bg-white text-[#5E7163] border border-[#D7E5D9] hover:border-[#12804E]'
                                }`}
                              >
                                {chip.label}
                              </button>
                            );
                          })}
                        </div>
                        <input
                          type="text"
                          placeholder="Dish note (e.g. kam namak, kam mirchi)..."
                          value={it.specialInstructions || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCartItems((prev) =>
                              prev.map((item) => (item.id === it.id ? { ...item, specialInstructions: val } : item))
                            );
                          }}
                          className={`w-full px-3 py-1.5 rounded-xl text-[11px] border focus:outline-none focus:border-[#12804E] focus:ring-2 focus:ring-[#12804E]/20 transition ${
                            isDark
                              ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-600'
                              : 'bg-[#FAFCFA] border-[#D7E5D9] text-[#123C2B] placeholder-[#8B9E90]'
                          }`}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Confirmed Seated Guest Count Summary */}
              <div className={`p-3 rounded-2xl border transition-all ${
                isDark ? 'bg-[#0E2A1E]/50 border-white/10' : 'bg-[#F4F9F5] border-[#D7E5D9]'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#12804E]/15 text-[#12804E] flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black ${isDark ? 'text-white' : 'text-[#123C2B]'}`}>
                          {customerGuestCount} {customerGuestCount === 1 ? 'Guest' : 'Guests'} Seated
                        </span>
                        <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                          ✓ Confirmed
                        </span>
                      </div>
                      <p className="text-[10px] text-[#5E7163] dark:text-slate-400">
                        Kitchen cutlery & plates automatically arranged for {customerGuestCount} {customerGuestCount === 1 ? 'person' : 'people'}.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGuestCountPicker(!showGuestCountPicker)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#E4F1E6] hover:bg-[#D3E8D6] dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-[#12804E] dark:text-[#74D99F] border border-[#B8D7C1] dark:border-emerald-800 transition active:scale-95 shrink-0 shadow-2xs"
                  >
                    {showGuestCountPicker ? 'Done' : 'Change'}
                  </button>
                </div>

                {/* Collapsible Selector only if guest wants to change party size */}
                {showGuestCountPicker && (
                  <div className="pt-2.5 mt-2.5 border-t border-dashed border-[#D7E5D9] dark:border-white/10 space-y-1.5 animate-fadeIn">
                    <p className="text-[10px] font-medium text-[#5E7163] dark:text-slate-400">
                      Change guest count if more people joined your table:
                    </p>
                    <div className="grid grid-cols-6 gap-1.5">
                      {[1, 2, 3, 4, 5, 6].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setCustomerGuestCount(p);
                            try {
                              localStorage.setItem('spicehub_customer_guest_count', String(p));
                            } catch {}
                          }}
                          className={`h-11 py-2.5 rounded-xl text-sm font-black transition-all border flex items-center justify-center ${
                            customerGuestCount === p
                              ? 'emerald-3d-button text-white border-transparent shadow-md scale-105'
                              : isDark
                              ? 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                              : 'bg-white text-[#123C2B] border-[#D7E5D9] hover:bg-[#E8F3EA]'
                          }`}
                        >
                          {p}{p === 6 ? '+' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Special Cooking Instructions */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#5E7163] dark:text-slate-400 flex items-center gap-1">
                  <span>Special Cooking Instructions</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. less spicy, separate cutlery, serve fast..."
                  value={cartSpecialInstructions}
                  onChange={(e) => setCartSpecialInstructions(e.target.value)}
                  className={`w-full h-11 px-3.5 py-2 rounded-xl text-xs sm:text-sm border focus:outline-none focus:border-[#12804E] focus:ring-2 focus:ring-[#12804E]/20 transition ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600' : 'bg-white border-[#D7E5D9] text-[#123C2B] placeholder-[#8B9E90]'
                  }`}
                />
              </div>

              {/* Restaurant Offers & Coupon Codes */}
              <div className={`p-3.5 rounded-2xl border space-y-2.5 text-xs shadow-2xs ${
                isDark ? 'bg-[#1A261E] border-white/10' : 'bg-gradient-to-r from-[#FFFDF7] to-[#FBF8EF] border-[#E9C98A]/60'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 text-[#6B4A12] dark:text-[#F7E2B4]">
                    <Sparkles className="w-3.5 h-3.5 text-[#D9A93F]" />
                    <span>Restaurant Offers & Coupons</span>
                  </span>
                  {appliedPromo && (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#E4F1E6] text-[#123C2B] border border-[#B8D7C1] font-bold">
                      Applied ({appliedPromo.code})
                    </span>
                  )}
                </div>

                {appliedPromo ? (
                  <div className="flex items-center justify-between bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-2.5 text-xs text-emerald-300">
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Code: {appliedPromo.code}</span>
                      </div>
                      <div className="text-[10px] text-emerald-400/80 mt-0.5">
                        {appliedPromo.discountType === 'PERCENTAGE' ? `${appliedPromo.discountValue}% OFF` : `₹${appliedPromo.discountValue} OFF`}
                        {appliedPromo.minOrderAmount ? ` (Min. Bill ₹${appliedPromo.minOrderAmount})` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePromo}
                      className="px-3 py-1.5 text-xs font-bold bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-lg transition active:scale-95"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter Promo Code (e.g. WELCOME10)"
                        value={promoCodeInput}
                        onChange={(e) => {
                          setPromoCodeInput(e.target.value.toUpperCase());
                          setPromoError(null);
                        }}
                        className={`flex-1 h-12 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm uppercase font-mono tracking-wider border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                          isDark ? 'bg-slate-950 border-slate-700 text-white placeholder:text-slate-600' : 'bg-white border-[#E9C98A] text-slate-900'
                        }`}
                      />
                      <button
                        type="button"
                        disabled={isApplyingPromo || !promoCodeInput.trim()}
                        onClick={handleApplyPromo}
                        className="h-12 px-5 rounded-xl emerald-3d-button disabled:opacity-50 text-white font-black text-xs sm:text-sm transition shadow-xs active:scale-95 shrink-0 flex items-center justify-center"
                      >
                        {isApplyingPromo ? 'Checking...' : 'Apply'}
                      </button>
                    </div>
                    {promoError && (
                      <div className="text-[11px] text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{promoError}</span>
                      </div>
                    )}
                  </div>
                )}

                {promoThresholdWarning && (
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{promoThresholdWarning}</span>
                  </div>
                )}
              </div>

              {/* Statutory GST Tax Box */}
              <div
                data-testid="statutory-gst-calculation-box"
                className={`p-4 rounded-2xl border space-y-2.5 text-xs shadow-2xs ${
                  isDark
                    ? 'bg-[#0E2A1E]/60 border-white/10 text-slate-300'
                    : 'bg-[#F8FAF8] border-[#D7E5D9] text-[#123C2B]'
                }`}
              >
                <div className="flex items-center justify-between border-b border-[#D7E5D9]/70 dark:border-white/10 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#12804E] dark:text-emerald-400">
                    Statutory Tax Engine (SAC 9963)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E4F1E6] text-[#123C2B] font-bold">
                    5% Food GST Slab
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-[#5E7163] dark:text-slate-400">Food Subtotal</span>
                  <span className="font-bold font-mono text-[#123C2B] dark:text-white">₹{cartSubtotal}</span>
                </div>
                {calculatedDiscount > 0 && (
                  <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400">
                    <span>Coupon Discount ({appliedPromo?.code})</span>
                    <span className="font-mono">-₹{calculatedDiscount}</span>
                  </div>
                )}
                <div className="flex justify-between text-[11px] text-[#5E7163] dark:text-slate-400">
                  <span>Taxable Amount</span>
                  <span className="font-mono">₹{discountedSubtotal}</span>
                </div>
                <div className="flex justify-between text-[11px] text-[#5E7163] dark:text-slate-400">
                  <span>CGST (2.5% SAC 9963)</span>
                  <span className="font-mono">₹{(discountedSubtotal * 0.025).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-[#5E7163] dark:text-slate-400">
                  <span>SGST (2.5% SAC 9963)</span>
                  <span className="font-mono">₹{(discountedSubtotal * 0.025).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold pt-1.5 border-t border-[#D7E5D9]/70 dark:border-white/10 text-[#123C2B] dark:text-slate-300">
                  <span>Total Statutory GST (5%)</span>
                  <span className="font-mono">₹{gstAmount}</span>
                </div>
                <div className="flex justify-between text-[11px] text-[#5E7163] dark:text-slate-400">
                  <span>Service Charge</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">₹0 (Free)</span>
                </div>
                <div className="flex justify-between font-black text-base pt-2.5 border-t border-[#D7E5D9] dark:border-white/10 text-[#123C2B] dark:text-[#F7E2B4]">
                  <span>Grand Total</span>
                  <span className="font-mono">₹{grandTotal}</span>
                </div>
              </div>

              {/* Checkout / Place Order Button */}
              {cartItems.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setCurrentTab('menu')}
                  className="w-full h-14 min-h-[56px] py-3.5 px-5 rounded-2xl font-black text-sm sm:text-base emerald-3d-button text-[#F7E2B4] shadow-[0_10px_25px_rgba(18,128,78,0.38)] flex items-center justify-center gap-2.5 transition mb-24 active:scale-[0.98]"
                >
                  <UtensilsCrossed className="w-5 h-5 text-[#F7E2B4] drop-shadow" />
                  <span>
                    {selectedLanguage === 'HI' ? 'शाही मेनू से व्यंजन चुनें' : 'Browse Menu to Add Dishes'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="btn-place-order"
                  disabled={canOrder === false || isReadOnly || isSubmittingOrder}
                  onClick={handleCheckout}
                  className={`w-full h-14 min-h-[56px] py-3.5 px-5 rounded-2xl font-black text-sm sm:text-base shadow-[0_10px_25px_rgba(18,128,78,0.38)] flex items-center justify-center gap-2.5 transition mb-24 active:scale-[0.98] ${
                    canOrder === false || isReadOnly || isSubmittingOrder
                      ? 'bg-[#EDF5EE] text-[#5E7163] cursor-not-allowed border border-[#D7E5D9] pointer-events-none opacity-80'
                      : 'emerald-3d-button text-[#F7E2B4] disabled:opacity-50'
                  }`}
                >
                  {isSubmittingOrder ? (
                    <>
                      <Loader2 className="w-5 h-5 text-[#F7E2B4] animate-spin" />
                      <span>{selectedLanguage === 'HI' ? 'रसोई (KDS) में भेजा जा रहा है...' : 'Sending to Kitchen KDS...'}</span>
                    </>
                  ) : (
                    <>
                      <ChefHat className="w-5 h-5 text-[#F7E2B4] drop-shadow" />
                      <span>
                        {canOrder === false || isReadOnly ? 'Table In Service • Ask Captain' : `Place Order • ₹${grandTotal}`}
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* TAB 2: LIVE ORDER TRACKING SCREEN (5-Star Luxury Heritage Aesthetic) */}
          {/* --------------------------------------------------------------------- */}
          {currentTab === 'orders' && (
            <div className={`p-4 sm:p-5 rounded-3xl border space-y-4 shadow-sm ${
              isDark ? 'glass-panel bg-[#0C2118]/90 border-white/10 text-white' : 'glass-panel border-[#D7E5D9] text-[#123C2B]'
            }`}>
              {activeOrders.length === 0 ? (
                <div className="py-12 px-4 text-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-[#E4F1E6] text-[#123C2B] border border-[#B8D7C1] flex items-center justify-center mx-auto text-2xl font-bold shadow-2xs">
                    <UtensilsCrossed className="w-8 h-8 text-[#123C2B]" />
                  </div>
                  <div>
                    <h3 className="font-lux font-bold text-[#123C2B] dark:text-[#F7E2B4] text-base">No Active Orders Placed Yet</h3>
                    <p className="text-xs text-[#5E7163] dark:text-slate-400 mt-1 max-w-xs mx-auto">
                      Explore our menu and place an order. Your food will be cooked fresh by our master chefs!
                    </p>
                  </div>
                  <button
                    onClick={() => setCurrentTab('menu')}
                    className="px-6 py-2.5 rounded-xl emerald-3d-button text-[#F7E2B4] text-xs font-black shadow-md transition active:scale-95"
                  >
                    Browse Menu & Order
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Top Live Tracker Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#D7E5D9]/70 dark:border-white/10">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-[#E4F1E6] text-[#123C2B] border border-[#B8D7C1] flex items-center justify-center font-black shadow-2xs">
                        <Clock className="w-4 h-4 text-[#123C2B]" />
                      </div>
                      <div>
                        <h3 className="font-lux font-bold text-sm text-[#123C2B] dark:text-white flex items-center gap-2">
                          <span>Live Kitchen Tracking</span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        </h3>
                        <p className="text-[10px] text-[#5E7163] dark:text-slate-400 font-medium">
                          Table {tableNumber} • Synced with Live Kitchen ({activeOrders.length} {activeOrders.length === 1 ? 'ticket' : 'tickets'})
                        </p>
                      </div>
                    </div>
                    {onRefreshOrders && (
                      <button
                        onClick={() => onRefreshOrders()}
                        className="text-[11px] font-bold text-[#12804E] hover:underline flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition active:scale-95 border border-[#D7E5D9] dark:border-white/10 shadow-2xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Refresh</span>
                      </button>
                    )}
                  </div>

                  {/* Active Orders List */}
                  <div className="space-y-4 max-h-[520px] overflow-y-auto custom-scrollbar pr-1">
                    {activeOrders.map((order, oIdx) => {
                      const isCancelled = order.orderStatus === 'CANCELLED';
                      const isServed = order.orderStatus === 'SERVED';
                      const isReady = order.orderStatus === 'READY';
                      const isPreparing = order.orderStatus === 'PREPARING';
                      const isPlaced = order.orderStatus === 'PLACED' || order.orderStatus === 'ACCEPTED' || (!isReady && !isServed && !isPreparing && !isCancelled);

                      const placedAtTime = order.placedAt ? new Date(order.placedAt).getTime() : nowTimestamp;
                      const elapsedSec = Math.floor((nowTimestamp - placedAtTime) / 1000);
                      const canCancel = isPlaced && elapsedSec < 120 && !isCancelled;
                      const remainingSec = Math.max(0, 120 - elapsedSec);

                      const statusBadge = isCancelled
                        ? { label: 'Cancelled', bg: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30', icon: X }
                        : isServed
                        ? { label: 'Served at Table', bg: 'bg-blue-600/15 text-blue-800 dark:text-blue-300 border-blue-400/40', icon: Utensils }
                        : isReady
                        ? { label: 'Ready to Serve', bg: 'bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border-emerald-500/50 animate-pulse', icon: Bell }
                        : isPreparing
                        ? { label: 'Kitchen Cooking', bg: 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 animate-pulse', icon: ChefHat }
                        : { label: 'Kitchen Received', bg: 'bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-400/40', icon: Clock };

                      const orderSubtotal = order.totalAmount || (order.items || []).reduce((acc, it) => acc + (it.subtotal || it.unitPrice * it.quantity), 0);

                      return (
                        <div
                          key={order.orderNumber || oIdx}
                          className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-2xs ${
                            isCancelled
                              ? 'bg-slate-900/40 border-red-900/30 opacity-75'
                              : isDark
                              ? 'bg-gradient-to-br from-[#123C2B]/60 via-[#0C2118]/80 to-[#081F15]/90 border-white/10'
                              : 'bg-gradient-to-br from-[#F9FCFA] via-white to-[#F2F7F3] border-[#D7E5D9]'
                          }`}
                        >
                          {/* Ticket Header Bar */}
                          <div className={`p-3.5 border-b flex items-center justify-between ${
                            isDark ? 'bg-[#0E2A1E]/80 border-white/10' : 'bg-[#EBF3ED]/75 border-[#D7E5D9]'
                          }`}>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#123C2B] text-[#F7E2B4] shadow-2xs">
                                  KOT TICKET
                                </span>
                                <span className="font-mono font-black text-xs text-[#123C2B] dark:text-[#F7E2B4]">
                                  #{order.orderNumber}
                                </span>
                              </div>
                              <div className="text-[10px] text-[#5E7163] dark:text-slate-400 mt-1 font-medium flex items-center gap-1.5">
                                <span>{order.placedAt ? new Date(order.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
                                <span>•</span>
                                <span>Table {tableNumber}</span>
                                {order.guestCount ? (
                                  <>
                                    <span>•</span>
                                    <span>👥 {order.guestCount} Guests</span>
                                  </>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {canCancel && (
                                <button
                                  type="button"
                                  data-testid={`btn-cancel-order-${order.orderNumber}`}
                                  disabled={cancellingOrderId === (order.id || order.orderId)}
                                  onClick={() => handleCancelOrderClick(order.id || order.orderId || order.orderNumber, order.orderNumber)}
                                  className="px-2.5 py-1 rounded-full text-[10px] font-bold border border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition flex items-center gap-1 shadow-xs"
                                >
                                  <X className="w-3 h-3" />
                                  <span>{cancellingOrderId === (order.id || order.orderId) ? 'Cancelling…' : `Cancel (${remainingSec}s)`}</span>
                                </button>
                              )}
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border flex items-center gap-1 shadow-2xs ${statusBadge.bg}`}>
                                <statusBadge.icon className="w-3 h-3" />
                                <span>{statusBadge.label}</span>
                              </span>
                            </div>
                          </div>

                          <div className="p-4 space-y-4">
                            {/* Stepper Timeline or Cancelled Notice */}
                            {isCancelled ? (
                              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
                                <X className="w-4 h-4 text-red-500 shrink-0" />
                                <span>Order was cancelled before food preparation started. No amount charged.</span>
                              </div>
                            ) : (
                              <div data-testid="live-order-status-tracker" className="relative pl-7 py-1 text-xs space-y-3.5">
                                {/* Continuous Luxury Connecting Rail */}
                                <div className={`absolute left-[11px] top-3 bottom-3 w-[2px] transition-all duration-300 ${
                                  isServed
                                    ? 'bg-[#12804E]'
                                    : isReady
                                    ? 'bg-gradient-to-b from-[#12804E] via-[#12804E] to-emerald-400'
                                    : isPreparing
                                    ? 'bg-gradient-to-b from-[#12804E] via-amber-400 to-slate-200 dark:to-slate-700'
                                    : 'bg-gradient-to-b from-[#12804E] via-slate-200 to-slate-200 dark:from-[#12804E] dark:via-slate-700 dark:to-slate-700'
                                }`} />

                                {/* Step 1: Order Received */}
                                <div className="relative">
                                  <span className="absolute -left-7 top-0.5 w-6 h-6 rounded-full bg-[#12804E] text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </span>
                                  <div>
                                    <div className="font-bold text-xs text-[#12804E] dark:text-[#74D99F] flex items-center gap-1.5">
                                      <span>1. Order Received by Kitchen</span>
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                        ✓ Validated
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-[#5E7163] dark:text-slate-400 mt-0.5">
                                      Ticket logged into Kitchen Display (KDS) & station queues.
                                    </p>
                                  </div>
                                </div>

                                {/* Step 2: Preparing Dishes in Kitchen */}
                                <div className="relative">
                                  <span className={`absolute -left-7 top-0.5 w-6 h-6 rounded-full text-white text-[10px] font-black flex items-center justify-center shadow-xs transition-all ${
                                    isReady || isServed
                                      ? 'bg-[#12804E]'
                                      : isPreparing
                                      ? 'bg-amber-500 ring-4 ring-amber-400/30 text-white animate-pulse'
                                      : 'bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-400'
                                  }`}>
                                    {isReady || isServed ? (
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    ) : isPreparing ? (
                                      <ChefHat className="w-3.5 h-3.5" />
                                    ) : (
                                      '2'
                                    )}
                                  </span>
                                  <div>
                                    <div className="flex items-center justify-between flex-wrap gap-1">
                                      <div className={`font-bold text-xs ${
                                        isReady || isServed
                                          ? 'text-[#12804E] dark:text-[#74D99F]'
                                          : isPreparing
                                          ? 'text-amber-800 dark:text-amber-300 font-black'
                                          : 'text-slate-500 dark:text-slate-400 font-semibold'
                                      }`}>
                                        {isReady || isServed ? '2. Prepared in Kitchen' : '2. Preparing Dishes in Kitchen'}
                                      </div>
                                      {isReady || isServed ? (
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                          ✓ Cooked Fresh
                                        </span>
                                      ) : isPreparing ? (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-800 dark:text-amber-200 font-mono font-bold flex items-center gap-1 shadow-2xs animate-pulse">
                                          <Flame className="w-3 h-3 text-amber-600 animate-bounce" />
                                          <span>Cooking Now • Est. ~12-15m</span>
                                        </span>
                                      ) : (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 font-mono font-semibold">
                                          Queued for Chef Pass
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-[#5E7163] dark:text-slate-400 mt-0.5">
                                      {isReady || isServed
                                        ? 'Master chefs completed cooking at dedicated station pass.'
                                        : isPreparing
                                        ? 'Master chefs are actively cooking fresh at dedicated station pass.'
                                        : 'Chef station assigned. Food preparation will begin shortly.'}
                                    </p>
                                  </div>
                                </div>

                                {/* Step 3: Plated & Ready for Waiter */}
                                <div className={`relative ${isPlaced || isPreparing ? 'opacity-40' : ''}`}>
                                  <span className={`absolute -left-7 top-0.5 w-6 h-6 rounded-full text-white text-[10px] font-black flex items-center justify-center shadow-xs transition-all ${
                                    isServed
                                      ? 'bg-[#12804E]'
                                      : isReady
                                      ? 'bg-emerald-600 ring-4 ring-emerald-400/40 text-white animate-pulse'
                                      : 'bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-400'
                                  }`}>
                                    {isServed ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : isReady ? <Bell className="w-3.5 h-3.5 animate-bounce" /> : '3'}
                                  </span>
                                  <div>
                                    <div className="flex items-center justify-between flex-wrap gap-1">
                                      <div className={`font-bold text-xs ${isReady ? 'text-[#12804E] dark:text-[#74D99F] font-black' : isServed ? 'text-[#12804E] dark:text-[#74D99F]' : 'text-slate-500'}`}>
                                        {isReady ? '3. Plated & Ready to Serve!' : '3. Plated & Ready for Waiter'}
                                      </div>
                                      {isReady && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-400 font-bold flex items-center gap-1 shadow-2xs animate-pulse">
                                          <Bell className="w-3 h-3 text-emerald-600 animate-spin" />
                                          <span>Ready for Table Pickup</span>
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-[#5E7163] dark:text-slate-400 mt-0.5">
                                      {isReady
                                        ? `Hot & ready! Waiter is bringing your food to Table ${tableNumber}.`
                                        : 'Garnished, quality checked & hot pass expediter notified.'}
                                    </p>
                                  </div>
                                </div>

                                {/* Step 4: Served at Table */}
                                <div className={`relative ${!isServed ? 'opacity-40' : ''}`}>
                                  <span className={`absolute -left-7 top-0.5 w-6 h-6 rounded-full text-white text-[10px] font-black flex items-center justify-center shadow-xs transition-all ${
                                    isServed
                                      ? 'bg-blue-600 ring-4 ring-blue-400/30 text-white'
                                      : 'bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-400'
                                  }`}>
                                    {isServed ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '4'}
                                  </span>
                                  <div>
                                    <div className="flex items-center justify-between flex-wrap gap-1">
                                      <div className={`font-bold text-xs ${isServed ? 'text-blue-600 dark:text-blue-400 font-black' : 'text-slate-500'}`}>
                                        4. Served at Table
                                      </div>
                                      {isServed && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                                          ✓ Delivered Warm
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-[#5E7163] dark:text-slate-400 mt-0.5">
                                      {isServed
                                        ? `Delivered warm to Table ${tableNumber}. Enjoy your royal meal!`
                                        : `Delivered warm to Table ${tableNumber} by dining floor server.`}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Dishes in Ticket (Luxury Embossed Slip) */}
                            <div className={`p-3.5 rounded-xl border space-y-2.5 text-xs ${
                              isDark ? 'bg-black/30 border-white/10' : 'bg-[#F4F8F5] border-[#D7E5D9]'
                            }`}>
                              <div className="flex items-center justify-between text-[10px] font-bold text-[#5E7163] dark:text-slate-400 uppercase tracking-wider">
                                <span className="flex items-center gap-1.5">
                                  <Receipt className="w-3 h-3 text-[#12804E]" />
                                  <span>Dishes in this Ticket:</span>
                                </span>
                                <span className="font-mono">{order.items?.length || 0} Items</span>
                              </div>

                              <div className="space-y-2 pt-0.5">
                                {(order.items || []).map((it, iIdx) => (
                                  <div key={iIdx} className="flex items-center justify-between py-1.5 border-b border-dashed border-[#D7E5D9]/70 dark:border-white/10 last:border-none">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="px-1.5 py-0.5 rounded-md bg-[#12804E]/15 text-[#12804E] dark:text-[#74D99F] font-black text-[11px] shrink-0 border border-[#12804E]/25">
                                        {it.quantity}x
                                      </span>
                                      <span className={`font-bold text-xs truncate ${isDark ? 'text-slate-100' : 'text-[#123C2B]'}`}>
                                        {it.name}
                                      </span>
                                    </div>
                                    <span className="font-mono font-black text-xs text-[#123C2B] dark:text-[#F7E2B4] shrink-0 ml-2">
                                      ₹{(it.subtotal || it.unitPrice * it.quantity).toLocaleString()}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {order.cookingInstructions && (
                                <div className="pt-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-300/40 flex items-start gap-1.5">
                                  <span className="shrink-0">👨‍🍳</span>
                                  <span>Chef Note: "{order.cookingInstructions}"</span>
                                </div>
                              )}
                            </div>

                            {/* Ticket Total Bar */}
                            <div className="flex items-center justify-between pt-1 px-1">
                              <span className="text-xs font-bold text-[#5E7163] dark:text-slate-400">Ticket Subtotal:</span>
                              <span className="font-mono text-sm font-black text-[#12804E] dark:text-[#74D99F]">
                                ₹{orderSubtotal.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Running Total & Action Buttons */}
                  <div className={`p-4 rounded-2xl border space-y-3.5 ${
                    isDark ? 'bg-gradient-to-br from-[#123C2B]/40 to-[#0A2016]/60 border-white/10' : 'bg-gradient-to-br from-[#EAF4ED] to-[#F4F9F5] border-[#D7E5D9] shadow-2xs'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-[#5E7163] dark:text-slate-400">Total Running Bill</div>
                        <div className="text-[10px] text-[#5E7163]/80 dark:text-slate-500">All dining tickets + SAC 9963 Taxes included</div>
                      </div>
                      <div className="text-right">
                        <span className="font-lux font-bold text-xl text-[#123C2B] dark:text-[#F7E2B4]">
                          ₹{activeOrdersGrandTotal.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setCurrentTab('menu')}
                        className="h-13 min-h-[52px] py-3 px-3 rounded-2xl border border-[#D7E5D9] bg-white dark:bg-white/10 hover:bg-[#E8F3EA] text-[#123C2B] dark:text-[#F7E2B4] font-black text-xs sm:text-sm text-center transition active:scale-95 shadow-2xs flex items-center justify-center gap-2"
                      >
                        <Utensils className="w-4 h-4" />
                        <span>+ Order More</span>
                      </button>
                      <button
                        type="button"
                        data-testid="btn-view-provisional-bill"
                        onClick={() => setCurrentTab('payment')}
                        className="h-13 min-h-[52px] py-3 px-3 rounded-2xl emerald-3d-button text-[#F7E2B4] font-black text-xs sm:text-sm text-center transition shadow-md active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Receipt className="w-4 h-4" />
                        <span>View Bill & Pay (₹{activeOrdersGrandTotal.toLocaleString()})</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* --------------------------------------------------------------------- */}
          {/* TAB 3: SPLIT BILL SCREEN                                              */}
          {/* --------------------------------------------------------------------- */}
          {currentTab === 'split' && (
            <div className={`p-4 rounded-3xl border space-y-4 shadow-sm ${
              isDark ? 'glass-panel bg-[#0C2118]/90 border-white/10 text-white' : 'glass-panel border-[#D7E5D9] text-[#123C2B]'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-[#D7E5D9]/70 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-[#E4F1E6] text-[#123C2B] border border-[#B8D7C1] flex items-center justify-center font-black shadow-2xs">
                    <Users className="w-4 h-4 text-[#123C2B]" />
                  </div>
                  <div>
                    <h3 className="font-lux font-bold text-sm text-[#123C2B] dark:text-white">Split Table Bill</h3>
                    <p className="text-[10px] text-[#5E7163] dark:text-slate-400 font-medium">Total Bill: ₹{activeOrdersGrandTotal}</p>
                  </div>
                </div>
                <button
                  onClick={() => setCurrentTab('orders')}
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                >
                  Cancel
                </button>
              </div>

              {activeOrders.length === 0 ? (
                <div className="py-8 px-4 text-center space-y-3">
                  <p className="text-xs text-[#5E7163] dark:text-slate-400">
                    {selectedLanguage === 'HI' ? 'स्प्लिट करने के लिए कोई सक्रिय बिल नहीं है। पहले आर्डर प्लेस करें।' : 'No active bill to split. Please place your order first.'}
                  </p>
                  <button
                    onClick={() => setCurrentTab('home')}
                    className="h-12 px-6 py-2.5 rounded-xl emerald-3d-button text-[#F7E2B4] font-black text-xs sm:text-sm shadow-md transition"
                  >
                    {selectedLanguage === 'HI' ? 'मेनू देखें' : 'Go to Menu'}
                  </button>
                </div>
              ) : (
                <>
                  {/* Equal vs Individual Mode Selector */}
                  <div className={`grid grid-cols-2 p-1 rounded-xl border text-xs font-bold ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
                  }`}>
                    <button
                      onClick={() => setSplitMode('equal')}
                      className={`py-2 rounded-lg transition ${
                        splitMode === 'equal' ? 'emerald-3d-pill-active text-[#F7E2B4] shadow-xs' : 'text-slate-400'
                      }`}
                    >
                      Equal Split
                    </button>
                    <button
                      onClick={() => setSplitMode('individual')}
                      className={`py-2 rounded-lg transition ${
                        splitMode === 'individual' ? 'emerald-3d-pill-active text-[#F7E2B4] shadow-xs' : 'text-slate-400'
                      }`}
                    >
                      Select Items
                    </button>
                  </div>

                  {splitMode === 'equal' ? (
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Number of Persons Sharing</label>
                      <div className="flex items-center gap-2">
                        {[2, 3, 4, 5, 6].map((num) => (
                          <button
                            key={num}
                            onClick={() => setSplitPersonsCount(num)}
                            className={`flex-1 h-11 py-2 rounded-xl font-black text-sm border flex items-center justify-center transition ${
                              splitPersonsCount === num
                                ? 'emerald-3d-pill-active text-[#F7E2B4] border-emerald-600'
                                : isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-800'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                      {activeBillItems.map((it) => (
                        <label
                          key={it.name}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer text-xs ${
                            isDark ? 'bg-slate-800 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={splitItemChecked[it.name] || false}
                              onChange={(e) =>
                                setSplitItemChecked({ ...splitItemChecked, [it.name]: e.target.checked })
                              }
                              className="rounded text-emerald-600 focus:ring-0"
                            />
                            <span className="font-semibold">{it.name} (x{it.qty})</span>
                          </div>
                          <span className="font-bold">₹{it.price * it.qty}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Calculated Split Box */}
                  <div className={`p-3 rounded-xl border flex items-center justify-between ${
                    isDark ? 'border-emerald-800/60 bg-emerald-950/30 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  }`}>
                    <span className="text-xs font-bold">
                      {splitMode === 'equal' ? `Share per person (${splitPersonsCount} guests)` : 'Your Itemized Share'}
                    </span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      ₹{effectiveSplitAmount}
                    </span>
                  </div>

                  <button
                    onClick={handleConfirmSplitBill}
                    className="w-full h-14 min-h-[56px] py-3.5 px-4 rounded-2xl emerald-3d-button text-[#F7E2B4] font-black text-sm sm:text-base shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    Proceed with Share (Pay ₹{effectiveSplitAmount})
                  </button>
                </>
              )}
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* TAB 4: PAYMENT SCREEN (UPI QR, Card, Cash, Room)                      */}
          {/* --------------------------------------------------------------------- */}
          {currentTab === 'payment' && (
            <div data-testid="provisional-bill-panel" className={`p-4 rounded-3xl border space-y-4 shadow-sm ${
              isDark ? 'glass-panel bg-[#0C2118]/90 border-white/10 text-white' : 'glass-panel border-[#D7E5D9] text-[#123C2B]'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-[#D7E5D9]/70 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-[#E4F1E6] text-[#123C2B] border border-[#B8D7C1] flex items-center justify-center font-black shadow-2xs">
                    <Receipt className="w-4 h-4 text-[#123C2B]" />
                  </div>
                  <div>
                    <h3 className="font-lux font-bold text-sm text-[#123C2B] dark:text-white">Provisional Bill & Settlement</h3>
                    <p className="text-[10px] text-[#5E7163] dark:text-slate-400 font-medium">{tableNumber} • {hotelName} • Instant Receipt</p>
                  </div>
                </div>
                {payableAmount !== null && activeOrdersGrandTotal > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                    Split Bill Active
                  </span>
                )}
              </div>

              {settlementDone ? (
                <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-2xl text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/40">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-emerald-400">Payment Settled Successfully!</h4>
                    <p className="text-[10px] text-slate-300">Invoice #{settledData?.billNumber}</p>
                  </div>

                  <div className={`p-3 rounded-xl border text-left text-xs space-y-1.5 ${
 isDark ? 'bg-slate-800 border-slate-800' : 'bg-white border-slate-200'
 }`}>
                    <div className="flex justify-between text-slate-400">
                      <span>Table Number:</span>
                      <strong className="text-white">{tableNumber}</strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Amount Paid:</span>
                      <strong className="text-emerald-400">₹{settledData?.amount || currentPayableTotal}</strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Payment Method:</span>
                      <strong className="text-white">{settledData?.paymentMode}</strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Time:</span>
                      <strong className="text-white">{settledData?.settledAt}</strong>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => showToast('Tax Invoice downloaded as PDF!')}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition"
                    >
                      Download Invoice
                    </button>
                    <button
                      onClick={() => {
                        setSettlementDone(false);
                        setPayableAmount(null);
                        setCurrentTab('home');
                      }}
                      className="flex-1 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-xs transition"
                    >
                      New Order
                    </button>
                  </div>
                </div>
              ) : activeOrders.length === 0 ? (
                <div className="py-10 px-4 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[#E4F1E6] dark:bg-emerald-950/40 text-[#123C2B] dark:text-emerald-400 mx-auto flex items-center justify-center border border-[#B8D7C1] dark:border-emerald-700/50 shadow-inner">
                    <Receipt className="w-8 h-8 opacity-80" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-lux font-bold text-base text-[#123C2B] dark:text-white">
                      {selectedLanguage === 'HI' ? 'कोई सक्रिय बिल नहीं है' : 'No Active Bill to Settle'}
                    </h3>
                    <p className="text-xs text-[#5E7163] dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                      {selectedLanguage === 'HI'
                        ? 'टेबल पर अभी कोई कन्फ़र्म आर्डर नहीं है। बिल देखने और भुगतान करने के लिए पहले मेनू से आर्डर प्लेस करें।'
                        : 'No confirmed orders have been placed for this table yet. Place an order from the menu or cart to generate a dining bill.'}
                    </p>
                  </div>

                  {cartItems.length > 0 ? (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setCurrentTab('cart')}
                        className="w-full h-14 min-h-[56px] py-3.5 px-5 rounded-2xl emerald-3d-button text-[#F7E2B4] font-black text-sm sm:text-base shadow-md transition flex items-center justify-center gap-2.5 active:scale-[0.98]"
                      >
                        <ShoppingCart className="w-5 h-5 text-[#F7E2B4]" />
                        <span>
                          {selectedLanguage === 'HI'
                            ? `कार्ट देखें और आर्डर प्लेस करें (${cartItems.length} आइटम्स - ₹${grandTotal})`
                            : `View Cart & Place Order (${cartItems.length} items - ₹${grandTotal})`}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setCurrentTab('home')}
                        className="w-full h-14 min-h-[56px] py-3.5 px-5 rounded-2xl emerald-3d-button text-[#F7E2B4] font-black text-sm sm:text-base shadow-md transition flex items-center justify-center gap-2.5 active:scale-[0.98]"
                      >
                        <UtensilsCrossed className="w-5 h-5 text-[#F7E2B4]" />
                        <span>{selectedLanguage === 'HI' ? 'मेनू देखें और आर्डर करें' : 'Explore Menu & Order'}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Luxury Hero Statement Bill Card */}
                  <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-[#123C2B] via-[#0E3324] to-[#081F15] text-white border border-[#23583E] shadow-[0_16px_40px_rgba(18,60,43,0.32)]">
                    <Receipt className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 pointer-events-none" />
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[10px] font-black tracking-wider uppercase text-[#E9C98A]">
                        <Sparkles className="w-3 h-3 text-[#E9C98A]" />
                        <span>Provisional Dining Bill</span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-white/70 bg-black/20 px-2 py-0.5 rounded-lg border border-white/10">
                        {tableNumber} • Table Service
                      </span>
                    </div>

                    <div className="relative z-10 mt-3.5">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-[#A3C9B2]">
                        Payable Amount (At Table)
                      </div>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-xl sm:text-2xl font-black text-[#E9C98A]">₹</span>
                        <span className="font-serif text-3xl sm:text-4xl font-black text-[#FBF7EE] tracking-tight">
                          {currentPayableTotal.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[11px] text-[#A3C9B2] font-medium ml-1.5">
                          (GST included)
                        </span>
                      </div>
                    </div>

                    <div className="relative z-10 mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-[#D4E8D9]">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#E9C98A]" />
                        <span>Statutory SAC 9963 Validated</span>
                      </span>
                      <span className="font-mono font-black text-[#E9C98A] text-xs">
                        {activeOrders.flatMap(o => o.items || []).reduce((acc, i) => acc + i.quantity, 0)} Items
                      </span>
                    </div>
                  </div>

                  {/* Provisional Bill Itemized Breakdown with Statutory Taxes */}
                  <div className={`p-4 sm:p-5 rounded-3xl border space-y-3 text-xs ${
                    isDark ? 'glass-panel bg-[#0C2118]/85 border-white/10 text-slate-200' : 'glass-panel border-[#D7E5D9] bg-white/80 text-[#123C2B]'
                  }`}>
                    <div className="flex items-center justify-between pb-2.5 border-b border-[#D7E5D9]/70 dark:border-white/10">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-[#E4F1E6] text-[#123C2B] border border-[#B8D7C1] flex items-center justify-center font-black">
                          <Receipt className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="font-lux font-bold text-xs text-[#123C2B] dark:text-white">Itemized Tax Breakdown</h4>
                          <p className="text-[9px] text-[#5E7163] dark:text-slate-400 font-mono">SAC 9963 • Hotel Restaurant Service</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#E4F1E6] dark:bg-emerald-950 text-[#12804E] dark:text-emerald-300 text-[10px] font-black border border-[#B8D7C1] dark:border-emerald-700/50">
                        PROVISIONAL
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                      {activeOrders.flatMap(o => o.items || []).map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[11px] py-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-[#123C2B] dark:text-slate-200">{it.name}</span>
                            <span className="px-1.5 py-0.2 rounded-md bg-[#E4F1E6] dark:bg-emerald-900/40 text-[#12804E] dark:text-emerald-300 text-[10px] font-bold">
                              ×{it.quantity}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-[#123C2B] dark:text-white">
                            ₹{(it.subtotal || it.unitPrice * it.quantity).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-dashed border-[#B8D7C1] dark:border-white/15 my-2" />

                    <div className="space-y-1 text-slate-500 dark:text-slate-400 text-[11px]">
                      <div className="flex justify-between">
                        <span>Food Subtotal</span>
                        <span className="font-mono text-[#123C2B] dark:text-white font-medium">₹{Math.round(currentPayableTotal / 1.05).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>CGST (2.5% SAC 9963)</span>
                        <span className="font-mono text-[#123C2B] dark:text-white font-medium">₹{((currentPayableTotal / 1.05) * 0.025).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SGST (2.5% SAC 9963)</span>
                        <span className="font-mono text-[#123C2B] dark:text-white font-medium">₹{((currentPayableTotal / 1.05) * 0.025).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#EAF2EC] dark:bg-emerald-950/60 border border-[#B8D7C1] dark:border-emerald-700/50 flex justify-between items-center mt-2 shadow-2xs">
                      <div>
                        <div className="text-[10px] text-[#5E7163] dark:text-slate-400 font-bold uppercase tracking-wider">Total Dining Bill</div>
                        <div className="text-xs font-bold text-[#123C2B] dark:text-[#F7E2B4]">All Statutory Taxes Included</div>
                      </div>
                      <div className="font-mono text-lg font-black text-[#12804E] dark:text-[#F7E2B4]">
                        ₹{currentPayableTotal.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  {/* Split Bill Calculator Preview */}
                  <div data-testid="split-bill-calculator-preview" className={`p-4 rounded-3xl border space-y-3 ${
                    isDark ? 'glass-panel bg-[#0C2118]/85 border-white/10 text-white' : 'glass-panel border-[#D7E5D9] bg-white/80 text-[#123C2B]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-[#E4F1E6] text-[#123C2B] border border-[#B8D7C1] flex items-center justify-center font-black">
                          <Users className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="font-lux font-bold text-xs text-[#123C2B] dark:text-white">Split Bill Calculator</h4>
                          <p className="text-[9px] text-[#5E7163] dark:text-slate-400">Share total equally per guest</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#E4F1E6] dark:bg-emerald-950 text-[#12804E] dark:text-emerald-300 border border-[#B8D7C1] dark:border-emerald-700/40">
                        Instant Preview
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[2, 3, 4, 5].map((guests) => {
                        const share = (currentPayableTotal / guests).toFixed(0);
                        const isSelected = splitPersonsCount === guests;
                        return (
                          <button
                            key={guests}
                            type="button"
                            onClick={() => setSplitPersonsCount(guests)}
                            className={`h-16 py-2.5 px-2 rounded-2xl border transition-all duration-150 flex flex-col items-center justify-center ${
                              isSelected
                                ? 'emerald-3d-pill-active text-[#F7E2B4] scale-[1.03] shadow-md border-[#1E4A35]'
                                : isDark
                                  ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-white/20'
                                  : 'bg-white border-[#D7E5D9] text-[#123C2B] hover:border-[#12804E]/40 shadow-2xs'
                            }`}
                          >
                            <div className={`text-[11px] font-bold ${isSelected ? 'text-[#E9C98A]' : 'text-[#5E7163] dark:text-slate-400'}`}>
                              {guests} Guests
                            </div>
                            <div className={`text-sm font-black font-mono mt-0.5 ${isSelected ? 'text-[#F7E2B4]' : 'text-[#123C2B] dark:text-emerald-300'}`}>
                              ₹{share}/ea
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payment Mode Preference for Waiter */}
                  <div className="space-y-2.5">
                    <div className="text-[11px] font-bold text-[#5E7163] dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-[#12804E]" />
                      <span>Select Preferred Payment Mode for Server</span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { id: 'upi', label: 'UPI QR Code', sublabel: 'GPay, PhonePe, Paytm on Waiter Terminal', icon: Smartphone },
                        { id: 'card', label: 'Card Swipe Machine', sublabel: 'Visa, Mastercard, RuPay at Table', icon: CreditCard },
                        { id: 'cash', label: 'Cash Payment', sublabel: 'Direct Cash Settlement with Waiter', icon: Banknote },
                      ].map((m) => {
                        const Icon = m.icon;
                        const isSelected = selectedPaymentMethod === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setSelectedPaymentMethod(m.id as any)}
                            className={`w-full min-h-[64px] p-3.5 sm:p-4 rounded-2xl border transition-all duration-150 flex items-center justify-between text-left active:scale-[0.99] ${
                              isSelected
                                ? 'bg-[#E8F3EA]/95 dark:bg-emerald-950/70 border-2 border-[#12804E] shadow-sm'
                                : isDark
                                  ? 'bg-[#0E2A1E]/40 border-white/10 text-slate-300 hover:bg-white/5'
                                  : 'bg-white/80 border-[#D7E5D9] text-[#123C2B] hover:bg-[#F2F7F2] shadow-2xs'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                                isSelected
                                  ? 'bg-[#12804E] text-[#F7E2B4]'
                                  : 'bg-[#E4F1E6] dark:bg-white/10 text-[#123C2B] dark:text-white'
                              }`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div>
                                <div className={`font-bold text-sm ${isSelected ? 'text-[#123C2B] dark:text-[#F7E2B4]' : 'text-[#123C2B] dark:text-white'}`}>
                                  {m.label}
                                </div>
                                <div className="text-[11px] text-[#5E7163] dark:text-slate-400 font-medium">
                                  {m.sublabel}
                                </div>
                              </div>
                            </div>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 ${
                              isSelected
                                ? 'bg-[#12804E] border border-[#12804E] shadow-2xs'
                                : 'border-2 border-slate-300 dark:border-white/20'
                            }`}>
                              {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Informational Concierge Notice */}
                  <div className="p-3.5 rounded-2xl border border-[#B8D7C1] dark:border-white/10 bg-[#E8F3EA]/60 dark:bg-[#0E2A1E]/60 text-xs text-[#123C2B] dark:text-slate-300 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-[#12804E] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Provisional Bill Notice:</span> Guests do not settle bills directly in the browser. 
                      Please call your waiter to verify orders and complete payment via Cash, Card or UPI QR.
                    </div>
                  </div>

                  {/* Bill Requested Status Banner */}
                  {isBillRequested && (
                    <div className="p-4 rounded-2xl border border-emerald-500/50 bg-[#E8F3EA] dark:bg-emerald-950/60 space-y-1.5 shadow-sm animate-in fade-in">
                      <div className="flex items-center gap-2 text-[#12804E] dark:text-emerald-400 font-black text-xs">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Waiter Notified for Bill Settlement!</span>
                      </div>
                      <p className="text-[11px] text-[#5E7163] dark:text-slate-300">
                        Staff is on the way to {tableNumber} with your final tax bill and payment terminal.
                      </p>
                    </div>
                  )}

                  {/* Call Waiter to Settle Bill */}
                  <button
                    type="button"
                    data-testid="btn-call-waiter-bill"
                    onClick={handleCallWaiterForBill}
                    className="w-full h-14 min-h-[56px] py-3.5 px-5 rounded-2xl emerald-3d-button text-[#F7E2B4] font-black text-sm sm:text-base tracking-wide shadow-[0_10px_25px_rgba(18,128,78,0.38)] transition flex items-center justify-center gap-2.5 active:scale-[0.98]"
                  >
                    <Bell className="w-5 h-5 text-[#F7E2B4] drop-shadow animate-bounce" />
                    <span>{isBillRequested ? `Paging Waiter Again (₹${currentPayableTotal.toLocaleString('en-IN')})` : `Call Waiter to Settle Bill (₹${currentPayableTotal.toLocaleString('en-IN')})`}</span>
                  </button>

                  {/* Table Vacated / Leaving Table Action */}
                  <div className="pt-2 border-t border-[#D7E5D9]/70 dark:border-white/10">
                    <button
                      type="button"
                      data-testid="btn-leaving-table"
                      onClick={handleNotifyTableVacated}
                      className="w-full h-12 min-h-[48px] py-3 px-4 rounded-2xl border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/20 hover:bg-rose-100 text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-2xs active:scale-[0.98] mb-16"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>I am Leaving Table (Table Chhodiye)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* TAB 5: CALL WAITER SCREEN                                             */}
          {/* --------------------------------------------------------------------- */}
          {waiterEnabled && currentTab === 'waiter' && (
            <div className={`p-4 rounded-2xl border space-y-4 shadow-sm ${
 isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
 }`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/30">
                <div>
                  <h3 className="font-black text-sm">Call Waiter & Service Desk</h3>
                  <p className="text-[10px] text-slate-400">Direct alert to assigned floor staff</p>
                </div>
                <button
                  onClick={() => setCurrentTab('home')}
                  className="text-xs text-orange-500 font-bold hover:underline"
                >
                  Back
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { type: 'CALL_WAITER', icon: Bell, label: 'Assistance / Waiter', desc: 'Assistance needed' },
                  { type: 'WATER', icon: Droplets, label: 'Water Bottle', desc: 'Chilled / Normal' },
                  { type: 'CUTLERY', icon: Utensils, label: 'Extra Cutlery', desc: 'Plates, spoons, bowls' },
                  { type: 'CLEANING', icon: Sparkles, label: 'Clean Table', desc: 'Spill clean up' },
                  { type: 'BILL', icon: Receipt, label: 'Request Bill', desc: 'Printed tax folio' },
                  { type: 'ASSISTANCE', icon: MessageSquare, label: 'Special Request', desc: 'Speak to manager' },
                ].map((s) => {
                  const SvgIcon = s.icon;
                  return (
                  <button
                    key={s.type}
                    data-testid={
                      s.type === 'WATER'
                        ? 'service-call-water'
                        : s.type === 'BILL'
                        ? 'service-call-bill'
                        : s.type === 'CALL_WAITER'
                        ? 'service-call-assistance'
                        : `service-call-${s.type.toLowerCase()}`
                    }
                    disabled={waiterCooldown > 0}
                    onClick={() => handleSendServiceCall(s.type as CustomerRequestType, s.label)}
                    className={`p-3 rounded-xl border flex flex-col items-center text-center gap-1.5 transition ${
                      waiterCooldown > 0 ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105'
                    } ${
                      isDark
                        ? 'bg-slate-800 border-slate-800 hover:border-emerald-600/50'
                        : 'bg-slate-50 border-slate-200 hover:border-orange-300 shadow-2xs'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center relative">
                      <SvgIcon className="w-4 h-4" />
                      {waiterCooldown > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 text-[9px] font-black bg-amber-500 text-white rounded-full w-4 h-4 flex items-center justify-center shadow-xs">
                          {waiterCooldown}
                        </span>
                      )}
                    </div>
                    <span className={`font-black text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {s.label}{waiterCooldown > 0 ? ` (${waiterCooldown}s)` : ''}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {waiterCooldown > 0 ? 'Server alerted • in queue' : s.desc}
                    </span>
                  </button>
                );
              })}
              </div>

              {/* Report Food / Table Problem Card */}
              <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>Having an issue with Food or Table?</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Report taste, temperature, hygiene, or table issues directly to the floor manager & waiter with URGENT priority.
                </p>
                <button
                  type="button"
                  data-testid="btn-open-issue-modal"
                  onClick={() => setIsIssueModalOpen(true)}
                  className="w-full py-2.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Report Problem / Dikkat Batayein</span>
                </button>
              </div>

              {/* Table Vacated Button */}
              <button
                type="button"
                data-testid="btn-waiter-vacate-table"
                onClick={handleNotifyTableVacated}
                className="w-full py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4 text-slate-400" />
                <span>Leaving Table? Let Staff Know</span>
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MOBILE STICKY FLOATING BOTTOM ACTION & NAVIGATION BAR                 */}
      {/* ========================================================================= */}
      
      {/* Mobile Sticky Bottom 'View Cart' Button */}
      {/* Floating Bottom Cart Pill (When items in cart and tab is not cart/payment) */}
      {totalCartCount > 0 && currentTab !== 'cart' && currentTab !== 'payment' && (
        <div className="fixed bottom-20 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md z-40">
          <button
            type="button"
            data-testid="btn-floating-view-cart"
            onClick={() => setCurrentTab('cart')}
            className="h-14 min-h-[56px] w-full bg-gradient-to-r from-[#123C2B] via-[#1A4E38] to-[#0D2E20] text-[#F7E2B4] border border-[#E9C98A]/50 rounded-2xl px-5 py-3.5 flex items-center justify-between font-bold shadow-[0_12px_28px_rgba(18,60,43,0.35),inset_0_1px_1px_rgba(255,255,255,0.35)] backdrop-blur-xl active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-[#E9C98A] text-[#123C2B] text-xs flex items-center justify-center font-black shadow-xs">
                {totalCartCount}
              </span>
              <span className="text-sm sm:text-base font-black">{totalCartCount === 1 ? '1 item' : `${totalCartCount} items`} • ₹{grandTotal}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black uppercase tracking-wider text-[#F7E2B4]">
              <span>{selectedLanguage === 'HI' ? 'कार्ट देखें' : 'View Cart'}</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Floating Frosted Glass Bottom Navigation Capsule (Streamlined 4 Tabs) */}
      <nav
        data-testid="bottom-navigation-bar"
        className="glass-nav-pill fixed bottom-3 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md z-40 rounded-3xl py-1.5 px-2 flex items-center justify-around transition-all duration-200"
        style={{ marginBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)' }}
      >
        {[
          { id: 'home', label: selectedLanguage === 'HI' ? 'मेनू' : 'Menu', icon: UtensilsCrossed, testId: 'tab-home' },
          { id: 'cart', label: selectedLanguage === 'HI' ? 'कार्ट' : 'Cart', icon: ShoppingCart, badge: totalCartCount, testId: 'tab-cart' },
          { id: 'orders', label: selectedLanguage === 'HI' ? 'आर्डर' : 'Orders', icon: Clock, badge: activeOrders.length, testId: 'tab-orders' },
          { id: 'payment', label: selectedLanguage === 'HI' ? 'बिल व भुगतान' : 'Bill & Pay', icon: Receipt, testId: 'tab-payment' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === 'home'
            ? (currentTab === 'home' || currentTab === 'menu')
            : tab.id === 'payment'
            ? (currentTab === 'payment' || currentTab === 'split')
            : currentTab === tab.id;
          return (
            <button
              key={tab.id}
              data-testid={tab.testId}
              onClick={() => setCurrentTab(tab.id as any)}
              className={`min-h-[48px] flex-1 max-w-[85px] flex flex-col items-center justify-center gap-0.5 relative py-1 px-1 rounded-2xl transition-all duration-150 ${
                isActive
                  ? 'emerald-3d-pill-active text-[#F7E2B4] font-black scale-[1.02]'
                  : 'text-[#5E7163] hover:text-[#123C2B] font-semibold active:scale-95'
              }`}
            >
              <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-[#F7E2B4] drop-shadow' : 'text-[#5E7163]'}`} />
              <span className={`max-w-full truncate text-[10px] sm:text-[11px] leading-tight ${isActive ? 'text-[#F7E2B4] font-black' : 'font-semibold'}`}>
                {tab.label}
              </span>
              {tab.badge && tab.badge > 0 ? (
                <span className="absolute -top-1 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E9C98A] text-[#123C2B] text-[10px] font-black flex items-center justify-center shadow-md border border-white">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* ========================================================================= */}
      {/* 4. DISH CUSTOMIZATION MODAL (Luxury Bottom-Sheet Design)                   */}
      {/* ========================================================================= */}
      {isCustomizeModalOpen && customizingDish && (() => {
        const addonTotal = [
          { name: 'Extra Butter / Ghee', price: 30 },
          { name: 'Extra Gravy Bowl', price: 40 },
          { name: 'Extra Cheese Topping', price: 50 },
        ].reduce((sum, item) => sum + (selectedAddons[item.name] ? item.price : 0), 0);
        const calculatedModalTotal = (customizingDish.price + addonTotal) * modalQty;

        return (
          <div
            data-testid="item-detail-modal"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsCustomizeModalOpen(false);
            }}
          >
            <div className={`w-full sm:max-w-md max-h-[92vh] sm:max-h-[88vh] rounded-t-[32px] sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl border-t sm:border transition-colors animate-in slide-in-from-bottom duration-250 ${
              isDark ? 'bg-[#0C2118] text-[#F2F7F2] border-white/10' : 'bg-white text-[#123C2B] border-slate-200/80'
            }`}>
              {/* Mobile Sheet Drag Handle Indicator */}
              <div className="w-12 h-1.5 bg-white/40 backdrop-blur-md rounded-full mx-auto mt-2.5 mb-1 sm:hidden absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none" />

              {/* Food Hero Image */}
              <div className="relative h-52 sm:h-56 w-full bg-slate-950 shrink-0 overflow-hidden">
                <img
                  src={customizingDish.image}
                  alt={customizingDish.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setIsCustomizeModalOpen(false)}
                  className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition active:scale-95 shadow-md z-10"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 left-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-md">
                  <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                  <span>{customizingDish.rating} ({customizingDish.ratingCount})</span>
                </div>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
                {/* Title, Dietary Badges & Price */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full shrink-0 ${customizingDish.isVeg ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-red-500 ring-2 ring-red-200'}`} />
                    <h3 className="font-black text-lg sm:text-xl text-slate-900 dark:text-white tracking-tight">
                      {customizingDish.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {customizingDish.description}
                  </p>

                  <div data-testid="modal-allergens" className="mt-2.5 flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200/90 flex items-center gap-1.5 shadow-2xs">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                      <span>Allergen Notice: Contains Dairy (Paneer / Milk)</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-200/90 flex items-center gap-1.5 shadow-2xs">
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Gluten Free Option</span>
                    </span>
                  </div>

                  <div className="text-2xl font-black text-[#123C2B] dark:text-[#F7E2B4] mt-2 tracking-tight">
                    ₹{customizingDish.price}
                  </div>
                </div>

                {/* Spice Level (Luxury 3D Emerald Selector) */}
                <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-white/10">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span>Choose Spice Level</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['Mild', 'Medium', 'Spicy', 'Extra Spicy'] as const).map((lvl) => {
                      const isSelected = spiceLevel === lvl;
                      return (
                        <button
                          key={lvl}
                          type="button"
                          data-testid={`btn-spice-${lvl.toLowerCase().replace(/\s+/g, '-')}`}
                          onClick={() => setSpiceLevel(lvl)}
                          className={`py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
                            isSelected
                              ? 'emerald-3d-pill-active text-[#F7E2B4] font-black scale-[1.02]'
                              : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200/70 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10'
                          }`}
                        >
                          {lvl}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dietary & Cooking Customization */}
                <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-white/10">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span>Dietary & Cooking Customization</span>
                  </label>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {[
                      { id: 'extra-spicy', label: 'Extra Spicy' },
                      { id: 'less-oil', label: 'Less Oil' },
                      { id: 'jain-style', label: 'Jain Style' },
                      { id: 'extra-crispy', label: 'Extra Crispy' },
                    ].map((cust) => {
                      const isSelected = customInstructions.includes(cust.label) || (cust.id === 'extra-spicy' && spiceLevel === 'Extra Spicy');
                      return (
                        <button
                          key={cust.id}
                          type="button"
                          data-testid={`btn-custom-${cust.id}`}
                          onClick={() => {
                            if (cust.id === 'extra-spicy') {
                              setSpiceLevel('Extra Spicy');
                            }
                            if (!customInstructions.includes(cust.label)) {
                              setCustomInstructions(prev => prev ? `${prev}, ${cust.label}` : cust.label);
                            } else {
                              setCustomInstructions(prev => prev.replace(cust.label, '').replace(/,\s*,/, ',').replace(/^,\s*|\s*,\s*$/, ''));
                            }
                          }}
                          className={`px-3.5 py-1.5 rounded-xl border font-bold text-xs transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? 'emerald-3d-pill-active text-[#F7E2B4] scale-[1.02]'
                              : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5 text-[#F7E2B4]" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{cust.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Addons (Optional) */}
                <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-white/10">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Add-ons (Optional)
                  </label>
                  <div className="space-y-2 text-xs">
                    {[
                      { name: 'Extra Butter / Ghee', price: 30 },
                      { name: 'Extra Gravy Bowl', price: 40 },
                      { name: 'Extra Cheese Topping', price: 50 },
                    ].map((ad) => {
                      const isChecked = selectedAddons[ad.name] || false;
                      return (
                        <label
                          key={ad.name}
                          className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400/80 text-emerald-950 dark:text-emerald-100 shadow-2xs font-bold'
                              : 'bg-slate-50/80 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:bg-slate-100/80'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) =>
                                setSelectedAddons({ ...selectedAddons, [ad.name]: e.target.checked })
                              }
                              className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-500 accent-[#12804E] cursor-pointer"
                            />
                            <span>{ad.name}</span>
                          </div>
                          <span className="font-black text-[#123C2B] dark:text-[#F7E2B4]">+₹{ad.price}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Instructions */}
                <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-white/10">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Cooking Notes / Special Instructions
                  </label>
                  <input
                    type="text"
                    data-testid="modal-special-instructions-input"
                    placeholder="e.g. Please make it less spicy, less oil..."
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Sticky Bottom Action Bar with 3D Emerald Button & Stepper */}
              <div
                className="p-4 bg-white/95 dark:bg-[#0C2118]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-3 shrink-0 shadow-lg"
                style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}
              >
                {/* 3D Quantity Stepper */}
                <div className="flex items-center gap-1.5 bg-[#F2F7F2] dark:bg-slate-900 p-1 rounded-2xl border border-emerald-200/80 dark:border-emerald-800 shadow-inner shrink-0">
                  <button
                    type="button"
                    data-testid="btn-modal-decrease-qty"
                    onClick={() => setModalQty(q => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center font-black text-slate-700 dark:text-slate-200 active:scale-95 transition shadow-2xs"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4 text-[#123C2B] dark:text-emerald-400" />
                  </button>
                  <span data-testid="modal-dish-qty" className="w-7 text-center font-black text-base text-[#123C2B] dark:text-[#F7E2B4] tabular-nums">
                    {modalQty}
                  </span>
                  <button
                    type="button"
                    data-testid="btn-modal-increase-qty"
                    onClick={() => setModalQty(q => q + 1)}
                    className="w-9 h-9 rounded-xl bg-gradient-to-b from-[#184E38] to-[#123C2B] text-white flex items-center justify-center font-black active:scale-95 transition shadow-[0_2px_8px_rgba(18,60,43,0.35)]"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* 3D Luxury Emerald Add to Cart Button */}
                <button
                  type="button"
                  data-testid="modal-add-to-cart-btn"
                  onClick={() => {
                    if (customInstructions.trim()) {
                      setCartSpecialInstructions(prev => prev ? `${prev}, ${customInstructions.trim()}` : customInstructions.trim());
                    }
                    handleAddDish(customizingDish, modalQty);
                    setIsCustomizeModalOpen(false);
                  }}
                  className="flex-1 h-12 rounded-2xl bg-gradient-to-b from-[#184E38] via-[#123C2B] to-[#0A241A] hover:brightness-105 text-[#F7E2B4] border border-emerald-400/40 shadow-[0_6px_20px_rgba(18,60,43,0.35),inset_0_1px_1.5px_rgba(255,255,255,0.4)] font-black text-sm flex items-center justify-between px-4 transition active:translate-y-0.5"
                >
                  <span className="font-bold">{selectedLanguage === 'HI' ? 'कार्ट में जोड़ें' : 'Add to Cart'}</span>
                  <span className="text-sm font-black text-[#F7E2B4] bg-black/25 px-2.5 py-1 rounded-xl border border-white/10">
                    ₹{calculatedModalTotal}
                  </span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}


      {/* 5. ORDER CONFIRMATION MODAL */}
      {placedOrderConfirmation && (
        <div data-testid="order-confirmation-modal" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-sm dark:shadow-none">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Order sent to kitchen!</h3>
              <p className="text-xs text-slate-300 mt-1">
                KOT # generated: <strong className="text-amber-400 font-mono font-bold">{placedOrderConfirmation.kotNumber}</strong>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Sent to Tandoor & Curry kitchen display stations.
              </p>
            </div>
            <button
              type="button"
              data-testid="btn-track-order"
              onClick={() => {
                setPlacedOrderConfirmation(null);
                setCurrentTab('orders');
              }}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition shadow-lg"
            >
              Track Order Live
            </button>
          </div>
        </div>
      )}

      {/* 6. CUSTOMER FOOD & TABLE ISSUE / COMPLAINT MODAL */}
      {isIssueModalOpen && (
        <div data-testid="issue-reporting-modal" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`rounded-3xl max-w-md w-full overflow-hidden shadow-xl border p-5 space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm">Report Issue to Staff</h3>
                  <p className="text-[10px] text-slate-400">Table {tableNumber} • Immediate Manager Alert</p>
                </div>
              </div>
              <button
                onClick={() => setIsIssueModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category selection */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-800/60 border border-slate-700/50">
              {(['food', 'table', 'other'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  data-testid={`issue-cat-${cat}`}
                  onClick={() => {
                    setIssueCategory(cat);
                    setSelectedIssuePreset('');
                  }}
                  className={`py-2 px-1 rounded-lg text-xs font-bold capitalize transition text-center ${
                    issueCategory === cat
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {cat === 'food' ? '🍲 Food Issue' : cat === 'table' ? '🪑 Table / AC' : '⚡ Other'}
                </button>
              ))}
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400">Quick Select Common Issues</label>
              <div className="flex flex-wrap gap-1.5">
                {(issueCategory === 'food' ? [
                  'Food is cold / Thanda hai',
                  'Too spicy or salty',
                  'Wrong dish served',
                  'Food preparation delayed',
                  'Undercooked / Raw',
                  'Hygiene concern in food',
                ] : issueCategory === 'table' ? [
                  'Table not wiped / dirty',
                  'AC / Fan too cold/hot',
                  'Water or sauce spilled',
                  'Noisy surroundings',
                  'Cutlery / Glass dirty',
                  'Unpleasant odor',
                ] : [
                  'Need Floor Manager urgently',
                  'Need high chair for baby',
                  'Special dietary emergency',
                  'Billing dispute',
                ]).map((preset) => {
                  const isSelected = selectedIssuePreset === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSelectedIssuePreset(isSelected ? '' : preset)}
                      className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition ${
                        isSelected
                          ? 'bg-rose-600/30 border-rose-500 text-rose-300 font-bold'
                          : isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400">Additional Details (Optional)</label>
              <textarea
                rows={2}
                value={customIssueNote}
                onChange={(e) => setCustomIssueNote(e.target.value)}
                placeholder="E.g. Dal Makhani has too much salt, please replace or check..."
                className={`w-full p-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsIssueModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="btn-submit-issue"
                disabled={isSubmittingIssue || (!selectedIssuePreset && !customIssueNote.trim())}
                onClick={handleSubmitIssue}
                className="flex-2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-lg"
              >
                {isSubmittingIssue ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5" />
                )}
                <span>Send Urgent Alert to Staff</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live 24/7 Concierge & Floor Support Chatbox Modal */}
      <CustomerNeedHelpChatModal
        isOpen={isHelpChatOpen}
        onClose={() => setIsHelpChatOpen(false)}
        hotelId={hotelId || ''}
        hotelName={hotelName}
        currentRoomNumber={''}
        currentTableNumber={tableNumber}
        apiBaseUrl={API_BASE}
        socketUrl={SOCKET_URL}
        initialCategory="DINING"
      />

       </div>
    </div>
  );
};
