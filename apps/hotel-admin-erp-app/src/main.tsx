import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import { ErrorBoundary, I18nProvider, installGlobalNumericInputGuard } from '@spicehub/ui';
import { HotelPortalRouter } from './HotelPortalRouter';
import { API_BASE_URL, API_ORIGIN, getApiAuthHeaders } from './config/api';
import './index.css';

installGlobalNumericInputGuard();

// All axios calls use the same deployed API origin and pick up the latest
// persisted staff token / tenant context on every request.
axios.defaults.baseURL = API_ORIGIN;
axios.interceptors.request.use((config) => {
  for (const [key, value] of Object.entries(getApiAuthHeaders())) {
    config.headers.set(key, value);
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 403 &&
      (error.response?.data?.errorCode === 'TENANT_SUSPENDED' ||
        String(error.response?.data?.message || '').toLowerCase().includes('suspend'))
    ) {
      const msg =
        error.response.data?.message ||
        'This hotel property has been suspended by the platform administrator. Access blocked.';
      window.dispatchEvent(new CustomEvent('spicehub:logout', { detail: { message: msg } }));
    }
    return Promise.reject(error);
  }
);

const rootElement = document.getElementById('root');

function renderPortal(impersonationError?: string): void {
  if (!rootElement) return;
  if (impersonationError) {
    ReactDOM.createRoot(rootElement).render(
      <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
        <div role="alert" className="mx-auto mt-16 max-w-lg rounded-xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold">Temporary admin session unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">{impersonationError}</p>
          <button
            type="button"
            onClick={() => { window.location.href = '/'; }}
            className="mt-5 min-h-11 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Return to sign in
          </button>
        </div>
      </div>
    );
    return;
  }

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

async function bootstrapImpersonation(): Promise<void> {
  const url = new URL(window.location.href);
  const handoffCode = url.searchParams.get('impersonate');
  if (!handoffCode) {
    renderPortal();
    return;
  }

  url.searchParams.delete('impersonate');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  localStorage.removeItem('spicehub_token');
  localStorage.removeItem('token');
  localStorage.removeItem('spicehub_hotel_id');
  localStorage.removeItem('hotelId');
  localStorage.removeItem('spicehub_auth_user');
  localStorage.removeItem('auth_user');
  localStorage.removeItem('spicehub_impersonation');

  try {
    const response = await fetch(`${API_BASE_URL}/support/impersonation/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handoffCode }),
      referrerPolicy: 'no-referrer',
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.success || !result?.data?.token || !result?.data?.tenant) {
      throw new Error(result?.message || `Temporary sign-in failed (HTTP ${response.status}).`);
    }

    const { token, tenant, user, expiresAt } = result.data;
    localStorage.setItem('spicehub_token', token);
    localStorage.setItem('token', token);
    localStorage.setItem('spicehub_hotel_id', String(tenant.id));
    localStorage.setItem('hotelId', String(tenant.id));
    localStorage.setItem('spicehub_auth_user', JSON.stringify(user));
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('spicehub_impersonation', JSON.stringify({
      hotelName: tenant.name,
      expiresAt,
    }));
    renderPortal();
  } catch (error) {
    renderPortal(error instanceof Error ? error.message : 'The temporary sign-in could not be completed.');
  }
}

if (rootElement) void bootstrapImpersonation();
