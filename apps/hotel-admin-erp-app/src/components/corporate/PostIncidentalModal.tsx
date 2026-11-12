import React, { useState } from 'react';
import {
  IGroupBookingUI,
  IPostIncidentalPayload,
  SplitBillingPolicy, NumericInput,
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
  const inHouseRooms = group.rooms.filter((r) => r.status === 'CHECKED_IN' || (r.status as string) === 'IN_HOUSE' || (r.status as string) === 'BLOCKED');

  const [selectedRoomNumber, setSelectedRoomNumber] = useState(
    inHouseRooms[0]
      ? typeof inHouseRooms[0].allocatedRoomId === 'object' && 'roomNumber' in inHouseRooms[0].allocatedRoomId
        ? (inHouseRooms[0].allocatedRoomId as any).roomNumber
        : '101'
      : ''
  );
  const [department, setDepartment] = useState('ROOM_SERVICE');
  const [description, setDescription] = useState('');
  const [rate, setRate] = useState<number>(450);
  const [quantity, setQuantity] = useState<number>(1);
  const [taxRate, setTaxRate] = useState<number>(0.05);

  const subtotal = rate * quantity;
  const taxAmount = Math.round(subtotal * taxRate);
  const netAmount = subtotal + taxAmount;

  const willChargeCorporate = group.splitBillingPolicy === SplitBillingPolicy.MASTER_PAYS_ALL;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomNumber || !description || rate <= 0 || quantity <= 0) {
      alert('Please fill room, description, rate and quantity.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-xl overflow-hidden text-xs text-slate-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Post Incidental / Extra Charge</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {group.groupName} ({group.groupBookingCode})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-slate-600 font-medium mb-1">Target In-House Room *</label>
            <select
              required
              value={selectedRoomNumber}
              onChange={(e) => setSelectedRoomNumber(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-semibold cursor-pointer"
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
              <label className="block text-slate-600 font-medium mb-1">Department *</label>
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white cursor-pointer"
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
              <label className="block text-slate-600 font-medium mb-1">Applicable GST Rate</label>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-mono cursor-pointer"
              >
                <option value={0.05}>5% GST (Restaurant & F&B)</option>
                <option value={0.12}>12% GST (Standard Services)</option>
                <option value={0.18}>18% GST (Laundry & Assets)</option>
                <option value={0}>0% (Tax Exempt)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Item / Service Description *</label>
            <input
              type="text"
              required
              placeholder="e.g. Executive Buffet Dinner / 2x Laundry Suits"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Rate (₹) *</label>
              <NumericInput
                min="1"
                required
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Quantity *</label>
              <NumericInput
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-mono"
              />
            </div>
          </div>

          {/* Policy Split Routing Indicator */}
          <div className={`p-3.5 rounded-xl border ${willChargeCorporate ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center gap-2 font-bold">
              <span className={`w-2 h-2 rounded-full ${willChargeCorporate ? 'bg-emerald-600' : 'bg-blue-600'}`} />
              <span className={willChargeCorporate ? 'text-emerald-900' : 'text-slate-800'}>
                {willChargeCorporate
                  ? 'Policy: Will Post to Corporate Master Folio'
                  : 'Policy: Will Post to Guest Individual Room Folio'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {willChargeCorporate
                ? 'Because company policy is MASTER_PAYS_ALL, this charge is billed directly to corporate invoice.'
                : 'Because company policy covers Room Only, this charge will be paid personally by the guest at checkout.'}
            </div>
          </div>

          {/* Amount Calculation Box */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500">Subtotal: </span>
              <span className="text-slate-800 font-semibold font-mono">₹{subtotal.toLocaleString('en-IN')}</span>
              <span className="text-slate-400 ml-2">+ Tax: </span>
              <span className="text-slate-800 font-semibold font-mono">₹{taxAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 font-medium mr-1.5">Net Charge:</span>
              <span className="text-sm font-extrabold text-emerald-700 font-mono">₹{netAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedRoomNumber}
              className="btn-glass-green px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>Post Charge ₹{netAmount.toLocaleString('en-IN')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
