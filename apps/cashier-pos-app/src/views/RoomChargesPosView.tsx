import React, { useCallback, useEffect, useState } from 'react';
import {
  Coffee,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { getApiClient } from '../lib/apiClient';

interface RoomChargesPosViewProps {
  isDark?: boolean;
  onToast?: (msg: string) => void;
}

interface ActiveStay {
  stayId?: string;
  roomNumber?: string;
  guestName?: string;
  balanceDue?: number;
  folioNumber?: string;
}

interface StayDetails {
  room: { roomNumber: string };
  stay: { guestName: string; stayStatus?: string };
  folio: {
    folioNumber: string;
    dueAmount: number;
    netAmountPayable: number;
    folioStatus: string;
  } | null;
}

export const RoomChargesPosView: React.FC<RoomChargesPosViewProps> = ({
  isDark = true,
  onToast,
}) => {
  const [stays, setStays] = useState<ActiveStay[]>([]);
  const [roomNum, setRoomNum] = useState('');
  const [details, setDetails] = useState<StayDetails | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStays = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getApiClient().request<{
        success: boolean;
        data: ActiveStay[];
      }>('GET', '/api/v1/pms/frontdesk/active-stays');
      const rows = (response.data || []).filter(
        (stay) => stay.roomNumber && stay.roomNumber !== 'N/A'
      );
      setStays(rows);
      setRoomNum((current) => current || rows[0]?.roomNumber || '');
    } catch (err: any) {
      setStays([]);
      setError(err?.message || 'In-house guests could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetails = useCallback(async (roomNumber: string) => {
    if (!roomNumber) {
      setDetails(null);
      return;
    }
    try {
      const response = await getApiClient().request<{
        success: boolean;
        data: StayDetails;
      }>('GET', `/api/v1/pms/frontdesk/room-stay-details/${encodeURIComponent(roomNumber)}`);
      setDetails(response.data);
    } catch (err: any) {
      setDetails(null);
      setError(err?.message || `Folio for Room ${roomNumber} could not be loaded.`);
    }
  }, []);

  useEffect(() => {
    void loadStays();
  }, [loadStays]);

  useEffect(() => {
    void loadDetails(roomNum);
  }, [roomNum, loadDetails]);

  const handlePost = async (event: React.FormEvent) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!roomNum) {
      onToast?.('Select an occupied room first.');
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      onToast?.('Enter a valid F&B bill amount.');
      return;
    }
    if (!description.trim()) {
      onToast?.('Enter the bill notes or item summary.');
      return;
    }

    setPosting(true);
    try {
      await getApiClient().request('POST', '/api/v1/pms/frontdesk/post-inroom-charge', {
        roomNumber: roomNum,
        department: 'RESTAURANT_DINE',
        description: description.trim(),
        amount: numericAmount,
      });
      setAmount('');
      setDescription('');
      onToast?.(`₹${numericAmount.toLocaleString('en-IN')} transferred to Room ${roomNum} folio.`);
      await loadDetails(roomNum);
      await loadStays();
    } catch (err: any) {
      onToast?.(err?.message || `Charge could not be transferred to Room ${roomNum}.`);
    } finally {
      setPosting(false);
    }
  };

  const selected = stays.find((stay) => stay.roomNumber === roomNum);
  const currentDue = Number(details?.folio?.dueAmount || selected?.balanceDue || 0);
  const projectedDue = currentDue + (Number(amount) || 0);

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-8">
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div>
          <h2 className={`text-lg font-black tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Coffee className="w-5 h-5 text-amber-500" />
            <span>F&B Bill Transfer to Hotel Guest Room Folio</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Charge dining or bar bills directly to a live in-house room folio without cash.
          </p>
        </div>
        <button
          onClick={() => void loadStays()}
          disabled={loading}
          className="p-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:text-white disabled:opacity-50"
          title="Refresh in-house guests"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </span>
          <button onClick={() => void loadStays()} className="font-bold underline">
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <form onSubmit={handlePost} className={`p-5 rounded-2xl border space-y-4 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h3 className="font-black text-sm text-white">Post Bill to In-House Guest</h3>

          <div>
            <label className="text-xs text-slate-400 font-bold block mb-1">Select Hotel Room</label>
            <select
              value={roomNum}
              onChange={(event) => setRoomNum(event.target.value)}
              disabled={loading || stays.length === 0}
              className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-900 border-slate-800 text-white font-bold focus:outline-none disabled:opacity-50"
            >
              {stays.length === 0 ? (
                <option value="">No occupied rooms</option>
              ) : (
                stays.map((stay) => (
                  <option key={stay.stayId || stay.roomNumber} value={stay.roomNumber}>
                    Room {stay.roomNumber} - {stay.guestName || 'In-house guest'} (Due: ₹
                    {Number(stay.balanceDue || 0).toLocaleString('en-IN')})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-bold block mb-1">F&B Bill Amount (₹)</label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-900 border-slate-800 text-white font-mono font-bold focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-bold block mb-1">Bill Notes / Items Summary</label>
            <input
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="e.g. Dine-In Dinner Bill #D1025"
              className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-900 border-slate-800 text-white focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={posting || !roomNum}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-black text-xs shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{posting ? 'Transferring…' : 'Authorize & Transfer to Room Folio'}</span>
          </button>
        </form>

        <div className={`p-5 rounded-2xl border space-y-4 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h3 className="font-black text-sm text-white">Resident Guest Folio Preview</h3>
          {!roomNum ? (
            <div className="py-10 text-center text-xs text-slate-500">
              No occupied room is available for folio transfer.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <div className="text-xs text-slate-400">Guest Name:</div>
                <div className="text-sm font-bold text-white">
                  {details?.stay.guestName || selected?.guestName || 'In-house guest'}
                </div>
                <div className="text-xs text-slate-400">Folio:</div>
                <div className="text-xs font-bold text-amber-400 font-mono">
                  {details?.folio?.folioNumber || selected?.folioNumber || '—'}
                </div>
                <div className="text-xs text-slate-400">Stay Status:</div>
                <div className="text-xs font-bold text-emerald-400">
                  {details?.stay.stayStatus || 'ACTIVE'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between items-center">
                <span className="text-xs text-slate-400 font-bold">Existing Folio Due:</span>
                <span className="text-sm font-mono font-black text-white">
                  ₹{currentDue.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex justify-between items-center">
                <span className="text-xs text-amber-300 font-bold">New Folio Due (After Post):</span>
                <span className="text-base font-mono font-black text-amber-400">
                  ₹{projectedDue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
