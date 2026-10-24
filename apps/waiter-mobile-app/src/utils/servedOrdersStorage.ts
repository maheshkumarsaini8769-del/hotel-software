export interface ServedOrderRecord {
  orderId: string;
  orderNumber: string;
  table: string;
  servedAt: string;
}

const SERVED_ORDERS_KEY = 'spicehub_waiter_served_orders';
const TABLES_SERVED_KEY = 'spicehub_tables_served_map';
const SERVED_COUNT_KEY = 'spicehub_waiter_served_count';

export const getServedOrderRecords = (): ServedOrderRecord[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SERVED_ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
};

export const isOrderServed = (orderIdOrNumber: string): boolean => {
  if (!orderIdOrNumber) return false;
  const records = getServedOrderRecords();
  const cleanKey = orderIdOrNumber.replace(/^#/, '').toLowerCase().trim();
  return records.some(
    (r) =>
      r.orderId === orderIdOrNumber ||
      r.orderNumber === orderIdOrNumber ||
      r.orderNumber.replace(/^#/, '').toLowerCase().trim() === cleanKey
  );
};

export const markOrderServedInStorage = (
  orderId: string,
  orderNumber: string,
  table: string
): void => {
  if (typeof window === 'undefined') return;
  try {
    const records = getServedOrderRecords();
    const cleanNum = String(table).replace(/[^0-9]/g, '');
    const cleanOrderNum = orderNumber.startsWith('#') ? orderNumber : `#${orderNumber}`;
    
    const existing = records.find(
      (r) => r.orderId === orderId || r.orderNumber === cleanOrderNum || r.orderNumber === orderNumber
    );
    if (!existing) {
      records.push({
        orderId,
        orderNumber: cleanOrderNum,
        table: cleanNum ? `Table ${cleanNum}` : table,
        servedAt: new Date().toISOString(),
      });
      localStorage.setItem(SERVED_ORDERS_KEY, JSON.stringify(records));
    }

    // Also update tables served map
    if (cleanNum) {
      const mapRaw = localStorage.getItem(TABLES_SERVED_KEY);
      const map: Record<string, 'SERVED'> = mapRaw ? JSON.parse(mapRaw) : {};
      map[cleanNum] = 'SERVED';
      localStorage.setItem(TABLES_SERVED_KEY, JSON.stringify(map));
    }

    // Also broadcast a custom storage event for multi-tab sync if needed
    window.dispatchEvent(new Event('spicehub_served_orders_updated'));
  } catch (_) {}
};

export const getTablesServedMap = (): Record<string, 'SERVED'> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(TABLES_SERVED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
};

export const getServedCountStorage = (initialBase = 14): number => {
  if (typeof window === 'undefined') return initialBase;
  try {
    const raw = localStorage.getItem(SERVED_COUNT_KEY);
    if (raw) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return initialBase;
  } catch (_) {
    return initialBase;
  }
};

export const incrementServedCountStorage = (initialBase = 14): number => {
  if (typeof window === 'undefined') return initialBase + 1;
  try {
    const cur = getServedCountStorage(initialBase);
    const next = cur + 1;
    localStorage.setItem(SERVED_COUNT_KEY, String(next));
    return next;
  } catch (_) {
    return initialBase + 1;
  }
};
