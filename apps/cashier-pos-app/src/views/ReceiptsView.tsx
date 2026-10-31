import React, { useCallback, useEffect, useState } from 'react';
import {
  Receipt,
  Search,
  Printer,
  Download,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { getApiClient } from '../lib/apiClient';

interface ReceiptsViewProps {
  isDark?: boolean;
  onToast?: (msg: string) => void;
}

interface ReceiptRow {
  id: string;
  number: string;
  table: string;
  customer: string;
  subtotal: number;
  cgst: number;
  sgst: number;
  total: number;
  time: string;
  mode: string;
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const ReceiptsView: React.FC<ReceiptsViewProps> = ({ isDark = true, onToast }) => {
  const [search, setSearch] = useState('');
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadReceipts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getApiClient().request<{
        success: boolean;
        data: ReceiptRow[];
      }>('GET', '/api/v1/fast-cashier/receipts');
      setReceipts(
        (response.data || []).map((row) => ({
          ...row,
          subtotal: Number(row.subtotal || 0),
          cgst: Number(row.cgst || 0),
          sgst: Number(row.sgst || 0),
          total: Number(row.total || 0),
        }))
      );
    } catch (err: any) {
      setReceipts([]);
      setError(err?.message || 'Settled receipts could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReceipts();
  }, [loadReceipts]);

  const filtered = receipts.filter(
    (receipt) =>
      receipt.number.toLowerCase().includes(search.toLowerCase()) ||
      receipt.table.toLowerCase().includes(search.toLowerCase()) ||
      receipt.customer.toLowerCase().includes(search.toLowerCase()) ||
      receipt.mode.toLowerCase().includes(search.toLowerCase())
  );

  const fetchReceiptText = async (receipt: ReceiptRow): Promise<string> => {
    const response = await getApiClient().request<{
      success: boolean;
      receiptText: string;
    }>('POST', `/api/v1/fast-cashier/thermal-receipt/${receipt.id}`, {
      width: '80mm',
      kickDrawer: false,
      cutPaper: false,
    });
    return response.receiptText || '';
  };

  const handlePrint = async (receipt: ReceiptRow) => {
    setBusyId(receipt.id);
    try {
      const text = await fetchReceiptText(receipt);
      const printWindow = window.open('', '_blank', 'width=520,height=760');
      if (!printWindow) {
        onToast?.('Allow pop-ups to print the thermal receipt.');
        return;
      }
      printWindow.document.write(
        `<html><head><title>${receipt.number}</title><style>body{font-family:monospace;font-size:12px;white-space:pre-wrap;padding:16px;}</style></head><body>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}<script>window.onload=()=>window.print();</script></body></html>`
      );
      printWindow.document.close();
      onToast?.(`Thermal 80mm receipt opened for ${receipt.number}.`);
    } catch (err: any) {
      onToast?.(err?.message || `Receipt ${receipt.number} could not be printed.`);
    } finally {
      setBusyId(null);
    }
  };

  const handleDownload = async (receipt: ReceiptRow) => {
    setBusyId(receipt.id);
    try {
      const text = await fetchReceiptText(receipt);
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${receipt.number}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      onToast?.(`Downloaded receipt ${receipt.number}.`);
    } catch (err: any) {
      onToast?.(err?.message || `Receipt ${receipt.number} could not be downloaded.`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8">
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div>
          <h2 className={`text-lg font-black tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Receipt className="w-5 h-5 text-amber-500" />
            <span>Tax Invoices & GST Receipts Repository</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Live settled bills with CGST/SGST breakup, thermal reprint and receipt download.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search invoice, table or mode..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl border text-xs bg-slate-900 border-slate-800 text-white focus:outline-none"
            />
          </div>
          <button
            onClick={() => void loadReceipts()}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:text-white disabled:opacity-50"
            title="Refresh receipts"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </span>
          <button onClick={() => void loadReceipts()} className="font-bold underline">
            Retry
          </button>
        </div>
      )}

      <div className={`rounded-2xl border overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b text-[11px] font-black uppercase tracking-wider ${
              isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Destination</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Settled</th>
                <th className="py-3 px-4 text-right">Taxable</th>
                <th className="py-3 px-4 text-right">CGST</th>
                <th className="py-3 px-4 text-right">SGST</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    Loading live receipts…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    No settled receipts match this search.
                  </td>
                </tr>
              ) : (
                filtered.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">{receipt.number}</td>
                    <td className="py-3 px-4 font-bold text-white">{receipt.table}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {receipt.mode}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{formatTime(receipt.time)}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-300">
                      ₹{receipt.subtotal.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">
                      ₹{receipt.cgst.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">
                      ₹{receipt.sgst.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-emerald-400 text-sm">
                      ₹{receipt.total.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => void handlePrint(receipt)}
                          disabled={busyId === receipt.id}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition disabled:opacity-50"
                          title="Print thermal receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => void handleDownload(receipt)}
                          disabled={busyId === receipt.id}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition disabled:opacity-50"
                          title="Download receipt text"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
