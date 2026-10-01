import React, { useState, useEffect, useMemo } from 'react';
import { TableCard } from './TableCard';
import { TableActionDrawer } from './TableActionDrawer';
import { FloorSectionTabs } from './FloorSectionTabs';
import { FloorPlanStore } from '../../../../../packages/ui/src/floor-plan/FloorPlanStore';
import { FloorLayoutHelper } from '../../../../../packages/ui/src/floor-plan/FloorLayoutHelper';
import { LiveTableCardModel, TableActionPayload, FloorPlanFilterOptions } from '../../../../../packages/ui/src/floor-plan/types';

export interface FloorPlanViewProps {
  store: FloorPlanStore;
  onTableAction?: (action: TableActionPayload) => Promise<void> | void;
}

export const FloorPlanView: React.FC<FloorPlanViewProps> = ({ store, onTableAction }) => {
  const [tables, setTables] = useState<LiveTableCardModel[]>(store.getFilteredTables());
  const [selectedTable, setSelectedTable] = useState<LiveTableCardModel | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<FloorPlanFilterOptions>(store.getFilters());

  useEffect(() => {
    const unsubscribe = store.subscribe((updated) => {
      setTables([...updated]);
      // Update selected table reference if open
      if (selectedTable) {
        const found = store.getTable(selectedTable.id);
        if (found) setSelectedTable({ ...found });
      }
    });
    return () => unsubscribe();
  }, [store, selectedTable]);

  const allTables = useMemo(() => store.getAllTables(), [store, tables]);

  const sections = useMemo(() => {
    const s = new Set<string>();
    for (const t of allTables) {
      if (t.section) s.add(t.section);
    }
    return Array.from(s);
  }, [allTables]);

  const stats = useMemo(() => {
    return FloorLayoutHelper.calculateSectionStats(allTables);
  }, [allTables]);

  const handleTableClick = (table: LiveTableCardModel) => {
    setSelectedTable(table);
    setDrawerOpen(true);
  };

  const handleFilterChange = (newFilters: Partial<FloorPlanFilterOptions>) => {
    store.setFilters(newFilters);
    setFilters(store.getFilters());
  };

  const handleDrawerAction = async (action: TableActionPayload) => {
    if (onTableAction) {
      await onTableAction(action);
    } else {
      // Default local store handlers
      if (action.action === 'START_SESSION') {
        store.seatTable(action.tableId, `sess_${Date.now()}`, action.guestCount);
      } else if (action.action === 'SEAT_RESERVATION') {
        store.seatTable(action.tableId, `sess_res_${Date.now()}`);
      } else if (action.action === 'BILL_REQUEST') {
        store.markBilling(action.tableId);
      } else if (action.action === 'CHANGE_STATUS') {
        if (action.newStatus) {
          store.handleTableStatusChanged({ tableId: action.tableId, status: action.newStatus });
        }
      }
    }
    setDrawerOpen(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Floor Section Tabs & Top Filters */}
      <FloorSectionTabs
        sections={sections}
        currentFilters={filters}
        onFilterChange={handleFilterChange}
        stats={stats}
      />

      {/* Tables Grid */}
      {tables.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
          <p className="text-slate-400 font-medium text-lg">No tables match the selected filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {tables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              onClick={handleTableClick}
              isSelected={selectedTable?.id === table.id}
            />
          ))}
        </div>
      )}

      {/* Action Drawer */}
      <TableActionDrawer
        table={selectedTable}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onAction={handleDrawerAction}
      />
    </div>
  );
};
