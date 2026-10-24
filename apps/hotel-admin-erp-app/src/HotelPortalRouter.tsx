import React, { useState, useEffect, useCallback } from 'react';
import { StaffLoginGate, SpiceHubPortalDirectoryModal } from '@spicehub/ui';
import { AdminErpShell } from './AdminErpShell';
import { CashierStandaloneApp } from './CashierStandaloneApp';
import { ReceptionStandaloneApp } from './ReceptionStandaloneApp';
import { API_BASE_URL } from './config/api';

export type HotelPortalType = 'admin' | 'cashier' | 'reception' | 'launcher';

export const HotelPortalRouter: React.FC = () => {
  const detectPortalFromUrl = (): HotelPortalType => {
    if (typeof window === 'undefined') return 'admin';

    const path = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();

    if (
      path.includes('/launcher') ||
      path.includes('/portals') ||
      path.includes('/directory') ||
      search.includes('mode=launcher') ||
      search.includes('portal=launcher') ||
      search.includes('app=launcher')
    ) {
      return 'launcher';
    }

    if (
      path.includes('/cashier') ||
      search.includes('mode=cashier') ||
      search.includes('portal=cashier') ||
      search.includes('app=cashier')
    ) {
      return 'cashier';
    }

    if (
      path.includes('/reception') ||
      path.includes('/rooms') ||
      path.includes('/room-system') ||
      path.includes('/pms') ||
      search.includes('mode=reception') ||
      search.includes('portal=reception') ||
      search.includes('app=reception') ||
      search.includes('portal=rooms')
    ) {
      return 'reception';
    }

    return 'admin';
  };

  const [currentPortal, setCurrentPortal] = useState<HotelPortalType>(detectPortalFromUrl);

  const updateDocumentTitle = useCallback((portal: HotelPortalType) => {
    if (typeof document === 'undefined') return;
    if (portal === 'cashier') {
      document.title = 'SpiceHub | Express Cashier POS';
    } else if (portal === 'reception') {
      document.title = 'SpiceHub | Front Desk & Reception PMS';
    } else if (portal === 'launcher') {
      document.title = 'SpiceHub | Unified Portal Directory';
    } else {
      document.title = 'SpiceHub | Hotel Admin ERP Command Center';
    }
  }, []);

  const navigatePortal = useCallback((portal: HotelPortalType) => {
    setCurrentPortal(portal);
    updateDocumentTitle(portal);

    const targetUrl = portal === 'admin' ? '/' : `/${portal}`;
    try {
      window.history.pushState({ portal }, '', targetUrl);
    } catch {
      // Fallback in case of restricted history state
    }
  }, [updateDocumentTitle]);

  useEffect(() => {
    updateDocumentTitle(currentPortal);

    const onPopState = () => {
      const nextPortal = detectPortalFromUrl();
      setCurrentPortal(nextPortal);
      updateDocumentTitle(nextPortal);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [currentPortal, updateDocumentTitle]);

  if (currentPortal === 'launcher') {
    return (
      <StaffLoginGate
        apiBaseUrl={API_BASE_URL}
        appName="SpiceHub Portal Directory"
        appSubtitle="Centralized launcher for all SpiceHub operational stations and guest portals."
        accent="amber"
        demoEmail="admin@tajgateway.com"
        demoPassword="SpiceHub@123"
      >
        <div className="min-h-screen bg-[#07090e] flex flex-col items-center justify-center p-4">
          <SpiceHubPortalDirectoryModal
            isOpen={true}
            onClose={() => navigatePortal('admin')}
            currentPortalId="admin"
          />
        </div>
      </StaffLoginGate>
    );
  }

  if (currentPortal === 'cashier') {
    return (
      <StaffLoginGate
        apiBaseUrl={API_BASE_URL}
        appName="Express Cashier POS"
        appSubtitle="Billing, open bills, split payments and shift control for your hotel."
        accent="emerald"
        demoEmail="priya@tajgateway.com"
        demoPassword="SpiceHub@123"
      >
        <CashierStandaloneApp onNavigatePortal={navigatePortal} />
      </StaffLoginGate>
    );
  }

  if (currentPortal === 'reception') {
    return (
      <StaffLoginGate
        apiBaseUrl={API_BASE_URL}
        appName="Front Desk & Reception PMS"
        appSubtitle="Room inventory, check-in/out, folio charges and guest services."
        accent="blue"
        demoEmail="admin@tajgateway.com"
        demoPassword="SpiceHub@123"
      >
        <ReceptionStandaloneApp onNavigatePortal={navigatePortal} />
      </StaffLoginGate>
    );
  }

  return (
    <StaffLoginGate
      apiBaseUrl={API_BASE_URL}
      appName="Hotel Admin ERP"
      appSubtitle="Command center for hotel operations, revenue, staff and compliance."
      accent="amber"
      demoEmail="admin@tajgateway.com"
      demoPassword="SpiceHub@123"
    >
      <AdminErpShell onNavigatePortal={navigatePortal} />
    </StaffLoginGate>
  );
};
