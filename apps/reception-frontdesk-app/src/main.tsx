import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary, StaffLoginGate, I18nProvider } from '@spicehub/ui';
import { ReceptionStandaloneApp } from './ReceptionFrontDeskApp';
import { API_BASE_URL } from './config/api';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <I18nProvider>
          <StaffLoginGate
            portalId="reception"
            apiBaseUrl={API_BASE_URL}
            appName="Front Desk & Reception PMS"
            appSubtitle="Room inventory, check-in/out, folio charges and guest services."
            accent="blue"
            demoEmail="reception.neha@test.com"
            demoPassword="Reception@123"
          >
            <ReceptionStandaloneApp />
          </StaffLoginGate>
        </I18nProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
