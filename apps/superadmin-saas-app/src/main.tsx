import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary, StaffLoginGate, I18nProvider } from '@spicehub/ui';
import { env } from './config/env';
import { SuperAdminDashboardApp } from './SuperAdminDashboardApp';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <I18nProvider>
          <StaffLoginGate
            apiBaseUrl={env.apiBaseUrl}
            appName="SpiceHub Platform Control Plane"
            appSubtitle="Global tenant governance, subscriptions and platform health. Superadmin access only."
            accent="blue"
            requireHotel={false}
            validatePath="/superadmin/metrics"
            demoEmail="superadmin@spicehub.com"
            demoPassword="SpiceHub@123"
          >
            <SuperAdminDashboardApp />
          </StaffLoginGate>
        </I18nProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
