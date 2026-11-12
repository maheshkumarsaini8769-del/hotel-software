import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { CUSTOMER_APP_PACKAGE, buildAndroidIntentUrl } from './OpenInSpiceHubApp';

export interface CustomerDownloadAppBannerProps {
  portal?: 'table' | 'room' | 'general';
  className?: string;
}

const BANNER_DISMISSED_KEY = 'spicehub_download_banner_dismissed';

export const CustomerDownloadAppBanner: React.FC<CustomerDownloadAppBannerProps> = ({
  portal = 'table',
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isNative = Boolean((window as any)?.Capacitor?.isNativePlatform?.());
    const isDismissed = sessionStorage.getItem(BANNER_DISMISSED_KEY) === '1';
    if (!isNative && !isDismissed) {
      setIsVisible(true);
    }
  }, []);

  if (!isVisible) return null;

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(BANNER_DISMISSED_KEY, '1');
    } catch {}
    setIsVisible(false);
  };

  const handleDownloadApp = () => {
    if (typeof window === 'undefined') return;
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      const intentUrl = buildAndroidIntentUrl(window.location.href, CUSTOMER_APP_PACKAGE);
      window.location.href = intentUrl;
    } else {
      // Direct APK download link or universal app landing
      window.open('/downloads/spicehub-customer.apk', '_blank');
    }
  };

  const label =
    portal === 'room'
      ? 'SpiceHub Guest App'
      : portal === 'table'
      ? 'SpiceHub Customer App'
      : 'SpiceHub Hospitality App';

  return (
    <div
      data-testid="customer-download-app-banner"
      className={`w-full bg-[#0E2C1E] text-white border-b border-[#1E4A35] px-3 sm:px-4 py-2 flex items-center justify-between gap-2 text-xs font-medium z-50 transition-all ${className}`}
    >
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
        <div className="w-6 h-6 rounded-md bg-[#1B4B34] border border-[#2E684D] text-[#E9C98A] flex items-center justify-center font-bold text-xs shrink-0">
          S
        </div>
        <div className="min-w-0 truncate">
          <span className="font-semibold text-[#E9C98A] mr-1.5 hidden xs:inline">{label}</span>
          <span className="text-white/90 truncate">
            Get the mobile app for live kitchen tracking & instant room service
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleDownloadApp}
          className="px-3 py-1 bg-[#E9C98A] hover:bg-[#F3D59A] text-[#123C2B] font-bold text-[11px] sm:text-xs rounded-lg transition active:scale-95 shadow-xs whitespace-nowrap"
        >
          Download App
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss banner"
          className="w-6 h-6 rounded-md text-white/60 hover:text-white hover:bg-white/10 flex items-center justify-center transition cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
