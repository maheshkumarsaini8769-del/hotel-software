import React from 'react';
import ReactDOM from 'react-dom/client';
import { AdminErpShell } from './AdminErpShell';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <AdminErpShell />
    </React.StrictMode>
  );
}
