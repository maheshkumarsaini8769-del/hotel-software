import React, { useState } from 'react';
import {
  Building2,
  Sliders,
  Utensils,
  FolderTree,
  Table as TableIcon,
  ChefHat,
  Flame,
  CreditCard,
  Ticket,
  BookOpen,
  Truck,
  ArrowUpRight,
  ShoppingCart,
  FileSpreadsheet,
  Wallet,
  Warehouse as WarehouseIcon,
  Clock,
  UserCheck,
  ShieldAlert,
  Search,
  X,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

export interface ErpMasterSystemItem {
  id: string;
  name: string;
  category: 'F&B & Dine-In' | 'Supply Chain & Inventory' | 'Billing & Finance' | 'Administration & Audits';
  icon: any;
  status: 'ACTIVE' | 'LIVE' | 'CONFIGURED';
  summary: string;
  targetModule: string;
  targetTab?: string;
  port?: number;
}

export const ERP_19_SYSTEMS: ErpMasterSystemItem[] = [
  {
    id: 'sys-rest-info',
    name: '1. Restaurant Info',
    category: 'F&B & Dine-In',
    icon: Building2,
    status: 'ACTIVE',
    summary: 'Hotel profile, FSSAI lic., GSTIN, timings, physical address & branding.',
    targetModule: 'SETTINGS_CONFIGURATION',
    targetTab: 'RESTAURANT_INFO',
  },
  {
    id: 'sys-setting',
    name: '2. Setting & Tax Config',
    category: 'Administration & Audits',
    icon: Sliders,
    status: 'ACTIVE',
    summary: 'Tax slabs (CGST 2.5%, SGST 2.5%), service charges, auto-KOT print & round-off.',
    targetModule: 'SETTINGS_CONFIGURATION',
    targetTab: 'SETTINGS',
  },
  {
    id: 'sys-kitchen-sec',
    name: '3. Kitchen Section',
    category: 'F&B & Dine-In',
    icon: Utensils,
    status: 'LIVE',
    summary: 'KDS preparation stations (Tandoor, Chinese, Curry, Bakery, Bar, Pantry).',
    targetModule: 'SETTINGS_CONFIGURATION',
    targetTab: 'KITCHEN_SECTIONS',
    port: 3003,
  },
  {
    id: 'sys-category',
    name: '4. Category',
    category: 'F&B & Dine-In',
    icon: FolderTree,
    status: 'ACTIVE',
    summary: 'Menu categories & sub-categories with icons, display order & kitchen routing.',
    targetModule: 'MENU_CATALOG',
    targetTab: 'CATEGORIES',
  },
  {
    id: 'sys-table',
    name: '5. Table & Multi-Floor',
    category: 'F&B & Dine-In',
    icon: TableIcon,
    status: 'LIVE',
    summary: 'Floor 1, Floor 2 Banquets & Floor 3 Rooftop table studio with instant QR codes.',
    targetModule: 'TABLE_MANAGEMENT',
    port: 3001,
  },
  {
    id: 'sys-menu-item',
    name: '6. Menu Item',
    category: 'F&B & Dine-In',
    icon: ChefHat,
    status: 'ACTIVE',
    summary: 'Dish catalog with prices, Veg/Non-Veg badges, descriptions & kitchen stations.',
    targetModule: 'MENU_CATALOG',
    targetTab: 'ITEMS',
  },
  {
    id: 'sys-menu-stock',
    name: '7. Menu Item Stock (86 Board)',
    category: 'F&B & Dine-In',
    icon: Flame,
    status: 'LIVE',
    summary: 'Real-time 86 Out-of-Stock toggle board synchronized with Customer & Waiter apps.',
    targetModule: 'MENU_CATALOG',
    targetTab: 'STOCK_86',
  },
  {
    id: 'sys-payment',
    name: '8. Payment & Settlements',
    category: 'Billing & Finance',
    icon: CreditCard,
    status: 'LIVE',
    summary: 'Cash, UPI QR, EDC Cards, Room Charge Folio settlements and multi-tender splits.',
    targetModule: 'POS_CASHIER',
    port: 3007,
  },
  {
    id: 'sys-voucher',
    name: '9. Voucher & Coupons',
    category: 'Billing & Finance',
    icon: Ticket,
    status: 'ACTIVE',
    summary: 'Discount coupon codes (WELCOME10, FLAT100, FESTIVE20), min spend & redemptions.',
    targetModule: 'SETTINGS_CONFIGURATION',
    targetTab: 'VOUCHERS',
  },
  {
    id: 'sys-recipe',
    name: '10. Recipe (BOM Costing)',
    category: 'Supply Chain & Inventory',
    icon: BookOpen,
    status: 'ACTIVE',
    summary: 'Bill of Materials linking dishes to raw ingredients, calculating food cost % (COGS).',
    targetModule: 'MENU_CATALOG',
    targetTab: 'RECIPES',
  },
  {
    id: 'sys-supplier',
    name: '11. Supplier / Vendor',
    category: 'Supply Chain & Inventory',
    icon: Truck,
    status: 'ACTIVE',
    summary: 'Vendor directory, contact persons, GSTIN, supply categories & purchase ledgers.',
    targetModule: 'PURCHASES_SUPPLIERS',
    targetTab: 'VENDORS',
  },
  {
    id: 'sys-stock-issue',
    name: '12. Stock Issue (Requisition)',
    category: 'Supply Chain & Inventory',
    icon: ArrowUpRight,
    status: 'ACTIVE',
    summary: 'Store requisitions issuing raw ingredients from Central Store to Kitchens & Bar.',
    targetModule: 'INVENTORY_STOCK',
    targetTab: 'STOCK_ISSUE',
  },
  {
    id: 'sys-purchase',
    name: '13. Purchase & GRN',
    category: 'Supply Chain & Inventory',
    icon: ShoppingCart,
    status: 'ACTIVE',
    summary: 'Purchase orders (PO), Goods Received Notes (GRN) & supplier invoice matching.',
    targetModule: 'PURCHASES_SUPPLIERS',
    targetTab: 'PURCHASE_ORDERS',
  },
  {
    id: 'sys-account-report',
    name: '14. Account Report & GST',
    category: 'Billing & Finance',
    icon: FileSpreadsheet,
    status: 'ACTIVE',
    summary: 'Day-end P&L summary, CGST/SGST tax output register, gross operating margin.',
    targetModule: 'REPORTS_ANALYTICS',
    targetTab: 'ACCOUNT_REPORT',
  },
  {
    id: 'sys-wallet',
    name: '15. Customer Wallet',
    category: 'Billing & Finance',
    icon: Wallet,
    status: 'LIVE',
    summary: 'Guest prepaid dining balances, top-up funds, loyalty points & VIP tier perks.',
    targetModule: 'SETTINGS_CONFIGURATION',
    targetTab: 'WALLETS',
  },
  {
    id: 'sys-warehouse',
    name: '16. Ware House & Stores',
    category: 'Supply Chain & Inventory',
    icon: WarehouseIcon,
    status: 'ACTIVE',
    summary: 'Central Godown, Kitchen Dry Pantry, Cold Storage freezer & Bar Cellar locations.',
    targetModule: 'SETTINGS_CONFIGURATION',
    targetTab: 'WAREHOUSES',
  },
  {
    id: 'sys-work-period',
    name: '17. Work Period Report',
    category: 'Billing & Finance',
    icon: Clock,
    status: 'LIVE',
    summary: 'Shift register & Z-Report, cash drawer float, expected vs counted cash reconciliation.',
    targetModule: 'SETTINGS_CONFIGURATION',
    targetTab: 'WORK_PERIOD',
  },
  {
    id: 'sys-registration',
    name: '18. Registration (Staff & Guest)',
    category: 'Administration & Audits',
    icon: UserCheck,
    status: 'LIVE',
    summary: 'Staff onboarding (Waiters, Chefs, Cashiers with PINs) and Customer profiles.',
    targetModule: 'STAFF_MANAGEMENT',
  },
  {
    id: 'sys-logs',
    name: '19. Logs & Audit Trail',
    category: 'Administration & Audits',
    icon: ShieldAlert,
    status: 'ACTIVE',
    summary: 'System activity logs, KOT void authorizations, price changes and audit trails.',
    targetModule: 'SETTINGS_CONFIGURATION',
    targetTab: 'LOGS',
  },
  {
    id: 'sys-policies',
    name: '20. Policies & 15 Use-Cases Studio',
    category: 'Administration & Audits',
    icon: BookOpen,
    status: 'LIVE',
    summary: '12 standard hotel operating policies, compliance guidelines & 15 complete real-world use-case lifecycles.',
    targetModule: 'POLICIES_AND_USECASES',
  },
];

interface ErpMasterDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSystem: (system: ErpMasterSystemItem) => void;
  isDark?: boolean;
}

