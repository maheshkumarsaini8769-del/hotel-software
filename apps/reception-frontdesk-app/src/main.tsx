import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary, StaffLoginGate } from '@spicehub/ui';
import { ReceptionStandaloneApp } from './ReceptionFrontDeskApp';
import { API_BASE_URL } from './config/api';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <StaffLoginGate
          apiBaseUrl={API_BASE_URL}
          appName="Front Desk & Reception PMS"
          appSubtitle="Room inventory, check-in/out, folio charges and guest services."
          accent="blue"
          demoEmail="admin@tajgateway.com"
          demoPassword="SpiceHub@123"
        >
          <ReceptionStandaloneApp />
        </StaffLoginGate>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
