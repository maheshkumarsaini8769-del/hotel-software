import React, { useEffect, useMemo } from 'react';

export const CUSTOMER_APP_PACKAGE = 'com.spicehub.customer';

export interface OpenInSpiceHubAppProps {
  /** Which guest experience the scanned QR was for — only used for the copy. */
  portal?: 'table' | 'room';
}

function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

/**
 * Android resolves `intent:` URLs through the package name, so the installed
 * app opens even while its App Links are still unverified. The path and the
 * query are preserved so the app receives the original QR payload.
 */
export function buildAndroidIntentUrl(href: string, pkg = CUSTOMER_APP_PACKAGE): string {
  const url = new URL(href);
  const query = url.search ? `?${url.searchParams.toString()}` : '';
  const fallback = encodeURIComponent(href);
  return (
    `intent://${url.host}${url.pathname}${query}` +
    `#Intent;scheme=${url.protocol.replace(':', '')};package=${pkg};` +
    `S.browser_fallback_url=${fallback};end`
  );
}

const ATTEMPT_KEY = 'spicehub_app_intent_attempted';

export const OpenInSpiceHubApp: React.FC<OpenInSpiceHubAppProps> = ({ portal = 'table' }) => {
  const intentUrl = useMemo(
    () => (typeof window === 'undefined' ? '' : buildAndroidIntentUrl(window.location.href)),
    [],
  );
  const isAndroidDevice = isAndroid();
  const copy =
    portal === 'room'
      ? 'The SpiceHub in-room guest portal opens inside the SpiceHub Customer app.'
      : 'The SpiceHub dining menu opens inside the SpiceHub Customer app.';

  useEffect(() => {
    if (!isAndroidDevice || !intentUrl) return;
    // Hand off once per tab; repeating it would fight the browser back gesture.
    let alreadyTried = false;
    try {
      alreadyTried = sessionStorage.getItem(ATTEMPT_KEY) === '1';
      sessionStorage.setItem(ATTEMPT_KEY, '1');
    } catch {}
    if (alreadyTried) return;
    window.location.href = intentUrl;
  }, [intentUrl, isAndroidDevice]);

  return (
    <main className="min-h-screen bg-[#F2F7F2] px-6 flex items-center justify-center text-center text-[#04120B]">
      <section className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-lg">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#123C2B] text-lg font-black text-white">
          S
        </div>
        <h1 className="text-xl font-bold text-[#123C2B]">Opening the SpiceHub app…</h1>
        <p className="mt-2 text-sm leading-6 text-[#5D675F]">{copy}</p>

        {isAndroidDevice ? (
          <a
            href={intentUrl}
            className="mt-5 flex w-full items-center justify-center rounded-xl bg-[#123C2B] px-4 py-3 text-sm font-bold text-white active:scale-95 transition"
          >
            Open in SpiceHub app
          </a>
        ) : null}
      </section>
    </main>
  );
};
