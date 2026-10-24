import React, { useState } from 'react';
import {
  IGroupBookingUI,
  IPostIncidentalPayload,
  SplitBillingPolicy,
} from '@spicehub/ui';

interface PostIncidentalModalProps {
  group: IGroupBookingUI;
  onClose: () => void;
  onSubmit: (payload: IPostIncidentalPayload) => Promise<void>;
  loading: boolean;
}

export const PostIncidentalModal: React.FC<PostIncidentalModalProps> = ({
  group,
  onClose,
  onSubmit,
  loading,
}) => {
  // Only checked-in rooms can be charged
  const inHouseRooms = group.rooms.filter((r) => r.status === 'CHECKED_IN' && r.allocatedRoomId);

  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>(
    typeof inHouseRooms[0]?.allocatedRoomId === 'object' && 'roomNumber' in inHouseRooms[0].allocatedRoomId
      ? (inHouseRooms[0].allocatedRoomId as any).roomNumber
      : ''
  );
  const [department, setDepartment] = useState('ROOM_SERVICE');
  const [description, setDescription] = useState('');
  const [rate, setRate] = useState<number>(350);
  const [quantity, setQuantity] = useState<number>(1);
  const [taxRate, setTaxRate] = useState<number>(0.05); // 5% GST for F&B

  const subtotal = rate * quantity;
  const taxAmount = Math.round(subtotal * taxRate);
  const netAmount = subtotal + taxAmount;

  // Determine policy routing preview
  const willChargeCorporate = group.splitBillingPolicy === SplitBillingPolicy.MASTER_PAYS_ALL;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomNumber || !description || rate <= 0) {
      alert('Please fill room number, charge description and valid rate.');
      return;
    }

    await onSubmit({
      roomNumber: selectedRoomNumber,
      department,
      description,
      rate: Number(rate),
      quantity: Number(quantity),
      taxRate: Number(taxRate),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#121721] border border-amber-500/30 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-xs text-zinc-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-[#0b0e14]">
          <div>
            <h2 className="text-base font-bold text-white">Post Incidental / Extra Charge</h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {group.groupName} ({group.groupBookingCode})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 text-lg"
          >
            ✕
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-zinc-400 font-medium mb-1">Target In-House Room *</label>
            <select
              required
              value={selectedRoomNumber}
              onChange={(e) => setSelectedRoomNumber(e.target.value)}
              className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-semibold"
            >
              <option value="">-- Select Room --</option>
              {inHouseRooms.map((r, idx) => {
                const roomNum =
                  typeof r.allocatedRoomId === 'object' && 'roomNumber' in r.allocatedRoomId
                    ? (r.allocatedRoomId as any).roomNumber
                    : `Room #${idx + 1}`;
                return (
                  <option key={r._id || idx} value={roomNum}>
                    Room {roomNum} ({r.primaryGuestName})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 font-medium mb-1">Department *</label>
              <select
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  if (e.target.value === 'LAUNDRY' || e.target.value === 'PAID_AMENITY') {
                    setTaxRate(0.18);
                  } else {
                    setTaxRate(0.05);
                  }
                }}
                className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              >
                <option value="ROOM_SERVICE">Room Service (F&B)</option>
                <option value="RESTAURANT_DINE">Restaurant Dine-In</option>
                <option value="LAUNDRY">Laundry Department</option>
                <option value="MINIBAR">Minibar Consumption</option>
                <option value="PAID_AMENITY">Banquet / Paid Amenity</option>
                <option value="DAMAGE">Incidental Damage Charge</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 font-medium mb-1">Applicable GST Rate</label>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
              >
                <option value={0.05}>5% GST (Restaurant & F&B)</option>
                <option value={0.12}>12% GST (Standard Services)</option>
                <option value={0.18}>18% GST (Laundry & Assets)</option>
                <option value={0}>0% (Tax Exempt)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 font-medium mb-1">Item / Service Description *</label>
            <input
              type="text"
              required
              placeholder="e.g. Executive Buffet Dinner / 2x Laundry Suits"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 font-medium mb-1">Rate (₹) *</label>
              <input
                type="number"
                min="1"
                required
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-zinc-400 font-medium mb-1">Quantity *</label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          {/* Policy Split Routing Indicator */}
          <div className={`p-3.5 rounded-xl border ${willChargeCorporate ? 'bg-emerald-950/40 border-emerald-700/50' : 'bg-amber-950/40 border-amber-700/50'}`}>
            <div className="flex items-center gap-2 font-bold">
              <span className={`w-2 h-2 rounded-full ${willChargeCorporate ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className={willChargeCorporate ? 'text-emerald-300' : 'text-amber-300'}>
                {willChargeCorporate
                  ? 'Policy: Will Post to Corporate Master Folio'
                  : 'Policy: Will Post to Guest Individual Room Folio'}
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              {willChargeCorporate
                ? 'Because company policy is MASTER_PAYS_ALL, this charge is billed directly to corporate invoice.'
                : 'Because company policy covers Room Only, this charge will be paid personally by the guest at checkout.'}
            </div>
          </div>

          {/* Amount Calculation Box */}
          <div className="bg-[#0b0e14] p-3 rounded-xl border border-zinc-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-zinc-500">Subtotal: </span>
              <span className="text-zinc-300 font-mono">₹{subtotal.toLocaleString('en-IN')}</span>
              <span className="text-zinc-500 ml-2">+ Tax: </span>
              <span className="text-zinc-300 font-mono">₹{taxAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="text-right">
              <span className="text-zinc-400 font-medium mr-1.5">Net Charge:</span>
              <span className="text-sm font-black text-amber-400 font-mono">₹{netAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedRoomNumber}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <span className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />}
              <span>Post Charge ₹{netAmount.toLocaleString('en-IN')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
