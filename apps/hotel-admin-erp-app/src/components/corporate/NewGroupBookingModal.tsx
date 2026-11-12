import React, { useState } from 'react';
import {
  SplitBillingPolicy,
  INewGroupBookingPayload,
  CorporateHelper, NumericInput,
} from '@spicehub/ui';
import { Briefcase, Plus, Trash2 } from 'lucide-react';

interface RoomTypeOption {
  _id: string;
  name: string;
  code: string;
  basePriceOvernight: number;
}

interface NewGroupBookingModalProps {
  roomTypes: RoomTypeOption[];
  onClose: () => void;
  onSubmit: (payload: INewGroupBookingPayload) => Promise<void>;
  loading: boolean;
}

export const NewGroupBookingModal: React.FC<NewGroupBookingModalProps> = ({
  roomTypes,
  onClose,
  onSubmit,
  loading,
}) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 3);

  const [groupName, setGroupName] = useState('');
  const [organizerName, setOrganizerName] = useState('');
  const [organizerPhone, setOrganizerPhone] = useState('');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyGst, setCompanyGst] = useState('');
  const [checkInDate, setCheckInDate] = useState(tomorrow.toISOString().split('T')[0]);
  const [checkOutDate, setCheckOutDate] = useState(dayAfter.toISOString().split('T')[0]);
  const [splitBillingPolicy, setSplitBillingPolicy] = useState<SplitBillingPolicy>(
    SplitBillingPolicy.MASTER_PAYS_ROOM_ONLY
  );
  const [advanceDepositPaid, setAdvanceDepositPaid] = useState<number>(0);

  // Dynamic Room Entries
  const [rooms, setRooms] = useState<Array<{
    roomTypeId: string;
    primaryGuestName: string;
    primaryGuestPhone: string;
  }>>([
    {
      roomTypeId: roomTypes[0]?._id || '',
      primaryGuestName: 'Executive Guest 1',
      primaryGuestPhone: '9876543210',
    },
    {
      roomTypeId: roomTypes[0]?._id || '',
      primaryGuestName: 'Executive Guest 2',
      primaryGuestPhone: '9876543211',
    },
  ]);

  const nights = CorporateHelper.calculateNights(checkInDate, checkOutDate);

  // Calculate live estimates
  const roomTariffs = rooms.map((r) => {
    const rt = roomTypes.find((t) => t._id === r.roomTypeId);
    return rt?.basePriceOvernight || 3500;
  });

  const { totalTariff, taxRate, taxAmount, grandTotal } = CorporateHelper.calculateEstimatedCost(
    roomTariffs,
    nights
  );

  const handleAddRoomRow = () => {
    setRooms([
      ...rooms,
      {
        roomTypeId: roomTypes[0]?._id || '',
        primaryGuestName: `Guest ${rooms.length + 1}`,
        primaryGuestPhone: '987650000' + (rooms.length + 1),
      },
    ]);
  };

  const handleRemoveRoomRow = (index: number) => {
    if (rooms.length <= 1) return;
    setRooms(rooms.filter((_, i) => i !== index));
  };

  const handleRoomChange = (index: number, field: string, value: string) => {
    const updated = [...rooms];
    updated[index] = { ...updated[index], [field]: value };
    setRooms(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName || !organizerName || !organizerPhone || rooms.length === 0) {
      alert('Please fill all mandatory group details and room entries.');
      return;
    }

    await onSubmit({
      groupName,
      organizerName,
      organizerPhone,
      organizerEmail: organizerEmail || `${organizerPhone}@example.com`,
      companyName,
      companyGst,
      checkInDate,
      checkOutDate,
      splitBillingPolicy,
      advanceDepositPaid: Number(advanceDepositPaid),
      rooms,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Create Group & Corporate Booking</h2>
              <p className="text-xs text-slate-500">Block room inventory, master folio routing & split billing setup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          {/* Section 1: Group & Organizer Information */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              1. Group & Event Particulars
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Group Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Annual Conference"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Organizer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={organizerName}
                  onChange={(e) => setOrganizerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Organizer Phone *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9876543210"
                  value={organizerPhone}
                  onChange={(e) => setOrganizerPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Company Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Technologies Ltd"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Company GSTIN (For B2B Invoice)</label>
                <input
                  type="text"
                  placeholder="e.g. 27AABCA1234F1Z0"
                  value={companyGst}
                  onChange={(e) => setCompanyGst(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Organizer Email</label>
                <input
                  type="email"
                  placeholder="organizer@company.com"
                  value={organizerEmail}
                  onChange={(e) => setOrganizerEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Dates, Policy & Advance Deposit */}
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              2. Contract Dates & Folio Split Policy
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Check-In Date *</label>
                <input
                  type="date"
                  required
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Check-Out Date *</label>
                <input
                  type="date"
                  required
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Split Billing Policy *</label>
                <select
                  value={splitBillingPolicy}
                  onChange={(e) => setSplitBillingPolicy(e.target.value as SplitBillingPolicy)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white cursor-pointer"
                >
                  <option value={SplitBillingPolicy.MASTER_PAYS_ROOM_ONLY}>
                    Company Pays Room Only (Guests Pay Incidentals)
                  </option>
                  <option value={SplitBillingPolicy.MASTER_PAYS_ALL}>
                    Company Pays All (100% Sponsorship)
                  </option>
                  <option value={SplitBillingPolicy.INDIVIDUAL_SETTLEMENT}>
                    Individual Settlement (Guest Pays Everything)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Advance Deposit Paid (₹)</label>
                <NumericInput
                  min="0"
                  value={advanceDepositPaid}
                  onChange={(e) => setAdvanceDepositPaid(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Room Entries List */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                3. Room Allocation Plan ({rooms.length} Rooms Reserved)
              </h3>
              <button
                type="button"
                onClick={handleAddRoomRow}
                className="btn-glass-green-subtle px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Room Row</span>
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {rooms.map((room, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-12 gap-2 items-center"
                >
                  <div className="col-span-1 text-center font-bold text-slate-500">
                    #{idx + 1}
                  </div>
                  <div className="col-span-4">
                    <select
                      value={room.roomTypeId}
                      onChange={(e) => handleRoomChange(idx, 'roomTypeId', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {roomTypes.map((rt) => (
                        <option key={rt._id} value={rt._id}>
                          {rt.name} (₹{rt.basePriceOvernight}/night)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="Primary Guest Name"
                      value={room.primaryGuestName}
                      onChange={(e) => handleRoomChange(idx, 'primaryGuestName', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="Guest Mobile"
                      value={room.primaryGuestPhone}
                      onChange={(e) => handleRoomChange(idx, 'primaryGuestPhone', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="col-span-1 text-right">
                    <button
                      type="button"
                      disabled={rooms.length <= 1}
                      onClick={() => handleRemoveRoomRow(idx)}
                      className="text-slate-400 hover:text-rose-600 font-bold p-1 disabled:opacity-20 cursor-pointer"
                      title="Remove Room"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Live Estimated Financial Breakdown */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-slate-500 text-[11px] uppercase font-bold">Total Rooms × Nights</div>
              <div className="text-base font-bold text-slate-900 mt-0.5 font-mono">
                {rooms.length} Rooms × {nights} Nights
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-[11px] uppercase font-bold">Room Tariff Subtotal</div>
              <div className="text-base font-bold text-slate-900 mt-0.5 font-mono">
                ₹{totalTariff.toLocaleString('en-IN')}
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-[11px] uppercase font-bold">
                GST ({(taxRate * 100).toFixed(0)}%)
              </div>
              <div className="text-base font-bold text-slate-900 mt-0.5 font-mono">
                ₹{taxAmount.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="text-right">
              <div className="text-slate-500 text-[11px] uppercase font-bold">Grand Total / Due</div>
              <div className="text-lg font-extrabold text-emerald-700 mt-0.5 font-mono">
                ₹{Math.max(0, grandTotal - advanceDepositPaid).toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-slate-500">
                (Adv Paid: ₹{advanceDepositPaid.toLocaleString('en-IN')})
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-glass-green px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>Confirm & Block {rooms.length} Rooms</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
