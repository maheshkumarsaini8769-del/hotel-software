/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_PORTAL_WAITER_URL?: string;
  readonly VITE_PORTAL_CASHIER_URL?: string;
  readonly VITE_PORTAL_KDS_URL?: string;
  readonly VITE_PORTAL_RECEPTION_URL?: string;
}
