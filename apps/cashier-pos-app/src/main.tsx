import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary, StaffLoginGate, I18nProvider, installGlobalNumericInputGuard } from '@spicehub/ui';
import { CashierStandaloneApp } from './CashierPosApp';
import { API_BASE_URL } from './config/api';

installGlobalNumericInputGuard();

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <I18nProvider>
          <StaffLoginGate
            portalId="cashier"
            apiBaseUrl={API_BASE_URL}
            appName="Express Cashier POS"
            appSubtitle="Billing, open bills, split payments and shift control for your hotel."
            accent="emerald"
            variant="heritage"
            demoEmail="sunil.cashier@spicehub.hotel"
            demoPassword="Cashier@123"
          >
            <CashierStandaloneApp />
          </StaffLoginGate>
        </I18nProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
