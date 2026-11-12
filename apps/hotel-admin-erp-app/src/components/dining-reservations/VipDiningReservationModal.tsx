import React, { useState } from 'react';
import {
  MealPeriodUI,
  TableTypePreferenceUI,
  VIPTierUI,
  INewDiningReservationPayload, NumericInput,
} from '@spicehub/ui';
import { UtensilsCrossed, AlertTriangle, X } from 'lucide-react';

interface VipDiningReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: INewDiningReservationPayload) => Promise<void>;
  loading: boolean;
}

export const VipDiningReservationModal: React.FC<VipDiningReservationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [partySize, setPartySize] = useState<number>(2);
  const [reservationDate, setReservationDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [timeSlot, setTimeSlot] = useState('19:30');
  const [mealPeriod, setMealPeriod] = useState<MealPeriodUI>('DINNER');
  const [tableTypePreference, setTableTypePreference] = useState<TableTypePreferenceUI>('STANDARD_DINING');
  const [vipTier, setVipTier] = useState<VIPTierUI>('REGULAR');
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [specialOccasion, setSpecialOccasion] = useState('NONE');
  const [chefNotes, setChefNotes] = useState('');
  const [depositAmount, setDepositAmount] = useState<number>(0);

  if (!isOpen) return null;

  const allergenOptions = [
    { id: 'PEANUTS_TREENUTS', label: 'Peanuts / Tree Nuts' },
    { id: 'GLUTEN', label: 'Gluten / Wheat' },
    { id: 'DAIRY_LACTOSE', label: 'Dairy / Lactose' },
    { id: 'SHELLFISH_SEAFOOD', label: 'Shellfish / Crustaceans' },
    { id: 'EGGS', label: 'Eggs' },
    { id: 'SOY', label: 'Soy' },
  ];

  const handleAllergenToggle = (id: string) => {
    if (selectedAllergens.includes(id)) {
      setSelectedAllergens(selectedAllergens.filter((a) => a !== id));
    } else {
      setSelectedAllergens([...selectedAllergens, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      customerName,
      customerPhone,
      customerEmail: customerEmail.trim() || undefined,
      partySize,
      reservationDate,
      timeSlot,
      mealPeriod,
      tableTypePreference,
      vipTier,
      allergens: selectedAllergens,
      specialOccasion,
      chefNotes: chefNotes.trim() || undefined,
      depositAmount,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl p-6 shadow-xl text-slate-900 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-emerald-600" />
              New Dining Table Reservation
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Record guest booking, party size, VIP status, and critical kitchen allergen alerts.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Guest Full Name *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Rajesh Singhania"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number (WhatsApp) *
              </label>
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Party Size
              </label>
              <NumericInput
                min="1"
                max="30"
                required
                value={partySize}
                onChange={(e) => setPartySize(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 text-center focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Time Slot
              </label>
              <input
                type="time"
                required
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Meal Period
              </label>
              <select
                value={mealPeriod}
                onChange={(e) => setMealPeriod(e.target.value as MealPeriodUI)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
              >
                <option value="LUNCH">Lunch</option>
                <option value="DINNER">Dinner</option>
                <option value="HIGH_TEA">High Tea</option>
                <option value="BREAKFAST">Breakfast</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                VIP Tier
              </label>
              <select
                value={vipTier}
                onChange={(e) => setVipTier(e.target.value as VIPTierUI)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-amber-700 focus:outline-none focus:border-emerald-500 focus:bg-white"
              >
                <option value="REGULAR">Regular</option>
                <option value="SILVER">Silver</option>
                <option value="GOLD">Gold VIP</option>
                <option value="PLATINUM_VIP">Platinum VIP</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Seating Preference
              </label>
              <select
                value={tableTypePreference}
                onChange={(e) => setTableTypePreference(e.target.value as TableTypePreferenceUI)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
              >
                <option value="STANDARD_DINING">Standard Dining Floor</option>
                <option value="VIP_BOOTH">VIP Plush Booth</option>
                <option value="WINDOW_VIEW">Skyline / Window View</option>
                <option value="OUTDOOR_PATIO">Alfresco / Outdoor Patio</option>
                <option value="PRIVATE_DINING_ROOM_PDR">Private Dining Room (PDR)</option>
                <option value="CHEF_TABLE">Interactive Chef's Table</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Special Occasion
              </label>
              <select
                value={specialOccasion}
                onChange={(e) => setSpecialOccasion(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
              >
                <option value="NONE">Regular Dining</option>
                <option value="BIRTHDAY">Birthday Celebration</option>
                <option value="ANNIVERSARY">Wedding Anniversary</option>
                <option value="BUSINESS_MEETING">Business Dinner</option>
                <option value="DATE_NIGHT">Date Night</option>
                <option value="PROPOSAL">Marriage Proposal</option>
              </select>
            </div>
          </div>

          {/* Critical Allergens Checkbox Grid */}
          <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
                Critical Dietary Allergens (Direct Alert to KDS / Kitchen Station)
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {allergenOptions.map((item) => {
                const isSelected = selectedAllergens.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleAllergenToggle(item.id)}
                    className={`p-2 rounded-xl text-xs font-semibold border text-left transition-all ${
                      isSelected
                        ? 'bg-rose-100 border-rose-400 text-rose-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Chef / Kitchen Preparation Warning Note
            </label>
            <textarea
              rows={2}
              value={chefNotes}
              onChange={(e) => setChefNotes(e.target.value)}
              placeholder="e.g. Severe peanut allergy. Clean cookware & use separate prep station."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-glass-green px-5 py-2 rounded-xl text-white text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50 shadow-xs"
            >
              {loading ? 'Confirming...' : 'Confirm Reservation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
