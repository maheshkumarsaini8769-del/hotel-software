import React, { useState } from 'react';
import {
  SplitBillingPolicy,
  INewGroupBookingPayload,
  CorporateHelper,
} from '@spicehub/ui';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#121721] border border-amber-500/30 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-[#0b0e14]">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <h2 className="text-xl font-bold text-white">Create Group & Corporate Booking</h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 text-lg"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-xs text-zinc-300">
          {/* Section 1: Group & Organizer Information */}
          <div>
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3">
              1. Group & Event Particulars
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Group Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Annual Conference"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Organizer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={organizerName}
                  onChange={(e) => setOrganizerName(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Organizer Phone *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9876543210"
                  value={organizerPhone}
                  onChange={(e) => setOrganizerPhone(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Company Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Technologies Ltd"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Company GSTIN (For B2B Invoice)</label>
                <input
                  type="text"
                  placeholder="e.g. 27AABCA1234F1Z0"
                  value={companyGst}
                  onChange={(e) => setCompanyGst(e.target.value.toUpperCase())}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Organizer Email</label>
                <input
                  type="email"
                  placeholder="organizer@company.com"
                  value={organizerEmail}
                  onChange={(e) => setOrganizerEmail(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Dates, Policy & Advance Deposit */}
          <div className="pt-4 border-t border-zinc-800">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3">
              2. Contract Dates & Folio Split Policy
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Check-In Date *</label>
                <input
                  type="date"
                  required
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Check-Out Date *</label>
                <input
                  type="date"
                  required
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Split Billing Policy *</label>
                <select
                  value={splitBillingPolicy}
                  onChange={(e) => setSplitBillingPolicy(e.target.value as SplitBillingPolicy)}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
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
                <label className="block text-zinc-400 mb-1 font-medium">Advance Deposit Paid (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={advanceDepositPaid}
                  onChange={(e) => setAdvanceDepositPaid(Number(e.target.value))}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Room Entries List */}
          <div className="pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                3. Room Allocation Plan ({rooms.length} Rooms Reserved)
              </h3>
              <button
                type="button"
                onClick={handleAddRoomRow}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-semibold text-xs border border-amber-500/30 flex items-center gap-1.5 transition-all"
              >
                + Add Room Row
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {rooms.map((room, idx) => (
                <div
                  key={idx}
                  className="bg-[#0b0e14] p-3 rounded-xl border border-zinc-800 grid grid-cols-12 gap-2 items-center"
                >
                  <div className="col-span-1 text-center font-bold text-zinc-500">
                    #{idx + 1}
                  </div>
                  <div className="col-span-4">
                    <select
                      value={room.roomTypeId}
                      onChange={(e) => handleRoomChange(idx, 'roomTypeId', e.target.value)}
                      className="w-full bg-[#121721] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-amber-500"
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
                      className="w-full bg-[#121721] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="Guest Mobile"
                      value={room.primaryGuestPhone}
                      onChange={(e) => handleRoomChange(idx, 'primaryGuestPhone', e.target.value)}
                      className="w-full bg-[#121721] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="col-span-1 text-right">
                    <button
                      type="button"
                      disabled={rooms.length <= 1}
                      onClick={() => handleRemoveRoomRow(idx)}
                      className="text-zinc-500 hover:text-rose-400 font-bold p-1 disabled:opacity-20"
                      title="Remove Room"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Live Estimated Financial Breakdown */}
          <div className="bg-[#0b0e14] p-4 rounded-xl border border-amber-500/20 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-zinc-500 text-[11px] uppercase font-bold">Total Rooms × Nights</div>
              <div className="text-base font-bold text-white mt-0.5">
                {rooms.length} Rooms × {nights} Nights
              </div>
            </div>
            <div>
              <div className="text-zinc-500 text-[11px] uppercase font-bold">Room Tariff Subtotal</div>
              <div className="text-base font-bold text-zinc-300 mt-0.5">
                ₹{totalTariff.toLocaleString('en-IN')}
              </div>
            </div>
            <div>
              <div className="text-zinc-500 text-[11px] uppercase font-bold">
                GST ({(taxRate * 100).toFixed(0)}%)
              </div>
              <div className="text-base font-bold text-zinc-300 mt-0.5">
                ₹{taxAmount.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="text-right">
              <div className="text-zinc-500 text-[11px] uppercase font-bold">Grand Total / Due</div>
              <div className="text-lg font-black text-amber-400 mt-0.5">
                ₹{Math.max(0, grandTotal - advanceDepositPaid).toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-zinc-500">
                (Adv Paid: ₹{advanceDepositPaid.toLocaleString('en-IN')})
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <span className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />}
              <span>Confirm & Block {rooms.length} Rooms</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
