import React, { useState, useEffect, useCallback } from 'react';
import { KdsHeader } from './components/KdsHeader';
import { KdsStationTabs } from './components/KdsStationTabs';
import { KdsOrderCard } from './components/KdsOrderCard';
import { Kds86ManagerDrawer, Kds86DishItem } from './components/Kds86ManagerDrawer';
import { KdsStore, KdsOrderCardModel, KitchenStationModel } from '@spicehub/ui';

export interface LowStockAlertItem {
  id: string;
  ingredientName: string;
  remainingQuantity: number;
  unit: string;
  triggeredByOrder?: string;
  timestamp?: string;
}

export interface KitchenKdsAppProps {
  store: KdsStore;
  dishes86?: Kds86DishItem[];
  lowStockAlerts?: LowStockAlertItem[];
  onDismissStockAlert?: (id: string) => void;
  onStartPreparing?: (orderId: string) => Promise<void> | void;
  onMarkReady?: (orderId: string) => Promise<void> | void;
  onMarkServed?: (orderId: string) => Promise<void> | void;
  onToggleItemStatus?: (orderId: string, itemId: string) => Promise<void> | void;
  onRefresh?: () => Promise<void> | void;
  onToggleItem86?: (itemId: string, isAvailable: boolean, reason?: string) => Promise<void> | void;
  onBatchToggle86?: (itemIds: string[], isAvailable: boolean, reason?: string) => Promise<void> | void;
}

