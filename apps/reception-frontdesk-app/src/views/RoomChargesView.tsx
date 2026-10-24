import React, { useCallback, useEffect, useState } from 'react';
import {
  Coffee,
  Plus,
  Printer,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { getApiClient } from '../lib/apiClient';

interface RoomChargesViewProps {
  isDark?: boolean;
  onToast?: (msg: string) => void;
}

interface ActiveStay {
  stayId?: string;
  roomNumber?: string;
  guestName?: string;
}

interface FolioLine {
  id: string;
  department: string;
  description: string;
  rate: number;
  taxAmount: number;
  netAmount: number;
  createdAt?: string;
}

interface FolioData {
  folioId: string;
  folioNumber: string;
  totalRoomTariff: number;
  totalFoodAndBeverage: number;
  totalLaundry: number;
  totalTaxes: number;
  advancePaid: number;
  paidAmount: number;
  netAmountPayable: number;
  dueAmount: number;
  folioStatus: string;
  lineItems: FolioLine[];
}

interface StayDetails {
  room: { roomNumber: string; roomTypeName?: string };
  stay: { guestName: string; guestPhone?: string; stayStatus?: string };
  folio: FolioData | null;
}

const DEPARTMENTS = [
  { value: 'ROOM_SERVICE', label: 'In-Room Dining (F&B)' },
  { value: 'MINIBAR', label: 'Mini-Bar Consumption' },
  { value: 'LAUNDRY', label: 'Laundry & Dry Cleaning' },
  { value: 'PAID_AMENITY', label: 'Spa, Extra Bed or Other Amenity' },
];

function formatDateTime(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const RoomChargesView: React.FC<RoomChargesViewProps> = ({ isDark = true, onToast }) => {
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [activeStays, setActiveStays] = useState<ActiveStay[]>([]);
  const [details, setDetails] = useState<StayDetails | null>(null);
  const [department, setDepartment] = useState<string>('ROOM_SERVICE');
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [isPosting, setIsPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStays = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getApiClient().request<{
        success: boolean;
        data: ActiveStay[];
      }>('GET', '/api/v1/pms/frontdesk/active-stays');
      const stays = (response.data || []).filter(
        (stay) => stay.roomNumber && stay.roomNumber !== 'N/A'
      );
      setActiveStays(stays);
      setSelectedRoom((current) => current || stays[0]?.roomNumber || '');
    } catch (err: any) {
      setActiveStays([]);
      setError(err?.message || 'Active in-house stays could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetails = useCallback(async (roomNumber: string) => {
    if (!roomNumber) {
      setDetails(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await getApiClient().request<{
        success: boolean;
        data: StayDetails;
      }>('GET', `/api/v1/pms/frontdesk/room-stay-details/${encodeURIComponent(roomNumber)}`);
      setDetails(response.data);
    } catch (err: any) {
      setDetails(null);
      setError(err?.message || `Folio for room ${roomNumber} could not be loaded.`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStays();
  }, [loadStays]);

  useEffect(() => {
    void loadDetails(selectedRoom);
  }, [selectedRoom, loadDetails]);

  const handlePostCharge = async (event: React.FormEvent) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!selectedRoom) {
      if (onToast) onToast('Select an occupied room before posting a charge.');
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      if (onToast) onToast('Enter a valid charge amount.');
      return;
    }
    if (!description.trim()) {
      if (onToast) onToast('Enter a charge description.');
      return;
    }

    setIsPosting(true);
    try {
      await getApiClient().request('POST', '/api/v1/pms/frontdesk/post-inroom-charge', {
        roomNumber: selectedRoom,
        department,
        description: description.trim(),
        amount: numericAmount,
      });
      setDescription('');
      setAmount('');
      if (onToast) onToast(`Posted ₹${numericAmount.toLocaleString('en-IN')} to Room ${selectedRoom} folio.`);
      await loadDetails(selectedRoom);
    } catch (err: any) {
      if (onToast) onToast(err?.message || `Charge could not be posted to Room ${selectedRoom}.`);
    } finally {
      setIsPosting(false);
    }
  };

  const printFolio = () => {
    if (!details?.folio) {
      if (onToast) onToast('No open folio is available to print for this room.');
      return;
    }
    const lines = details.folio.lineItems
      .map(
        (line) =>
          `<tr><td>${line.department}</td><td>${line.description}</td><td style="text-align:right">₹${Number(line.netAmount).toFixed(2)}</td></tr>`
      )
      .join('');
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      if (onToast) onToast('Allow pop-ups to print the folio statement.');
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>${details.folio.folioNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            h1 { font-size: 20px; margin: 0 0 4px; }
            p { margin: 2px 0; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
            th, td { border-bottom: 1px solid #ddd; padding: 8px 6px; text-align: left; }
            .totals { margin-top: 18px; margin-left: auto; width: 280px; font-size: 13px; }
            .totals div { display: flex; justify-content: space-between; padding: 3px 0; }
          </style>
        </head>
        <body>
          <h1>Folio Statement</h1>
          <p>Room ${details.room.roomNumber} • ${details.stay.guestName}</p>
          <p>Folio: ${details.folio.folioNumber} • Status: ${details.folio.folioStatus}</p>
          <table>
            <thead><tr><th>Department</th><th>Description</th><th style="text-align:right">Net</th></tr></thead>
            <tbody>${lines || '<tr><td colspan="3">No line items</td></tr>'}</tbody>
          </table>
          <div class="totals">
            <div><span>Room Tariff</span><strong>₹${Number(details.folio.totalRoomTariff).toFixed(2)}</strong></div>
            <div><span>F&amp;B</span><strong>₹${Number(details.folio.totalFoodAndBeverage).toFixed(2)}</strong></div>
            <div><span>Laundry</span><strong>₹${Number(details.folio.totalLaundry).toFixed(2)}</strong></div>
            <div><span>Taxes</span><strong>₹${Number(details.folio.totalTaxes).toFixed(2)}</strong></div>
            <div><span>Paid</span><strong>₹${Number(details.folio.paidAmount + details.folio.advancePaid).toFixed(2)}</strong></div>
            <div><span>Due</span><strong>₹${Number(details.folio.dueAmount).toFixed(2)}</strong></div>
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const folio = details?.folio;
  const items = folio?.lineItems || [];

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8">
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <h2 className={`text-lg font-black tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Coffee className="w-5 h-5 text-amber-500" />
            <span>Room Charges & In-Room Dining Billing Hub</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Post F&B, mini-bar, laundry and amenity charges directly to a live guest folio.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-bold">Select Room:</span>
          <div className="flex p-0.5 rounded-xl border border-slate-800 bg-slate-900 text-xs font-bold overflow-x-auto">
            {activeStays.length === 0 ? (
              <span className="px-3 py-1.5 text-slate-400">No occupied rooms</span>
            ) : (
              activeStays.map((stay) => (
                <button
                  key={stay.stayId || stay.roomNumber}
                  onClick={() => setSelectedRoom(stay.roomNumber || '')}
                  className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                    selectedRoom === stay.roomNumber ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Rm {stay.roomNumber}
                </button>
              ))
            )}
          </div>
          <button
            onClick={() => void loadStays()}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:text-white disabled:opacity-50"
            title="Refresh occupied rooms"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </span>
          <button onClick={() => void loadDetails(selectedRoom)} className="font-bold underline">
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4">
        <div className={`col-span-12 lg:col-span-4 p-4 rounded-2xl border space-y-4 ${
          isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h3 className={`font-black text-xs flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Plus className="w-4 h-4 text-emerald-500" />
            <span>Post New Charge {selectedRoom ? `to Room ${selectedRoom}` : ''}</span>
          </h3>

          <form onSubmit={handlePostCharge} className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Department</label>
              <select
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-900 border-slate-800 text-white focus:outline-none"
              >
                {DEPARTMENTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Item Description</label>
              <input
                type="text"
                placeholder="e.g. 2x Masala Chai + Veg Sandwich"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-900 border-slate-800 text-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Amount (₹)</label>
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="₹ Amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-900 border-slate-800 text-white focus:outline-none font-mono"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isPosting || !selectedRoom}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-black text-xs shadow-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isPosting ? 'Posting…' : 'Post Charge to Room Folio'}</span>
            </button>
          </form>
        </div>

        <div className={`col-span-12 lg:col-span-8 p-4 rounded-2xl border space-y-4 ${
          isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          {loading && !details ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-slate-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Loading live folio…
            </div>
          ) : !selectedRoom ? (
            <div className="py-16 text-center text-sm text-slate-400">
              No occupied rooms are available for in-room billing.
            </div>
          ) : !folio ? (
            <div className="py-16 text-center text-sm text-slate-400">
              No folio found for Room {selectedRoom}.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-base text-white">Room {details?.room.roomNumber} Master Folio</span>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {folio.folioNumber}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                      folio.folioStatus === 'OPEN'
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-700/40 text-slate-300 border-slate-600'
                    }`}>
                      {folio.folioStatus}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Guest: <strong className="text-white">{details?.stay.guestName}</strong>
                    {details?.stay.guestPhone ? ` • ${details.stay.guestPhone}` : ''}
                  </p>
                </div>

                <button
                  onClick={printFolio}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Folio Statement</span>
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl border border-slate-800 bg-[#191c2b]">
                  <span className="text-[10px] text-slate-400 font-bold block">Room Tariff</span>
                  <span className="text-base font-black text-white tabular-nums">₹{folio.totalRoomTariff.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 rounded-xl border border-slate-800 bg-[#191c2b]">
                  <span className="text-[10px] text-amber-400 font-bold block">F&B Total</span>
                  <span className="text-base font-black text-amber-300 tabular-nums">₹{folio.totalFoodAndBeverage.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 rounded-xl border border-slate-800 bg-[#191c2b]">
                  <span className="text-[10px] text-emerald-400 font-bold block">Grand Total</span>
                  <span className="text-base font-black text-emerald-400 tabular-nums">₹{folio.netAmountPayable.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 rounded-xl border border-rose-900/60 bg-rose-950/30">
                  <span className="text-[10px] text-rose-300 font-bold block">Due Balance</span>
                  <span className="text-base font-black text-rose-400 tabular-nums">₹{folio.dueAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-300">Itemized Posted Charges ({items.length})</h4>
                <div className="border border-slate-800/80 rounded-xl overflow-hidden divide-y divide-slate-800/80">
                  {items.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No charges posted to this folio yet.
                    </div>
                  ) : (
                    items.map((item) => (
                      <div key={item.id} className="p-2.5 flex items-center justify-between text-xs bg-[#191c2b]/60 hover:bg-[#191c2b] gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                            {item.department}
                          </span>
                          <span className="font-semibold text-white truncate">{item.description}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[10px] text-slate-400">{formatDateTime(item.createdAt)}</span>
                          <span className="font-mono font-bold text-emerald-400 tabular-nums">
                            ₹{Number(item.netAmount).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