export const ErpMasterDirectoryModal: React.FC<ErpMasterDirectoryModalProps> = ({
  isOpen,
  onClose,
  onSelectSystem,
  isDark = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  if (!isOpen) return null;

  const categories = ['ALL', 'F&B & Dine-In', 'Supply Chain & Inventory', 'Billing & Finance', 'Administration & Audits'];

  const filteredSystems = ERP_19_SYSTEMS.filter((sys) => {
    const matchesSearch =
      sys.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sys.summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || sys.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`w-full max-w-5xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
          isDark ? 'bg-[#0a0d14] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Modal Header */}
        <div className={`p-6 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg text-xl">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight">ERP Master Systems Directory</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  19 Core Modules Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Complete all-in-one operations suite for Hotel & Restaurant Management
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search 19 systems..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border outline-none font-medium ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
              }`}
            />
          </div>
        </div>

        {/* Systems Grid */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredSystems.map((sys) => {
            const Icon = sys.icon;
            return (
              <div
                key={sys.id}
                onClick={() => {
                  onSelectSystem(sys);
                  onClose();
                }}
                className={`group p-4 rounded-2xl border transition-all duration-150 cursor-pointer hover:border-amber-500/60 hover:shadow-lg relative flex flex-col justify-between ${
                  isDark
                    ? 'bg-[#0f1420] border-slate-800 hover:bg-slate-800/50'
                    : 'bg-slate-50 border-slate-200 hover:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold group-hover:scale-110 transition">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {sys.status}
                      </span>
                      {sys.port && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400">
                          :{sys.port}
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-sm font-black mt-3 group-hover:text-amber-400 transition flex items-center gap-1.5">
                    <span>{sys.name}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">{sys.summary}</p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-amber-500">
                  <span>Open System</span>
                  <span className="group-hover:translate-x-1 transition">→</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
