import React, { useState } from 'react';
import {
  BanquetEventType,
  BanquetTimeSlot,
  SeatingLayoutType,
  INewBanquetBookingPayload,
  BanquetHelper,
} from '@spicehub/ui';

interface NewBanquetBookingModalProps {
  onClose: () => void;
  onSubmit: (payload: INewBanquetBookingPayload) => Promise<void>;
  loading: boolean;
}

export const NewBanquetBookingModal: React.FC<NewBanquetBookingModalProps> = ({
  onClose,
  onSubmit,
  loading,
}) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 7);

  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState<BanquetEventType>(BanquetEventType.WEDDING_RECEPTION);
  const [venueName, setVenueName] = useState('Royal Kohinoor Ballroom');
  const [eventDate, setEventDate] = useState(tomorrow.toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState<BanquetTimeSlot>(BanquetTimeSlot.EVENING);
  const [guaranteedPax, setGuaranteedPax] = useState<number>(200);
  const [expectedPax, setExpectedPax] = useState<number>(250);

  const [pricingType, setPricingType] = useState<'PER_PLATE' | 'HALL_RENT_ONLY' | 'COMBO_PACKAGE'>('PER_PLATE');
  const [perPlateRate, setPerPlateRate] = useState<number>(1450);
  const [hallRentAmount, setHallRentAmount] = useState<number>(75000);
  const [decorAndAudioVisualAmount, setDecorAndAudioVisualAmount] = useState<number>(35000);
  const [advanceDepositPaid, setAdvanceDepositPaid] = useState<number>(50000);

  const [organizerName, setOrganizerName] = useState('');
  const [organizerPhone, setOrganizerPhone] = useState('');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyGst, setCompanyGst] = useState('');
  const [billingAddress, setBillingAddress] = useState('');

  const [seatingLayout, setSeatingLayout] = useState<SeatingLayoutType>(
    SeatingLayoutType.ROUND_TABLE_CLUSTERS
  );

  const { cateringSubtotal, subtotal, taxes, grandTotal } = BanquetHelper.calculateEventTotals(
    guaranteedPax,
    perPlateRate,
    hallRentAmount,
    decorAndAudioVisualAmount,
    pricingType
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName || !venueName || !eventDate || guaranteedPax <= 0 || !organizerName || !organizerPhone) {
      alert('Please fill all mandatory banquet and organizer details.');
      return;
    }

    await onSubmit({
      eventName,
      eventType,
      venueName,
      eventDate,
      timeSlot,
      guaranteedPax: Number(guaranteedPax),
      expectedPax: Number(expectedPax || guaranteedPax),
      pricingType,
      perPlateRate: Number(perPlateRate),
      hallRentAmount: Number(hallRentAmount),
      decorAndAudioVisualAmount: Number(decorAndAudioVisualAmount),
      advanceDepositPaid: Number(advanceDepositPaid),
      organizerName,
      organizerPhone,
      organizerEmail,
      companyName,
      companyGst,
      billingAddress,
      functionProspectus: {
        seatingLayout,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#121721] border border-amber-500/30 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-xs text-zinc-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-[#0b0e14]">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <h2 className="text-xl font-bold text-white">Book Banquet Hall & Event</h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 text-lg"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          {/* Section 1: Event & Venue Particulars */}
          <div>
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3">
              1. Event & Venue Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Event Name / Host *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Singhania Royal Wedding"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Event Type *</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as BanquetEventType)}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value={BanquetEventType.WEDDING_RECEPTION}>💍 Wedding & Reception</option>
                  <option value={BanquetEventType.CORPORATE_CONFERENCE}>💼 Corporate Conference</option>
                  <option value={BanquetEventType.COCKTAIL_DINNER}>🍸 Cocktail Dinner</option>
                  <option value={BanquetEventType.BIRTHDAY_ANNIVERSARY}>🎂 Birthday / Anniversary</option>
                  <option value={BanquetEventType.EXHIBITION_SEMINAR}>🏛️ Exhibition & Seminar</option>
                  <option value={BanquetEventType.SOCIAL_GATHERING}>🎉 Social Gathering</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Banquet Venue / Hall *</label>
                <select
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-semibold"
                >
                  <option value="Royal Kohinoor Ballroom">Royal Kohinoor Ballroom (Capacity: 500 Pax)</option>
                  <option value="Crystal Lawn & Poolside">Crystal Lawn & Poolside (Capacity: 800 Pax)</option>
                  <option value="Sapphire Banquet Hall">Sapphire Banquet Hall (Capacity: 250 Pax)</option>
                  <option value="Orchid Executive Conference">Orchid Executive Conference (Capacity: 80 Pax)</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Event Date *</label>
                <input
                  type="date"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Time Slot *</label>
                <select
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value as BanquetTimeSlot)}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value={BanquetTimeSlot.MORNING}>Morning (09:00 AM – 03:00 PM)</option>
                  <option value={BanquetTimeSlot.EVENING}>Evening (06:00 PM – 12:00 AM)</option>
                  <option value={BanquetTimeSlot.FULL_DAY}>Full Day Pass (09:00 AM – 11:30 PM)</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Seating Setup Layout</label>
                <select
                  value={seatingLayout}
                  onChange={(e) => setSeatingLayout(e.target.value as SeatingLayoutType)}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value={SeatingLayoutType.ROUND_TABLE_CLUSTERS}>Round Table Clusters</option>
                  <option value={SeatingLayoutType.THEATER}>Theater Style (Auditorium)</option>
                  <option value={SeatingLayoutType.U_SHAPE}>U-Shape Executive</option>
                  <option value={SeatingLayoutType.CLASSROOM}>Classroom Style</option>
                  <option value={SeatingLayoutType.COCKTAIL_STANDING}>Cocktail Standing</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Catering & Pricing Structure */}
          <div className="pt-4 border-t border-zinc-800">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3">
              2. Headcount & Catering Package
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Pricing Plan *</label>
                <select
                  value={pricingType}
                  onChange={(e) => setPricingType(e.target.value as any)}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="PER_PLATE">Per-Plate Catering + Hall</option>
                  <option value="HALL_RENT_ONLY">Venue Hall Rent Only</option>
                  <option value="COMBO_PACKAGE">All-Inclusive Combo Package</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Guaranteed Pax *</label>
                <input
                  type="number"
                  min="10"
                  required
                  value={guaranteedPax}
                  onChange={(e) => setGuaranteedPax(Number(e.target.value))}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Expected Pax</label>
                <input
                  type="number"
                  min="10"
                  value={expectedPax}
                  onChange={(e) => setExpectedPax(Number(e.target.value))}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Per-Plate Rate (₹)</label>
                <input
                  type="number"
                  min="0"
                  disabled={pricingType === 'HALL_RENT_ONLY'}
                  value={perPlateRate}
                  onChange={(e) => setPerPlateRate(Number(e.target.value))}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono disabled:opacity-30"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Hall Base Rent (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={hallRentAmount}
                  onChange={(e) => setHallRentAmount(Number(e.target.value))}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Decor & Audio/Visual (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={decorAndAudioVisualAmount}
                  onChange={(e) => setDecorAndAudioVisualAmount(Number(e.target.value))}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Advance Token Paid (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={advanceDepositPaid}
                  onChange={(e) => setAdvanceDepositPaid(Number(e.target.value))}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Organizer Contact & Corporate GST */}
          <div className="pt-4 border-t border-zinc-800">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3">
              3. Organizer & Billing Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Organizer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikramaditya Kapoor"
                  value={organizerName}
                  onChange={(e) => setOrganizerName(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Organizer Phone *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9819922334"
                  value={organizerPhone}
                  onChange={(e) => setOrganizerPhone(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Organizer Email</label>
                <input
                  type="email"
                  placeholder="vikram@kapoor.example.com"
                  value={organizerEmail}
                  onChange={(e) => setOrganizerEmail(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Company Name (If B2B)</label>
                <input
                  type="text"
                  placeholder="e.g. Reliance Retail Ltd"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Company GSTIN</label>
                <input
                  type="text"
                  placeholder="e.g. 27AAACR1234F1Z9"
                  value={companyGst}
                  onChange={(e) => setCompanyGst(e.target.value.toUpperCase())}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Billing Address</label>
                <input
                  type="text"
                  placeholder="e.g. Nariman Point, Mumbai"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Live Estimated Financials */}
          <div className="bg-[#0b0e14] p-4 rounded-xl border border-amber-500/20 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-zinc-500 text-[11px] uppercase font-bold">Catering Subtotal</div>
              <div className="text-base font-bold text-zinc-200 mt-0.5 font-mono">
                ₹{cateringSubtotal.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-zinc-500">({guaranteedPax} pax × ₹{perPlateRate})</div>
            </div>

            <div>
              <div className="text-zinc-500 text-[11px] uppercase font-bold">Venue & AV Subtotal</div>
              <div className="text-base font-bold text-zinc-200 mt-0.5 font-mono">
                ₹{(hallRentAmount + decorAndAudioVisualAmount).toLocaleString('en-IN')}
              </div>
            </div>

            <div>
              <div className="text-zinc-500 text-[11px] uppercase font-bold">18% GST (Tax)</div>
              <div className="text-base font-bold text-zinc-300 mt-0.5 font-mono">
                ₹{taxes.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="text-right">
              <div className="text-zinc-500 text-[11px] uppercase font-bold">Total Estimated / Balance Due</div>
              <div className="text-lg font-black text-amber-400 mt-0.5 font-mono">
                ₹{Math.max(0, grandTotal - advanceDepositPaid).toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-zinc-500">
                (Grand Total: ₹{grandTotal.toLocaleString('en-IN')})
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
              <span>Confirm & Book Banquet Contract</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
