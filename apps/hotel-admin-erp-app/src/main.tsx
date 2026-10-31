import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import { ErrorBoundary, I18nProvider } from '@spicehub/ui';
import { HotelPortalRouter } from './HotelPortalRouter';
import { API_ORIGIN, getApiAuthHeaders } from './config/api';
import './index.css';

// All axios calls use the same deployed API origin and pick up the latest
// persisted staff token / tenant context on every request.
axios.defaults.baseURL = API_ORIGIN;
axios.interceptors.request.use((config) => {
  for (const [key, value] of Object.entries(getApiAuthHeaders())) {
    config.headers.set(key, value);
  }
  return config;
});

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <I18nProvider>
          <HotelPortalRouter />
        </I18nProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