export const KitchenKdsApp: React.FC<KitchenKdsAppProps> = ({
  store,
  dishes86 = [],
  lowStockAlerts = [],
  onDismissStockAlert,
  onStartPreparing,
  onMarkReady,
  onMarkServed,
  onToggleItemStatus,
  onRefresh,
  onToggleItem86,
  onBatchToggle86,
}) => {
  const [orders, setOrders] = useState<KdsOrderCardModel[]>(store.getFilteredOrders());
  const [stations, setStations] = useState<KitchenStationModel[]>(store.getStations());
  const [selectedStationId, setSelectedStationId] = useState<string | 'ALL'>(store.getSelectedStationId());
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const [is86DrawerOpen, setIs86DrawerOpen] = useState<boolean>(false);
  const [localDishes86, setLocalDishes86] = useState<Kds86DishItem[]>(dishes86);

  useEffect(() => {
    setLocalDishes86(dishes86);
  }, [dishes86]);

  // Sync state on store update
  const syncState = useCallback(() => {
    setOrders(store.getFilteredOrders());
    setStations(store.getStations());
    setSelectedStationId(store.getSelectedStationId());
  }, [store]);

  useEffect(() => {
    const unsubscribe = store.subscribe(syncState);
    return () => unsubscribe();
  }, [store, syncState]);

  // Periodic live timer updates (every 30s)
  useEffect(() => {
    const interval = setInterval(() => {
      store.tickTimers();
    }, 30000);
    return () => clearInterval(interval);
  }, [store]);

  // Audio Chime Handler via Web Audio API
  useEffect(() => {
    if (!isSoundEnabled) {
      store.registerChimeHandler(() => {});
      return;
    }

    const audioHandler = (tones: { frequency: number; durationMs: number; type?: any }[]) => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        let currentTime = ctx.currentTime;

        tones.forEach((t) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = t.type || 'sine';
          osc.frequency.setValueAtTime(t.frequency, currentTime);

          gain.gain.setValueAtTime(0.2, currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, currentTime + t.durationMs / 1000);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(currentTime);
          osc.stop(currentTime + t.durationMs / 1000);

          currentTime += t.durationMs / 1000 + 0.05;
        });

        const totalPlaybackMs = (currentTime - ctx.currentTime) * 1000 + 300;
        setTimeout(() => {
          if (ctx.state !== 'closed') {
            ctx.close().catch(() => {});
          }
        }, totalPlaybackMs);
      } catch (err) {
        // Fallback or muted browser policies
      }
    };

    store.registerChimeHandler(audioHandler);
  }, [store, isSoundEnabled]);

  const handleSelectStation = (stationId: string | 'ALL') => {
    store.selectStation(stationId);
    setSelectedStationId(stationId);
    setOrders(store.getFilteredOrders());
  };

  const handleStartPreparing = async (orderId: string) => {
    store.markOrderPreparing(orderId);
    if (onStartPreparing) {
      await onStartPreparing(orderId);
    }
  };

  const handleMarkReady = async (orderId: string) => {
    store.markReady(orderId);
    if (onMarkReady) {
      await onMarkReady(orderId);
    }
  };

  const handleMarkServed = async (orderId: string) => {
    store.markOrderServed(orderId);
    if (onMarkServed) {
      await onMarkServed(orderId);
    }
  };

  const handleToggleItem = async (orderId: string, itemId: string) => {
    const order = store.getOrders().find((o) => o.id === orderId);
    if (!order) return;
    const item = order.items.find((i) => i.itemId === itemId || i.menuItemId === itemId);
    const newStatus = item?.itemStatus === 'READY' ? 'PREPARING' : 'READY';

    store.markItemStatus(orderId, itemId, newStatus);
    if (onToggleItemStatus) {
      await onToggleItemStatus(orderId, itemId);
    }
  };

  const activeStationObj = stations.find((s) => s.id === selectedStationId);
  const activeStationName = selectedStationId === 'ALL' ? 'All Stations' : activeStationObj?.stationName || 'Station';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans select-none overflow-x-hidden">
      {/* KDS Header Bar */}
      <KdsHeader
        activeStationName={activeStationName}
        activeOrdersCount={orders.length}
        isSoundEnabled={isSoundEnabled}
        onToggleSound={() => setIsSoundEnabled(!isSoundEnabled)}
        onRefresh={onRefresh}
        onOpen86Modal={() => setIs86DrawerOpen(true)}
        active86Count={localDishes86.filter((d) => !d.isAvailable).length}
        lowStockCount={lowStockAlerts.length}
      />

      {/* BOM Low Stock Alert Banner (Shift 53) */}
      {lowStockAlerts.length > 0 && (
        <div
          data-testid="kds-low-stock-banner"
          className="bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 border-b border-amber-500/50 px-6 py-2.5 flex items-center justify-between text-amber-200 shadow-xl select-text"
        >
          <div className="flex items-center space-x-3">
            <span className="text-2xl animate-pulse">⚠️</span>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black tracking-wider uppercase bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-mono">
                  BOM RECIPE ALERT
                </span>
                <span className="text-sm font-bold text-white">
                  LOW STOCK: {lowStockAlerts[0].ingredientName} is down to{' '}
                  <span className="text-amber-300 font-black underline">
                    {lowStockAlerts[0].remainingQuantity} {lowStockAlerts[0].unit}
                  </span>
                  !
                </span>
              </div>
              <p className="text-xs text-amber-200/80 mt-0.5">
                Triggered automatically by order {lowStockAlerts[0].triggeredByOrder ? `#${lowStockAlerts[0].triggeredByOrder}` : 'processing'}. Please replenish cold-room stock soon.
              </p>
            </div>
          </div>
          {onDismissStockAlert && (
            <button
              onClick={() => onDismissStockAlert(lowStockAlerts[0].id)}
              className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-lg text-xs font-bold transition flex items-center space-x-1"
            >
              <span>Acknowledge</span>
              <span>✓</span>
            </button>
          )}
        </div>
      )}

      {/* Station Tabs */}
      <KdsStationTabs
        stations={stations}
        selectedStationId={selectedStationId}
        onSelectStation={handleSelectStation}
        getStationCount={(stId) => store.getPendingCountForStation(stId)}
      />

      {/* Responsive Kitchen KDS Grid */}
      <main className="flex-1 p-5 overflow-y-auto">
        {orders.length === 0 ? (
          <div className="h-full py-32 flex flex-col items-center justify-center text-slate-500">
            <span className="text-6xl mb-4">🍳</span>
            <h3 className="text-xl font-bold text-slate-300">Kitchen Line Clear!</h3>
            <p className="text-sm text-slate-500 mt-1">No pending orders for {activeStationName}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
            {orders.map((order) => (
              <KdsOrderCard
                key={order.id}
                order={order}
                onStartPreparing={handleStartPreparing}
                onMarkReady={handleMarkReady}
                onMarkServed={handleMarkServed}
                onToggleItemStatus={handleToggleItem}
              />
            ))}
          </div>
        )}
      </main>

      {/* 1-Tap 86 Out-of-Stock Manager Drawer */}
      <Kds86ManagerDrawer
        isOpen={is86DrawerOpen}
        dishes={localDishes86}
        onClose={() => setIs86DrawerOpen(false)}
        onToggleItem86={async (itemId, isAvailable, reason) => {
          setLocalDishes86((prev) =>
            prev.map((d) =>
              d.id === itemId
                ? {
                    ...d,
                    isAvailable,
                    outOfStockReason: isAvailable ? undefined : reason || 'INGREDIENT_EXHAUSTED',
                    markedOutOfStockBy: isAvailable ? undefined : 'Chef on Duty',
                  }
                : d
            )
          );
          if (onToggleItem86) {
            await onToggleItem86(itemId, isAvailable, reason);
          }
        }}
        onBatchToggle86={async (itemIds, isAvailable, reason) => {
          setLocalDishes86((prev) =>
            prev.map((d) =>
              itemIds.includes(d.id)
                ? {
                    ...d,
                    isAvailable,
                    outOfStockReason: isAvailable ? undefined : reason || 'INGREDIENT_EXHAUSTED',
                    markedOutOfStockBy: isAvailable ? undefined : 'Chef on Duty',
                  }
                : d
            )
          );
          if (onBatchToggle86) {
            await onBatchToggle86(itemIds, isAvailable, reason);
          }
        }}
      />
    </div>
  );
};
