import React, { useState, useEffect, useMemo } from 'react';
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
  ChefHat
} from 'lucide-react';
import { MenuCartStore, useTranslation } from '@spicehub/ui';

export type CustomerRequestType = 'WATER' | 'CALL_WAITER' | 'BILL' | 'CUTLERY' | 'CLEANING' | 'OTHER';

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
}

export interface CustomerMenuAppProps {
  store: MenuCartStore;
  hotelName?: string;
  tableNumber?: string;
  section?: string;
  onPlaceOrder?: (idempotencyKey: string, cookingInstructions?: string, clientItems?: any[], guestCount?: number) => Promise<boolean | void> | boolean | void;
  onRequestService?: (type: CustomerRequestType) => Promise<void> | void;
  onSettleBill?: (paymentMode: 'UPI' | 'CARD' | 'CASH' | 'ROOM', amount: number, utr?: string) => Promise<any> | any;
  activeOrders?: PlacedOrder[];
  onRefreshOrders?: () => Promise<void> | void;
  initialGuestCount?: number;
  hotelId?: string;
  waiterEnabled?: boolean;
  canOrder?: boolean;
  isReadOnly?: boolean;
  occupiedWarning?: string;
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

  // Smart App Download Banner & Modal States
  const [isAppDownloadModalOpen, setIsAppDownloadModalOpen] = useState(false);
  const [isAppBannerDismissed, setIsAppBannerDismissed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('spicehub_app_banner_dismissed') === 'true';
    }
    return false;
  });
  const customerApkUrl = `${API_BASE}/download/customer-apk`;

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
            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
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
    window.addEventListener('spicehub:menu_updated', handleMenuSync);

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
        showToast(`⚠️ "${payload.name || 'Dish'}" is now 86 (Sold Out in kitchen)!`);
      } else {
        showToast(`✅ "${payload.name || 'Dish'}" is back in stock!`);
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
  const [customerGuestCount, setCustomerGuestCount] = useState<number>(
    Number(initialGuestCount) > 0 ? Number(initialGuestCount) : 4
  );

  // Split Bill State
  const [splitMode, setSplitMode] = useState<'equal' | 'individual'>('individual');
  const [splitPersonsCount, setSplitPersonsCount] = useState<number>(3);
  const [splitItemChecked, setSplitItemChecked] = useState<{ [key: string]: boolean }>({});

  // Payment & Settlement State
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'upi' | 'card' | 'cash' | 'room'>('upi');
  const [payableAmount, setPayableAmount] = useState<number | null>(null);
  const [settlementDone, setSettlementDone] = useState<boolean>(false);
  const [settledData, setSettledData] = useState<{
    billNumber: string;
    amount: number;
    paymentMode: string;
    settledAt: string;
  } | null>(null);

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
      return `⚠️ Min order ₹${appliedPromo.minOrderAmount} required for coupon "${appliedPromo.code}". Add ₹${appliedPromo.minOrderAmount - cartSubtotal} more to activate discount!`;
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
        showToast(`🎉 Coupon "${data.promoCode || promoCodeInput.toUpperCase()}" applied successfully!`);
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

  // Running Unified Dining Bill
  const runningDiningTotal = cartItems.length > 0
    ? grandTotal
    : activeOrdersGrandTotal > 0
    ? activeOrdersGrandTotal
    : grandTotal;

  // Split Calculations
  const splitItemizedSubtotal = useMemo(() => {
    const itemsSource = cartItems.length > 0
      ? cartItems
      : activeOrders.flatMap(o => o.items.map(i => ({ name: i.name, price: i.unitPrice, qty: i.quantity })));
    return itemsSource.reduce((acc, it) => acc + (splitItemChecked[it.name] ? it.price * it.qty : 0), 0);
  }, [cartItems, activeOrders, splitItemChecked]);
  const splitItemizedGrandTotal = Math.round(splitItemizedSubtotal * 1.05);
  const splitEqualGrandTotal = Math.round(runningDiningTotal / (splitPersonsCount || 1));
  const effectiveSplitAmount = splitMode === 'equal' ? splitEqualGrandTotal : splitItemizedGrandTotal;
  const currentPayableTotal = payableAmount !== null ? payableAmount : runningDiningTotal;

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
    showToast(`🛎️ ${label} requested! Waiter notified at service desk.`);
    if (onRequestService) {
      await onRequestService(type);
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

    if (!onPlaceOrder) {
      showToast('Ordering is unavailable. Please rescan the table QR code.');
      return;
    }

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
    } catch (err: any) {
      showToast(err?.message || 'Order could not be sent to the kitchen. Please retry.');
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
  };

  const handleConfirmSplitBill = () => {
    setPayableAmount(effectiveSplitAmount);
    setCurrentTab('payment');
    showToast(`Split bill calculated: ₹${effectiveSplitAmount}`);
  };

  const handleProcessPayment = async () => {
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
    showToast(`✅ Payment Settled! Table flagged for sanitization.`);
  };

  // Dynamic categories list from backend catalog & admin
  const CATEGORIES = dynamicCategories;

  return (
    <div className={`min-h-screen w-full flex justify-center ${isDark ? 'bg-slate-950' : 'bg-slate-200/70'}`}>
      <div className={`max-w-3xl w-full mx-auto min-h-screen overflow-x-hidden font-sans select-none antialiased flex flex-col transition-colors duration-200 relative shadow-2xl border-x ${
        isDark ? 'bg-slate-950 text-slate-100 border-slate-800' : 'bg-slate-50 text-slate-900 border-slate-200'
      }`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-5 py-3 rounded-2xl shadow-sm dark:shadow-none flex items-center gap-3 animate-bounce border border-orange-400/40">
          <CheckCircle2 className="w-5 h-5 text-amber-200" />
          <span className="font-bold text-xs sm:text-sm">{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 0. SMART APP DOWNLOAD BANNER (Fast APK Access for Android Guests)        */}
      {/* ========================================================================= */}
      {!isAppBannerDismissed && (
        <div className="bg-slate-900 text-white dark:bg-slate-950 border-b border-slate-800 px-3 sm:px-4 py-2 text-xs flex items-center justify-between relative z-50">
          <div className="flex items-center gap-2 truncate">
            <span className="text-base">📱</span>
            <span className="font-semibold truncate">
              <span className="font-black">SpiceHub Android App:</span> 3x faster ordering & offline digital menu!
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsAppDownloadModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-black/40 hover:bg-black/60 text-white font-bold text-[11px] border border-white/20 transition flex items-center gap-1 shadow-xs"
            >
              <span>⬇️ Get App (.apk)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAppBannerDismissed(true);
                sessionStorage.setItem('spicehub_app_banner_dismissed', 'true');
              }}
              className="text-white/80 hover:text-white p-1 font-bold text-sm"
              title="Dismiss banner"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP HEADER (100% Full-Width Responsive Bar)                           */}
      {/* ========================================================================= */}
      <header className={`sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors ${
        isDark ? 'bg-slate-950/90 border-slate-800/80 text-white' : 'bg-white/95 border-slate-200 text-slate-900 shadow-xs'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Left: Brand Logo & Dining Table Session Pill */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setCurrentTab('home')}
              className="flex items-center gap-2 group text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-xs transition">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-base sm:text-lg tracking-tight flex items-center gap-1.5 leading-none text-slate-900 dark:text-white">
                  SpiceHub
                  <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    Dine-In
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate max-w-[130px] sm:max-w-none">
                  {hotelName}
                </p>
              </div>
            </button>

            {/* Table Badge */}
            <div className={`hidden xs:flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
              isDark ? 'bg-slate-800/80 border-slate-700 text-slate-200' : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{tableNumber}</span>
              <span className="text-[10px] opacity-70 hidden md:inline">({section})</span>
            </div>

            {/* Seated Pax Badge */}
            <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border ${
              isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}>
              <Users className="w-3.5 h-3.5 text-orange-500" />
              <span>{customerGuestCount} Guests</span>
            </div>

            {/* Geofence Proximity Badge */}
            <div data-testid="geofence-proximity-badge" className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${
              isDark ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>📍 On-Premises Verified (&lt;500m)</span>
            </div>
          </div>

          {/* Center (Desktop): Quick Search & Dietary Toggle */}
          <div className="hidden lg:flex items-center gap-3 flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search dishes, starters, desserts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border transition focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${
                  isDark
                    ? 'bg-slate-900/90 border-slate-700 text-slate-100 placeholder:text-slate-500'
                    : 'bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400'
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Veg / Non-Veg Toggle Pills */}
            <div className={`flex p-0.5 rounded-xl border text-[11px] font-bold shrink-0 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                onClick={() => setDietaryFilter('ALL')}
                className={`px-2 py-1 rounded-lg transition ${
                  dietaryFilter === 'ALL'
                    ? isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setDietaryFilter('VEG')}
                className={`px-2 py-1 rounded-lg flex items-center gap-1 transition ${
                  dietaryFilter === 'VEG'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-500 hover:text-emerald-400'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Veg</span>
              </button>
              <button
                onClick={() => setDietaryFilter('NON_VEG')}
                className={`px-2 py-1 rounded-lg flex items-center gap-1 transition ${
                  dietaryFilter === 'NON_VEG'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-red-500 hover:text-red-400'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span>Non-Veg</span>
              </button>
            </div>
          </div>

          {/* Right: Quick Service, Theme Switcher, Language & Cart Pill */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Call Waiter Button */}
            {waiterEnabled && (
              <button
                onClick={() => setCurrentTab('waiter')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 text-xs font-semibold shadow-xs transition"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Call Waiter</span>
              </button>
            )}

            {/* Get App Action Button */}
            <button
              type="button"
              onClick={() => setIsAppDownloadModalOpen(true)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${
                isDark
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 shadow-2xs'
              }`}
              title="Download SpiceHub Android App (.apk)"
            >
              <span>📲</span>
              <span className="hidden sm:inline">Get App</span>
            </button>

            {/* Bilingual English / Hindi Language Pill */}
            <button
              onClick={toggleCustomerLanguage}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-100 shadow-2xs'
              }`}
              title={selectedLanguage === 'EN' ? 'हिन्दी में बदलें' : 'Switch to English'}
            >
              <Globe className="w-3.5 h-3.5 text-orange-500" />
              <span>{selectedLanguage === 'EN' ? 'हिन्दी' : 'English'}</span>
            </button>

            {/* Cart Button */}
            <button
              data-testid="header-btn-cart"
              onClick={() => setCurrentTab('cart')}
              className={`relative px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 shadow-2xs'
              }`}
            >
              <ShoppingCart className="w-4 h-4 text-orange-500" />
              <span className="hidden sm:inline text-xs font-bold">Cart</span>
              {totalCartCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-orange-600 text-white text-[10px] font-black animate-pulse">
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search & Diet Bar (< md) */}
        <div className="md:hidden px-4 pb-2.5 pt-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={selectedLanguage === 'HI' ? 'व्यंजन, भोजन, पेय खोजें...' : 'Search dishes, curries, drinks...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border focus:outline-none ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500'
                  : 'bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400'
              }`}
            />
          </div>

          <div className={`flex p-0.5 rounded-xl border text-[10px] font-bold shrink-0 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setDietaryFilter('ALL')}
              className={`px-2 py-1 rounded-lg ${dietaryFilter === 'ALL' ? (isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900') : 'text-slate-400'}`}
            >
              {selectedLanguage === 'HI' ? 'सभी' : 'All'}
            </button>
            <button
              onClick={() => setDietaryFilter('VEG')}
              className={`px-2 py-1 rounded-lg ${dietaryFilter === 'VEG' ? 'bg-emerald-600 text-white' : 'text-emerald-500'}`}
            >
              {selectedLanguage === 'HI' ? 'शाकाहारी' : 'Veg'}
            </button>
            <button
              onClick={() => setDietaryFilter('NON_VEG')}
              className={`px-2 py-1 rounded-lg ${dietaryFilter === 'NON_VEG' ? 'bg-red-600 text-white' : 'text-red-500'}`}
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
          className="w-full bg-slate-900 border-b border-slate-800 px-4 py-2.5 text-slate-200 text-xs shadow-xs"
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-base">🔒</span>
              <div>
                <span className="font-bold text-white mr-2">
                  {selectedLanguage === 'HI' ? 'केवल मेनू देखें • मेज पहले से भरी हुई है' : 'VIEW-ONLY MENU • Table Currently Occupied'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {occupiedWarning || `Table ${tableNumber} is currently occupied with seated guests. Food ordering is disabled from this device.`}
                </span>
              </div>
            </div>
            <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider">
              Ordering Disabled
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN BODY: RESPONSIVE MULTI-COLUMN WORKSPACE                          */}
      {/* ========================================================================= */}
      <div className="flex-1 w-full max-w-4xl mx-auto p-3 sm:p-4 pb-32 flex flex-col gap-4 min-w-0">
        
        {/* ======================================================================= */}
        {/* LEFT / CENTER: MENU CATALOG & DISHES BROWSER                           */}
        {/* ======================================================================= */}
        <div className={`flex-1 min-w-0 flex flex-col space-y-4 ${currentTab !== 'home' && currentTab !== 'menu' ? 'hidden' : 'flex'}`}>
          
          {/* Active Live Order Tracker Banner (If any active orders) */}
          {activeOrders.length > 0 && (
            <div 
              onClick={() => setCurrentTab('orders')}
              className="cursor-pointer p-4 rounded-xl bg-slate-900 text-white border border-slate-800 flex items-center justify-between shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-lg">
                  🍳
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded">
                      {activeOrders.length} Active {activeOrders.length === 1 ? 'Order' : 'Orders'}
                    </span>
                    <span className="text-xs text-slate-300 font-medium">Table {tableNumber}</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold mt-0.5">
                    Latest: #{activeOrders[activeOrders.length - 1].orderNumber} • Status: {activeOrders[activeOrders.length - 1].orderStatus}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold bg-white text-slate-900 px-3 py-1.5 rounded-lg shadow-xs">
                <span>Track Live</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          )}

          {/* Hero Banner: Dining Atmosphere & Quick Call Waiter Chips */}
          <div data-testid="welcome-hero-banner" className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 min-h-[180px] flex items-end p-5 shadow-sm">
            <img
              src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80"
              alt="Restaurant Dining"
              className="absolute inset-0 w-full h-full object-cover opacity-25"
            />
            <div className="relative z-10 w-full flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/10 text-slate-200 text-xs font-medium mb-2">
                  <span>🍽️ Freshly Prepared Food</span>
                  <span>•</span>
                  <span>Instant Table Ordering</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Welcome to {hotelName}
                </h1>
                <p className="text-xs text-slate-300 mt-1 max-w-lg">
                  Order appetizers, main courses & beverages directly to <strong data-testid="badge-table-number" className="text-white font-semibold px-1.5 py-0.5 rounded bg-white/10">{tableNumber}</strong> without waiting.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    data-testid="btn-browse-menu"
                    onClick={() => {
                      setSelectedCategory('All');
                      setCurrentTab('menu');
                    }}
                    className="px-4 py-2 rounded-lg bg-white text-slate-900 font-semibold text-xs shadow-xs hover:bg-slate-100 transition flex items-center gap-1.5"
                  >
                    <span>Browse Menu</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick Waiter Action Chips */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleSendServiceCall('WATER', 'Extra Water')}
                  className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <span>💧</span>
                  <span>Water</span>
                </button>
                <button
                  onClick={() => handleSendServiceCall('BILL', 'Bill Request')}
                  className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <span>🧾</span>
                  <span>Bill</span>
                </button>
                <button
                  onClick={() => handleSendServiceCall('CLEANING', 'Clean Table')}
                  className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <span>✨</span>
                  <span>Clean</span>
                </button>
                {waiterEnabled && (
                  <button
                    onClick={() => setCurrentTab('waiter')}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>Call Waiter</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Horizontal Category Navigation Bar */}
          <div className="sticky top-16 z-30 py-2 backdrop-blur-md">
            <div className="overflow-x-auto flex gap-2 pb-1 custom-scrollbar">
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
                      if (currentTab !== 'menu' && currentTab !== 'home') setCurrentTab('menu');
                    }}
                    className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-1.5 border font-medium ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-xs'
                        : isDark
                        ? 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-2xs'
                    }`}
                  >
                    <span>{selectedLanguage === 'HI' ? (cat === 'All' ? 'सभी' : cat === 'Starters' ? 'स्टार्टर्स' : cat === 'Main Course' ? 'मेन कोर्स' : cat === 'Breads' ? 'रोटी व नान' : cat === 'Desserts' ? 'मिठाई' : cat === 'Beverages' ? 'पेय' : cat) : cat}</span>
                    <span className="text-xs opacity-75">({dishCount})</span>
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
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 h-full flex flex-col justify-between shadow-xs transition-colors hover:border-slate-300 dark:hover:border-slate-700 group cursor-pointer"
                    >
                      <div>
                        {/* Food Image with Badges */}
                        <div className="relative rounded-lg overflow-hidden h-32 bg-slate-100 dark:bg-slate-800 mb-3">
                          <img
                            src={dish.image}
                            alt={dish.name}
                            className={`w-full h-full object-cover group-hover:scale-105 transition duration-300 ${
                              dish.isAvailable === false ? 'grayscale opacity-50' : ''
                            }`}
                          />
                          
                          {/* 86 Sold Out Badge or Promotional Badge */}
                          {dish.isAvailable === false ? (
                            <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-red-600 text-white flex items-center gap-1">
                              <span>Sold Out</span>
                            </span>
                          ) : dish.badge ? (
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-900/80 text-white backdrop-blur-xs">
                              {dish.badge}
                            </span>
                          ) : null}

                          {/* Veg / Non-Veg Indicator */}
                          <span className={`absolute top-2 right-2 w-5 h-5 rounded-md backdrop-blur-xs flex items-center justify-center border ${
                            dish.isVeg
                              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400'
                              : 'bg-red-950/80 border-red-500 text-red-400'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${dish.isVeg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          </span>

                          {/* Rating Pill */}
                          <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-black/70 backdrop-blur-xs text-amber-300 flex items-center gap-1">
                            <span>★ {dish.rating}</span>
                          </span>

                          {/* Quick Customize Button */}
                          {dish.isAvailable !== false && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openCustomizeModal(dish);
                              }}
                              className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 hover:bg-black text-white text-[10px] font-medium backdrop-blur-xs flex items-center gap-1 transition"
                            >
                              <SlidersHorizontal className="w-3 h-3 text-slate-200" />
                              <span>Customize</span>
                            </button>
                          )}
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h3 className="font-semibold text-base text-slate-900 dark:text-white line-clamp-1">
                            {dish.name}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {dish.description}
                          </p>
                        </div>
                      </div>

                      {/* Price & Add to Cart Stepper */}
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-base font-semibold text-slate-900 dark:text-white">
                            ₹{dish.price}
                          </span>
                          <span className="text-[10px] text-slate-400">Taxes inclusive</span>
                        </div>

                        {dish.isAvailable === false ? (
                          <div className="h-9 w-full rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-medium flex items-center justify-center">
                            Sold Out
                          </div>
                        ) : inCartQty > 0 ? (
                          <div className="h-9 w-full flex items-center justify-between border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-sm">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateQty(cartItem!.id, -1);
                              }}
                              className="h-full px-3 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span>{inCartQty}</span>
                            <button
                              type="button"
                              data-testid={`btn-plus-${dish.name.toLowerCase().replace(/\s+/g, '-')}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateQty(cartItem!.id, 1);
                              }}
                              className="h-full px-3 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center"
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
                            className="h-9 w-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-md text-sm font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 transition active:scale-[0.98]"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add</span>
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
        {/* RIGHT COLUMN (DRAWER ON TABLET/DESKTOP, BOTTOM SHEET ON MOBILE)        */}
        {/* ======================================================================= */}
        {currentTab !== 'home' && currentTab !== 'menu' && (
          <div
            onClick={() => setCurrentTab('menu')}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity"
          />
        )}

        <div className={`shrink-0 flex flex-col space-y-4 ${
          currentTab !== 'home' && currentTab !== 'menu'
            ? 'fixed inset-x-0 bottom-0 max-h-[85vh] bg-white dark:bg-slate-900 rounded-t-2xl border-t border-slate-200 dark:border-slate-800 z-50 p-4 shadow-2xl overflow-y-auto md:max-h-none md:rounded-none md:border-t-0 md:inset-x-auto md:right-0 md:top-0 md:w-96 md:h-full md:border-l md:border-slate-200 md:dark:border-slate-800 md:flex'
            : 'hidden'
        }`}>
          {/* Drawer Header with Close Button */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-bold text-slate-900 dark:text-white text-base">
              {currentTab === 'cart' ? 'Cart & Order' : currentTab === 'orders' ? 'Live Order Status' : 'Bill & Payment'}
            </h2>
            <button
              onClick={() => setCurrentTab('menu')}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          
          {/* Panel Header Switcher (Cart | Live Order | Split/Pay | Waiter) */}
          <div className={`p-1 rounded-xl border flex items-center gap-1 text-xs font-semibold ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setCurrentTab('cart')}
              className={`flex-1 py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 transition ${
                currentTab === 'cart'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>{selectedLanguage === 'HI' ? 'कार्ट' : 'Cart'} ({totalCartCount})</span>
            </button>

            <button
              onClick={() => setCurrentTab('orders')}
              className={`flex-1 py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 transition ${
                currentTab === 'orders'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{selectedLanguage === 'HI' ? 'आर्डर' : 'Orders'} {activeOrders.length > 0 ? `(${activeOrders.length})` : ''}</span>
            </button>

            <button
              onClick={() => setCurrentTab('payment')}
              className={`flex-1 py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 transition ${
                currentTab === 'payment' || currentTab === 'split'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{selectedLanguage === 'HI' ? 'भुगतान' : 'Pay'} ₹{currentPayableTotal}</span>
            </button>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* TAB 1: CART SCREEN                                                    */}
          {/* --------------------------------------------------------------------- */}
          {(currentTab === 'cart' || (currentTab === 'home' && !('mobileScreen' in window))) && (
            <div
              data-testid="cart-drawer-container"
              className={`p-4 rounded-2xl border flex flex-col justify-between space-y-4 shadow-sm ${
                isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/30">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-black">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm">Table Order Cart</h3>
                    <p className="text-[10px] text-slate-400">{tableNumber} • {cartItems.length} unique items</p>
                  </div>
                </div>

                {cartItems.length > 0 && (
                  <button
                    onClick={() => setCartItems([])}
                    className="text-[11px] font-bold text-red-500 hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* Cart Items List */}
              <div className="space-y-2.5 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                {cartItems.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
                    <span>Your cart is empty. Add delicious items from the menu!</span>
                  </div>
                ) : (
                  cartItems.map((it) => (
                    <div
                      key={it.id}
                      data-testid={`cart-item-${it.name.toLowerCase().replace(/\s+/g, '-')}`}
                      className={`p-2.5 rounded-xl border flex flex-col gap-2 ${
                        isDark ? 'bg-slate-800 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {it.image && (
                            <img src={it.image} alt={it.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className={`font-bold text-xs truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {it.name}
                            </div>
                            <div className="text-[11px] font-black text-orange-500">₹{it.price * it.qty}</div>
                          </div>
                        </div>

                        {/* Stepper */}
                        <div className={`flex items-center border rounded-lg overflow-hidden text-xs font-black shrink-0 ${
                          isDark ? 'border-slate-700/50 bg-black/20' : 'border-slate-300 bg-slate-100'
                        }`}>
                          <button
                            onClick={() => handleUpdateQty(it.id, -1)}
                            className={`px-2 py-1 transition ${
                              isDark ? 'hover:bg-orange-500/20 text-slate-400 hover:text-white' : 'hover:bg-orange-100 text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            -
                          </button>
                          <span className={`px-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{it.qty}</span>
                          <button
                            onClick={() => handleUpdateQty(it.id, 1)}
                            className={`px-2 py-1 transition ${
                              isDark ? 'hover:bg-orange-500/20 text-slate-400 hover:text-white' : 'hover:bg-orange-100 text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Customization Chips & Note */}
                      <div className="pt-1.5 border-t border-slate-700/30 flex flex-col gap-1.5">
                        <div className="flex flex-wrap gap-1">
                          {[
                            { label: '🧂 Kam Namak', val: 'Kam Namak (Less Salt)' },
                            { label: '🌶️ Mirchi Kam', val: 'Mirchi Kam (Mild Spicy)' },
                            { label: '🌿 Jain', val: 'No Onion Garlic (Jain)' },
                            { label: '✨ Extra Crispy', val: 'Extra Crispy' },
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
                                className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition ${
                                  isSelected
                                    ? 'bg-amber-500 text-slate-950 font-bold'
                                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
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
                          className={`w-full px-2 py-1 rounded-lg text-[11px] border focus:outline-none focus:border-amber-400 ${
                            isDark ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-600' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                          }`}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Guest Count Selector (Pax / Seated People) */}
              <div className={`p-3 rounded-xl border space-y-2 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-orange-50/50 border-orange-200/60'
              }`}>
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <Users className="w-3.5 h-3.5 text-orange-500" />
                    <span>Guests Dining (Kitne log hain?)</span>
                  </label>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
                    {customerGuestCount} Seated
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Select how many people are sitting at this table for cutlery & plates.
                </p>
                <div className="grid grid-cols-6 gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCustomerGuestCount(p)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        customerGuestCount === p
                          ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20 scale-105'
                          : isDark
                          ? 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-700'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {p}{p === 6 ? '+' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Special Cooking Instructions */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  <span>Special Cooking Instructions</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. less spicy, separate cutlery, serve fast..."
                  value={cartSpecialInstructions}
                  onChange={(e) => setCartSpecialInstructions(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-orange-500 ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              {/* Restaurant Offers & Coupon Codes */}
              <div className={`p-3.5 rounded-2xl border space-y-2 text-xs ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-amber-50/50 border-amber-200/80'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 text-amber-500">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Restaurant Offers & Coupons</span>
                  </span>
                  {appliedPromo && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
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
                      className="px-2 py-1 text-[10px] font-bold bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-lg transition"
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
                        className={`flex-1 px-3 py-2 rounded-xl text-xs uppercase font-mono tracking-wider border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                          isDark ? 'bg-slate-950 border-slate-700 text-white placeholder:text-slate-600' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                      <button
                        type="button"
                        disabled={isApplyingPromo || !promoCodeInput.trim()}
                        onClick={handleApplyPromo}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs transition"
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
                className={`p-3.5 rounded-xl border space-y-2 text-xs ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-300'
                    : 'bg-slate-50 border-slate-200 text-slate-700 shadow-xs'
                }`}
              >
                <div className={`flex items-center justify-between border-b pb-1.5 ${
                  isDark ? 'border-slate-800' : 'border-slate-200'
                }`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    Statutory Tax Engine (SAC 9963)
                  </span>
                  <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>5% Food GST Slab</span>
                </div>
                <div className="flex justify-between">
                  <span>Food Subtotal</span>
                  <span className={`font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>₹{cartSubtotal}</span>
                </div>
                {calculatedDiscount > 0 && (
                  <div className={`flex justify-between font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    <span>Coupon Discount ({appliedPromo?.code})</span>
                    <span className="font-mono">-₹{calculatedDiscount}</span>
                  </div>
                )}
                <div className={`flex justify-between text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <span>Taxable Amount</span>
                  <span className="font-mono">₹{discountedSubtotal}</span>
                </div>
                <div className={`flex justify-between text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <span>CGST (2.5% SAC 9963)</span>
                  <span className="font-mono">₹{(discountedSubtotal * 0.025).toFixed(2)}</span>
                </div>
                <div className={`flex justify-between text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <span>SGST (2.5% SAC 9963)</span>
                  <span className="font-mono">₹{(discountedSubtotal * 0.025).toFixed(2)}</span>
                </div>
                <div className={`flex justify-between font-semibold pt-1 border-t ${
                  isDark ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-700'
                }`}>
                  <span>Total Statutory GST (5%)</span>
                  <span className="font-mono">₹{gstAmount}</span>
                </div>
                <div className={`flex justify-between text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <span>Service Charge</span>
                  <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>₹0 (Free)</span>
                </div>
                <div
                  className={`flex justify-between font-bold text-sm pt-2 border-t ${
                    isDark ? 'border-slate-800 text-white' : 'border-slate-200 text-slate-900'
                  }`}
                >
                  <span>Grand Total</span>
                  <span className="font-mono text-base font-bold text-slate-900 dark:text-white">₹{grandTotal}</span>
                </div>
              </div>

              {/* Checkout / Place Order Button */}
              <button
                type="button"
                data-testid="btn-place-order"
                disabled={cartItems.length === 0 || canOrder === false || isReadOnly}
                onClick={handleCheckout}
                className={`w-full h-12 rounded-lg font-semibold text-sm shadow-xs flex items-center justify-center gap-2 transition mb-24 ${
                  canOrder === false || isReadOnly
                    ? 'bg-slate-300 text-slate-500 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'
                    : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 disabled:opacity-50'
                }`}
              >
                <ChefHat className="w-4 h-4" />
                <span>
                  {canOrder === false || isReadOnly ? '🔒 Ordering Disabled (Table Occupied)' : `Place Order • ₹${grandTotal}`}
                </span>
              </button>
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* TAB 2: LIVE ORDER TRACKING SCREEN (Refresh Resilient & Dynamic)       */}
          {/* --------------------------------------------------------------------- */}
          {currentTab === 'orders' && (
            <div className={`p-4 rounded-2xl border space-y-4 shadow-sm ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              {activeOrders.length === 0 ? (
                <div className="py-12 px-4 text-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto text-2xl font-bold">
                    <UtensilsCrossed className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-black text-base">No Active Orders Placed Yet</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      Explore our menu and place an order. Your food will be cooked fresh in our kitchen!
                    </p>
                  </div>
                  <button
                    onClick={() => setCurrentTab('menu')}
                    className="px-6 py-2.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold shadow-xs transition hover:opacity-90"
                  >
                    Browse Menu & Order
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700/30">
                    <div>
                      <h3 className="font-black text-sm flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                        <span>Live Order Tracking ({activeOrders.length})</span>
                      </h3>
                      <p className="text-[10px] text-slate-400">{tableNumber} • Real-time Kitchen Synced</p>
                    </div>
                    {onRefreshOrders && (
                      <button
                        onClick={() => onRefreshOrders()}
                        className="text-[11px] font-bold text-orange-500 hover:underline flex items-center gap-1"
                      >
                        🔄 Refresh
                      </button>
                    )}
                  </div>

                  {/* Active Orders List */}
                  <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                    {activeOrders.map((order, oIdx) => {
                      const isReady = order.orderStatus === 'READY';
                      const isServed = order.orderStatus === 'SERVED';

                      const statusBadge = isServed
                        ? { label: '🍽️ Served', bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30' }
                        : isReady
                        ? { label: '🔔 Ready to Serve', bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse' }
                        : { label: '🍳 Kitchen Cooking', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse' };

                      const orderSubtotal = order.totalAmount || (order.items || []).reduce((acc, it) => acc + (it.subtotal || it.unitPrice * it.quantity), 0);

                      return (
                        <div
                          key={order.orderNumber || oIdx}
                          className={`p-3.5 rounded-2xl border space-y-3 transition ${
                            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          {/* Order Header */}
                          <div className="flex items-center justify-between pb-2 border-b border-slate-700/20">
                            <div>
                              <div className="font-mono font-black text-sm text-orange-500">
                                #{order.orderNumber}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {order.placedAt ? new Date(order.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                              </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${statusBadge.bg}`}>
                              {statusBadge.label}
                            </span>
                          </div>

                          {/* Stepper Timeline */}
                          <div data-testid="live-order-status-tracker" className="space-y-2.5 relative pl-5 text-xs py-1">
                            <div className="relative">
                              <span className="absolute -left-5 top-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center">
                                ✓
                              </span>
                              <div className="font-bold text-[11px] text-emerald-400">1. Order Received by Kitchen</div>
                            </div>

                            <div className="relative">
                              <span className={`absolute -left-5 top-0.5 w-3.5 h-3.5 rounded-full text-white text-[9px] font-black flex items-center justify-center ${
                                isReady || isServed ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse'
                              }`}>
                                {isReady || isServed ? '✓' : '●'}
                              </span>
                              <div className="flex items-center justify-between">
                                <div className={`font-bold text-[11px] ${!isReady && !isServed ? 'text-orange-400' : ''}`}>
                                  2. Preparing Dishes in Kitchen
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
                                  ⏱ Est. ~12-15 mins
                                </span>
                              </div>
                            </div>

                            <div className={`relative ${!isReady && !isServed ? 'opacity-40' : ''}`}>
                              <span className={`absolute -left-5 top-0.5 w-3.5 h-3.5 rounded-full text-white text-[9px] font-black flex items-center justify-center ${
                                isServed ? 'bg-emerald-500' : isReady ? 'bg-emerald-500 animate-pulse' : 'border border-slate-600 bg-slate-900'
                              }`}>
                                {isServed ? '✓' : isReady ? '●' : ''}
                              </span>
                              <div className={`font-bold text-[11px] ${isReady ? 'text-emerald-400' : ''}`}>
                                3. Plated & Ready for Waiter
                              </div>
                            </div>

                            <div className={`relative ${!isServed ? 'opacity-40' : ''}`}>
                              <span className={`absolute -left-5 top-0.5 w-3.5 h-3.5 rounded-full text-white text-[9px] font-black flex items-center justify-center ${
                                isServed ? 'bg-emerald-500' : 'border border-slate-600 bg-slate-900'
                              }`}>
                                {isServed ? '✓' : ''}
                              </span>
                              <div className={`font-bold text-[11px] ${isServed ? 'text-blue-400' : ''}`}>
                                4. Served at Table
                              </div>
                            </div>
                          </div>

                          {/* Items List */}
                          <div className={`p-2.5 rounded-xl border space-y-1.5 text-xs ${
                            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                          }`}>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Dishes in Ticket:
                            </div>
                            {(order.items || []).map((it, iIdx) => (
                              <div key={iIdx} className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-orange-500">x{it.quantity}</span>
                                  <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{it.name}</span>
                                </div>
                                <span className="font-mono font-bold text-slate-400">
                                  ₹{it.subtotal || it.unitPrice * it.quantity}
                                </span>
                              </div>
                            ))}
                            {order.cookingInstructions && (
                              <div className="pt-1.5 border-t border-slate-700/20 text-[11px] italic text-amber-400">
                                Note: "{order.cookingInstructions}"
                              </div>
                            )}
                          </div>

                          {/* Ticket Total */}
                          <div className="flex items-center justify-between text-xs pt-0.5 font-bold">
                            <span className="text-slate-400">Ticket Total:</span>
                            <span className="font-mono text-xs text-emerald-500 font-black">₹{orderSubtotal}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary & Actions */}
                  <div className={`p-3.5 rounded-2xl border space-y-2.5 ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Total Running Bill:</span>
                      <span className="font-mono font-black text-emerald-500 text-sm">₹{activeOrdersGrandTotal}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setCurrentTab('menu')}
                        className="py-2.5 rounded-xl border border-orange-500/40 bg-orange-500/10 hover:bg-orange-500 hover:text-white text-orange-500 font-black text-xs text-center transition"
                      >
                        + Order More
                      </button>
                      <button
                        type="button"
                        data-testid="btn-view-provisional-bill"
                        onClick={() => setCurrentTab('payment')}
                        className="py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs text-center transition shadow-md"
                      >
                        View Bill & Pay (₹{activeOrdersGrandTotal})
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
            <div className={`p-4 rounded-2xl border space-y-4 shadow-sm ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/30">
                <div>
                  <h3 className="font-black text-sm">Split Table Bill</h3>
                  <p className="text-[10px] text-slate-400">Total Bill Amount: ₹{grandTotal}</p>
                </div>
                <button
                  onClick={() => setCurrentTab('orders')}
                  className="text-xs text-orange-500 font-bold hover:underline"
                >
                  Cancel
                </button>
              </div>

              {/* Equal vs Individual Mode Selector */}
              <div className={`grid grid-cols-2 p-1 rounded-xl border text-xs font-bold ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}>
                <button
                  onClick={() => setSplitMode('equal')}
                  className={`py-1.5 rounded-lg transition ${
                    splitMode === 'equal' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-400'
                  }`}
                >
                  Equal Split
                </button>
                <button
                  onClick={() => setSplitMode('individual')}
                  className={`py-1.5 rounded-lg transition ${
                    splitMode === 'individual' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-400'
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
                        className={`flex-1 py-2 rounded-xl font-black text-xs border transition ${
                          splitPersonsCount === num
                            ? 'bg-orange-600 border-orange-500 text-white'
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
                  {cartItems.map((it) => (
                    <label
                      key={it.name}
                      className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer text-xs ${
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
                          className="rounded text-orange-600 focus:ring-0"
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
                isDark ? 'bg-orange-950/20 border-orange-800/40 text-orange-200' : 'bg-orange-50 border-orange-200 text-orange-900'
              }`}>
                <span className="text-xs font-bold">
                  {splitMode === 'equal' ? `Share per person (${splitPersonsCount} guests)` : 'Your Itemized Share'}
                </span>
                <span className="text-lg font-black text-orange-500">
                  ₹{effectiveSplitAmount}
                </span>
              </div>

              <button
                onClick={handleConfirmSplitBill}
                className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs shadow-md transition"
              >
                Proceed with Share (Pay ₹{effectiveSplitAmount})
              </button>
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* TAB 4: PAYMENT SCREEN (UPI QR, Card, Cash, Room)                      */}
          {/* --------------------------------------------------------------------- */}
          {currentTab === 'payment' && (
            <div data-testid="provisional-bill-panel" className={`p-4 rounded-2xl border space-y-4 shadow-sm ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/30">
                <div>
                  <h3 className="font-black text-sm">Provisional Bill & Settlement</h3>
                  <p className="text-[10px] text-slate-400">{tableNumber} • {hotelName} • Instant Receipt</p>
                </div>
                {payableAmount !== null && (
                  <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold border border-orange-500/30">
                    Split Bill Active
                  </span>
                )}
              </div>

              {settlementDone ? (
                <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-2xl text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xl mx-auto font-black shadow-lg shadow-emerald-950/40">
                    ✓
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
                      onClick={() => showToast('📥 Tax Invoice downloaded as PDF!')}
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
              ) : (
                <div className="space-y-4">
                  {/* Amount Pill */}
                  <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    isDark ? 'bg-slate-800 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Provisional Bill Total</div>
                      <div className="text-xl font-black text-orange-500">₹{currentPayableTotal}</div>
                    </div>
                    <Receipt className="w-6 h-6 text-orange-500 opacity-60" />
                  </div>

                  {/* Provisional Bill Itemized Breakdown with Statutory Taxes */}
                  <div className={`p-3.5 rounded-2xl border space-y-2 text-xs ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <div className="flex items-center justify-between border-b border-slate-700/40 pb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                        Statutory Tax Breakdown (SAC 9963)
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">PROVISIONAL</span>
                    </div>
                    {activeOrders.flatMap(o => o.items || []).map((it, idx) => (
                      <div key={idx} className="flex justify-between text-[11px]">
                        <span>{it.name} <strong className="text-orange-400">×{it.quantity}</strong></span>
                        <span className="font-mono font-bold">₹{it.subtotal || it.unitPrice * it.quantity}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-slate-700/30 pt-1.5 text-slate-400">
                      <span>Food Subtotal</span>
                      <span className="font-mono">₹{Math.round(currentPayableTotal / 1.05)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>CGST (2.5% SAC 9963)</span>
                      <span className="font-mono">₹{((currentPayableTotal / 1.05) * 0.025).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>SGST (2.5% SAC 9963)</span>
                      <span className="font-mono">₹{((currentPayableTotal / 1.05) * 0.025).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-black text-amber-300 border-t border-slate-700/30 pt-1">
                      <span>Total Provisional Bill</span>
                      <span className="font-mono text-base text-orange-500">₹{currentPayableTotal}</span>
                    </div>
                  </div>

                  {/* Split Bill Calculator Preview */}
                  <div data-testid="split-bill-calculator-preview" className={`p-3.5 rounded-2xl border space-y-2.5 ${
                    isDark ? 'bg-orange-950/20 border-orange-500/30 text-white' : 'bg-orange-50 border-orange-200 text-slate-900'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400">
                        <Users className="w-3.5 h-3.5" />
                        <span>Split Bill Calculator Preview</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300">
                        Instant Preview
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 text-center">
                      {[2, 3, 4, 5].map((guests) => {
                        const share = (currentPayableTotal / guests).toFixed(0);
                        return (
                          <div key={guests} className={`p-2 rounded-xl border ${
                            splitPersonsCount === guests
                              ? 'bg-orange-600/30 border-orange-500 text-white'
                              : isDark ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                          }`}>
                            <div className="text-[10px] font-bold text-slate-400">{guests} Guests</div>
                            <div className="text-xs font-black text-orange-400 font-mono">₹{share}/ea</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Choose Payment Option</div>
                    {[
                      { id: 'upi', label: 'UPI QR (GPay, PhonePe, Paytm)', icon: Smartphone },
                      { id: 'card', label: 'Credit / Debit Card at Table', icon: CreditCard },
                      { id: 'cash', label: 'Cash (Pay to Waiter)', icon: Banknote },
                      { id: 'room', label: 'Add to Hotel Room Folio', icon: Coffee },
                    ].map((m) => {
                      const Icon = m.icon;
                      const isSelected = selectedPaymentMethod === m.id;
                      return (
                        <button
                          key={m.id}
                          onClick={() => setSelectedPaymentMethod(m.id as any)}
                          className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-xs transition ${
                            isSelected
                              ? 'bg-orange-500/15 border-orange-500 text-orange-400 font-bold'
                              : isDark ? 'bg-slate-800 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-orange-500" />
                            <span>{m.label}</span>
                          </div>
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-orange-500 bg-orange-500' : 'border-slate-500'
                          }`}>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* UPI QR Display */}
                  {selectedPaymentMethod === 'upi' && (
                    <div className={`p-4 rounded-xl border flex flex-col items-center text-center space-y-2.5 ${
                      isDark ? 'bg-slate-800 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="font-bold text-xs flex items-center gap-1.5 text-orange-400">
                        <QrCode className="w-4 h-4" />
                        <span>Scan & Pay with Any UPI App</span>
                      </div>
                      <div className="p-2 bg-white rounded-xl shadow-md border">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                            `upi://pay?pa=spicehub@icici&pn=SpiceHubHotel&am=${currentPayableTotal}&cu=INR&tn=Table_${tableNumber.replace(/\s+/g, '')}`
                          )}`}
                          alt="UPI QR Code"
                          className="w-32 h-32 object-contain"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">UPI ID: spicehub@icici</p>
                    </div>
                  )}

                  <button
                    type="button"
                    data-testid="btn-complete-settlement"
                    onClick={handleProcessPayment}
                    className="w-full h-12 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 font-semibold text-xs shadow-xs transition flex items-center justify-center gap-1.5 mb-24"
                  >
                    <span>Complete Settlement (₹{currentPayableTotal})</span>
                  </button>
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
                  { type: 'CALL_WAITER', icon: '🔔', label: 'Assistance / Waiter', desc: 'Assistance needed' },
                  { type: 'WATER', icon: '💧', label: 'Water Bottle', desc: 'Chilled / Normal' },
                  { type: 'CUTLERY', icon: '🥄', label: 'Extra Cutlery', desc: 'Plates, spoons, bowls' },
                  { type: 'CLEANING', icon: '✨', label: 'Clean Table', desc: 'Spill clean up' },
                  { type: 'BILL', icon: '🧾', label: 'Request Bill', desc: 'Printed tax folio' },
                  { type: 'OTHER', icon: '💬', label: 'Special Request', desc: 'Speak to manager' },
                ].map((s) => (
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
                    onClick={() => handleSendServiceCall(s.type as CustomerRequestType, s.label)}
                    className={`p-3 rounded-xl border flex flex-col items-center text-center gap-1.5 transition hover:scale-105 ${
                      isDark
                        ? 'bg-slate-800 border-slate-800 hover:border-orange-500/50'
                        : 'bg-slate-50 border-slate-200 hover:border-orange-300 shadow-2xs'
                    }`}
                  >
                    <span className="text-2xl">{s.icon}</span>
                    <span className={`font-black text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>{s.label}</span>
                    <span className="text-[10px] text-slate-400">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MOBILE STICKY FLOATING BOTTOM ACTION & NAVIGATION BAR                 */}
      {/* ========================================================================= */}
      
      {/* Mobile Sticky Bottom 'View Cart' Button */}
      {totalCartCount > 0 && currentTab !== 'cart' && currentTab !== 'payment' && (
        <div className="fixed bottom-16 inset-x-0 md:hidden z-40">
          <button
            type="button"
            data-testid="btn-floating-view-cart"
            onClick={() => setCurrentTab('cart')}
            className="h-14 w-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-t-xl px-4 flex items-center justify-between font-semibold shadow-lg active:opacity-90 transition"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 text-xs flex items-center justify-center font-bold">
                {totalCartCount}
              </span>
              <span>{totalCartCount === 1 ? '1 item' : `${totalCartCount} items`} • ₹{grandTotal}</span>
            </div>
            <div className="flex items-center gap-1 text-sm font-semibold">
              <span>View Cart</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Bottom Sticky Tab Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:max-w-3xl z-40 border-t py-1.5 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around backdrop-blur-md transition-colors ${
        isDark ? 'bg-slate-950/95 border-slate-800' : 'bg-white/95 border-slate-200 shadow-lg'
      }`}>
        {[
          { id: 'home', label: 'Home', icon: UtensilsCrossed },
          { id: 'menu', label: 'Menu', icon: FileText },
          { id: 'cart', label: 'Cart', icon: ShoppingCart, badge: totalCartCount },
          { id: 'orders', label: 'Orders', icon: Clock, badge: activeOrders.length },
          ...(waiterEnabled ? [{ id: 'waiter', label: 'Call Waiter', icon: Bell }] : []),
          { id: 'payment', label: 'Pay Bill', icon: CreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              data-testid={`tab-${tab.id}`}
              onClick={() => setCurrentTab(tab.id as any)}
              className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center gap-0.5 relative py-1 px-2.5 rounded-xl transition ${
                isActive
                  ? isDark ? 'text-blue-400 font-semibold' : 'text-blue-600 font-semibold'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-medium">{t(tab.label)}</span>
              {tab.badge && tab.badge > 0 ? (
                <span className="absolute 1 right-1.5 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* ========================================================================= */}
      {/* 4. DISH CUSTOMIZATION MODAL                                               */}
      {/* ========================================================================= */}
      {isCustomizeModalOpen && customizingDish && (
        <div data-testid="item-detail-modal" className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`rounded-3xl max-w-md w-full overflow-hidden shadow-sm dark:shadow-none border transition-colors ${
            isDark ? 'bg-slate-900 text-slate-100 border-slate-800' : 'bg-white text-slate-900 border-slate-200'
          }`}>
            <div className="relative h-48 bg-slate-900">
              <img
                src={customizingDish.image}
                alt={customizingDish.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setIsCustomizeModalOpen(false)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-amber-300 text-xs font-bold">
                ⭐ {customizingDish.rating} ({customizingDish.ratingCount})
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${customizingDish.isVeg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <h3 className="font-black text-base">{customizingDish.name}</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">{customizingDish.description}</p>
                <div data-testid="modal-allergens" className="mt-2 flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    ⚠️ Allergen Notice: Contains Dairy (Paneer / Milk)
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    ✓ Gluten Free Option
                  </span>
                </div>
                <div className="text-lg font-black text-orange-500 mt-1">₹{customizingDish.price}</div>
              </div>

              {/* Spice Level */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400">Choose Spice Level</label>
                <div className="flex gap-2">
                  {(['Mild', 'Medium', 'Spicy', 'Extra Spicy'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      data-testid={`btn-spice-${lvl.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => setSpiceLevel(lvl)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition ${
                        spiceLevel === lvl
                          ? 'bg-orange-600 border-orange-500 text-white shadow-md'
                          : isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dietary & Cooking Customization */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400">Dietary & Cooking Customization</label>
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
                        className={`px-3 py-1.5 rounded-xl border font-bold text-xs transition flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}
                      >
                        <span>{isSelected ? '✓' : '+'}</span>
                        <span>{cust.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Addons */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400">Add-ons (Optional)</label>
                <div className="space-y-1.5 text-xs">
                  {[
                    { name: 'Extra Butter / Ghee', price: 30 },
                    { name: 'Extra Gravy Bowl', price: 40 },
                    { name: 'Extra Cheese Topping', price: 50 },
                  ].map((ad) => (
                    <label key={ad.name} className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer ${
                      isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedAddons[ad.name] || false}
                          onChange={(e) =>
                            setSelectedAddons({ ...selectedAddons, [ad.name]: e.target.checked })
                          }
                          className="rounded text-orange-600 focus:ring-0"
                        />
                        <span>{ad.name}</span>
                      </div>
                      <span className="font-bold text-orange-500">+₹{ad.price}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">Cooking Notes / Special Instructions</label>
                <input
                  type="text"
                  data-testid="modal-special-instructions-input"
                  placeholder="e.g. Please make it less spicy, less oil..."
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-orange-500 ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              {/* Quantity Stepper */}
              <div className="flex items-center justify-between py-1">
                <label className="text-xs font-bold text-slate-400">Quantity</label>
                <div className="flex items-center gap-3 bg-slate-900/60 p-1.5 rounded-xl border border-slate-700/60">
                  <button
                    type="button"
                    data-testid="btn-modal-decrease-qty"
                    onClick={() => setModalQty(q => Math.max(1, q - 1))}
                    className="w-7 h-7 rounded-lg border border-slate-700 flex items-center justify-center font-bold text-slate-300 hover:bg-slate-800 transition"
                  >
                    -
                  </button>
                  <span data-testid="modal-dish-qty" className="w-6 text-center font-bold font-mono text-sm text-amber-400">{modalQty}</span>
                  <button
                    type="button"
                    data-testid="btn-modal-increase-qty"
                    onClick={() => setModalQty(q => q + 1)}
                    className="w-7 h-7 rounded-lg border border-orange-500/50 flex items-center justify-center font-bold text-orange-400 hover:bg-orange-950/40 transition"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Add to Cart button */}
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
                className="w-full h-11 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 font-semibold text-xs shadow-xs transition"
              >
                Add to Cart • ₹{customizingDish.price * modalQty}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. ORDER CONFIRMATION MODAL */}
      {placedOrderConfirmation && (
        <div data-testid="order-confirmation-modal" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-sm dark:shadow-none">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto text-2xl font-black">
              ✓
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

      {/* ========================================================================= */}
      {/* NATIVE ANDROID APP (.APK) DOWNLOAD & OPEN MODAL                          */}
      {/* ========================================================================= */}
      {isAppDownloadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-3xl p-6 shadow-sm dark:shadow-none border flex flex-col relative animate-in fade-in zoom-in duration-150 ${
            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsAppDownloadModalOpen(false)}
              className={`absolute top-4 right-4 p-2 rounded-full border transition ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-900'
              }`}
            >
              <X className="w-4 h-4" />
            </button>

            {/* App Icon & Header */}
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-14 h-14 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center text-2xl font-bold shadow-xs">
                📱
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black tracking-tight">SpiceHub App</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                    Native Android
                  </span>
                </div>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Direct APK Download • v1.0.4 • 5.5 MB</p>
              </div>
            </div>

            {/* Feature Perks */}
            <div className={`p-3.5 rounded-2xl border space-y-2 mb-4 text-xs ${
              isDark ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <div className="flex items-center gap-2 font-medium">
                <span className="text-emerald-500 font-black">✓</span>
                <span><strong>No App Store required:</strong> Direct instant install on any Android phone.</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <span className="text-emerald-500 font-black">✓</span>
                <span><strong>3x Faster Performance:</strong> Instant local caching & offline digital menu.</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <span className="text-emerald-500 font-black">✓</span>
                <span><strong>Real-Time Live Updates:</strong> Sound chime when kitchen accepts your order.</span>
              </div>
            </div>

            {/* Scannable QR Code for Desktop/Tablet Guests */}
            <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 mb-4 text-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(customerApkUrl)}`}
                alt="Scan to Download APK"
                className="w-32 h-32 object-contain bg-white p-2 rounded-xl border border-slate-200 shadow-xs"
              />
              <span className="mt-2 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                Scan with your phone camera or click below to download
              </span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <a
                href={customerApkUrl}
                download="SpiceHub-Customer.apk"
                className="w-full h-11 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition hover:opacity-90 text-center"
              >
                <span>⬇️</span>
                <span>Download Android APK (5.5 MB)</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  // Attempt custom URI intent to launch installed app if present
                  const tableParam = tableNumber ? `&table=${encodeURIComponent(tableNumber)}` : '';
                  const hotelParam = hotelId ? `&hotelId=${encodeURIComponent(hotelId)}` : '';
                  window.location.href = `intent://customer-table?${tableParam}${hotelParam}#Intent;scheme=spicehub;package=com.spicehub.customer;end`;
                  setTimeout(() => {
                    setIsAppDownloadModalOpen(false);
                  }, 1200);
                }}
                className={`w-full py-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  isDark
                    ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                    : 'border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200'
                }`}
              >
                <span>🚀</span>
                <span>Already Installed? Open App Directly</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAppDownloadModalOpen(false)}
                className={`w-full py-2 text-xs font-semibold text-center transition ${
                  isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Continue in Browser
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
