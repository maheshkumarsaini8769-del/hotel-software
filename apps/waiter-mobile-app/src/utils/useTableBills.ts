import { useEffect, useState } from 'react';
import {
  fetchTableOrdersFromApi,
  getTableBill,
  TableBillCalculation,
} from './tableBillingService';

/**
 * Loads live table bills for the given table keys.
 * Returns a map of table key → bill calculation (empty bill when the table
 * has no running order on the server).
 */
export const useTableBills = (
  tableKeys: string[]
): Record<string, TableBillCalculation> => {
  const [bills, setBills] = useState<Record<string, TableBillCalculation>>({});
  const signature = Array.from(new Set(tableKeys.filter(Boolean))).sort().join('|');

  useEffect(() => {
    let cancelled = false;
    const keys = signature ? signature.split('|') : [];

    if (keys.length === 0) {
      setBills({});
      return;
    }

    (async () => {
      const entries = await Promise.all(
        keys.map(async (key) => {
          const items = await fetchTableOrdersFromApi(key);
          return [key, getTableBill(key, items)] as const;
        })
      );
      if (!cancelled) {
        setBills(Object.fromEntries(entries));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [signature]);

  return bills;
};
