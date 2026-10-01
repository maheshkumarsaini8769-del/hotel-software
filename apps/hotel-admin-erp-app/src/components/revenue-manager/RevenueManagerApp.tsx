import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Sliders,
  DollarSign,
  Percent,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Building,
  RefreshCw,
  Sparkles,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import {
  IRevenueStrategyUI,
  IDynamicRateQuoteUI,
  RevenueManagerHelper,
  RevenueManagerStore,
} from '@spicehub/ui';

interface RevenueManagerAppProps {
  hotelId?: string;
  token?: string;
  apiUrl?: string;
}

export const RevenueManagerApp: React.FC<RevenueManagerAppProps> = ({
  hotelId = '',
  token,
  apiUrl = 'http://localhost:5000/api/v1',
}) => {
  const [store] = useState(() => new RevenueManagerStore());
  const [strategies, setStrategies] = useState<IRevenueStrategyUI[]>([]);
  const [currentQuote, setCurrentQuote] = useState<IDynamicRateQuoteUI | null>(null);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>('');
  const [simulatedOccupancy, setSimulatedOccupancy] = useState<number>(75);
  const [simulatedWeekend, setSimulatedWeekend] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isApplyingRate, setIsApplyingRate] = useState<boolean>(false);
  const [appliedSuccessNotice, setAppliedSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setStrategies([...store.getStrategies()]);
      setCurrentQuote(store.getCurrentQuote());
    });
    fetchStrategies();
    return () => unsubscribe();
  }, [hotelId]);

  const fetchStrategies = async () => {
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-hotel-id': hotelId,
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${apiUrl}/revenue-manager/strategies`, { headers });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        store.setStrategies(json.data);
        if (json.data.length > 0 && !selectedRoomTypeId) {
          const firstId = json.data[0].roomTypeId?._id || json.data[0].roomTypeId;
          setSelectedRoomTypeId(firstId);
          fetchDynamicQuote(firstId, simulatedOccupancy, simulatedWeekend);
        }
      }
    } catch (err) {
      console.error('Failed to load revenue strategies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDynamicQuote = async (
    roomTypeId: string,
    occupancy: number,
    isWeekend: boolean
  ) => {
    if (!roomTypeId) return;
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-hotel-id': hotelId,
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${apiUrl}/revenue-manager/quote-rate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          roomTypeId,
          overrideOccupancyPercent: occupancy,
          isWeekendOverride: isWeekend,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        store.setCurrentQuote(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch rate quote:', err);
    }
  };

  const handleApplyToLiveInventory = async () => {
    if (!currentQuote) return;
    setIsApplyingRate(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-hotel-id': hotelId,
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${apiUrl}/revenue-manager/apply-to-inventory`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          roomTypeId: currentQuote.roomTypeId,
          newDynamicRate: currentQuote.finalDynamicRate,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setAppliedSuccessNotice(
          `Successfully applied ₹${currentQuote.finalDynamicRate} to live inventory!`
        );
        setTimeout(() => setAppliedSuccessNotice(null), 4000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to apply rate to inventory');
    } finally {
      setIsApplyingRate(false);
    }
  };

  const activeStrategy = strategies.find(
    (s) => (s.roomTypeId?._id || s.roomTypeId) === selectedRoomTypeId
  );

  const lift = currentQuote
    ? RevenueManagerHelper.calculateYieldLift(currentQuote.basePrice, currentQuote.finalDynamicRate)
    : { liftPercent: 0, isSurge: false };

  const tierBadge = currentQuote
    ? RevenueManagerHelper.getTierBadge(currentQuote.activeTierName)
    : { label: 'DEFAULT', bg: 'transparent', text: '#94a3b8', border: '1px solid #334155' };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Hotel Revenue Manager & Dynamic Yield Engine</h1>
              <p className="text-sm text-slate-400">
                Automated ADR & RevPAR optimization driven by real-time occupancy compression
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {appliedSuccessNotice && (
            <div className="px-3.5 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 animate-pulse">
              <Check className="w-4 h-4" />
              <span>{appliedSuccessNotice}</span>
            </div>
          )}

          <button
            onClick={() => {
              if (selectedRoomTypeId) {
                fetchDynamicQuote(selectedRoomTypeId, simulatedOccupancy, simulatedWeekend);
              }
            }}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium px-4 py-2.5 rounded-xl border border-slate-700/60 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Recalculate Yield</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Dynamic Pricing Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Interactive Simulation Controls */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-2 text-base font-semibold text-slate-200 border-b border-slate-800 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <span>Real-Time Yield Simulation</span>
          </div>

          {/* Select Room Type */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Select Room Category
            </label>
            <select
              value={selectedRoomTypeId}
              onChange={(e) => {
                setSelectedRoomTypeId(e.target.value);
                fetchDynamicQuote(e.target.value, simulatedOccupancy, simulatedWeekend);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {strategies.map((s) => (
                <option key={s._id} value={s.roomTypeId?._id || s.roomTypeId}>
                  {s.roomTypeId?.name || s.strategyName} (Base: ₹{s.basePrice})
                </option>
              ))}
            </select>
          </div>

          {/* Live Occupancy Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Live Occupancy Threshold
              </label>
              <span className="text-sm font-bold text-cyan-400">{simulatedOccupancy}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={simulatedOccupancy}
              onChange={(e) => {
                const val = Number(e.target.value);
                setSimulatedOccupancy(val);
                fetchDynamicQuote(selectedRoomTypeId, val, simulatedWeekend);
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>0% (Low)</span>
              <span>40%</span>
              <span>70%</span>
              <span>85%+ (Peak Surge)</span>
            </div>
          </div>

          {/* Weekend Multiplier Switch */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-slate-200">Weekend Surge (+15%)</div>
              <div className="text-xs text-slate-400">Friday, Saturday, Sunday pricing</div>
            </div>
            <button
              onClick={() => {
                const nextVal = !simulatedWeekend;
                setSimulatedWeekend(nextVal);
                fetchDynamicQuote(selectedRoomTypeId, simulatedOccupancy, nextVal);
              }}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                simulatedWeekend ? 'bg-cyan-500 justify-end' : 'bg-slate-800 justify-start'
              }`}
            >
              <div className="w-4 h-4 bg-white rounded-full shadow-md" />
            </button>
          </div>

          {/* Strategy Constraints Summary */}
          {activeStrategy && (
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60 text-xs space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Base Rack Rate:</span>
                <span className="font-semibold text-slate-200">₹{activeStrategy.basePrice}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Safety Floor Price:</span>
                <span className="font-semibold text-emerald-400">₹{activeStrategy.minPriceFloor}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Legal Ceiling Price:</span>
                <span className="font-semibold text-rose-400">₹{activeStrategy.maxPriceCeiling}</span>
              </div>
            </div>
          )}
        </div>

        {/* Center & Right Column: Calculated Dynamic Rate Quote & Competitor Benchmark */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Calculated Quote Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/30 border border-cyan-500/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
              <div>
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-block mb-1.5"
                  style={{
                    backgroundColor: tierBadge.bg,
                    color: tierBadge.text,
                    border: tierBadge.border,
                  }}
                >
                  {tierBadge.label}
                </span>
                <h2 className="text-xl font-bold text-white">
                  {currentQuote?.roomTypeName || 'Select Room Category'}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleApplyToLiveInventory}
                  disabled={isApplyingRate || !currentQuote}
                  className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-cyan-600/25 transition-all cursor-pointer text-sm"
                >
                  {isApplyingRate ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  <span>Apply to Live Inventory</span>
                </button>
              </div>
            </div>

            {/* Big Numbers Display */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-6 items-center">
              <div>
                <div className="text-xs text-slate-400 uppercase font-semibold">Authoritative Dynamic Rate</div>
                <div className="text-4xl font-extrabold text-cyan-400 mt-1">
                  {currentQuote ? RevenueManagerHelper.formatCurrency(currentQuote.finalDynamicRate) : '₹0'}
                </div>
                <div className="text-xs text-slate-400 mt-1">Per room / night before GST</div>
              </div>

              <div>
                <div className="text-xs text-slate-400 uppercase font-semibold">Base Rack Rate vs Lift</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xl font-bold text-slate-300">
                    {currentQuote ? RevenueManagerHelper.formatCurrency(currentQuote.basePrice) : '₹0'}
                  </span>
                  <div
                    className={`flex items-center text-xs font-bold px-2 py-0.5 rounded-md ${
                      lift.isSurge ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {lift.isSurge ? <ArrowUpRight className="w-3.5 h-3.5" /> : null}
                    <span>{lift.liftPercent > 0 ? `+${lift.liftPercent}%` : `${lift.liftPercent}%`}</span>
                  </div>
                </div>
                <div className="text-xs text-slate-400 mt-1">Multiplier: {currentQuote?.surgeMultiplier}x</div>
              </div>

              <div>
                <div className="text-xs text-slate-400 uppercase font-semibold">Total with 12% GST</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">
                  {currentQuote ? RevenueManagerHelper.formatCurrency(currentQuote.totalWithGst) : '₹0'}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Tax: {currentQuote ? RevenueManagerHelper.formatCurrency(currentQuote.tax12Percent) : '₹0'}
                </div>
              </div>
            </div>

            {/* AI Yield Recommendation Banner */}
            <div className="bg-slate-950/70 border border-cyan-500/20 p-4 rounded-xl flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 leading-relaxed">
                <span className="font-semibold text-cyan-300">Yield Engine Advice: </span>
                {currentQuote?.yieldRecommendation || 'Analyzing live market compression metrics...'}
              </div>
            </div>
          </div>

          {/* Competitor Market Parity Benchmark Table */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-cyan-400" />
                <h3 className="font-semibold text-sm text-slate-200">Local Comp-Set Benchmark Parity</h3>
              </div>
              <div className="text-xs text-slate-400">
                Comp Average:{' '}
                <span className="font-semibold text-white">
                  {currentQuote?.competitorAverage
                    ? RevenueManagerHelper.formatCurrency(currentQuote.competitorAverage)
                    : 'N/A'}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Competitor Hotel</th>
                    <th className="py-2.5 px-4 font-semibold">Market Rate</th>
                    <th className="py-2.5 px-4 font-semibold">Our Dynamic Rate</th>
                    <th className="py-2.5 px-4 font-semibold">Position Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {currentQuote?.competitorComparison && currentQuote.competitorComparison.length > 0 ? (
                    currentQuote.competitorComparison.map((comp, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-medium text-white">{comp.competitorName}</td>
                        <td className="py-3 px-4 text-slate-300">
                          {RevenueManagerHelper.formatCurrency(comp.benchmarkPrice)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-cyan-400">
                          {RevenueManagerHelper.formatCurrency(currentQuote.finalDynamicRate)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-semibold ${
                              comp.priceDelta >= 0 ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {comp.priceDelta >= 0
                              ? `+₹${comp.priceDelta} (Premium)`
                              : `-₹${Math.abs(comp.priceDelta)} (Competitive)`}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-500">
                        No competitor benchmarks registered for this category yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
