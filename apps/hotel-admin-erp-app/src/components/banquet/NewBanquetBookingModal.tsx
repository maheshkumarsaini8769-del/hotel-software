import React, { useState } from 'react';
import {
  BanquetEventType,
  BanquetTimeSlot,
  SeatingLayoutType,
  INewBanquetBookingPayload,
  BanquetHelper, NumericInput,
} from '@spicehub/ui';
import { Building2 } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-xl overflow-hidden text-xs text-slate-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Book Banquet Hall & Event</h2>
              <p className="text-xs text-slate-500">Configure event schedule, catering packages & contract details</p>
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          {/* Section 1: Event & Venue Particulars */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              1. Event & Venue Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Event Name / Host *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Singhania Royal Wedding"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Event Type *</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as BanquetEventType)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white cursor-pointer"
                >
                  <option value={BanquetEventType.WEDDING_RECEPTION}>Wedding & Reception</option>
                  <option value={BanquetEventType.CORPORATE_CONFERENCE}>Corporate Conference</option>
                  <option value={BanquetEventType.COCKTAIL_DINNER}>Cocktail Dinner</option>
                  <option value={BanquetEventType.BIRTHDAY_ANNIVERSARY}>Birthday / Anniversary</option>
                  <option value={BanquetEventType.EXHIBITION_SEMINAR}>Exhibition & Seminar</option>
                  <option value={BanquetEventType.SOCIAL_GATHERING}>Social Gathering</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Banquet Venue / Hall *</label>
                <select
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-semibold cursor-pointer"
                >
                  <option value="Royal Kohinoor Ballroom">Royal Kohinoor Ballroom (Capacity: 500 Pax)</option>
                  <option value="Crystal Lawn & Poolside">Crystal Lawn & Poolside (Capacity: 800 Pax)</option>
                  <option value="Sapphire Banquet Hall">Sapphire Banquet Hall (Capacity: 250 Pax)</option>
                  <option value="Orchid Executive Conference">Orchid Executive Conference (Capacity: 80 Pax)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Event Date *</label>
                <input
                  type="date"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Time Slot *</label>
                <select
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value as BanquetTimeSlot)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white cursor-pointer"
                >
                  <option value={BanquetTimeSlot.MORNING}>Morning (09:00 AM – 03:00 PM)</option>
                  <option value={BanquetTimeSlot.EVENING}>Evening (06:00 PM – 12:00 AM)</option>
                  <option value={BanquetTimeSlot.FULL_DAY}>Full Day Pass (09:00 AM – 11:30 PM)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Seating Setup Layout</label>
                <select
                  value={seatingLayout}
                  onChange={(e) => setSeatingLayout(e.target.value as SeatingLayoutType)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white cursor-pointer"
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
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              2. Headcount & Catering Package
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Pricing Plan *</label>
                <select
                  value={pricingType}
                  onChange={(e) => setPricingType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white cursor-pointer"
                >
                  <option value="PER_PLATE">Per-Plate Catering + Hall</option>
                  <option value="HALL_RENT_ONLY">Venue Hall Rent Only</option>
                  <option value="COMBO_PACKAGE">All-Inclusive Combo Package</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Guaranteed Pax *</label>
                <NumericInput
                  min="10"
                  required
                  value={guaranteedPax}
                  onChange={(e) => setGuaranteedPax(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Expected Pax</label>
                <NumericInput
                  min="10"
                  value={expectedPax}
                  onChange={(e) => setExpectedPax(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Per-Plate Rate (₹)</label>
                <NumericInput
                  min="0"
                  disabled={pricingType === 'HALL_RENT_ONLY'}
                  value={perPlateRate}
                  onChange={(e) => setPerPlateRate(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-mono disabled:opacity-40"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Hall Base Rent (₹)</label>
                <NumericInput
                  min="0"
                  value={hallRentAmount}
                  onChange={(e) => setHallRentAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Decor & Audio/Visual (₹)</label>
                <NumericInput
                  min="0"
                  value={decorAndAudioVisualAmount}
                  onChange={(e) => setDecorAndAudioVisualAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Advance Token Paid (₹)</label>
                <NumericInput
                  min="0"
                  value={advanceDepositPaid}
                  onChange={(e) => setAdvanceDepositPaid(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Organizer Contact & Corporate GST */}
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              3. Organizer & Billing Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Organizer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikramaditya Kapoor"
                  value={organizerName}
                  onChange={(e) => setOrganizerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Organizer Phone *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9819922334"
                  value={organizerPhone}
                  onChange={(e) => setOrganizerPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Organizer Email</label>
                <input
                  type="email"
                  placeholder="vikram@kapoor.example.com"
                  value={organizerEmail}
                  onChange={(e) => setOrganizerEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Company Name (If B2B)</label>
                <input
                  type="text"
                  placeholder="e.g. Reliance Retail Ltd"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Company GSTIN</label>
                <input
                  type="text"
                  placeholder="e.g. 27AAACR1234F1Z9"
                  value={companyGst}
                  onChange={(e) => setCompanyGst(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Billing Address</label>
                <input
                  type="text"
                  placeholder="e.g. Nariman Point, Mumbai"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Live Estimated Financials */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-slate-500 text-[11px] uppercase font-bold">Catering Subtotal</div>
              <div className="text-base font-bold text-slate-900 mt-0.5 font-mono">
                ₹{cateringSubtotal.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-slate-500">({guaranteedPax} pax × ₹{perPlateRate})</div>
            </div>

            <div>
              <div className="text-slate-500 text-[11px] uppercase font-bold">Venue & AV Subtotal</div>
              <div className="text-base font-bold text-slate-900 mt-0.5 font-mono">
                ₹{(hallRentAmount + decorAndAudioVisualAmount).toLocaleString('en-IN')}
              </div>
            </div>

            <div>
              <div className="text-slate-500 text-[11px] uppercase font-bold">18% GST (Tax)</div>
              <div className="text-base font-bold text-slate-900 mt-0.5 font-mono">
                ₹{taxes.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="text-right">
              <div className="text-slate-500 text-[11px] uppercase font-bold">Total Estimated / Balance Due</div>
              <div className="text-lg font-extrabold text-emerald-700 mt-0.5 font-mono">
                ₹{Math.max(0, grandTotal - advanceDepositPaid).toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-slate-500">
                (Grand Total: ₹{grandTotal.toLocaleString('en-IN')})
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
              <span>Confirm & Book Banquet Contract</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
