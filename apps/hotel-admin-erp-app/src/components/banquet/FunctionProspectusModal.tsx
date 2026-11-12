import React, { useState } from 'react';
import {
  IBanquetBookingUI,
  SeatingLayoutType,
  IFunctionProspectusUI,
} from '@spicehub/ui';
import { Printer, UtensilsCrossed, UserCheck, Volume2 } from 'lucide-react';

interface FunctionProspectusModalProps {
  booking: IBanquetBookingUI;
  onClose: () => void;
  onSave: (fp: Partial<IFunctionProspectusUI>) => Promise<void>;
  loading: boolean;
}

export const FunctionProspectusModal: React.FC<FunctionProspectusModalProps> = ({
  booking,
  onClose,
  onSave,
  loading,
}) => {
  const existing = (booking.functionProspectus || {}) as Partial<IFunctionProspectusUI>;

  const [seatingLayout, setSeatingLayout] = useState<SeatingLayoutType>(
    existing.seatingLayout || SeatingLayoutType.ROUND_TABLE_CLUSTERS
  );
  const [stageDimensions, setStageDimensions] = useState(existing.stageDimensions || '24ft x 12ft x 2ft elevated');
  const [audioVisualNotes, setAudioVisualNotes] = useState(
    existing.audioVisualNotes || 'JBL Array Sound, 2x Cordless Mics, Podium Mic, P3 LED Backdrop 16x9'
  );

  const [welcomeDrinksTiming, setWelcomeDrinksTiming] = useState(existing.welcomeDrinksTiming || '18:30');
  const [starterCirculationTiming, setStarterCirculationTiming] = useState(
    existing.starterCirculationTiming || '19:00'
  );
  const [mainBuffetOpenTiming, setMainBuffetOpenTiming] = useState(existing.mainBuffetOpenTiming || '20:30');
  const [dessertStationTiming, setDessertStationTiming] = useState(existing.dessertStationTiming || '21:30');

  const [specialDietaryRequirements, setSpecialDietaryRequirements] = useState(
    existing.specialDietaryRequirements || ''
  );
  const [additionalInstructions, setAdditionalInstructions] = useState(existing.additionalInstructions || '');

  const [chefSignOff, setChefSignOff] = useState(Boolean(existing.chefSignOff));
  const [banquetManagerSignOff, setBanquetManagerSignOff] = useState(
    Boolean(existing.banquetManagerSignOff)
  );
  const [electricianAvSignOff, setElectricianAvSignOff] = useState(Boolean(existing.electricianAvSignOff));

  const handlePrint = () => {
    window.print();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      seatingLayout,
      stageDimensions,
      audioVisualNotes,
      welcomeDrinksTiming,
      starterCirculationTiming,
      mainBuffetOpenTiming,
      dessertStationTiming,
      specialDietaryRequirements,
      additionalInstructions,
      chefSignOff,
      banquetManagerSignOff,
      electricianAvSignOff,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-xl overflow-hidden text-xs text-slate-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-emerald-700 font-bold">{booking.bookingCode}</span>
              <span className="text-slate-300">|</span>
              <h2 className="text-base font-bold text-slate-900">Function Prospectus (FP / BEO)</h2>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {booking.eventName} • {booking.venueName} • {booking.guaranteedPax} Pax Guaranteed
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print BEO</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-lg cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6">
          {/* Section 1: Seating Layout & Stage Setup */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              1. Venue Architecture & Seating Layout
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Seating Geometry *</label>
                <select
                  value={seatingLayout}
                  onChange={(e) => setSeatingLayout(e.target.value as SeatingLayoutType)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-semibold cursor-pointer"
                >
                  <option value={SeatingLayoutType.ROUND_TABLE_CLUSTERS}>Round Table Clusters (Banquet Setup)</option>
                  <option value={SeatingLayoutType.THEATER}>Theater Style (Rows Facing Stage)</option>
                  <option value={SeatingLayoutType.U_SHAPE}>U-Shape Executive Conference</option>
                  <option value={SeatingLayoutType.CLASSROOM}>Classroom Style with Tables</option>
                  <option value={SeatingLayoutType.COCKTAIL_STANDING}>High Cocktail Standing Tables</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Stage Dimensions & Elevation</label>
                <input
                  type="text"
                  value={stageDimensions}
                  onChange={(e) => setStageDimensions(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-600 mb-1 font-medium">Audio / Visual & Lighting Setup</label>
                <input
                  type="text"
                  value={audioVisualNotes}
                  onChange={(e) => setAudioVisualNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: F&B Service Timeline (Banqueting Bible) */}
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              2. Food & Beverage Service Milestones
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Welcome Drinks Start</label>
                <input
                  type="text"
                  value={welcomeDrinksTiming}
                  onChange={(e) => setWelcomeDrinksTiming(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Starters Circulation</label>
                <input
                  type="text"
                  value={starterCirculationTiming}
                  onChange={(e) => setStarterCirculationTiming(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Main Buffet Open</label>
                <input
                  type="text"
                  value={mainBuffetOpenTiming}
                  onChange={(e) => setMainBuffetOpenTiming(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Dessert Station Open</label>
                <input
                  type="text"
                  value={dessertStationTiming}
                  onChange={(e) => setDessertStationTiming(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-mono"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-600 mb-1 font-medium">Special Dietary Counters</label>
                <input
                  type="text"
                  value={specialDietaryRequirements}
                  onChange={(e) => setSpecialDietaryRequirements(e.target.value)}
                  placeholder="e.g. Separate Jain counter for 30 pax, Gluten-free desserts"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-600 mb-1 font-medium">Additional Service Instructions</label>
                <input
                  type="text"
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  placeholder="e.g. VIP table gets personal attendant service"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Department Sign-Offs */}
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              3. Inter-Departmental BEO Sign-Offs
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className={`p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${chefSignOff ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                <input
                  type="checkbox"
                  checked={chefSignOff}
                  onChange={(e) => setChefSignOff(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-0 border-slate-300"
                />
                <div>
                  <div className={`font-bold flex items-center gap-1.5 ${chefSignOff ? 'text-emerald-900' : 'text-slate-800'}`}>
                    <UtensilsCrossed className="w-4 h-4 text-emerald-600" />
                    <span>Executive Chef Sign-Off</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Kitchen prep & recipe plan locked</div>
                </div>
              </label>

              <label className={`p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${banquetManagerSignOff ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                <input
                  type="checkbox"
                  checked={banquetManagerSignOff}
                  onChange={(e) => setBanquetManagerSignOff(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-0 border-slate-300"
                />
                <div>
                  <div className={`font-bold flex items-center gap-1.5 ${banquetManagerSignOff ? 'text-emerald-900' : 'text-slate-800'}`}>
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>Service Captain Sign-Off</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Floor staff & cutlery layout verified</div>
                </div>
              </label>

              <label className={`p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${electricianAvSignOff ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                <input
                  type="checkbox"
                  checked={electricianAvSignOff}
                  onChange={(e) => setElectricianAvSignOff(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-0 border-slate-300"
                />
                <div>
                  <div className={`font-bold flex items-center gap-1.5 ${electricianAvSignOff ? 'text-emerald-900' : 'text-slate-800'}`}>
                    <Volume2 className="w-4 h-4 text-emerald-600" />
                    <span>Audio/Visual & Stage Sign-Off</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Sound check & lighting generator OK</div>
                </div>
              </label>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs transition-all cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-glass-green px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>Save & Issue Function Prospectus</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
