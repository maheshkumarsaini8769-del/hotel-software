import React, { useState } from 'react';
import {
  IBanquetBookingUI,
  SeatingLayoutType,
  IUpdateProspectusPayload,
  BanquetHelper,
} from '@spicehub/ui';

interface FunctionProspectusModalProps {
  booking: IBanquetBookingUI;
  onClose: () => void;
  onSave: (payload: IUpdateProspectusPayload) => Promise<void>;
  loading: boolean;
}

export const FunctionProspectusModal: React.FC<FunctionProspectusModalProps> = ({
  booking,
  onClose,
  onSave,
  loading,
}) => {
  const fp = booking.functionProspectus;

  const [seatingLayout, setSeatingLayout] = useState<SeatingLayoutType>(fp.seatingLayout);
  const [stageDimensions, setStageDimensions] = useState(fp.stageDimensions || '24ft x 16ft x 2ft');
  const [hasAudioVisual, setHasAudioVisual] = useState(fp.hasAudioVisual ?? true);
  const [audioVisualNotes, setAudioVisualNotes] = useState(fp.audioVisualNotes || '');

  const [foodServiceStartTime, setFoodServiceStartTime] = useState(fp.foodServiceStartTime || '19:30');
  const [foodServiceEndTime, setFoodServiceEndTime] = useState(fp.foodServiceEndTime || '23:30');
  const [welcomeDrinksTiming, setWelcomeDrinksTiming] = useState(fp.welcomeDrinksTiming || '19:00');
  const [starterCirculationTiming, setStarterCirculationTiming] = useState(fp.starterCirculationTiming || '19:30 - 21:00');
  const [mainBuffetOpenTiming, setMainBuffetOpenTiming] = useState(fp.mainBuffetOpenTiming || '21:00');
  const [dessertStationTiming, setDessertStationTiming] = useState(fp.dessertStationTiming || '21:30');
  const [specialDietaryRequirements, setSpecialDietaryRequirements] = useState(fp.specialDietaryRequirements || '');
  const [additionalInstructions, setAdditionalInstructions] = useState(fp.additionalInstructions || '');

  // Department Sign-Offs
  const [chefSignOff, setChefSignOff] = useState(fp.chefSignOff ?? false);
  const [banquetManagerSignOff, setBanquetManagerSignOff] = useState(fp.banquetManagerSignOff ?? false);
  const [electricianAvSignOff, setElectricianAvSignOff] = useState(fp.electricianAvSignOff ?? false);

  const handlePrint = () => {
    window.print();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      seatingLayout,
      stageDimensions,
      hasAudioVisual,
      audioVisualNotes,
      foodServiceStartTime,
      foodServiceEndTime,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#121721] border border-amber-500/30 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-xs text-zinc-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-[#0b0e14]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-amber-400 font-bold">{booking.bookingCode}</span>
              <span className="text-zinc-600">|</span>
              <h2 className="text-lg font-bold text-white">FUNCTION PROSPECTUS (FP / BEO)</h2>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              {booking.eventName} • {booking.venueName} • {booking.guaranteedPax} Pax Guaranteed
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs border border-zinc-700 flex items-center gap-1.5 transition-all"
            >
              <span>🖨️ Print BEO</span>
            </button>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 text-lg"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6">
          {/* Section 1: Seating Layout & Stage Setup */}
          <div>
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3">
              1. Venue Architecture & Seating Layout
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Seating Geometry *</label>
                <select
                  value={seatingLayout}
                  onChange={(e) => setSeatingLayout(e.target.value as SeatingLayoutType)}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-semibold"
                >
                  <option value={SeatingLayoutType.ROUND_TABLE_CLUSTERS}>Round Table Clusters (Banquet Setup)</option>
                  <option value={SeatingLayoutType.THEATER}>Theater Style (Rows Facing Stage)</option>
                  <option value={SeatingLayoutType.U_SHAPE}>U-Shape Executive Conference</option>
                  <option value={SeatingLayoutType.CLASSROOM}>Classroom Style with Tables</option>
                  <option value={SeatingLayoutType.COCKTAIL_STANDING}>High Cocktail Standing Tables</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Stage Dimensions & Elevation</label>
                <input
                  type="text"
                  value={stageDimensions}
                  onChange={(e) => setStageDimensions(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-zinc-400 mb-1 font-medium">Audio / Visual & Lighting Setup</label>
                <input
                  type="text"
                  value={audioVisualNotes}
                  onChange={(e) => setAudioVisualNotes(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: F&B Service Timeline (Banqueting Bible) */}
          <div className="pt-4 border-t border-zinc-800">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3">
              2. Food & Beverage Service Milestones
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Welcome Drinks Start</label>
                <input
                  type="text"
                  value={welcomeDrinksTiming}
                  onChange={(e) => setWelcomeDrinksTiming(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Starters Circulation</label>
                <input
                  type="text"
                  value={starterCirculationTiming}
                  onChange={(e) => setStarterCirculationTiming(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Main Buffet Open</label>
                <input
                  type="text"
                  value={mainBuffetOpenTiming}
                  onChange={(e) => setMainBuffetOpenTiming(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Dessert Station Open</label>
                <input
                  type="text"
                  value={dessertStationTiming}
                  onChange={(e) => setDessertStationTiming(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-zinc-400 mb-1 font-medium">Special Dietary Counters</label>
                <input
                  type="text"
                  value={specialDietaryRequirements}
                  onChange={(e) => setSpecialDietaryRequirements(e.target.value)}
                  placeholder="e.g. Separate Jain counter for 30 pax, Gluten-free desserts"
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-zinc-400 mb-1 font-medium">Additional Service Instructions</label>
                <input
                  type="text"
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  placeholder="e.g. VIP table gets personal attendant service"
                  className="w-full bg-[#0b0e14] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Department Sign-Offs */}
          <div className="pt-4 border-t border-zinc-800">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3">
              3. Inter-Departmental BEO Sign-Offs
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className={`p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${chefSignOff ? 'bg-emerald-950/40 border-emerald-600/50' : 'bg-[#0b0e14] border-zinc-800'}`}>
                <input
                  type="checkbox"
                  checked={chefSignOff}
                  onChange={(e) => setChefSignOff(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-zinc-900 border-zinc-700"
                />
                <div>
                  <div className={`font-bold ${chefSignOff ? 'text-emerald-300' : 'text-zinc-300'}`}>
                    👨‍🍳 Executive Chef Sign-Off
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">Kitchen prep & recipe plan locked</div>
                </div>
              </label>

              <label className={`p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${banquetManagerSignOff ? 'bg-emerald-950/40 border-emerald-600/50' : 'bg-[#0b0e14] border-zinc-800'}`}>
                <input
                  type="checkbox"
                  checked={banquetManagerSignOff}
                  onChange={(e) => setBanquetManagerSignOff(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-zinc-900 border-zinc-700"
                />
                <div>
                  <div className={`font-bold ${banquetManagerSignOff ? 'text-emerald-300' : 'text-zinc-300'}`}>
                    🧑‍💼 Service Captain Sign-Off
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">Floor staff & cutlery layout verified</div>
                </div>
              </label>

              <label className={`p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${electricianAvSignOff ? 'bg-emerald-950/40 border-emerald-600/50' : 'bg-[#0b0e14] border-zinc-800'}`}>
                <input
                  type="checkbox"
                  checked={electricianAvSignOff}
                  onChange={(e) => setElectricianAvSignOff(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-zinc-900 border-zinc-700"
                />
                <div>
                  <div className={`font-bold ${electricianAvSignOff ? 'text-emerald-300' : 'text-zinc-300'}`}>
                    🔊 Audio/Visual & Stage Sign-Off
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">Sound check & lighting generator OK</div>
                </div>
              </label>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs transition-all"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <span className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />}
              <span>Save & Issue Function Prospectus</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
