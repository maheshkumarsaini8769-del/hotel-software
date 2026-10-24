/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_TIMEOUT_MS?: string;
  readonly VITE_SOCKET_URL?: string;
  readonly VITE_HOTEL_ID?: string;
  readonly VITE_HOTEL_NAME?: string;
  readonly VITE_ENABLE_PWA?: string;
  readonly VITE_ENABLE_DEBUG_LOGS?: string;
  readonly VITE_PORTAL_ADMIN_URL?: string;
  readonly VITE_PORTAL_CASHIER_URL?: string;
  readonly VITE_PORTAL_RECEPTION_URL?: string;
  readonly VITE_PORTAL_KDS_URL?: string;
  readonly VITE_PORTAL_WAITER_URL?: string;
  readonly VITE_PORTAL_CUSTOMER_URL?: string;
  readonly VITE_PORTAL_GUEST_URL?: string;
  readonly VITE_PORTAL_SUPERADMIN_URL?: string;
  readonly VITE_PORTAL_ADMIN?: string;
  readonly VITE_PORTAL_CASHIER?: string;
  readonly VITE_PORTAL_RECEPTION?: string;
  readonly VITE_PORTAL_KDS?: string;
  readonly VITE_PORTAL_WAITER?: string;
  readonly VITE_PORTAL_CUSTOMER?: string;
  readonly VITE_PORTAL_GUEST?: string;
  readonly VITE_PORTAL_SUPERADMIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
