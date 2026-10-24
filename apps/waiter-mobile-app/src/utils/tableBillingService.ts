import { API_BASE_URL } from '../config/api';
import { waiterFetch } from '../lib/waiterApi';

export interface BillItem {
  name: string;
  qty: number;
  rate: number;
  total: number;
}

export interface TableBillCalculation {
  tableKey: string;
  tableNumber: number;
  items: BillItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  discountedSubtotal: number;
  serviceChargePercent: number;
  serviceChargeAmount: number;
  cgst: number;
  sgst: number;
  gstAmount: number;
  grandTotal: number;
}

/**
 * Table billing is always derived from live POS orders. There is no built-in
 * sample bill any more — a fabricated amount would end up on a real UPI QR
 * request or a guest invoice.
 */
export const normalizeTableKey = (input: string | number): string => {
  const str = String(input).trim();
  const numOnly = parseInt(str.replace(/[^0-9]/g, ''), 10);
  if (isNaN(numOnly) || numOnly < 1) {
    return 'Table 0';
  }
  return `Table ${numOnly}`;
};

export const getTableNumber = (input: string | number): number => {
  const str = String(input).trim();
  const numOnly = parseInt(str.replace(/[^0-9]/g, ''), 10);
  return isNaN(numOnly) ? 0 : numOnly;
};

export const calculateBill = (
  tableKey: string,
  items: BillItem[],
  discountPercent = 0,
  serviceChargePercent = 5
): TableBillCalculation => {
  const safeItems = Array.isArray(items) ? items : [];
  const subtotal = safeItems.reduce((acc, it) => acc + (it.total || it.rate * it.qty), 0);
  const discountAmount = Math.round((subtotal * (discountPercent || 0)) / 100);
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const serviceChargeAmount = Math.round((discountedSubtotal * (serviceChargePercent || 0)) / 100);
  const cgst = Math.round(discountedSubtotal * 0.025);
  const sgst = Math.round(discountedSubtotal * 0.025);
  const gstAmount = cgst + sgst;
  const grandTotal = discountedSubtotal + serviceChargeAmount + gstAmount;

  return {
    tableKey,
    tableNumber: getTableNumber(tableKey),
    items: safeItems,
    subtotal,
    discountPercent,
    discountAmount,
    discountedSubtotal,
    serviceChargePercent,
    serviceChargeAmount,
    cgst,
    sgst,
    gstAmount,
    grandTotal,
  };
};

/**
 * Calculates a table bill from items that were already loaded from the API.
 * Callers must fetch live items with `fetchTableOrdersFromApi` first.
 */
export const getTableBill = (
  tableInput: string | number,
  items: BillItem[] = [],
  discountPercent = 0,
  serviceChargePercent = 5
): TableBillCalculation => {
  const tableKey = normalizeTableKey(tableInput);
  return calculateBill(tableKey, items, discountPercent, serviceChargePercent);
};

export const fetchTableOrdersFromApi = async (
  tableInput: string | number
): Promise<BillItem[]> => {
  const cleanNum = getTableNumber(tableInput);
  if (!cleanNum) return [];
  const tFormat = `T-${String(cleanNum).padStart(2, '0')}`;

  try {
    const res = await waiterFetch(`${API_BASE_URL}/pos/table/orders?tableNumber=${encodeURIComponent(tFormat)}`);
    if (res.ok) {
      const body = await res.json();
      if (body.success && Array.isArray(body.data) && body.data.length > 0) {
        const mappedItems: BillItem[] = [];
        body.data.forEach((ord: any) => {
          if (Array.isArray(ord.items)) {
            ord.items.forEach((it: any) => {
              if (it.itemStatus !== 'CANCELLED') {
                const rate = Number(it.unitPrice || it.price || 0);
                const qty = Number(it.quantity || 1);
                mappedItems.push({
                  name: it.name || 'Menu Item',
                  qty,
                  rate,
                  total: rate * qty,
                });
              }
            });
          }
        });
        return mappedItems;
      }
    }
  } catch (_) {
    // Network or API error — the caller shows an honest empty state.
  }

  return [];
};

/** Fetches the live bill for a table in one call. */
export const loadTableBill = async (
  tableInput: string | number,
  discountPercent = 0,
  serviceChargePercent = 5
): Promise<TableBillCalculation> => {
  const items = await fetchTableOrdersFromApi(tableInput);
  return getTableBill(tableInput, items, discountPercent, serviceChargePercent);
};
