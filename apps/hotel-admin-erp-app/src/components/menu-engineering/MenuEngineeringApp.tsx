import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  IMenuEngineeringReportUI,
  IMenuEngineeringItemUI,
  IPriceSimulationResultUI,
  MenuEngineeringStore,
} from '@spicehub/ui';
import { MenuEngineeringHeader } from './MenuEngineeringHeader';
import { QuadrantScatterPlotCard } from './QuadrantScatterPlotCard';
import { MenuItemMatrixTable } from './MenuItemMatrixTable';
import { WhatIfPriceSimulatorModal } from './WhatIfPriceSimulatorModal';

interface MenuEngineeringAppProps {
  apiBaseUrl?: string;
  authToken?: string;
  hotelId?: string;
}

export const MenuEngineeringApp: React.FC<MenuEngineeringAppProps> = ({
  apiBaseUrl = 'http://localhost:5000/api/v1',
  authToken,
  hotelId,
}) => {
  const store = useMemo(() => new MenuEngineeringStore(), []);
  const [state, setState] = useState(store.getState());

  const [activeTab, setActiveTab] = useState<'MATRIX' | 'TABLE' | 'SIMULATOR'>('MATRIX');
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simulatorItem, setSimulatorItem] = useState<IMenuEngineeringItemUI | null>(null);

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setState(newState);
    });
    return () => unsubscribe();
  }, [store]);

  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    if (hotelId) headers['x-hotel-id'] = hotelId;
    return headers;
  }, [authToken, hotelId]);

  const fetchReports = async () => {
    store.setLoading(true);
    try {
      const res = await axios.get(`${apiBaseUrl}/menu-engineering/reports`, {
        headers: authHeaders,
      });
      if (res.data.success && res.data.reports) {
        store.setReports(res.data.reports);
      }
    } catch (err: any) {
      console.error('Error fetching menu engineering reports:', err);
      store.setError(err.response?.data?.message || err.message);
    } finally {
      store.setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerateLiveMatrix = async () => {
    store.setLoading(true);
    try {
      const res = await axios.post(
        `${apiBaseUrl}/menu-engineering/reports`,
        {
          reportTitle: `BCG Menu Matrix - ${new Date().toLocaleDateString('en-GB')}`,
        },
        { headers: authHeaders }
      );
      if (res.data.success && res.data.report) {
        store.setActiveReport(res.data.report);
        fetchReports();
      }
    } catch (err: any) {
      console.error('Error generating matrix report:', err);
      alert(err.response?.data?.message || 'Failed to generate live matrix');
    } finally {
      store.setLoading(false);
    }
  };

  const handleSimulatePrice = async (payload: any): Promise<IPriceSimulationResultUI | null> => {
    try {
      const res = await axios.post(
        `${apiBaseUrl}/menu-engineering/simulate`,
        payload,
        { headers: authHeaders }
      );
      if (res.data.success && res.data.simulation) {
        return res.data.simulation;
      }
      return null;
    } catch (err) {
      console.error('Error in simulation:', err);
      return null;
    }
  };

  const currentItems = state.activeReport?.items || [];

  return (
    <div className="min-h-screen bg-[#06080d] text-zinc-100 flex flex-col font-sans">
      {/* Header */}
      <MenuEngineeringHeader
        report={state.activeReport}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onGenerateReport={handleGenerateLiveMatrix}
        onOpenSimulator={() => {
          setSimulatorItem(currentItems.length > 0 ? currentItems[0] : null);
          setIsSimulatorOpen(true);
        }}
        loading={state.isLoading}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 p-6 space-y-6">
        {currentItems.length === 0 ? (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-12 text-center">
            <span className="text-4xl">📊</span>
            <h3 className="text-base font-bold text-white mt-3">No Menu Matrix Generated Yet</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              Click "Recalculate Live Matrix" in the top bar to analyze live sales volume, recipe portion costs, and classify all dishes into BCG quadrants.
            </p>
            <button
              type="button"
              onClick={handleGenerateLiveMatrix}
              disabled={state.isLoading}
              className="mt-4 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-900 font-bold text-xs uppercase tracking-wider transition-all"
            >
              Generate Live Matrix Now
            </button>
          </div>
        ) : (
          <>
            {/* View 1: 2x2 Scatter Plot Matrix */}
            {activeTab === 'MATRIX' && (
              <QuadrantScatterPlotCard
                items={currentItems}
                onSelectItem={(item) => store.setSelectedItem(item)}
                onSimulateItem={(item) => {
                  setSimulatorItem(item);
                  setIsSimulatorOpen(true);
                }}
              />
            )}

            {/* View 2: Detailed Table */}
            {activeTab === 'TABLE' && (
              <MenuItemMatrixTable
                items={currentItems}
                onSimulateItem={(item) => {
                  setSimulatorItem(item);
                  setIsSimulatorOpen(true);
                }}
              />
            )}

            {/* View 3: Full Page Simulator */}
            {activeTab === 'SIMULATOR' && (
              <div className="space-y-4">
                <div className="bg-purple-950/20 border border-purple-500/30 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-purple-300">
                      Menu Price Elasticity & Profit Optimization Simulator
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Select any dish from the table below to project the financial impact of price and food cost adjustments.
                    </p>
                  </div>
                </div>

                <MenuItemMatrixTable
                  items={currentItems}
                  onSimulateItem={(item) => {
                    setSimulatorItem(item);
                    setIsSimulatorOpen(true);
                  }}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Simulator Modal */}
      <WhatIfPriceSimulatorModal
        isOpen={isSimulatorOpen}
        item={simulatorItem}
        allItems={currentItems}
        onClose={() => {
          setIsSimulatorOpen(false);
          setSimulatorItem(null);
        }}
        onSimulate={handleSimulatePrice}
      />
    </div>
  );
};
