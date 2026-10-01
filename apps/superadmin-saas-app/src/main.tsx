import React from 'react';
import ReactDOM from 'react-dom/client';
import { SuperAdminDashboardApp } from './SuperAdminDashboardApp';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <SuperAdminDashboardApp />
    </React.StrictMode>
  );
}
