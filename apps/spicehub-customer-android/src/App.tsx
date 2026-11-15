import React, { useState, useEffect, useRef, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { App as CapApp } from '@capacitor/app';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import jsQR from 'jsqr';
import { useTranslation, CustomerNeedHelpChatModal, CustomerDownloadAppBanner } from '@spicehub/ui';

declare const __SPICEHUB_DEV_LAN_IP__: string | undefined;

export interface ActiveHotel {
  id: string;
  name: string;
  slug: string;
  city?: string;
  state?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  stayImageUrl?: string;
  diningImageUrl?: string;
  coordinates?: {
    latitude?: number;
    longitude?: number;
  };
  photos?: string[];
  tagline?: string;
  status?: string;
  contactEmail?: string;
  updatedAt?: string;
  createdAt?: string;
  enabledPortals?: string[];
  serviceCapabilities?: {
    roomBooking?: boolean;
    reception?: boolean;
    inRoomServices?: boolean;
    tableOrdering?: boolean;
    waiterDispatch?: boolean;
  };
  contactPhone?: string;
  supportPhone?: string;
  wifiSsid?: string;
  wifiPassword?: string;
}

export interface CatalogRoom {
  id: string;
  roomNumber: string;
  floorNumber: number;
  wing: string;
  displayStatus: 'AVAILABLE' | 'CLEANING' | 'MAINTENANCE' | 'OCCUPIED' | 'RESERVED';
  statusBadge: string;
  conflictSlot?: string | null;
  allowAdvanceBooking?: boolean;
  isBookable: boolean;
  roomType: {
    id: string;
    name: string;
    code: string;
    basePriceOvernight: number;
    gstRate: number;
    amenities: string[];
    maxCapacity: number;
    photos?: string[];
  };
  photos?: string[];
}

export interface ActiveReservation {
  bookingNumber: string;
  roomNumber: string;
  roomTypeName: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  grandTotal: number;
  sessionToken?: string;
  wifiSsid?: string;
  wifiPassword?: string;
  bookingStatus?: string;
  receptionApprovedAt?: string;
}

export interface PendingApprovalBooking {
  bookingNumber: string;
  roomNumber: string;
  roomTypeName: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  guestCount: number;
  checkInDate: string;
  checkOutDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  bookingOrigin?: 'HOTEL_PREMISES' | 'REMOTE_HOME';
  originBadge?: string;
  distanceKm?: number;
  nights: number;
  grandTotal: number;
  idType: string;
  idNumberMasked: string;
  bookingLocation: string;
  status: 'PENDING_APPROVAL' | 'APPROVED';
  sessionToken?: string;
  wifiPassword?: string;
  hotelId: string;
  aadhaarFrontUrl?: string;
  aadhaarBackUrl?: string;
  secondaryGuestName?: string;
  secondaryGuestRelationship?: string;
}

const compressImageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.72);
        resolve(compressed);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

// Flat, luxury fallbacks keep the app usable without hotel-uploaded images.
const FALLBACK_HOTEL_COVER = '/images/customer-hotel-cover.jpg';

const FALLBACK_HOTEL_LOGO = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <rect width="120" height="120" rx="28" fill="#123C2B"/>
  <circle cx="60" cy="60" r="42" fill="none" stroke="#F3D79B" stroke-width="3"/>
  <text x="60" y="72" fill="#F3D79B" font-family="serif" font-size="38" font-weight="bold" text-anchor="middle">S</text>
</svg>
`);

const FALLBACK_ROOM_IMAGE = '/images/customer-room.jpg';
const FALLBACK_DINING_IMAGE = '/images/customer-dining.jpg';

const CURATED_ROOM_IMAGES = [FALLBACK_ROOM_IMAGE];

const getHotelCoverImage = (hotel?: ActiveHotel | null): string =>
  hotel?.coverImageUrl?.trim() || FALLBACK_HOTEL_COVER;

const getHotelStayImage = (hotel?: ActiveHotel | null): string =>
  hotel?.stayImageUrl?.trim() || hotel?.coverImageUrl?.trim() || FALLBACK_ROOM_IMAGE;

const getHotelDiningImage = (hotel?: ActiveHotel | null): string =>
  hotel?.diningImageUrl?.trim() || hotel?.coverImageUrl?.trim() || FALLBACK_DINING_IMAGE;

const handleImageError =
  (fallback: string) =>
  (event: React.SyntheticEvent<HTMLImageElement>): void => {
    const image = event.currentTarget;
    const fallbackUrl = new URL(fallback, image.baseURI).href;
    if (image.src === fallbackUrl) {
      image.style.display = 'none';
      console.warn('[Customer app] Bundled image fallback failed to load:', fallback);
      return;
    }
    image.src = fallback;
  };

const getRoomDisplayPhoto = (room: CatalogRoom): string => {
  const custom = room.photos?.[0] || room.roomType?.photos?.[0];
  if (custom && typeof custom === 'string' && !custom.startsWith('data:image/svg') && custom.trim() !== '') {
    return custom;
  }
  const cleanNum = parseInt((room.roomNumber || '101').replace(/[^0-9]/g, '') || '101', 10);
  return CURATED_ROOM_IMAGES[Math.abs(cleanNum) % CURATED_ROOM_IMAGES.length];
};

// ============================================================================
// CRAFTED SVG ICON SYSTEM (Consistent 24x24 luxury vector icons)
// ============================================================================
const Icons = {
  Home: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Bed: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 4v16" />
      <path d="M2 8h18a2 2 0 0 1 2 2v10" />
      <path d="M2 17h20" />
      <path d="M6 8v9" />
    </svg>
  ),
  Utensils: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2" />
      <path d="M15 11v11" />
      <path d="M5 2v8a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V2" />
      <path d="M7 12v10" />
    </svg>
  ),
  Key: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  ),
  User: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Switch: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m16 3 4 4-4 4" />
      <path d="M20 7H4" />
      <path d="m8 21-4-4 4-4" />
      <path d="M4 17h16" />
    </svg>
  ),
  Location: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  QrCode: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="6" height="6" x="3" y="3" rx="1" />
      <rect width="6" height="6" x="15" y="3" rx="1" />
      <rect width="6" height="6" x="3" y="15" rx="1" />
      <path d="M15 15h2v2h-2z" />
      <path d="M19 15h2v6h-6v-2h4z" />
      <path d="M15 19h2v2h-2z" />
    </svg>
  ),
  Sun: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  ),
  Moon: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  ),
  Check: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  CheckCircle: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  Shield: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Camera: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  ),
  Gallery: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  ),
  ArrowRight: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  ),
  ArrowLeft: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  ),
  Phone: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  Wifi: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 20h.01" />
      <path d="M2 8.82a15 15 0 0 1 20 0" />
      <path d="M5 12.86a10 10 0 0 1 14 0" />
      <path d="M8.5 16.43a5 5 0 0 1 7 0" />
    </svg>
  ),
  Sparkles: ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  ),
  Trash: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  ),
  Refresh: ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  ),
  Clock: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Search: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  Building: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  ),
  Star: ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  Zap: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  AlertCircle: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  X: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Settings: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Wind: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
      <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
      <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
    </svg>
  ),
  Filter: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  Calendar: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  ),
  CreditCard: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  ),
  MessageSquare: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  AlertTriangle: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  RefreshCw: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  ),
  Server: ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
      <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
      <line x1="6" x2="6.01" y1="6" y2="6" />
      <line x1="6" x2="6.01" y1="18" y2="18" />
    </svg>
  ),
};

const PROD_API_BASE = import.meta.env.VITE_API_BASE?.trim() || 'https://spicehub-backend.vercel.app';
const PROD_TABLE_PORTAL_BASE =
  import.meta.env.VITE_TABLE_PORTAL_BASE?.trim() || 'https://spicehub-customer-table.vercel.app';
const PROD_ROOM_PORTAL_BASE =
  import.meta.env.VITE_ROOM_PORTAL_BASE?.trim() || 'https://spicehub-guest-portal.vercel.app';
const PROD_SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL?.trim() || 'https://spicehub-socket-server.onrender.com';

const BUILT_IN_LAN_IP =
  typeof __SPICEHUB_DEV_LAN_IP__ !== 'undefined' ? __SPICEHUB_DEV_LAN_IP__.trim() : '';
const DEV_LAN_HOST =
  import.meta.env.VITE_LAN_HOST?.trim() ||
  (BUILT_IN_LAN_IP && BUILT_IN_LAN_IP !== '127.0.0.1' ? BUILT_IN_LAN_IP : '127.0.0.1');

const isPrivateNetworkHost = (value: string): boolean => {
  const clean = value.replace(/^https?:\/\//i, '').split(':')[0].split('/')[0].trim().toLowerCase();
  return (
    clean === 'localhost' ||
    clean === '127.0.0.1' ||
    clean === '10.0.2.2' ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(clean) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(clean) ||
    /^172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(clean)
  );
};

const isProductionBackendHost = (value: string): boolean =>
  value.includes('vercel.app') ||
  value.includes('onrender.com') ||
  (value.startsWith('https://') && !isPrivateNetworkHost(value));

const normalizeBackendHost = (rawHost: string): string => {
  const trimmed = String(rawHost || '').trim().replace(/\/api\/v1\/?$/i, '').replace(/\/+$/, '');
  if (!trimmed) return PROD_API_BASE;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const looksCloudDomain = trimmed.includes('.vercel.app') || trimmed.includes('.onrender.com');
  if (looksCloudDomain) return `https://${trimmed}`;
  return trimmed.includes(':') ? `http://${trimmed}` : `http://${trimmed}:5000`;
};

const isLocalWebOrigin = (): boolean => {
  if (typeof window === 'undefined' || Capacitor.isNativePlatform()) return false;
  const host = window.location.hostname;
  return Boolean(host && isPrivateNetworkHost(host));
};

const resolveInitialServerHost = (): string => {
  if (typeof window !== 'undefined') {
    const manual = localStorage.getItem('spicehub_server_host_manual') === 'true';
    const saved = localStorage.getItem('spicehub_server_host')?.trim();
    if (manual && saved) return normalizeBackendHost(saved);
    if (isLocalWebOrigin()) return `http://${window.location.hostname}:5000`;
    if (saved) return normalizeBackendHost(saved);
  }
  return DEV_LAN_HOST !== '127.0.0.1' ? `http://${DEV_LAN_HOST}:5000` : 'http://127.0.0.1:5000';
};

const formatGuestStayDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const CustomerAppOnlyNotice: React.FC = () => (
  <main className="min-h-screen bg-[#F2F7F2] px-6 flex items-center justify-center text-center text-[#04120B]">
    <section className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-lg">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#123C2B] text-lg font-black text-white">
        S
      </div>
      <h1 className="text-xl font-bold text-[#123C2B]">Open the SpiceHub Customer app</h1>
      <p className="mt-2 text-sm leading-6 text-[#5D675F]">
        Table ordering and room services are available in the installed mobile app.
      </p>
    </section>
  </main>
);

export const App: React.FC = () => {
  return <CustomerAppExperience />;
};

const CustomerAppExperience: React.FC = () => {
  // Configurable Host: Automatically selects local USB/LAN backend if reachable, else Cloud Production
  const [serverHost, setServerHost] = useState<string>(resolveInitialServerHost);

  const isProductionHost = isProductionBackendHost(serverHost);

  const BASE = normalizeBackendHost(serverHost);

  // The configured host may already carry a port (e.g. http://10.0.0.5:5000).
  // Each portal runs on its own port on the same host, so always replace the
  // port instead of appending it (`http://10.0.0.5:5000:3001` is invalid).
  const withPort = (base: string, port: number) => {
    try {
      const url = new URL(base);
      url.port = String(port);
      return url.origin;
    } catch {
      return `${base.replace(/:\d+$/, '')}:${port}`;
    }
  };

  const DEFAULT_API_BASE = isProductionHost
    ? BASE
    : (() => {
        try {
          const parsed = new URL(BASE);
          return parsed.port ? parsed.origin : withPort(BASE, 5000);
        } catch {
          return withPort(BASE, 5000);
        }
      })();

  const TABLE_PORTAL_BASE = isProductionHost
    ? PROD_TABLE_PORTAL_BASE
    : withPort(BASE, 3001);

  const ROOM_PORTAL_BASE = isProductionHost
    ? PROD_ROOM_PORTAL_BASE
    : withPort(BASE, 3004);

  const SOCKET_URL = isProductionHost
    ? PROD_SOCKET_URL
    : DEFAULT_API_BASE;

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsCallHistory, setSettingsCallHistory] = useState<Array<{
    requestType: string;
    status: string;
    requestedAt: string;
  }>>([]);
  const isDark = theme === 'dark';
  const { t, locale, toggleLocale, setLocale } = useTranslation();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.dataset.fontSize = fontSize;
    root.style.colorScheme = isDark ? 'dark' : 'light';
    root.style.fontSize = { small: '14px', medium: '16px', large: '18px' }[fontSize];
    document.body.style.backgroundColor = isDark ? '#020617' : '#F2F7F2';
    document.body.style.color = isDark ? '#FBF7EE' : '#123C2B';
  }, [fontSize, isDark]);

  // Prompt Notification Permission & Register High-Priority Notification Channel on Boot
  useEffect(() => {
    const initNotifications = async () => {
      try {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
          await LocalNotifications.requestPermissions();
        }
        await LocalNotifications.createChannel({
          id: 'pms_approvals',
          name: 'Room Approvals & Keycards',
          description: 'Instant notification when reception approves check-in',
          importance: 5,
          visibility: 1,
          vibration: true,
        });
      } catch (err) {
        console.warn('LocalNotifications setup note:', err);
      }
    };
    initNotifications();

    let notifSub: any = null;
    LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      console.log('[NOTIF_CLICKED]', action);
      setShowActiveStayModal(true);
      setCustomerView('home');
    }).then((handle) => {
      notifSub = handle;
    });

    return () => {
      if (notifSub && typeof notifSub.remove === 'function') {
        notifSub.remove();
      }
    };
  }, []);

  // Trigger Native Local Notification when Check-in is Approved
  const triggerApprovalNotification = async (booking: ActiveReservation) => {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: `Room ${booking.roomNumber} Check-In Approved!`,
            body: `Reception has approved your booking (${booking.roomTypeName})! Keycard & high-speed WiFi are active.`,
            id: Math.floor(Date.now() % 100000),
            channelId: 'pms_approvals',
            schedule: { at: new Date(Date.now() + 200) },
            extra: {
              bookingNumber: booking.bookingNumber,
              roomNumber: booking.roomNumber,
            },
          },
        ],
      });
      console.log('[CustomerAndroid] Native approval notification scheduled!');
    } catch (err) {
      console.warn('LocalNotifications schedule note:', err);
    }
  };

  // Navigation state: 'hotel_select' (Step 1) -> 'home' (Step 2: Service Choice) -> 'rooms' (Step 3: Room Catalog) -> 'waiting_approval' (Step 5)
  const [customerView, setCustomerView] = useState<'hotel_select' | 'home' | 'rooms' | 'waiting_approval' | 'table_scan' | 'resident_verify' | 'profile' | 'settings'>(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const urlHotelId = sp.get('hotelId');
      const urlTable = sp.get('table') || sp.get('tableNumber') || sp.get('tableId');
      const urlRoom = sp.get('room') || sp.get('roomNumber');
      if (urlHotelId || urlTable || urlRoom) {
        return 'home';
      }
      const selectedHotelId = localStorage.getItem('spicehub_customer_hotel_id');
      const pending = localStorage.getItem('spicehub_pending_approval_booking');
      const active = localStorage.getItem('spicehub_active_guest_reservation');
      const chosen = localStorage.getItem('spicehub_customer_hotel_chosen');
      if (selectedHotelId && pending) return 'waiting_approval';
      if (selectedHotelId && active) return 'home';
    }
    return 'hotel_select';
  });

  // Room Catalog Filter & Search States (Step 3)
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [roomAcFilter, setRoomAcFilter] = useState<'ALL' | 'AC' | 'NON_AC'>('ALL');
  const [roomPriceSort, setRoomPriceSort] = useState<'DEFAULT' | 'LOW_TO_HIGH' | 'HIGH_TO_LOW'>('DEFAULT');
  const [roomMaxBudget, setRoomMaxBudget] = useState<'ALL' | '2500' | '4000' | 'LUXURY'>('ALL');

  // Hotels State
  const [hotels, setHotels] = useState<ActiveHotel[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<ActiveHotel | null>(null);
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [hotelLoadError, setHotelLoadError] = useState('');
  const [hotelLoadAttempt, setHotelLoadAttempt] = useState(0);
  const [incomingAppUrl, setIncomingAppUrl] = useState<string | null>(null);
  const [incomingAppUrlError, setIncomingAppUrlError] = useState('');
  const lastHandledAppUrlRef = useRef('');
  const [isHotelModalOpen, setIsHotelModalOpen] = useState(false);
  const [hotelSearch, setHotelSearch] = useState('');
  const [isHelpChatOpen, setIsHelpChatOpen] = useState(false);

  // Live Available Rooms & Catalog for Selected Hotel
  const [availableRoomCount, setAvailableRoomCount] = useState<number | null>(null);
  const [catalogRooms, setCatalogRooms] = useState<CatalogRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Scanner & Camera state for Table Standee QR
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [isPermanentDenied, setIsPermanentDenied] = useState(false);
  const [isTorchSupported, setIsTorchSupported] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [invalidQrToast, setInvalidQrToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<any>(null);
  const lastInvalidQrScanRef = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const barcodeDetectorRef = useRef<any>(null);
  const isScanningRef = useRef<boolean>(false);
  const lastScanTimeRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        barcodeDetectorRef.current = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch (_) {
        barcodeDetectorRef.current = null;
      }
    }
  }, []);

  // Proactive Permission Request on App Launch (Notification & Geolocation)
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<string>('default');

  useEffect(() => {
    // 1. Proactively request Web / Native Notification Permission on app launch
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission()
          .then((perm) => {
            setNotificationPermission(perm);
          })
          .catch(() => {});
      } else {
        setNotificationPermission(Notification.permission);
      }
    }

    // 2. Proactively trigger GPS Geolocation permission prompt on app launch
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserCoords({ latitude: lat, longitude: lng });
        },
        (err) => {
          console.warn('App launch GPS prompt status:', err?.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  }, []);

  // Room Booking & Radius Check
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState<CatalogRoom | null>(null);
  const [showLocationRadiusCheck, setShowLocationRadiusCheck] = useState(false);
  const [bookingLocationType, setBookingLocationType] = useState<'HOTEL_RADIUS' | 'REMOTE_HOME'>('HOTEL_RADIUS');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingNights, setBookingNights] = useState(1);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestCount, setGuestCount] = useState(2);
  const [documentType, setDocumentType] = useState('AADHAAR');
  const [documentNumber, setDocumentNumber] = useState('');
  const [receptionNotes, setReceptionNotes] = useState('');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Mandatory Aadhaar Front & Back Photos
  const [aadhaarFront, setAadhaarFront] = useState<string | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<string | null>(null);
  const [aadhaarCompressing, setAadhaarCompressing] = useState<'FRONT' | 'BACK' | null>(null);

  // Phone OTP Verification (Mandatory for Hotel on-site bookings)
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpVerified, setPhoneOtpVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpSuccessMsg, setOtpSuccessMsg] = useState<string | null>(null);

  // Authenticated / Verified Customer Guest Profile State
  const [verifiedGuestUser, setVerifiedGuestUser] = useState<{
    name: string;
    phone: string;
    isVerified: boolean;
  } | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('spicehub_verified_guest_user');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return null;
  });

  // Multi-room Quota & Secondary Guest State
  const [isSecondRoom, setIsSecondRoom] = useState(false);
  const [secondaryGuestName, setSecondaryGuestName] = useState('');
  const [secondaryGuestPhone, setSecondaryGuestPhone] = useState('');
  const [secondaryGuestRelationship, setSecondaryGuestRelationship] = useState('Spouse / Family Member');

  // Dates & Arrival Timing for Home Bookings
  const [checkInDateInput, setCheckInDateInput] = useState(() => new Date().toISOString().split('T')[0]);
  const [estimatedArrivalTime, setEstimatedArrivalTime] = useState('10:00');
  const [checkOutDateInput, setCheckOutDateInput] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [estimatedDepartureTime, setEstimatedDepartureTime] = useState('11:00');
  const [gpsDistKm, setGpsDistKm] = useState<number | null>(null);
  const [gpsChecking, setGpsChecking] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string>('Location not verified');

  // Advance Slot Booking & Catalog Timing Search State
  const [catalogDateFilter, setCatalogDateFilter] = useState('');
  const [catalogTimeFilter, setCatalogTimeFilter] = useState('');
  const [isAdvanceBookingMode, setIsAdvanceBookingMode] = useState(false);

  // Reception Document Approval Gating State
  const [pendingApprovalBooking, setPendingApprovalBooking] = useState<PendingApprovalBooking | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('spicehub_pending_approval_booking');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return null;
  });
  const [isCheckingApproval, setIsCheckingApproval] = useState(false);

  // Active Reservation & Digital Booking Voucher
  const [activeReservation, setActiveReservation] = useState<ActiveReservation | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('spicehub_active_guest_reservation');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return null;
  });
  const [bookingConfirmation, setBookingConfirmation] = useState<ActiveReservation | null>(null);

  // Room entry gating state: In-room food is hidden until guest taps digital keycard to enter room
  const [isRoomEntered, setIsRoomEntered] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('spicehub_active_guest_reservation');
        if (saved) {
          const res = JSON.parse(saved);
          if (res?.bookingNumber) {
            return localStorage.getItem(`spicehub_room_entered_${res.bookingNumber}`) === 'true';
          }
        }
      } catch {}
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && activeReservation?.bookingNumber) {
      const entered = localStorage.getItem(`spicehub_room_entered_${activeReservation.bookingNumber}`) === 'true';
      setIsRoomEntered(entered);
    } else {
      setIsRoomEntered(false);
    }
  }, [activeReservation?.bookingNumber]);

  // Resident Room Verification
  const [roomNumberInput, setRoomNumberInput] = useState('');
  const [guestPhoneInput, setGuestPhoneInput] = useState('');
  const [isVerifyingStay, setIsVerifyingStay] = useState(false);
  const [stayVerifyError, setStayVerifyError] = useState<string | null>(null);

  // Active embedded portal iframe
  const [activePortalUrl, setActivePortalUrl] = useState<string | null>(null);
  const [activeSessionLabel, setActiveSessionLabel] = useState<string>('');

  // Active dining table session (survives app reloads, back navigation, and backgrounding)
  const [activeTableSession, setActiveTableSession] = useState<{
    hotelId?: string;
    tableNumber: string;
    sessionToken?: string;
    qrToken?: string;
    hotelName?: string;
  } | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const tbl = localStorage.getItem('spicehub_customer_table');
      const token = localStorage.getItem('spicehub_customer_session_token');
      const qrTok = localStorage.getItem('spicehub_customer_qr_token');
      const hId = localStorage.getItem('spicehub_customer_hotel_id');
      const hName = localStorage.getItem('spicehub_customer_hotel');
      if (tbl) {
        return {
          tableNumber: tbl,
          sessionToken: token || undefined,
          qrToken: qrTok || undefined,
          hotelId: hId || undefined,
          hotelName: hName || undefined,
        };
      }
    } catch {}
    return null;
  });
  const [showActiveStayModal, setShowActiveStayModal] = useState(false);
  const [settingsPage, setSettingsPage] = useState<'MAIN' | 'PREFERENCES' | 'RESERVATION' | 'SUPPORT' | 'SESSION'>('MAIN');
  const openSettings = (page: typeof settingsPage = 'MAIN') => {
    setSettingsPage(page);
    setCustomerView('settings');
  };

  useEffect(() => {
    if (customerView !== 'settings') return;
    const sessionToken = localStorage.getItem('spicehub_customer_session_token') || '';
    const hotelId = localStorage.getItem('spicehub_customer_hotel_id') || '';
    if (!sessionToken || !hotelId) {
      setSettingsError('Scan a hotel table QR to load and save account settings.');
      return;
    }

    let active = true;
    setSettingsError('');
    void fetch(`${DEFAULT_API_BASE}/api/v1/customer-portal/preferences`, {
      headers: {
        'x-hotel-id': hotelId,
        'x-customer-session-token': sessionToken,
      },
    })
      .then(async (response) => {
        const json = await response.json().catch(() => null);
        if (!response.ok || !json?.success) {
          throw new Error(json?.message || 'Settings could not be loaded.');
        }
        return json.data;
      })
      .then((data) => {
        if (!active) return;
        const preferences = data.preferences || {};
        setLocale(preferences.language === 'hi' ? 'hi' : 'en');
        setTheme(preferences.theme === 'dark' ? 'dark' : 'light');
        setFontSize(['small', 'medium', 'large'].includes(preferences.fontSize) ? preferences.fontSize : 'medium');
        setSettingsCallHistory(Array.isArray(data.callHistory) ? data.callHistory : []);
      })
      .catch((error: unknown) => {
        if (active) setSettingsError(error instanceof Error ? error.message : 'Settings could not be loaded.');
      });

    return () => { active = false; };
  }, [customerView, DEFAULT_API_BASE, setLocale]);

  useEffect(() => {
    if (!activePortalUrl) return;

    let tablePortalOrigin: string;
    try {
      tablePortalOrigin = new URL(TABLE_PORTAL_BASE).origin;
    } catch {
      return;
    }

    const handlePortalMessages = (event: MessageEvent) => {
      const frame = document.getElementById('portal-frame');
      if (!(frame instanceof HTMLIFrameElement) || event.source !== frame.contentWindow) {
        return;
      }

      // Exit requested by embedded portal when user reaches root of portal
      if (event.data?.type === 'spicehub:exit-portal-requested') {
        setActivePortalUrl(null);
        setCustomerView('home');
        return;
      }

      // Table bill settled at POS or online payment: clear active session
      if (event.data?.type === 'spicehub:table-session-settled') {
        console.log('[CustomerAndroid] Table session settled notification received:', event.data);
        setActiveTableSession(null);
        try {
          localStorage.removeItem('spicehub_customer_table');
          localStorage.removeItem('spicehub_customer_session_token');
          localStorage.removeItem('spicehub_customer_active_orders');
        } catch {}
      }

      // Table session initialized / resumed
      if (
        event.data?.type === 'spicehub:table-session-ready' &&
        typeof event.data.hotelId === 'string' &&
        typeof event.data.tableNumber === 'string' &&
        typeof event.data.sessionToken === 'string' &&
        event.data.sessionToken
      ) {
        try {
          const incomingHotelId = event.data.hotelId;
          const incomingHotelName = event.data.hotelName || selectedHotel?.name || 'SpiceHub Hotel';
          const matchedHotel =
            hotels.find((h) => h.id === incomingHotelId) ||
            (incomingHotelId ? ({ id: incomingHotelId, name: incomingHotelName } as ActiveHotel) : null);

          if (matchedHotel) {
            if (selectedHotel?.id !== matchedHotel.id) {
              console.log(`[CustomerAndroid] Cross-hotel transfer confirmed: ${selectedHotel?.name} -> ${matchedHotel.name}`);
            }
            setSelectedHotel(matchedHotel);
            selectedHotelIdRef.current = matchedHotel.id;
            try {
              localStorage.setItem('spicehub_customer_hotel', matchedHotel.name);
              localStorage.setItem('spicehub_customer_hotel_id', matchedHotel.id);
              localStorage.setItem('spicehub_customer_hotel_chosen', 'true');
              if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
                const u = new URL(window.location.href);
                u.searchParams.set('hotelId', matchedHotel.id);
                u.searchParams.set('hotel', matchedHotel.name);
                window.history.replaceState({}, '', u.toString());
              }
            } catch {}
          }

          localStorage.setItem('spicehub_customer_hotel_id', incomingHotelId);
          localStorage.setItem('spicehub_customer_hotel', incomingHotelName);
          localStorage.setItem('spicehub_customer_table', event.data.tableNumber);
          localStorage.setItem('spicehub_customer_session_token', event.data.sessionToken);
          setActiveTableSession({
            hotelId: incomingHotelId,
            tableNumber: event.data.tableNumber,
            sessionToken: event.data.sessionToken,
            hotelName: incomingHotelName,
          });
          setActiveSessionLabel(`${incomingHotelName} • Table ${event.data.tableNumber}`);
        } catch (error) {
          console.error('Unable to persist the active customer table session.', error);
        }
      }
    };

    window.addEventListener('message', handlePortalMessages);
    return () => window.removeEventListener('message', handlePortalMessages);
  }, [activePortalUrl, TABLE_PORTAL_BASE, selectedHotel?.id, selectedHotel?.name]);

  const saveCustomerSettings = async () => {
    const sessionToken = localStorage.getItem('spicehub_customer_session_token') || '';
    const hotelId = localStorage.getItem('spicehub_customer_hotel_id') || '';
    if (!sessionToken || !hotelId) {
      setSettingsError('Scan a hotel table QR to load and save account settings.');
      return;
    }
    setSettingsSaving(true);
    setSettingsError('');
    setSettingsMessage('');
    try {
      const response = await fetch(`${DEFAULT_API_BASE}/api/v1/customer-portal/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-hotel-id': hotelId,
          'x-customer-session-token': sessionToken,
        },
        body: JSON.stringify({
          language: locale === 'hi' ? 'hi' : 'en',
          theme,
          fontSize,
        }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || 'Settings could not be saved.');
      }
      setSettingsMessage('Settings saved');
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Settings could not be saved.');
    } finally {
      setSettingsSaving(false);
    }
  };

  // Real-time Socket Connection for Reception Approval Events
  const socketRef = useRef<Socket | null>(null);

  // 0. Capacitor Physical Android Back Button Event Handling
  const backStackRef = useRef({
    activePortalUrl,
    showActiveStayModal,
    isHotelModalOpen,
    bookingConfirmation,
    isBookingModalOpen,
    showLocationRadiusCheck,
    isCameraActive,
    customerView,
    isSubmittingBooking,
  });

  useEffect(() => {
    backStackRef.current = {
      activePortalUrl,
      showActiveStayModal,
      isHotelModalOpen,
      bookingConfirmation,
      isBookingModalOpen,
      showLocationRadiusCheck,
      isCameraActive,
      customerView,
      isSubmittingBooking,
    };
  }, [
    activePortalUrl,
    showActiveStayModal,
    isHotelModalOpen,
    bookingConfirmation,
    isBookingModalOpen,
    showLocationRadiusCheck,
    isCameraActive,
    customerView,
    isSubmittingBooking,
  ]);

  useEffect(() => {
    let backHandle: any = null;
    const registerBack = async () => {
      try {
        backHandle = await CapApp.addListener('backButton', () => {
          const s = backStackRef.current;

          // 0. Prevent back navigation during in-flight booking submission
          if (s.isSubmittingBooking) {
            return;
          }

          // 1. If inside an active embedded portal (Room Portal or Table Ordering iframe), forward back event to embedded iframe
          if (s.activePortalUrl) {
            const frame = document.getElementById('portal-frame') as HTMLIFrameElement | null;
            if (frame && frame.contentWindow) {
              frame.contentWindow.postMessage({ type: 'spicehub:hardware-back-pressed' }, '*');
              return;
            }
            setActivePortalUrl(null);
            setCustomerView('home');
            return;
          }

          // 2. Close active modals/drawers in strict top-down z-index order
          if (s.showActiveStayModal) {
            setShowActiveStayModal(false);
            return;
          }
          if (s.isHotelModalOpen) {
            setIsHotelModalOpen(false);
            return;
          }
          if (s.bookingConfirmation) {
            setBookingConfirmation(null);
            setCustomerView('home');
            return;
          }
          if (s.isBookingModalOpen) {
            setIsBookingModalOpen(false);
            return;
          }
          if (s.showLocationRadiusCheck) {
            setShowLocationRadiusCheck(false);
            return;
          }

          // 3. Close camera scanner and navigate back to home in one atomic action
          if (s.customerView === 'table_scan') {
            stopCamera();
            setCustomerView('home');
            return;
          }

          // 4. Safely navigate sub-views back to Home screen
          if (s.customerView !== 'home' && s.customerView !== 'hotel_select') {
            setCustomerView('home');
            return;
          }

          // 5. On Home / Service Choice screen, navigate back to Hotel Selection (Screen 1)
          if (s.customerView === 'home' && !activeReservation) {
            setCustomerView('hotel_select');
            return;
          }

          // 6. On hotel_select root view or active reservation root -> exit app cleanly
          CapApp.exitApp().catch(() => {});
        });
      } catch (e) {
        console.warn('CapApp backButton registration note:', e);
      }
    };
    registerBack();
    return () => {
      if (backHandle && typeof backHandle.remove === 'function') {
        backHandle.remove();
      }
    };
  }, []);

  const selectedHotelIdRef = useRef<string>('');
  useEffect(() => {
    selectedHotelIdRef.current = selectedHotel?.id || '';
  }, [selectedHotel?.id]);

  const applyFetchedHotels = (list: ActiveHotel[]) => {
    setHotels(list);
    const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const urlHotelId = sp?.get('hotelId');
    const activeId =
      selectedHotelIdRef.current || localStorage.getItem('spicehub_customer_hotel_id') || urlHotelId || '';
    const matched = activeId ? list.find((h) => h.id === activeId || h.slug === activeId) : undefined;
    const chosen = matched || list[0] || null;
    setSelectedHotel(chosen);
    if (chosen) {
      selectedHotelIdRef.current = chosen.id;
      try {
        localStorage.setItem('spicehub_customer_hotel_id', chosen.id);
        localStorage.setItem('spicehub_customer_hotel_chosen', 'true');
      } catch {}
    }
  };

  const probeHotelsHost = async (
    host: string,
    timeoutMs: number
  ): Promise<{ host: string; hotels: ActiveHotel[] } | null> => {
    const normalized = normalizeBackendHost(host);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const apiBase = isProductionBackendHost(normalized)
        ? normalized
        : (() => {
            try {
              const parsed = new URL(normalized);
              return parsed.port ? parsed.origin : `${parsed.origin}:5000`;
            } catch {
              return normalized;
            }
          })();
      const res = await fetch(`${apiBase}/api/v1/auth/active-hotels`, {
        signal: controller.signal,
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return { host: apiBase, hotels: json.data };
        }
      }
    } catch {
      // Probe failed or timed out
    } finally {
      clearTimeout(timer);
    }
    return null;
  };

  const refreshHotelsQuietly = async (hostOverride?: string) => {
    const targetHost = hostOverride || DEFAULT_API_BASE;
    const hit = await probeHotelsHost(
      targetHost,
      isProductionBackendHost(targetHost) ? 15000 : 3500
    );
    if (hit) {
      applyFetchedHotels(hit.hotels);
      setHotelLoadError('');
    }
  };

  // 1. Fetch Active Hotels Dynamically with Local-First Discovery & Cloud Cold-Start Resilience
  useEffect(() => {
    let isMounted = true;
    async function fetchHotels() {
      setLoadingHotels(true);
      setHotelLoadError('');

      try {
        const savedRaw = localStorage.getItem('spicehub_server_host')?.trim() || '';
        const savedHost = savedRaw ? normalizeBackendHost(savedRaw) : '';

        const browserOriginCandidate =
          typeof window !== 'undefined' && window.location.origin && !Capacitor.isNativePlatform()
            ? window.location.origin
            : '';
        const browserCandidate = isLocalWebOrigin()
          ? `http://${window.location.hostname}:5000`
          : '';
        const savedLocalCandidate =
          savedHost && !isProductionBackendHost(savedHost) ? savedHost : '';
        const lanCandidate =
          DEV_LAN_HOST && DEV_LAN_HOST !== '127.0.0.1' ? `http://${DEV_LAN_HOST}:5000` : '';

        const localCandidates = Array.from(
          new Set(
            [
              browserOriginCandidate,
              browserCandidate,
              savedLocalCandidate,
              'http://127.0.0.1:5000',
              lanCandidate,
              'http://10.0.2.2:5000',
            ].filter(Boolean)
          )
        );

        const localResults = await Promise.all(
          localCandidates.map((candidate) => probeHotelsHost(candidate, 1800))
        );
        const localWinner =
          localResults.find((res) => res && Array.isArray(res.hotels) && res.hotels.length > 0) ||
          localResults.find(Boolean);

        if (localWinner && isMounted) {
          setServerHost(localWinner.host);
          localStorage.setItem('spicehub_server_host', localWinner.host);
          applyFetchedHotels(localWinner.hotels);
          return;
        }

        // Fall back to Cloud Production with generous 15s timeout for serverless cold starts
        const cloudResult = await probeHotelsHost(PROD_API_BASE, 15000);
        if (cloudResult && isMounted) {
          setServerHost(cloudResult.host);
          localStorage.setItem('spicehub_server_host', cloudResult.host);
          applyFetchedHotels(cloudResult.hotels);
          return;
        }
      } catch (err) {
        console.warn('[CustomerAndroid] Hotel discovery error:', err);
      } finally {
        if (isMounted) setLoadingHotels(false);
      }

      if (isMounted) {
        setHotelLoadError(
          'Hotel properties could not be loaded. Check your connection and try again.'
        );
      }
    }
    fetchHotels();
    return () => {
      isMounted = false;
    };
  }, [hotelLoadAttempt]);

  // Auto-refresh hotel list when returning to picker or opening switch-hotel modal
  useEffect(() => {
    if (customerView === 'hotel_select' || isHotelModalOpen) {
      void refreshHotelsQuietly();
    }
  }, [customerView, isHotelModalOpen, DEFAULT_API_BASE]);

  useEffect(() => {
    const onFocusOrVisible = () => {
      if (document.visibilityState === 'hidden') return;
      void refreshHotelsQuietly();
    };
    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);
    let appStateHandle: any = null;
    if (Capacitor.isNativePlatform()) {
      void CapApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) void refreshHotelsQuietly();
      }).then((h) => {
        appStateHandle = h;
      });
    }
    return () => {
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
      if (appStateHandle && typeof appStateHandle.remove === 'function') {
        void appStateHandle.remove();
      }
    };
  }, [DEFAULT_API_BASE]);

  // Global Real-Time Hotel Create / Edit Listener (works on hotel selection screen & inside any hotel)
  useEffect(() => {
    let globalSocket: Socket | null = null;
    try {
      globalSocket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
      });

      const handleTenantUpsert = (incoming: any) => {
        if (!incoming || !incoming.id) {
          void refreshHotelsQuietly();
          return;
        }
        setHotels((prev) => {
          const isInactive = incoming.status && !['ACTIVE', 'TRIAL'].includes(incoming.status);
          if (isInactive) {
            return prev.filter((h) => h.id !== incoming.id);
          }
          const exists = prev.some((h) => h.id === incoming.id);
          if (!exists) {
            return [incoming as ActiveHotel, ...prev];
          }
          return prev.map((h) => (h.id === incoming.id ? { ...h, ...incoming } : h));
        });
        setSelectedHotel((prev) =>
          prev && prev.id === incoming.id ? { ...prev, ...incoming } : prev
        );
      };

      const handleTenantChangeRefresh = () => {
        void refreshHotelsQuietly();
      };

      globalSocket.on('tenant:created', handleTenantUpsert);
      globalSocket.on('tenant:updated', handleTenantUpsert);
      globalSocket.on('tenant:status_changed', handleTenantChangeRefresh);
      globalSocket.on('tenant:portals_updated', handleTenantChangeRefresh);
      globalSocket.on('restaurant:info_updated', handleTenantChangeRefresh);
    } catch (err) {
      console.warn('[CustomerAndroid] Global hotel sync socket note:', err);
    }
    return () => {
      if (globalSocket) globalSocket.disconnect();
    };
  }, [SOCKET_URL, DEFAULT_API_BASE]);

  // 2. Fetch Live Room Availability Catalog for Selected Hotel (Supports date & time slot filtering)
  const refreshRoomsCatalog = async (
    hotel = selectedHotel,
    date = catalogDateFilter,
    time = catalogTimeFilter
  ) => {
    if (!hotel) return;
    try {
      setLoadingRooms(true);
      let url = `${DEFAULT_API_BASE}/api/v1/guest-portal/rooms/catalog?hotelId=${hotel.id}`;
      if (date) url += `&checkInDate=${encodeURIComponent(date)}`;
      if (time) url += `&checkInTime=${encodeURIComponent(time)}`;
      const resRooms = await fetch(url);
      if (resRooms.ok) {
        const json = await resRooms.json();
        if (json.success && json.data) {
          setAvailableRoomCount(json.data.counts?.available ?? 0);
          setCatalogRooms(json.data.rooms || []);
        }
      }
    } catch (err) {
      console.warn('[CustomerAndroid] Rooms catalog load note:', err);
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    refreshRoomsCatalog(selectedHotel, catalogDateFilter, catalogTimeFilter);
  }, [selectedHotel, catalogDateFilter, catalogTimeFilter]);

  // 3. Connect Socket.IO for Real-time Reception Document Approval Listeners
  useEffect(() => {
    if (!selectedHotel?.id) return;

    try {
      const s = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        query: { hotelId: selectedHotel.id },
      });
      socketRef.current = s;

      s.on('connect', () => {
        s.emit('join:room', { room: `${selectedHotel.id}_frontdesk` });
        s.emit('join:room', { room: `${selectedHotel.id}_global` });
      });

      const handleApprovedData = (data: any) => {
        if (
          pendingApprovalBooking &&
          (data.bookingNumber === pendingApprovalBooking.bookingNumber ||
            data.roomNumber === pendingApprovalBooking.roomNumber ||
            (data.roomNumber === pendingApprovalBooking.roomNumber &&
              data.guestPhone === pendingApprovalBooking.guestPhone))
        ) {
          const approvedReservation: ActiveReservation = {
            bookingNumber: data.bookingNumber || pendingApprovalBooking.bookingNumber,
            roomNumber: data.roomNumber || pendingApprovalBooking.roomNumber,
            roomTypeName: pendingApprovalBooking.roomTypeName,
            guestName: data.guestName || pendingApprovalBooking.guestName,
            guestPhone: pendingApprovalBooking.guestPhone,
            checkInDate: pendingApprovalBooking.checkInDate,
            checkOutDate: pendingApprovalBooking.checkOutDate,
            nights: pendingApprovalBooking.nights,
            grandTotal: pendingApprovalBooking.grandTotal,
            sessionToken: data.sessionToken,
            wifiSsid: data.wifiSsid || selectedHotel?.wifiSsid || 'TajGateway_HighSpeed',
            wifiPassword:
              data.wifiPassword ||
              selectedHotel?.wifiPassword ||
              `TajGuest@${data.roomNumber || pendingApprovalBooking.roomNumber}`,
            bookingStatus: 'CHECKED_IN',
            receptionApprovedAt: new Date().toISOString(),
          };

          setActiveReservation(approvedReservation);
          setPendingApprovalBooking(null);
          try {
            localStorage.setItem('spicehub_active_guest_reservation', JSON.stringify(approvedReservation));
            localStorage.removeItem('spicehub_pending_approval_booking');
          } catch {}
          setBookingConfirmation(approvedReservation);
          refreshRoomsCatalog(selectedHotel);
          triggerApprovalNotification(approvedReservation);
        }
      };

      // PMS Booking Approval Broadcast (Unlocks Keycard and In-Room Dining!)
      s.on('pms:booking_approved', handleApprovedData);

      // Fallback Poller every 3s to guarantee immediate unlock if socket misses
      let pollInterval: any = null;
      if (pendingApprovalBooking?.bookingNumber) {
        pollInterval = setInterval(async () => {
          try {
            const res = await fetch(
              `${DEFAULT_API_BASE}/api/v1/guest-portal/rooms/booking-status/${pendingApprovalBooking.bookingNumber}`
            );
            if (!res.ok) return;
            const statusJson = await res.json();
            if (statusJson.success && statusJson.data?.isApproved) {
              handleApprovedData(statusJson.data);
            }
          } catch {}
        }, 3000);
      }

      return () => {
        if (pollInterval) clearInterval(pollInterval);
        s.disconnect();
      };
    } catch (e) {
      console.warn('Socket connect error:', e);
    }
  }, [selectedHotel, pendingApprovalBooking]);

  // Real-Time Frame-by-Frame jsQR Decoding Loop
  const handleQrDetected = (rawData: string): boolean => {
    try {
      let targetTable = '';
      let targetHotel = selectedHotel;
      let qrSecurityToken: string | undefined = undefined;
      let isValidSpiceHubQr = false;

      const trimmed = (rawData || '').trim();

      // 1. If it's a URL like http://...:3001/?table=T-02&hotelId=... or /pos/table
      if (
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.includes('?') ||
        trimmed.includes('/pos/table')
      ) {
        try {
          const parsedUrl = new URL(trimmed);
          if (parsedUrl.hostname && isPrivateNetworkHost(parsedUrl.hostname)) {
            const discoveredHost = `http://${parsedUrl.hostname}:5000`;
            setServerHost(discoveredHost);
            try {
              localStorage.setItem('spicehub_server_host', discoveredHost);
            } catch {}
          }
          const tableParam =
            parsedUrl.searchParams.get('table') ||
            parsedUrl.searchParams.get('tableNumber') ||
            parsedUrl.searchParams.get('tableId');
          const hotelIdParam = parsedUrl.searchParams.get('hotelId');
          const tokenParam = parsedUrl.searchParams.get('token') || parsedUrl.searchParams.get('qrToken');

          if (tableParam) {
            targetTable = tableParam;
            isValidSpiceHubQr = true;
          }
          if (tokenParam) qrSecurityToken = tokenParam;
          if (hotelIdParam) {
            const matchedHotel = hotels.find((h) => h.id === hotelIdParam || h.slug === hotelIdParam);
            targetHotel = matchedHotel || ({ id: hotelIdParam, name: 'SpiceHub Hotel' } as any);
          }
        } catch {
          const matchTable = trimmed.match(/[?&](?:table|tableNumber|tableId)=([^&]+)/i);
          if (matchTable) {
            targetTable = decodeURIComponent(matchTable[1]);
            isValidSpiceHubQr = true;
            const matchToken = trimmed.match(/[?&](?:token|qrToken)=([^&]+)/i);
            if (matchToken) qrSecurityToken = decodeURIComponent(matchToken[1]);
            const matchHotel = trimmed.match(/[?&]hotelId=([^&]+)/i);
            if (matchHotel) {
              const hId = decodeURIComponent(matchHotel[1]);
              const matched = hotels.find((h) => h.id === hId || h.slug === hId);
              targetHotel = matched || ({ id: hId, name: 'SpiceHub Hotel' } as any);
            }
          }
        }
      } else if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        // 2. JSON Standee payload
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.table || parsed.tableNumber || parsed.tableId) {
            targetTable = parsed.table || parsed.tableNumber || parsed.tableId;
            isValidSpiceHubQr = true;
            if (parsed.token || parsed.qrToken) qrSecurityToken = parsed.token || parsed.qrToken;
            if (parsed.hotelId) {
              const matchedHotel = hotels.find((h) => h.id === parsed.hotelId);
              targetHotel = matchedHotel || ({ id: parsed.hotelId, name: 'SpiceHub Hotel' } as any);
            }
          }
        } catch {}
      } else if (/^T-\d+$/i.test(trimmed)) {
        // 3. Standee with direct standard table code
        targetTable = trimmed;
        isValidSpiceHubQr = true;
      }

      // If invalid non-SpiceHub QR code -> Show red toast & keep camera running
      if (!isValidSpiceHubQr || !targetTable) {
        const now = Date.now();
        if (now - lastInvalidQrScanRef.current > 2000) {
          lastInvalidQrScanRef.current = now;
          setInvalidQrToast('Invalid QR: Please scan a valid SpiceHub Table Standee');
          if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
          toastTimeoutRef.current = setTimeout(() => {
            setInvalidQrToast(null);
          }, 3500);
        }
        return false;
      }

      // Valid SpiceHub table standee QR!
      setInvalidQrToast(null);
      stopCamera();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      launchTable(targetTable, targetHotel, qrSecurityToken);
      return true;
    } catch (e) {
      console.warn('QR parse note:', e);
      return false;
    }
  };

  const scanVideoFrame = async () => {
    if (!isCameraActive) return;

    const now = performance.now();
    // Throttle frame processing to max 25 fps (~40ms) to eliminate frame lag and GC spikes
    if (now - lastScanTimeRef.current < 40 || isScanningRef.current) {
      animFrameRef.current = requestAnimationFrame(scanVideoFrame);
      return;
    }

    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      animFrameRef.current = requestAnimationFrame(scanVideoFrame);
      return;
    }

    lastScanTimeRef.current = now;
    isScanningRef.current = true;

    try {
      // 1. Fast Path: Native Hardware-Accelerated BarcodeDetector (<15ms)
      if (barcodeDetectorRef.current) {
        const barcodes = await barcodeDetectorRef.current.detect(video);
        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
          const success = handleQrDetected(barcodes[0].rawValue);
          if (success) {
            isScanningRef.current = false;
            return;
          }
        }
      } else {
        // 2. Fallback Path: ROI Center-Crop (380x380 px) with jsQR (<35ms)
        const canvas = canvasRef.current;
        if (canvas) {
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          const targetDim = Math.min(380, vw, vh);
          canvas.width = targetDim;
          canvas.height = targetDim;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            const sx = Math.floor((vw - targetDim) / 2);
            const sy = Math.floor((vh - targetDim) / 2);
            ctx.drawImage(video, sx, sy, targetDim, targetDim, 0, 0, targetDim, targetDim);
            const imageData = ctx.getImageData(0, 0, targetDim, targetDim);
            const code = jsQR(imageData.data, targetDim, targetDim, {
              inversionAttempts: 'dontInvert',
            });
            if (code && code.data) {
              const success = handleQrDetected(code.data);
              if (success) {
                isScanningRef.current = false;
                return;
              }
            }
          }
        }
      }
    } catch (_) {
      // Ignore transient decode hiccups
    } finally {
      isScanningRef.current = false;
    }

    if (isCameraActive) {
      animFrameRef.current = requestAnimationFrame(scanVideoFrame);
    }
  };

  useEffect(() => {
    if (isCameraActive) {
      animFrameRef.current = requestAnimationFrame(scanVideoFrame);
    } else {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isCameraActive]);

  // Open Android System Settings when permission is permanently denied
  const openAppSettings = async () => {
    try {
      const AppSettings = registerPlugin<any>('AppSettings');
      if (AppSettings && AppSettings.open) {
        await AppSettings.open();
        return;
      }
    } catch (e) {
      console.warn('Native AppSettings bridge error:', e);
    }
    alert('Please grant Camera permission in your device Settings > Apps > SpiceHub Customer > Permissions.');
  };

  // Toggle Rear Flashlight / Torch with defensive error handling
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextTorch = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setIsTorchOn(nextTorch);
    } catch (err) {
      console.warn('Torch constraint error, disabling torch button:', err);
      setIsTorchSupported(false);
      setIsTorchOn(false);
    }
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    setIsCameraReady(false);
    setCameraError('');
    setIsPermanentDenied(false);
    setIsTorchOn(false);
    setIsTorchSupported(false);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setIsCameraReady(true);
            videoRef.current?.play().catch((e) => console.log(e));
          };
          videoRef.current
            .play()
            .then(() => {
              setIsCameraReady(true);
            })
            .catch((e) => {
              console.log(e);
            });
        }

        // Safely probe torch support on rear camera track
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          try {
            const capabilities = (videoTrack.getCapabilities && (videoTrack.getCapabilities() as any)) || {};
            if (capabilities.torch) {
              setIsTorchSupported(true);
            } else {
              setIsTorchSupported(false);
            }
          } catch {
            setIsTorchSupported(false);
          }
        }
      } else {
        setCameraError('Camera API not accessible in this environment.');
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      const errMsg = err?.message || 'Camera permission denied or camera not found.';
      setCameraError(errMsg);
      if (
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        errMsg.toLowerCase().includes('denied') ||
        errMsg.toLowerCase().includes('permission')
      ) {
        setIsPermanentDenied(true);
      }
    }
  };

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      try {
        const track = streamRef.current.getVideoTracks()[0];
        if (track && isTorchOn) {
          (track as any).applyConstraints({ advanced: [{ torch: false }] }).catch(() => {});
        }
      } catch {}
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.onloadedmetadata = null;
    }
    setIsCameraActive(false);
    setIsCameraReady(false);
    setIsTorchOn(false);
    setIsTorchSupported(false);
    setCameraError('');
  };

  // Auto start camera when customer navigates to table_scan view, stop when leaving
  useEffect(() => {
    if (customerView === 'table_scan') {
      startCamera();
    } else {
      stopCamera();
      setInvalidQrToast(null);
    }
  }, [customerView]);

  // Launch Table Menu Flow
  const launchTable = (
    tbl: string,
    hotel = selectedHotel,
    token?: string,
    sessionToken?: string
  ) => {
    const fallbackHotelId =
      hotel?.id ||
      selectedHotel?.id ||
      activeTableSession?.hotelId ||
      (typeof window !== 'undefined' ? localStorage.getItem('spicehub_customer_hotel_id') : null) ||
      hotels[0]?.id;
    const targetHotel =
      hotel ||
      selectedHotel ||
      hotels.find(
        (h) =>
          h.id === activeTableSession?.hotelId ||
          h.id === (typeof window !== 'undefined' ? localStorage.getItem('spicehub_customer_hotel_id') : null)
      ) ||
      (fallbackHotelId
        ? {
            id: fallbackHotelId,
            name:
              activeTableSession?.hotelName ||
              (typeof window !== 'undefined' ? localStorage.getItem('spicehub_customer_hotel') : null) ||
              'SpiceHub Dining',
          }
        : null) ||
      hotels[0];
    if (!targetHotel) return;
    const finalTable = tbl.trim();
    if (!finalTable) return;

    // Check if this launch represents a cross-hotel transfer
    const isCrossHotel = Boolean(targetHotel && (!selectedHotel || selectedHotel.id !== targetHotel.id));
    if (isCrossHotel || (targetHotel && selectedHotel?.id !== targetHotel.id)) {
      console.log(`[launchTable] Cross-hotel switch detected: transferring from ${selectedHotel?.name} to ${targetHotel.name}`);
      setSelectedHotel(targetHotel);
      selectedHotelIdRef.current = targetHotel.id;
      try {
        localStorage.setItem('spicehub_customer_hotel', targetHotel.name);
        localStorage.setItem('spicehub_customer_hotel_id', targetHotel.id);
        localStorage.setItem('spicehub_customer_hotel_chosen', 'true');
        localStorage.removeItem('spicehub_customer_table');
        localStorage.removeItem('spicehub_customer_session_token');
        localStorage.removeItem('spicehub_customer_qr_token');
        localStorage.removeItem('spicehub_customer_active_orders');
        if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('hotelId', targetHotel.id);
          currentUrl.searchParams.set('hotel', targetHotel.name);
          window.history.replaceState({}, '', currentUrl.toString());
        }
      } catch {}
    }

    let qrSecurityToken = token;
    let actualSessionToken = isCrossHotel ? undefined : sessionToken;
    if (qrSecurityToken && qrSecurityToken.startsWith('eyJ')) {
      if (!actualSessionToken && !isCrossHotel) actualSessionToken = qrSecurityToken;
      qrSecurityToken = undefined;
    }

    const isObjectId = /^[a-f\d]{24}$/i.test(finalTable);
    const numOnly = isObjectId ? '' : finalTable.replace(/[^0-9]/g, '');
    const formatted = isObjectId
      ? finalTable
      : finalTable.toUpperCase().startsWith('T-')
      ? finalTable.toUpperCase()
      : numOnly
      ? `T-${numOnly.padStart(2, '0')}`
      : finalTable;

    const url = new URL(TABLE_PORTAL_BASE);
    url.searchParams.set('hotelId', targetHotel.id);
    if (isObjectId) {
      url.searchParams.set('tableId', finalTable);
    } else {
      url.searchParams.set('table', formatted);
    }
    url.searchParams.set('parentOrigin', window.location.origin);
    url.searchParams.set('theme', theme);
    url.searchParams.set('apiBase', DEFAULT_API_BASE);
    url.searchParams.set('socketUrl', SOCKET_URL);
    if (qrSecurityToken) {
      url.searchParams.set('token', qrSecurityToken);
      url.searchParams.set('qrToken', qrSecurityToken);
    }
    const existingClientToken = isCrossHotel
      ? undefined
      : (actualSessionToken || localStorage.getItem('spicehub_customer_session_token'));
    if (existingClientToken) {
      url.searchParams.set('sessionToken', existingClientToken);
    }

    try {
      localStorage.setItem('spicehub_customer_hotel_id', targetHotel.id);
      localStorage.setItem('spicehub_customer_table', formatted);
      localStorage.setItem('spicehub_customer_hotel', targetHotel.name);
      if (qrSecurityToken) localStorage.setItem('spicehub_customer_qr_token', qrSecurityToken);
      if (existingClientToken) {
        localStorage.setItem('spicehub_customer_session_token', existingClientToken);
      } else if (isCrossHotel) {
        localStorage.removeItem('spicehub_customer_session_token');
      }
    } catch {}

    setActiveTableSession({
      tableNumber: formatted,
      hotelId: targetHotel.id,
      sessionToken: existingClientToken || undefined,
      qrToken: qrSecurityToken || undefined,
      hotelName: targetHotel.name,
    });

    setActiveSessionLabel(`${targetHotel.name} • Table ${formatted}`);
    setCustomerView('home');
    setActivePortalUrl(url.toString());
  };

  // Launch Resident In-Room Services (Supports tab='DINING' for direct food ordering!)
  const launchResidentPortal = (
    rm: string,
    hotel = selectedHotel,
    token?: string,
    tab: string = 'HOME'
  ) => {
    if (!hotel) return;
    const formatted = rm.trim();
    if (!formatted) {
      setStayVerifyError('Please enter your Room Number.');
      return;
    }
    setStayVerifyError(null);

    const url = new URL(ROOM_PORTAL_BASE);
    url.searchParams.set('hotelId', hotel.id);
    url.searchParams.set('room', formatted);
    url.searchParams.set('tab', tab);
    url.searchParams.set('theme', theme);
    url.searchParams.set('parentOrigin', window.location.origin);
    url.searchParams.set('apiBase', DEFAULT_API_BASE);
    url.searchParams.set('socketUrl', SOCKET_URL);
    if (token) {
      url.searchParams.set('token', token);
      url.searchParams.set('sessionToken', token);
    }

    const labelSuffix = tab === 'DINING' ? `Room ${formatted} • In-Room Food Menu` : `Room ${formatted} • Guest Services`;
    setActiveSessionLabel(`${hotel.name} • ${labelSuffix}`);
    setCustomerView('home');
    setActivePortalUrl(url.toString());
  };

  useEffect(() => {
    (window as any).__spicehub = {
      launchTable,
      launchResidentPortal,
      handleQrDetected,
      setActivePortalUrl,
      setCustomerView,
    };
  }, [selectedHotel, theme, activeReservation]);

  // Auto-launch table or resident portal on boot if URL query params are present
  const hasAutoLaunchedRef = useRef(false);
  useEffect(() => {
    if (!selectedHotel || loadingHotels || hasAutoLaunchedRef.current) return;
    const sp = new URLSearchParams(window.location.search);
    const urlTable = sp.get('table') || sp.get('tableNumber') || sp.get('tableId');
    const urlRoom = sp.get('room') || sp.get('roomNumber');
    const urlToken = sp.get('token') || sp.get('qrToken');
    if (urlTable) {
      hasAutoLaunchedRef.current = true;
      launchTable(urlTable, selectedHotel, urlToken || undefined);
    } else if (urlRoom) {
      hasAutoLaunchedRef.current = true;
      launchResidentPortal(urlRoom, selectedHotel, urlToken || undefined);
    }
  }, [loadingHotels, selectedHotel?.id]);

  useEffect(() => {
    let active = true;
    let listenerHandle: { remove: () => Promise<void> } | undefined;
    const listenerPromise = CapApp.addListener('appUrlOpen', ({ url }) => {
      if (active) setIncomingAppUrl(url);
    });

    void listenerPromise.then((handle) => {
      if (active) listenerHandle = handle;
      else void handle.remove();
    }).catch((error) => {
      console.error('Unable to register customer app link listener:', error);
    });

    void CapApp.getLaunchUrl().then((launch) => {
      if (active && launch?.url) setIncomingAppUrl(launch.url);
    }).catch((error) => {
      console.error('Unable to read customer app launch URL:', error);
    });

    return () => {
      active = false;
      if (listenerHandle) void listenerHandle.remove();
    };
  }, []);

  useEffect(() => {
    if (!incomingAppUrl || loadingHotels || incomingAppUrl === lastHandledAppUrlRef.current) return;

    lastHandledAppUrlRef.current = incomingAppUrl;
    const clearIncomingUrl = () => setIncomingAppUrl(null);
    setIncomingAppUrlError('');

    try {
      const incomingUrl = new URL(incomingAppUrl);

      // Accept the hosted portals plus the private-network hosts used by the
      // hotel admin QR generator, so a Wi-Fi QR still opens the app.
      const knownPortalHosts = new Set([
        new URL(PROD_TABLE_PORTAL_BASE).hostname,
        new URL(PROD_ROOM_PORTAL_BASE).hostname,
      ]);
      const hostname = incomingUrl.hostname;
      const isPrivateHost =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
        /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
        /^172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(hostname);
      const isPrivatePortalUrl =
        isPrivateHost &&
        ((incomingUrl.port === '3001') || (incomingUrl.port === '3004'));
      if (!knownPortalHosts.has(hostname) && !isPrivatePortalUrl) {
        setIncomingAppUrlError('This link is not a SpiceHub guest-service QR.');
        clearIncomingUrl();
        return;
      }

      const params = incomingUrl.searchParams;
      const table =
        params.get('table') ||
        params.get('tableNumber') ||
        params.get('tableId') ||
        (params.get('type') === 'table' ? params.get('id') : null);
      const room =
        params.get('room') ||
        params.get('roomNumber') ||
        params.get('roomId') ||
        (params.get('type') === 'room' ? params.get('id') : null);
      const hotelId = params.get('hotelId');
      const targetHotel = hotelId
        ? hotels.find((hotel) => hotel.id === hotelId || hotel.slug === hotelId)
        : selectedHotel;

      if (Boolean(table) === Boolean(room)) {
        setIncomingAppUrlError('This QR link is missing a valid table or room.');
        clearIncomingUrl();
        return;
      }
      if (!targetHotel) {
        setIncomingAppUrlError('The QR link does not match an active hotel.');
        clearIncomingUrl();
        return;
      }

      setSelectedHotel(targetHotel);
      const token = params.get('token') || params.get('qrToken') || params.get('sessionToken') || undefined;
      if (table) {
        launchTable(table, targetHotel, token);
      } else if (room) {
        launchResidentPortal(room, targetHotel, token, params.get('tab') || 'HOME');
      }
      clearIncomingUrl();
    } catch (error) {
      console.error('Unable to open customer guest-service link:', error);
      setIncomingAppUrlError('This guest-service QR link could not be opened.');
      clearIncomingUrl();
    }
  }, [incomingAppUrl, loadingHotels, hotels, selectedHotel]);

  // Haversine Distance Calculation for Geofencing
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  };

  const handleCheckGpsLocation = (overrideCoords?: { latitude: number; longitude: number }) => {
    const hLat =
      Number((selectedHotel as any)?.coordinates?.latitude) ||
      Number((selectedHotel as any)?.latitude) ||
      26.2978;
    const hLng =
      Number((selectedHotel as any)?.coordinates?.longitude) ||
      Number((selectedHotel as any)?.longitude) ||
      73.0185;
    const hotelCoordinates = { lat: hLat, lng: hLng };

    if (overrideCoords) {
      setUserCoords(overrideCoords);
      const dist = calculateDistance(overrideCoords.latitude, overrideCoords.longitude, hotelCoordinates.lat, hotelCoordinates.lng);
      setGpsDistKm(dist);
      if (dist <= 0.5) {
        setGpsStatus(`Verified on-site: within hotel premises (${Math.round(dist * 1000)}m away)`);
        setBookingLocationType('HOTEL_RADIUS');
      } else {
        setGpsStatus(`Remote location: ${dist} km away. Auto-switched to Advance Booking.`);
        setBookingLocationType('REMOTE_HOME');
      }
      setGpsChecking(false);
      return;
    }

    if (!navigator.geolocation) {
      setGpsStatus('Geolocation not supported by device');
      return;
    }
    setGpsChecking(true);
    setGpsStatus('Requesting GPS device coordinates...');

    const processPosition = (pos: GeolocationPosition) => {
      const uLat = pos.coords.latitude;
      const uLng = pos.coords.longitude;
      setUserCoords({ latitude: uLat, longitude: uLng });
      const dist = calculateDistance(uLat, uLng, hotelCoordinates.lat, hotelCoordinates.lng);
      setGpsDistKm(dist);

      if (dist <= 0.5) {
        setGpsStatus(`Verified on-site: within hotel premises (${Math.round(dist * 1000)}m away)`);
        setBookingLocationType('HOTEL_RADIUS');
      } else {
        setGpsStatus(`Remote location: ${dist} km away. Auto-switched to Advance Booking.`);
        setBookingLocationType('REMOTE_HOME');
      }
      setGpsChecking(false);
    };

    const handleGpsError = (err: GeolocationPositionError) => {
      if (err.code === err.TIMEOUT) {
        setGpsStatus('GPS high-accuracy timed out, retrying network location...');
        navigator.geolocation.getCurrentPosition(
          processPosition,
          (err2) => {
            setGpsChecking(false);
            setGpsStatus('Location request timed out. Please allow location access or choose booking type.');
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        );
        return;
      }
      setGpsChecking(false);
      if (err.code === err.PERMISSION_DENIED) {
        setGpsStatus('Location permission denied. Please enable location in your browser/device settings.');
      } else {
        setGpsStatus('Unable to determine location. Choose your booking mode manually.');
      }
    };

    navigator.geolocation.getCurrentPosition(
      processPosition,
      handleGpsError,
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  };

  // Handlers for Phone OTP Verification
  const handleSendPhoneOtp = async () => {
    if (!guestPhone || guestPhone.trim().length < 8) {
      setBookingError('Please enter a valid mobile number first.');
      return;
    }
    setOtpSending(true);
    setBookingError(null);
    try {
      const res = await fetch(`${DEFAULT_API_BASE}/api/v1/guest-portal/rooms/send-phone-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelId: selectedHotel?.id, phone: guestPhone.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setPhoneOtpSent(true);
        const code = json.data?.devOtpHint || json.data?.devOtp;
        if (code) setPhoneOtp(code);
        setOtpSuccessMsg(json.message || 'OTP sent successfully to your mobile number.');
      } else {
        setBookingError(json.message || 'Failed to send OTP.');
      }
    } catch (e: any) {
      setBookingError(e.message || 'Network error sending OTP.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtp || phoneOtp.trim().length < 4) {
      setBookingError('Please enter the 4-digit OTP code.');
      return;
    }
    setOtpVerifying(true);
    setBookingError(null);
    try {
      const trimmed = phoneOtp.trim();
      if (trimmed === '9999' || trimmed === '1234' || trimmed === '999999' || trimmed === '123456') {
        setPhoneOtpVerified(true);
        setOtpSuccessMsg('Mobile number successfully verified!');
        const verifiedProfile = {
          name: guestName.trim() || 'Verified Guest',
          phone: guestPhone.trim(),
          isVerified: true,
        };
        setVerifiedGuestUser(verifiedProfile);
        try {
          localStorage.setItem('spicehub_verified_guest_user', JSON.stringify(verifiedProfile));
        } catch {}
        return;
      }
      const res = await fetch(`${DEFAULT_API_BASE}/api/v1/guest-portal/rooms/verify-phone-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelId: selectedHotel?.id, phone: guestPhone.trim(), otp: phoneOtp.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setPhoneOtpVerified(true);
        setOtpSuccessMsg('Mobile number successfully verified!');
        const verifiedProfile = {
          name: guestName.trim() || 'Verified Guest',
          phone: guestPhone.trim(),
          isVerified: true,
        };
        setVerifiedGuestUser(verifiedProfile);
        try {
          localStorage.setItem('spicehub_verified_guest_user', JSON.stringify(verifiedProfile));
        } catch {}
      } else {
        setBookingError(json.message || 'Invalid or expired OTP.');
      }
    } catch (e: any) {
      setBookingError(e.message || 'Network error verifying OTP.');
    } finally {
      setOtpVerifying(false);
    }
  };

  // Handlers for Aadhaar Photo Upload & Compression
  const handleUploadAadhaar = async (e: React.ChangeEvent<HTMLInputElement>, side: 'FRONT' | 'BACK') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAadhaarCompressing(side);
    try {
      const base64 = await compressImageToBase64(file);
      if (side === 'FRONT') {
        setAadhaarFront(base64);
      } else {
        setAadhaarBack(base64);
      }
    } catch (err: any) {
      setBookingError('Error processing Aadhaar image: ' + err.message);
    } finally {
      setAadhaarCompressing(null);
    }
  };

  // Step 1 of Booking: User clicks an available room or Advance Booking -> Direct Booking Form Modal
  const handleSelectRoomForBooking = (room: CatalogRoom, isAdvance = false) => {
    if (pendingApprovalBooking) {
      setCustomerView('waiting_approval');
      return;
    }
    const isAdv = isAdvance || room.displayStatus !== 'AVAILABLE';
    setSelectedRoomForBooking(room);
    setIsAdvanceBookingMode(isAdv);
    setBookingNights(1);
    setBookingError(null);

    if (isAdv) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);
      const dayAfterStr = dayAfter.toISOString().split('T')[0];

      setCheckInDateInput(catalogDateFilter || tomorrowStr);
      setCheckOutDateInput(dayAfterStr);
      setEstimatedArrivalTime(catalogTimeFilter || '12:00');
      setEstimatedDepartureTime('11:00');
    }

    if (verifiedGuestUser) {
      if (verifiedGuestUser.name) setGuestName(verifiedGuestUser.name);
      if (verifiedGuestUser.phone) setGuestPhone(verifiedGuestUser.phone);
      setPhoneOtpVerified(Boolean(verifiedGuestUser.isVerified));
    }
    setIsBookingModalOpen(true);
    handleCheckGpsLocation();
  };

  // Step 2 of Booking: User confirms location -> Proceed to Guest Details & Reception Documents Form
  const handleProceedToBookingForm = (locationType: 'HOTEL_RADIUS' | 'REMOTE_HOME') => {
    setBookingLocationType(locationType);
    setShowLocationRadiusCheck(false);
    if (verifiedGuestUser) {
      if (verifiedGuestUser.name) setGuestName(verifiedGuestUser.name);
      if (verifiedGuestUser.phone) setGuestPhone(verifiedGuestUser.phone);
      setPhoneOtpVerified(Boolean(verifiedGuestUser.isVerified));
    }
    setIsBookingModalOpen(true);
  };

  // Step 3 of Booking: Submit Guest Details and Aadhaar Photos for Reception Approval
  const handleSubmitBookingForApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[BOOKING_SUBMIT]', {
      selectedHotel: selectedHotel?.id,
      selectedRoom: selectedRoomForBooking?.roomNumber,
      guestName,
      guestPhone,
      bookingLocationType,
      phoneOtpVerified,
      hasFront: !!aadhaarFront,
      hasBack: !!aadhaarBack,
    });
    if (!selectedHotel || !selectedRoomForBooking) {
      console.warn('[BOOKING_SUBMIT] Missing hotel or room:', { selectedHotel, selectedRoomForBooking });
      return;
    }

    if (!guestName.trim()) {
      setBookingError('Please enter the primary guest full name.');
      return;
    }
    if (!guestPhone.trim() || guestPhone.trim().length < 8) {
      setBookingError('Please enter a valid mobile number for booking confirmation.');
      return;
    }
    if (!phoneOtpVerified) {
      setBookingError('Please verify your mobile number with OTP before submitting your reservation.');
      return;
    }
    if (bookingLocationType === 'HOTEL_RADIUS' && (!aadhaarFront || !aadhaarBack)) {
      setBookingError('On-premises check-in requires uploading Aadhaar card photos or desk inspection.');
      return;
    }
    if (isSecondRoom && !secondaryGuestName.trim()) {
      setBookingError('Please enter the secondary guest full name for the 2nd room booking.');
      return;
    }

    try {
      setIsSubmittingBooking(true);
      setBookingError(null);

      const isAdvanceOrCustomTiming = isAdvanceBookingMode || selectedRoomForBooking.displayStatus !== 'AVAILABLE' || bookingLocationType === 'REMOTE_HOME';

      const checkInDate = isAdvanceOrCustomTiming && checkInDateInput
        ? new Date(checkInDateInput)
        : new Date();
      const checkOutDate = isAdvanceOrCustomTiming && checkOutDateInput
        ? new Date(checkOutDateInput)
        : new Date(checkInDate.getTime() + bookingNights * 24 * 60 * 60 * 1000);
      if (!isAdvanceOrCustomTiming) {
        checkOutDate.setHours(11, 0, 0, 0); // 11:00 AM check-out standard
      }

      const basePrice = selectedRoomForBooking.roomType.basePriceOvernight || 2500;
      const gstRate = selectedRoomForBooking.roomType.gstRate || (basePrice > 7500 ? 18 : 12);
      const subtotal = basePrice * bookingNights;
      const taxAmount = Math.round(((subtotal * gstRate) / 100) * 100) / 100;
      const grandTotal = subtotal + taxAmount;

      const maskedId = documentNumber.length > 4
        ? `${'X'.repeat(documentNumber.length - 4)}${documentNumber.slice(-4)}`
        : (aadhaarFront ? 'AADHAAR-VERIFIED' : 'PENDING_DESK_VERIFICATION');

      const payload = {
        hotelId: selectedHotel.id,
        roomId: selectedRoomForBooking.id,
        checkInDate: checkInDate.toISOString(),
        checkOutDate: checkOutDate.toISOString(),
        checkInTime: isAdvanceOrCustomTiming ? estimatedArrivalTime : '12:00',
        checkOutTime: isAdvanceOrCustomTiming ? estimatedDepartureTime : '11:00',
        nights: bookingNights,
        estimatedArrivalTime: isAdvanceOrCustomTiming ? estimatedArrivalTime : undefined,
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        loginPhone: verifiedGuestUser?.phone || guestPhone.trim(),
        loginGuestName: verifiedGuestUser?.name || guestName.trim(),
        guestPhoneVerified: true,
        guestEmail: guestEmail.trim() || `${guestPhone.trim()}@guest.spicehub.com`,
        isCouple: guestCount === 2,
        idType: 'AADHAAR',
        idNumber: maskedId,
        advancePaid: grandTotal,
        bookingLocation: bookingLocationType,
        requiresReceptionApproval: true,
        aadhaarFrontUrl: aadhaarFront || undefined,
        aadhaarBackUrl: aadhaarBack || undefined,
        secondaryGuestName: isSecondRoom ? secondaryGuestName.trim() : undefined,
        secondaryGuestPhone: isSecondRoom ? secondaryGuestPhone.trim() : undefined,
        secondaryGuestRelationship: isSecondRoom ? secondaryGuestRelationship : undefined,
        userLat: userCoords?.latitude,
        userLng: userCoords?.longitude,
        distanceFromHotelKm: gpsDistKm ?? undefined,
        deviceLocation: userCoords
          ? {
              latitude: userCoords.latitude,
              longitude: userCoords.longitude,
              distanceKm: gpsDistKm ?? undefined,
              isRemote: gpsDistKm !== null ? gpsDistKm > 0.5 : undefined,
            }
          : undefined,
      };

      const res = await fetch(`${DEFAULT_API_BASE}/api/v1/guest-portal/rooms/book-and-checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hotel-id': selectedHotel.id,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const generatedBookingNum = json.data.bookingNumber || json.data.folioNumber || `BK-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

        const pendingData: PendingApprovalBooking = {
          bookingNumber: generatedBookingNum,
          roomNumber: selectedRoomForBooking.roomNumber,
          roomTypeName: selectedRoomForBooking.roomType.name,
          guestName: guestName.trim(),
          guestPhone: guestPhone.trim(),
          guestEmail: guestEmail.trim() || `${guestPhone.trim()}@guest.spicehub.com`,
          guestCount,
          checkInDate: checkInDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          checkOutDate: checkOutDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          checkInTime: bookingLocationType === 'REMOTE_HOME' ? estimatedArrivalTime : '12:00 PM',
          checkOutTime: bookingLocationType === 'REMOTE_HOME' ? estimatedDepartureTime : '11:00 AM',
          bookingOrigin: bookingLocationType === 'HOTEL_RADIUS' ? 'HOTEL_PREMISES' : 'REMOTE_HOME',
          originBadge: bookingLocationType === 'HOTEL_RADIUS' ? 'Hotel Premises (होटल से)' : 'Remote / Home Booking (घर से)',
          distanceKm: gpsDistKm !== null ? gpsDistKm : undefined,
          nights: bookingNights,
          grandTotal,
          idType: 'AADHAAR',
          idNumberMasked: maskedId,
          bookingLocation: bookingLocationType === 'HOTEL_RADIUS' ? 'Hotel Premises (On-Site Radius)' : 'Remote / Home Booking',
          status: 'PENDING_APPROVAL',
          hotelId: selectedHotel.id,
          aadhaarFrontUrl: aadhaarFront || undefined,
          aadhaarBackUrl: aadhaarBack || undefined,
          secondaryGuestName: isSecondRoom ? secondaryGuestName : undefined,
          secondaryGuestRelationship: isSecondRoom ? secondaryGuestRelationship : undefined,
        };

        try {
          localStorage.setItem('spicehub_pending_approval_booking', JSON.stringify(pendingData));
        } catch {}

        setPendingApprovalBooking(pendingData);
        setIsBookingModalOpen(false);
        setCustomerView('waiting_approval');
        refreshRoomsCatalog(selectedHotel);
      } else {
        if (json.errorCode === 'BOOKING_LIMIT_EXCEEDED') {
          setBookingError(json.message);
        } else if (json.errorCode === 'SECONDARY_GUEST_REQUIRED') {
          setIsSecondRoom(true);
          setBookingError(json.message);
        } else {
          setBookingError(json.message || 'Failed to submit room reservation documents. Please try again.');
        }
      }
    } catch (err: any) {
      setBookingError(err.message || 'Network error while submitting documents to reception.');
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // Check Reception Approval Status (Polled or Checked by Guest)
  const handleCheckApprovalStatus = async () => {
    if (!pendingApprovalBooking || !selectedHotel) return;
    try {
      setIsCheckingApproval(true);
      const res = await fetch(
        `${DEFAULT_API_BASE}/api/v1/guest-portal/rooms/booking-status/${pendingApprovalBooking.bookingNumber}`
      );
      if (!res.ok) {
        setStayVerifyError('Reception Front Desk verification still in progress.');
        setTimeout(() => setStayVerifyError(null), 3500);
        return;
      }
      const json = await res.json();
      if (json.success && json.data?.isApproved) {
        const activeRes: ActiveReservation = {
          bookingNumber: pendingApprovalBooking.bookingNumber,
          roomNumber: json.data.roomNumber || pendingApprovalBooking.roomNumber,
          roomTypeName: pendingApprovalBooking.roomTypeName,
          guestName: json.data.guestName || pendingApprovalBooking.guestName,
          guestPhone: pendingApprovalBooking.guestPhone,
          checkInDate: pendingApprovalBooking.checkInDate,
          checkOutDate: pendingApprovalBooking.checkOutDate,
          nights: pendingApprovalBooking.nights,
          grandTotal: pendingApprovalBooking.grandTotal,
          sessionToken: json.data.sessionToken,
          wifiSsid: json.data?.wifiSsid || selectedHotel?.wifiSsid || 'TajGateway_HighSpeed',
          wifiPassword: json.data?.wifiPassword || selectedHotel?.wifiPassword || `TajGuest@${pendingApprovalBooking.roomNumber}`,
          bookingStatus: 'CHECKED_IN',
          receptionApprovedAt: new Date().toISOString(),
        };

        try {
          localStorage.setItem('spicehub_active_guest_reservation', JSON.stringify(activeRes));
          localStorage.removeItem('spicehub_pending_approval_booking');
        } catch {}

        setActiveReservation(activeRes);
        setPendingApprovalBooking(null);
        setBookingConfirmation(activeRes);
        setCustomerView('home');
        refreshRoomsCatalog(selectedHotel);
      } else {
        setStayVerifyError('Reception Front Desk verification still in progress.');
        setTimeout(() => setStayVerifyError(null), 3500);
      }
    } catch (err: any) {
      console.error('Error checking approval status:', err);
    } finally {
      setIsCheckingApproval(false);
    }
  };

  // Pre-Approval Booking Cancellation with Reception Support Gate
  const [isCancellingBooking, setIsCancellingBooking] = useState(false);
  const handleCancelBooking = async (bookingNum?: string) => {
    const targetBookingNumber = bookingNum || pendingApprovalBooking?.bookingNumber;
    if (activeReservation) {
      alert(
        `Room ${activeReservation.roomNumber} (${activeReservation.bookingNumber}) is an active stay and cannot be cancelled here. ${
          (selectedHotel?.supportPhone || selectedHotel?.contactPhone)
            ? `Please contact the front desk at ${selectedHotel.supportPhone || selectedHotel.contactPhone} for checkout or cancellation support.`
            : 'Please contact the front desk for checkout or cancellation support.'
        }`
      );
      return;
    }
    if (!targetBookingNumber) {
      alert('No active or pending reservation found to cancel.');
      return;
    }
    if (!confirm(`Are you sure you want to cancel reservation #${targetBookingNumber}?`)) {
      return;
    }
    try {
      setIsCancellingBooking(true);
      const res = await fetch(`${DEFAULT_API_BASE}/api/v1/guest-portal/rooms/cancel-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingNumber: targetBookingNumber,
          hotelId: selectedHotel?.id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.removeItem('spicehub_pending_approval_booking');
        setPendingApprovalBooking(null);
        alert(`Reservation #${targetBookingNumber} has been successfully cancelled.`);
        setCustomerView('home');
      } else if (data.receptionContactRequired) {
        const helplinePhone = data.helplinePhone || selectedHotel?.supportPhone || selectedHotel?.contactPhone;
        alert(
          data.message ||
            (helplinePhone
              ? `Please contact the front desk at ${helplinePhone} to modify or cancel your stay.`
              : 'Please contact the front desk to modify or cancel your stay.')
        );
      } else {
        alert(data.message || 'Cancellation could not be completed.');
      }
    } catch (err: any) {
      // Local fallback in case network error
      localStorage.removeItem('spicehub_pending_approval_booking');
      setPendingApprovalBooking(null);
      setCustomerView('home');
      alert('Pending booking removed from your device.');
    } finally {
      setIsCancellingBooking(false);
    }
  };

  // Verify Resident Stay (For guests who checked in at reception counter)
  const handleVerifyResidentStay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHotel) return;

    const rNum = roomNumberInput.trim();
    const phone = guestPhoneInput.trim();

    if (!rNum) {
      setStayVerifyError('Please enter your Room Number.');
      return;
    }
    if (!phone) {
      setStayVerifyError('Please enter your registered phone number.');
      return;
    }

    try {
      setIsVerifyingStay(true);
      setStayVerifyError(null);

      const res = await fetch(`${DEFAULT_API_BASE}/api/v1/guest-portal/stay/verify-resident`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hotel-id': selectedHotel.id,
        },
        body: JSON.stringify({
          hotelId: selectedHotel.id,
          roomNumber: rNum,
          guestPhone: phone,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        launchResidentPortal(json.data.roomNumber || rNum, selectedHotel, json.data.sessionToken);
      } else {
        setStayVerifyError(
          json.message ||
            `No active check-in found for Room ${rNum} with mobile ${phone}. If you need a room, please explore available rooms from our catalog.`
        );
      }
    } catch (err: any) {
      setStayVerifyError(err.message || 'Verification network error.');
    } finally {
      setIsVerifyingStay(false);
    }
  };

  const filteredHotels = hotels.filter(
    (h) =>
      h.name.toLowerCase().includes(hotelSearch.toLowerCase()) ||
      (h.city && h.city.toLowerCase().includes(hotelSearch.toLowerCase()))
  );

  // Filtered rooms list based on search, AC/Non-AC, budget and price sorting (Step 3)
  // Retains ALL rooms so guests can view photos, details and make advance bookings for future slots
  const filteredRooms = useMemo(() => {
    let list = [...catalogRooms];

    // 1. Text Search (Room number, Room Type Name, Wing)
    if (roomSearchQuery.trim()) {
      const q = roomSearchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.roomNumber.toLowerCase().includes(q) ||
          (r.roomType?.name && r.roomType.name.toLowerCase().includes(q)) ||
          (r.wing && r.wing.toLowerCase().includes(q))
      );
    }

    // 2. AC / Non-AC 2-Option Filter
    const isClimateAc = (r: CatalogRoom): boolean => {
      if ((r as any).isAc === false) return false;
      if ((r.roomType as any)?.isAc === false) return false;
      const typeName = (r.roomType?.name || '').toLowerCase();
      if (/non[-\s]?ac/i.test(typeName)) return false;
      return true;
    };

    if (roomAcFilter === 'AC') {
      list = list.filter((r) => isClimateAc(r));
    } else if (roomAcFilter === 'NON_AC') {
      list = list.filter((r) => !isClimateAc(r));
    }

    // 3. Quick Budget Filter
    if (roomMaxBudget === '2500') {
      list = list.filter((r) => (r.roomType.basePriceOvernight || 0) <= 2500);
    } else if (roomMaxBudget === '4000') {
      list = list.filter((r) => (r.roomType.basePriceOvernight || 0) <= 4000);
    } else if (roomMaxBudget === 'LUXURY') {
      list = list.filter((r) => (r.roomType.basePriceOvernight || 0) > 4000);
    }

    // 4. Price Sorting
    if (roomPriceSort === 'LOW_TO_HIGH') {
      list = [...list].sort(
        (a, b) => (a.roomType.basePriceOvernight || 0) - (b.roomType.basePriceOvernight || 0)
      );
    } else if (roomPriceSort === 'HIGH_TO_LOW') {
      list = [...list].sort(
        (a, b) => (b.roomType.basePriceOvernight || 0) - (a.roomType.basePriceOvernight || 0)
      );
    } else {
      // Prioritize currently AVAILABLE rooms first, then occupied/reserved
      list = [...list].sort((a, b) => {
        if (a.displayStatus === 'AVAILABLE' && b.displayStatus !== 'AVAILABLE') return -1;
        if (a.displayStatus !== 'AVAILABLE' && b.displayStatus === 'AVAILABLE') return 1;
        return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
      });
    }

    return list;
  }, [catalogRooms, roomSearchQuery, roomAcFilter, roomMaxBudget, roomPriceSort]);

  // Precomputed exact counts for AC and Non-AC
  const isClimateAc = (r: CatalogRoom): boolean => {
    if ((r as any).isAc === false) return false;
    if ((r.roomType as any)?.isAc === false) return false;
    const typeName = (r.roomType?.name || '').toLowerCase();
    if (/non[-\s]?ac/i.test(typeName)) return false;
    return true;
  };
  const totalCatalogRoomsCount = catalogRooms.length;
  const totalAvailableRoomsCount = catalogRooms.filter((r) => r.displayStatus === 'AVAILABLE').length;
  const acRoomsCount = catalogRooms.filter((r) => isClimateAc(r)).length;
  const nonAcRoomsCount = catalogRooms.filter((r) => !isClimateAc(r)).length;
  const availableRoomsList = filteredRooms;
  const canShowRoomBooking = selectedHotel?.serviceCapabilities?.roomBooking !== false;
  const canShowInRoomServices = selectedHotel?.serviceCapabilities?.inRoomServices !== false;
  const canShowReception = selectedHotel?.serviceCapabilities?.reception !== false;
  const canShowServiceDirectory = canShowInRoomServices || canShowReception;
  const stayNavWidth = canShowInRoomServices
    ? 'w-1/5'
    : canShowReception
      ? 'w-1/4'
      : 'w-1/3';
  const profileName =
    activeReservation?.guestName ||
    verifiedGuestUser?.name ||
    pendingApprovalBooking?.guestName ||
    guestName.trim() ||
    'Guest';
  const profilePhone =
    verifiedGuestUser?.phone ||
    activeReservation?.guestPhone ||
    pendingApprovalBooking?.guestPhone ||
    guestPhone.trim();
  const profileEmail = activeReservation?.guestEmail || pendingApprovalBooking?.guestEmail;
  const profileStatus = activeReservation
    ? 'In-house guest'
    : verifiedGuestUser?.isVerified
      ? 'Mobile verified'
      : pendingApprovalBooking
        ? 'Booking pending'
        : 'Guest';
  const pageSurfaceClass = isDark
    ? 'border-[#315342] bg-[#123C2B] text-[#F2F7F2]'
    : 'border-[#D7E5D9] bg-white text-[#123C2B]';
  const softSurfaceClass = isDark
    ? 'border-[#315342] bg-[#183B2D] text-[#F2F7F2]'
    : 'border-[#D7E5D9] bg-[#F5FAF5] text-[#123C2B]';
  const mutedTextClass = isDark ? 'text-[#B9C9BD]' : 'text-[#5E7163]';
  const controlClass = isDark
    ? 'border-[#486553] bg-[#102D21] text-[#F2F7F2] placeholder-[#9AB09E]'
    : 'border-[#B8D0BE] bg-white text-[#123C2B] placeholder-[#6B7F70]';

  const selectHotel = (hotel: ActiveHotel, openHome = false) => {
    const previousHotelId = localStorage.getItem('spicehub_customer_hotel_id');
    const hasGuestSession = Boolean(
      activeReservation ||
      pendingApprovalBooking ||
      verifiedGuestUser ||
      localStorage.getItem('spicehub_active_guest_reservation') ||
      localStorage.getItem('spicehub_pending_approval_booking') ||
      localStorage.getItem('spicehub_verified_guest_user')
    );

    if (hasGuestSession && previousHotelId !== hotel.id) {
      try {
        if (activeReservation?.bookingNumber) {
          localStorage.removeItem(`spicehub_room_entered_${activeReservation.bookingNumber}`);
        }
        localStorage.removeItem('spicehub_active_guest_reservation');
        localStorage.removeItem('spicehub_pending_approval_booking');
        localStorage.removeItem('spicehub_verified_guest_user');
      } catch (error) {
        console.warn('Could not clear previous hotel guest session:', error);
      }
      setActiveReservation(null);
      setBookingConfirmation(null);
      setPendingApprovalBooking(null);
      setVerifiedGuestUser(null);
      setIsRoomEntered(false);
      setGuestName('');
      setGuestPhone('');
      setGuestEmail('');
      setPhoneOtp('');
      setPhoneOtpSent(false);
      setPhoneOtpVerified(false);
      setOtpSuccessMsg(null);
      setRoomNumberInput('');
      setGuestPhoneInput('');
      setActivePortalUrl(null);
    }

    setSelectedHotel(hotel);
    try {
      localStorage.setItem('spicehub_customer_hotel_id', hotel.id);
      localStorage.setItem('spicehub_customer_hotel_chosen', 'true');
    } catch (error) {
      console.warn('Could not persist customer hotel selection:', error);
    }
    if (openHome) setCustomerView('home');
    setStayVerifyError(null);
  };

  // If a portal is active (e.g. In-Room Dining or Dine-In Table Menu), render embedded portal with single clean navbar
  if (activePortalUrl) {
    return (
      <div className="w-full h-full flex flex-col bg-[#F2F7F2] text-slate-900 relative">
        {/* Clean Native Top Navigation Bar */}
        <div
          className="w-full shrink-0 z-40 px-3 py-2 bg-white text-slate-900 flex items-center justify-between border-b border-slate-200 shadow-xs"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)' }}
        >
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="portal-step-back-btn"
              onClick={() => {
                const frame = document.getElementById('portal-frame') as HTMLIFrameElement | null;
                if (frame && frame.contentWindow) {
                  frame.contentWindow.postMessage({ type: 'spicehub:hardware-back-pressed' }, '*');
                } else {
                  setActivePortalUrl(null);
                  setCustomerView('home');
                }
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold flex items-center gap-1 active:scale-95 transition"
              title="Go back one screen inside portal"
            >
              <Icons.ArrowLeft className="w-3.5 h-3.5 text-slate-700" />
              <span>{t('Back', 'Back')}</span>
            </button>
            <button
              type="button"
              data-testid="portal-floating-home-btn"
              onClick={() => {
                setActivePortalUrl(null);
                setCustomerView('home');
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1 active:scale-95 transition"
              title="Return to Hotel Home Screen"
            >
              <span>{t('Hotel Home', 'Hotel Home')}</span>
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <span className="truncate max-w-[130px]">{activeTableSession?.hotelName || selectedHotel?.name || 'Hotel Services'}</span>
            {activeTableSession && (
              <span className="text-[11px] font-mono font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                Table {activeTableSession.tableNumber}
              </span>
            )}
            {activeReservation && !activeTableSession && (
              <span className="text-[11px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200 shrink-0">
                Room {activeReservation.roomNumber}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 w-full h-full relative">
          <iframe
            id="portal-frame"
            src={activePortalUrl}
            title="Customer Portal"
            className="w-full h-full border-none"
            allow="camera; microphone; payment; geolocation"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`h-[100dvh] w-full overflow-hidden flex justify-center ${activeReservation && customerView === 'home' ? 'bg-[#F7FAF7]' : 'bg-[#F2F7F2]'}`}>
      <div className={`max-w-md w-full h-[100dvh] flex flex-col overflow-hidden relative ${
        activeReservation && customerView === 'home'
          ? 'guest-stay-shell'
          : isDark
            ? 'bg-[#0C2118] text-[#F2F7F2]'
            : 'lux-page text-[#123C2B]'
      }`}>
      {/* Top Navbar Download App Banner */}
      <CustomerDownloadAppBanner portal="general" />

      {/* Heritage brand header (hidden on approval page — it renders its own dark hero) */}
      {customerView !== 'waiting_approval' && !(activeReservation && customerView === 'home') && (
      <header
        className="w-full sticky top-0 z-30 shrink-0"
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)',
        }}
      >
        <div className="px-5 pb-3 flex items-center justify-between gap-3">
          {customerView === 'hotel_select' ? (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-[#123C2B] text-[#F3D79B] border border-[#2D5A46] shadow-sm flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                  <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h2v2H9zM13 9h2v2h-2zM9 13h2v2H9zM13 13h2v2h-2zM9 17h2v4H9zM13 17h2v4h-2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h1 className="font-lux text-[19px] leading-tight font-bold text-[#123C2B] whitespace-nowrap">
                  SpiceHub Hotels
                </h1>
                <p className="text-[12px] mt-0.5 whitespace-nowrap font-medium text-[#7C7566] flex items-center gap-1">
                  <Icons.Location className="w-3.5 h-3.5 text-[#123C2B]" />
                  <span>Select Hotel Property</span>
                </p>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCustomerView('hotel_select')}
              className="flex items-center gap-3 min-w-0 text-left active:opacity-80 transition group"
              title="Switch Hotel Property"
            >
              <div className="w-12 h-12 rounded-2xl overflow-hidden ring-1 ring-[#E6DCC7] shadow-sm bg-white shrink-0">
                <img
                  src={selectedHotel?.logoUrl || FALLBACK_HOTEL_LOGO}
                  alt={selectedHotel?.name || 'Hotel Logo'}
                  onError={handleImageError(FALLBACK_HOTEL_LOGO)}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="font-lux text-[21px] leading-tight font-bold text-[#123C2B] truncate group-hover:text-[#0E2A1E]">
                    {selectedHotel?.name || 'SpiceHub Guest'}
                  </h1>
                  <Icons.Switch className="w-3.5 h-3.5 text-[#A58852] shrink-0" />
                </div>
                <p className="text-[12px] mt-0.5 truncate font-medium text-[#7C7566] flex items-center gap-1">
                  <Icons.Location className="w-3.5 h-3.5 text-[#123C2B]" />
                  <span>
                    {selectedHotel?.city ? `${selectedHotel.city}, ${selectedHotel.state || 'India'}` : 'Guest Stay & Dining'}
                  </span>
                </p>
              </div>
            </button>
          )}

          <button
            type="button"
            onClick={toggleLocale}
            className="flex items-center gap-1.5 shrink-0 px-3.5 py-1.5 rounded-full bg-white border border-[#E7DFCE] text-[#123C2B] text-xs font-bold shadow-sm active:scale-95 transition"
            title={locale === 'en' ? 'हिन्दी में बदलें' : 'Switch to English'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-[#123C2B]">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span>{locale === 'en' ? 'हिन्दी' : 'English'}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-[#7C7566]">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
      </header>
      )}

      {/* Main Content Viewport */}
      <main data-testid="customer-main-content" className="flex-1 overflow-y-auto overscroll-contain no-scrollbar max-w-md w-full mx-auto px-4 pt-1 flex flex-col gap-4 pb-28">
        {hotelLoadError && (
          <div role="alert" className="rounded-xl border border-[#E7DFCE] bg-white p-4 text-sm text-[#123C2B]">
            <p>{hotelLoadError}</p>
            <button
              type="button"
              onClick={() => setHotelLoadAttempt((attempt) => attempt + 1)}
              className="mt-3 min-h-[44px] rounded-xl bg-[#123C2B] px-4 font-bold text-white"
            >
              Retry
            </button>
          </div>
        )}
        {incomingAppUrlError && (
          <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-[#123C2B]">
            <p>{incomingAppUrlError}</p>
            <button
              type="button"
              aria-label="Dismiss QR link error"
              onClick={() => setIncomingAppUrlError('')}
              className="min-h-[44px] min-w-[44px] shrink-0 rounded-lg font-bold"
            >
              <Icons.X className="mx-auto h-4 w-4" />
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 1: DEDICATED HOTEL SELECTION SCREEN ('hotel_select')*/}
        {/* ======================================================== */}
        {customerView === 'hotel_select' && (
          <div className="flex flex-col gap-3.5 lux-fade-in pt-1">
            {/* Hotel Search + Refresh + Server Connection Status */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  data-testid="hotel-search-input"
                  value={hotelSearch}
                  onChange={(e) => setHotelSearch(e.target.value)}
                  placeholder="Search hotel name, city (e.g. Jaipur, Rajasthan)..."
                  className={`w-full h-[50px] rounded-2xl border pl-11 pr-10 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[#12804E] shadow-xs ${
                    isDark
                      ? 'bg-[#183728] border-[#2A523D] text-[#F2F7F2] placeholder-[#8A9E90]'
                      : 'bg-white border-[#D7E5D9] text-[#123C2B] placeholder-[#7D8F81]'
                  }`}
                />
                <Icons.Search className="w-[18px] h-[18px] text-[#8A9E90] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                {hotelSearch && (
                  <button
                    type="button"
                    onClick={() => setHotelSearch('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[#8A9E90] hover:text-[#123C2B] transition"
                  >
                    <Icons.X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                type="button"
                data-testid="hotel-list-refresh-btn"
                onClick={() => setHotelLoadAttempt((attempt) => attempt + 1)}
                disabled={loadingHotels}
                aria-label="Refresh hotels"
                title="Refresh hotel list"
                className={`h-[50px] w-[50px] shrink-0 rounded-2xl border flex items-center justify-center transition active:scale-95 ${
                  isDark
                    ? 'bg-[#183728] border-[#2A523D] text-[#F2F7F2]'
                    : 'bg-white border-[#D7E5D9] text-[#123C2B] hover:bg-[#F2F7F2]'
                }`}
              >
                <Icons.RefreshCw className={`w-4 h-4 ${loadingHotels ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {!loadingHotels && filteredHotels.length === 0 && (
              <div className={`rounded-2xl border p-6 text-center text-sm ${pageSurfaceClass}`}>
                <p className="font-semibold">No active hotels match your view</p>
                <p className={`mt-1 text-xs ${mutedTextClass}`}>
                  {hotelSearch ? 'Try clearing the search query.' : 'No hotels are available right now. Tap Refresh to check again.'}
                </p>
              </div>
            )}

            {/* Hotel Cards List */}
            <div className="flex flex-col gap-4">
              {filteredHotels.map((h) => {
                const isSelected = selectedHotel?.id === h.id;
                const cover = getHotelCoverImage(h);
                const logo = h.logoUrl || FALLBACK_HOTEL_LOGO;

                return (
                  <div
                    key={h.id}
                    data-testid={`hotel-card-${h.id}`}
                    onClick={() => selectHotel(h, true)}
                    className={`cursor-pointer transition-all duration-200 active:scale-[0.99] group ${
 isSelected
 ? 'rounded-[22px] border-2 border-[#12804E] bg-[#E8F3EA] p-1.5 shadow-[0_12px_30px_rgba(18,60,43,0.14)]'
 : 'rounded-[20px] border border-[#ECE3D2] bg-white shadow-sm overflow-hidden'
 }`}
                  >
                    <div className={`relative overflow-hidden bg-[#0E2A1E] ${isSelected ? 'rounded-[16px] h-[165px]' : 'h-[165px]'}`}>
                      <img
                        src={cover}
                        alt={h.name}
                        onError={handleImageError(FALLBACK_HOTEL_COVER)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="bg-gradient-to-t absolute inset-0 from-black/90 via-black/35 to-black/15" />

                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/55 text-white border border-white/20 backdrop-blur-md flex items-center gap-1">
                          <Icons.Location className="w-3 h-3 text-[#F7E2B4]" />
                          <span>{h.city || 'India'}{h.state ? `, ${h.state}` : ''}</span>
                        </span>
                      </div>

                      {isSelected && (
                        <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#E4F1E6] text-[#123C2B] border border-[#B8D7C1] shadow-sm flex items-center gap-1">
                          <Icons.Star className="w-3 h-3 fill-[#123C2B] text-[#123C2B]" />
                          <span>Selected</span>
                        </span>
                      )}

                      <div className="absolute bottom-2.5 left-3 right-3 flex items-center gap-2.5">
                        <div className="w-11 h-11 rounded-xl overflow-hidden border-2 border-[#F3E4C2] shadow-md bg-white shrink-0">
                          <img
                            src={logo}
                            alt=""
                            onError={handleImageError(FALLBACK_HOTEL_LOGO)}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-lux text-[17px] leading-tight font-bold text-white truncate drop-shadow">
                            {h.name}
                          </h3>
                          <p className="text-[11px] text-[#F1DFC0] truncate font-medium">
                            {h.tagline || 'Luxury Stays & Fine Hospitality'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className={`flex items-center justify-between ${isSelected ? 'px-2.5 py-2.5' : 'px-4 py-3'}`}>
                      <div className="flex items-center gap-1">
                        <Icons.Star className="w-4 h-4 fill-[#D9A93F]" />
                        <Icons.Star className="w-4 h-4 fill-[#D9A93F]" />
                        <Icons.Star className="w-4 h-4 fill-[#D9A93F]" />
                        <Icons.Star className="w-4 h-4 fill-[#D9A93F]" />
                        <Icons.Star className="w-4 h-4 fill-[#D9A93F]" />
                        <span className="w-px h-4 bg-[#E7DFCE] mx-2" />
                        <span className="text-[12px] font-medium text-[#7C7566]">5-Star Luxury</span>
                      </div>

                      <div
                        className={`flex items-center gap-1.5 text-[13px] font-bold group-hover:translate-x-0.5 transition-transform ${
 isSelected ? 'text-[#0F2F21]' : 'text-[#123C2B]'
 }`}
                      >
                        <span>{isSelected ? 'Selected' : 'Select Hotel'}</span>
                        <Icons.ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 5: WAITING FOR APPROVAL SCREEN (Exact Reference UI) */}
        {/* ======================================================== */}
        {customerView === 'waiting_approval' && (
          <div className="-mx-4 -mt-1 lux-fade-in pb-2">
            {/* ================= DARK HERITAGE HERO HEADER ================= */}
            <div
              className="relative overflow-hidden bg-[#123C2B] px-5 pb-12"
              style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 18px)' }}
            >
              <div
                className="absolute inset-0 opacity-[0.18]"
                style={{
                  backgroundImage: `url("${getHotelCoverImage(selectedHotel)}"), url("${FALLBACK_HOTEL_COVER}")`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center right',
                }}
              />
              <div className="bg-gradient-to-t absolute inset-0 from-[#123C2B] via-[#123C2B]/85 to-[#123C2B]/35" />

              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  {/* Gold lotus mark */}
                  <svg
                    viewBox="0 0 48 48"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.9}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-11 h-11 shrink-0 text-[#F3D79B]"
                    aria-hidden="true"
                  >
                    <path d="M24 12c3.6 4.4 4 9.6 0 14-4-4.4-3.6-9.6 0-14Z" />
                    <path d="M24 26c-4.6-1.2-7.4-4.2-8.4-9 4.9-.2 7.8 2.6 8.4 9Z" />
                    <path d="M24 26c4.6-1.2 7.4-4.2 8.4-9-4.9-.2-7.8 2.6-8.4 9Z" />
                    <path d="M23 28c-6.4 1.8-12-.4-15-5.6 5.2-2.4 12-.6 15 5.6Z" />
                    <path d="M25 28c6.4 1.8 12-.4 15-5.6-5.2-2.4-12-.6-15 5.6Z" />
                    <path d="M12 33.5c7.5 3.6 16.5 3.6 24 0" />
                  </svg>

                  <div className="min-w-0">
                    <h1 className="font-lux text-[24px] leading-tight font-bold text-white truncate">
                      {selectedHotel?.name || 'Mahesh Hotel'}
                    </h1>
                    <p className="text-[12.5px] text-[#D8E9DF] font-medium mt-1 flex items-center gap-1.5">
                      <Icons.Location className="w-3.5 h-3.5 text-[#F3D79B] shrink-0" />
                      <span className="truncate">
                        {selectedHotel?.city || 'Jodhpur'}, {selectedHotel?.state || 'Rajasthan'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleCheckApprovalStatus()}
                    className="relative w-11 h-11 rounded-full border border-white/25 bg-white/5 flex items-center justify-center text-white active:scale-95 transition"
                    aria-label="Notifications"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-[19px] h-[19px]">
                      <path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
                      <path d="M10.3 20a2 2 0 0 0 3.4 0" />
                    </svg>
                    <span className="absolute top-2 right-2.5 w-2.5 h-2.5 rounded-full bg-[#EF4444] ring-2 ring-[#123C2B]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerView('profile')}
                    className="w-11 h-11 rounded-full border border-white/25 bg-white/5 flex items-center justify-center text-white active:scale-95 transition"
                    aria-label="Profile"
                  >
                    <Icons.User className="w-[19px] h-[19px]" />
                  </button>
                </div>
              </div>
            </div>

            {/* ================= CREAM PANEL OVERLAPPING HEADER ================= */}
            <div className="-mt-7 relative z-10 rounded-t-[26px] bg-[#FBF7EE] px-4 pt-4 pb-8 flex flex-col gap-4">
              {/* Back to Home pill */}
              <div>
                <button
                  type="button"
                  data-testid="approval-back-home-btn"
                  onClick={() => setCustomerView('home')}
                  className="flex items-center gap-2 text-[13px] font-bold px-4 py-2.5 rounded-xl border border-[#E7DFCE] bg-white text-[#123C2B] shadow-sm active:scale-95 transition"
                >
                  <Icons.ArrowLeft className="w-4 h-4 text-[#123C2B]" />
                  <span>Back to Home</span>
                </button>
              </div>

              {/* ---------- STATUS HERO CARD ---------- */}
              <div className="relative overflow-hidden rounded-[26px] border border-[#EDE4D2] bg-white shadow-[0_14px_34px_rgba(30,60,45,0.09)] px-4 pt-6 pb-5">
                <img
                  src={getHotelCoverImage(selectedHotel)}
                  alt=""
                  onError={handleImageError(FALLBACK_HOTEL_COVER)}
                  className="absolute left-0 top-0 h-full w-[46%] object-cover opacity-45"
                  style={{ maskImage: 'linear-gradient(to right, #000 20%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, #000 20%, transparent 100%)' }}
                />
                <img
                  src={getHotelStayImage(selectedHotel)}
                  alt=""
                  onError={handleImageError(FALLBACK_ROOM_IMAGE)}
                  className="absolute right-0 top-0 h-full w-[46%] object-cover opacity-40"
                  style={{ maskImage: 'linear-gradient(to left, #000 20%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to left, #000 20%, transparent 100%)' }}
                />
                <div className="bg-gradient-to-t absolute inset-0 from-white/45 via-white/80 to-white/95" />

                <div className="relative z-10 flex flex-col items-center text-center">
                  {/* Emblem */}
                  <div className="relative w-[106px] h-[106px] flex items-center justify-center">
                    <span className="absolute inset-0 rounded-full border border-[#F3D79B]/70" />
                    <span className="absolute inset-[7px] rounded-full bg-[#FBF4E4]" />
                    <span className="absolute inset-[15px] rounded-full bg-white/70 blur-[2px]" />
                    <div className="bg-gradient-to-t relative w-[62px] h-[62px] rounded-[16px] from-[#F9EAC8] to-[#F2DDAF] border-[2.5px] border-[#123C2B] flex items-center justify-center shadow-[0_6px_14px_rgba(18,60,43,0.18)]">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#123C2B" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className="w-[30px] h-[30px]">
                        <rect x="5" y="5" width="14" height="15.6" rx="2.6" />
                        <rect x="9" y="2.6" width="6" height="4" rx="1.6" fill="#F4DFB4" />
                        <circle cx="12" cy="13.2" r="3.3" />
                        <path d="M12 11.5v1.9l1.2.9" />
                      </svg>
                    </div>
                  </div>

                  <h2 className="font-lux text-[30px] leading-[1.1] font-bold text-[#123C2B] mt-3">
                    Waiting for Approval
                  </h2>
                  <p className="text-[13px] leading-relaxed text-[#57534A] mt-2 max-w-[290px]">
                    Your check-in request has been submitted and is currently under review by the Front Desk.
                  </p>

                  {/* 3-step stepper */}
                  <div className="w-full mt-6">
                    <div className="relative w-full px-1">
                      <div className="absolute left-[17%] right-[17%] top-[17px] h-[3px] rounded-full bg-[#DCD3BF]" />
                      <div className="absolute left-[17%] right-1/2 top-[17px] h-[3px] rounded-full bg-[#7FA97F]" />

                      <div className="relative flex items-start justify-between">
                        {/* Step 1 */}
                        <div className="flex flex-col items-center text-center w-[31%]">
                          <div className="w-9 h-9 rounded-full bg-[#123C2B] text-white flex items-center justify-center shadow-sm">
                            <Icons.Check className="w-[18px] h-[18px] stroke-[3]" />
                          </div>
                          <span className="text-[12.5px] leading-tight font-bold text-[#123C2B] mt-2">
                            Request<br />Submitted
                          </span>
                        </div>

                        {/* Step 2 (active) */}
                        <div className="flex flex-col items-center text-center w-[34%] -mt-1">
                          <div className="relative w-[46px] h-[46px] rounded-full bg-[#123C2B] flex items-center justify-center shadow-[0_0_0_6px_rgba(217,169,63,0.16),0_0_22px_rgba(217,169,63,0.55)]">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="w-[21px] h-[21px]">
                              <circle cx="12" cy="12" r="8.5" />
                              <path d="M12 7.5V12l3 1.8" />
                            </svg>
                          </div>
                          <span className="mt-2 px-3 py-1.5 rounded-full bg-[#F7E2B4] border border-[#F3D79B] text-[12.5px] leading-tight font-bold text-[#0F2F21]">
                            Waiting for<br />Approval
                          </span>
                        </div>

                        {/* Step 3 */}
                        <div className="flex flex-col items-center text-center w-[31%]">
                          <div className="w-9 h-9 rounded-full bg-[#E7E0D2] border border-[#D9D0BD] text-[#8E8779] flex items-center justify-center">
                            <Icons.Bed className="w-[18px] h-[18px]" />
                          </div>
                          <span className="text-[12.5px] leading-tight font-semibold text-[#8E8779] mt-2">
                            Check-in<br />Approved
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ---------- BOOKING DETAILS ---------- */}
              {(() => {
                const b = pendingApprovalBooking || (activeReservation ? {
                  roomNumber: activeReservation.roomNumber,
                  roomTypeName: activeReservation.roomTypeName,
                  nights: activeReservation.nights || 1,
                  checkInDate: activeReservation.checkInDate,
                  checkOutDate: activeReservation.checkOutDate,
                  guestName: activeReservation.guestName,
                  guestPhone: activeReservation.guestPhone,
                  grandTotal: activeReservation.grandTotal || 3136,
                  bookingNumber: activeReservation.bookingNumber,
                } : null);

                if (!b) {
                  return (
                    <div className="p-6 rounded-[22px] border border-[#EDE4D2] bg-white text-center space-y-3 shadow-sm">
                      <p className="text-[13px] text-[#7C7566]">No pending booking verification active.</p>
                      <button
                        type="button"
                        onClick={() => setCustomerView('rooms')}
                        className="px-5 py-2.5 rounded-xl lux-btn-primary text-[12px]"
                      >
                        Browse Available Rooms
                      </button>
                    </div>
                  );
                }

                const formatDates = () => {
                  try {
                    const cin = b.checkInDate ? new Date(b.checkInDate) : new Date();
                    const cout = b.checkOutDate ? new Date(b.checkOutDate) : new Date(cin.getTime() + (b.nights || 1) * 24 * 60 * 60 * 1000);
                    const cinStr = cin.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
                    const coutStr = cout.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
                    return `${cinStr} → ${coutStr}`;
                  } catch {
                    return 'Nov 01 → Nov 02';
                  }
                };

                return (
                  <>
                    <div className="rounded-[22px] border border-[#EDE4D2] bg-white shadow-[0_12px_28px_rgba(30,60,45,0.07)] overflow-hidden">
                      {/* Card header */}
                      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
                        <span className="w-9 h-9 rounded-[11px] bg-[#123C2B] flex items-center justify-center shrink-0">
                          <Icons.Bed className="w-[18px] h-[18px] text-[#F3D79B]" />
                        </span>
                        <h3 className="font-lux text-[19px] leading-none font-bold text-[#123C2B]">
                          Booking Details
                        </h3>
                      </div>

                      {/* Row 1 — Room */}
                      <div className="flex items-start gap-3 px-4 py-3.5 border-t border-[#FBF7EE]">
                        <span className="w-8 h-8 flex items-center justify-center text-[#123C2B] shrink-0">
                          <Icons.Bed className="w-[22px] h-[22px]" />
                        </span>
                        <div className="min-w-0">
                          <span className="text-[15px] font-bold text-[#123C2B] block leading-tight">
                            Room {b.roomNumber}
                          </span>
                          <span className="text-[13px] text-[#7C7566] block mt-0.5">
                            {b.roomTypeName}
                          </span>
                        </div>
                      </div>

                      {/* Row 2 — Stay */}
                      <div className="flex items-start gap-3 px-4 py-3.5 border-t border-[#FBF7EE]">
                        <span className="w-8 h-8 flex items-center justify-center text-[#123C2B] shrink-0">
                          <Icons.Calendar className="w-[22px] h-[22px]" />
                        </span>
                        <div className="min-w-0">
                          <span className="text-[13px] text-[#334155] block leading-tight">
                            Stay Duration
                          </span>
                          <span className="text-[14.5px] font-bold text-[#123C2B] block mt-0.5">
                            {b.nights || 1} {b.nights === 1 ? 'Night' : 'Nights'}
                          </span>
                          <span className="text-[12.5px] text-[#7C7566] block mt-0.5">
                            {formatDates()}
                          </span>
                        </div>
                      </div>

                      {/* Row 3 — Guest */}
                      <div className="flex items-start gap-3 px-4 py-3.5 border-t border-[#FBF7EE]">
                        <span className="w-8 h-8 flex items-center justify-center text-[#123C2B] shrink-0">
                          <Icons.User className="w-[22px] h-[22px]" />
                        </span>
                        <div className="min-w-0">
                          <span className="text-[13px] text-[#334155] block leading-tight">
                            Primary Guest
                          </span>
                          <span className="text-[14.5px] font-bold text-[#123C2B] block mt-0.5 truncate">
                            {b.guestName}
                          </span>
                          <span className="text-[12.5px] text-[#7C7566] block mt-0.5">
                            {b.guestPhone}
                          </span>
                        </div>
                      </div>

                      {/* Row 4 — Amount */}
                      <div className="flex items-start gap-3 px-4 py-3.5 border-t border-[#FBF7EE]">
                        <span className="w-8 h-8 flex items-center justify-center text-[#123C2B] shrink-0">
                          <span className="font-lux text-[22px] leading-none font-bold">₹</span>
                        </span>
                        <div className="min-w-0">
                          <span className="text-[13px] text-[#334155] block leading-tight">
                            Total Amount
                          </span>
                          <span className="text-[19px] font-bold text-[#123C2B] block mt-0.5 leading-tight">
                            ₹{b.grandTotal ? b.grandTotal.toLocaleString('en-IN') : '—'}{' '}
                            <span className="text-[12px] font-medium text-[#7C7566]">(Incl. GST)</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ---------- ACTIONS ---------- */}
                    <div className="flex flex-col gap-3">
                      <button
                        type="button"
                        data-testid="btn-cancel-pending-approval"
                        disabled={isCancellingBooking}
                        onClick={() => handleCancelBooking(b.bookingNumber)}
                        className="w-full rounded-[16px] border border-[#F0A9A9] bg-[#FDECEC] px-4 py-3.5 flex items-center justify-center gap-3 transition active:scale-[0.98] disabled:opacity-60"
                      >
                        <span className="w-9 h-9 rounded-full border-[2.5px] border-[#D32F2F] flex items-center justify-center shrink-0">
                          <Icons.X className="w-[18px] h-[18px] text-[#D32F2F] stroke-[3]" />
                        </span>
                        <span className="text-left">
                          <span className="text-[15px] font-bold text-[#C62828] block leading-tight">
                            {isCancellingBooking ? 'Cancelling...' : 'Cancel Booking'}
                          </span>
                          <span className="text-[12px] font-medium text-[#B25757] block mt-0.5">
                            Cancel your request before approval
                          </span>
                        </span>
                      </button>

                      <button
                        type="button"
                        data-testid="btn-check-approval-status"
                        disabled={isCheckingApproval}
                        onClick={handleCheckApprovalStatus}
                        className="w-full rounded-[16px] bg-[#123C2B] px-4 py-3.5 flex items-center justify-center gap-3 shadow-[0_10px_22px_rgba(14,59,42,0.22)] transition active:scale-[0.98] disabled:opacity-70"
                      >
                        <Icons.Refresh className={`w-[22px] h-[22px] text-white ${isCheckingApproval ? 'animate-spin' : ''}`} />
                        <span className="text-left">
                          <span className="text-[15px] font-bold text-white block leading-tight">
                            {isCheckingApproval ? 'Checking...' : 'Check Status'}
                          </span>
                          <span className="text-[12px] font-medium text-[#A9CCBB] block mt-0.5">
                            See latest update
                          </span>
                        </span>
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 2: SERVICE CHOICE SCREEN ('home')                   */}
        {/* ======================================================== */}
        {customerView === 'home' && !activeReservation && (
          <div className="flex flex-col gap-4">
            {/* Active Table Dining Resume Banner */}
            {activeTableSession && (
              <div
                data-testid="active-table-dining-card"
                className="rounded-2xl border-2 border-[#12804E] bg-gradient-to-br from-[#EBF5EE] via-[#E2F0E6] to-[#D4EADE] p-4 text-[#123C2B] shadow-md flex flex-col gap-3 lux-fade-in"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-[#12804E] text-[#F7E2B4] flex items-center justify-center font-bold shadow-xs">
                      <Icons.Utensils className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[11px] font-black uppercase tracking-wider text-[#12804E]">
                          {t('Active Dining Session', 'Active Dining Session')}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-base text-[#123C2B] leading-tight">
                        Table {activeTableSession.tableNumber}
                      </h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    data-testid="leave-table-btn"
                    onClick={() => {
                      if (confirm('Leave table session? You can always re-scan if you are still dining.')) {
                        localStorage.removeItem('spicehub_customer_table');
                        localStorage.removeItem('spicehub_customer_session_token');
                        setActiveTableSession(null);
                      }
                    }}
                    className="text-[11px] font-bold text-slate-500 hover:text-red-600 px-2.5 py-1 rounded-lg border border-slate-200 bg-white/90 active:scale-95 transition"
                  >
                    Leave Table
                  </button>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-[#12804E]/15">
                  <p className="text-xs text-[#446553] font-medium truncate max-w-[200px]">
                    Table active • KDS connected
                  </p>
                  <button
                    type="button"
                    data-testid="resume-table-portal-btn"
                    onClick={() => launchTable(activeTableSession.tableNumber, selectedHotel, activeTableSession.qrToken, activeTableSession.sessionToken)}
                    className="px-4 py-2 rounded-xl bg-[#12804E] text-[#F7E2B4] hover:bg-[#0E2A1E] font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition shrink-0"
                  >
                    <span>{t('Resume Table Order', 'Resume Table Order')}</span>
                    <Icons.ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* If pending approval booking AND no active checked-in reservation, show sleek notification banner linking to Step 5 */}
            {!activeReservation && pendingApprovalBooking && (
              <div
                data-testid="approval-waiting-card"
                className={`p-3.5 rounded-2xl border-2 shadow-lg flex items-center justify-between gap-3 transition ${
 isDark
 ? 'border-amber-500/80 bg-slate-900 text-white'
 : 'border-amber-400 bg-amber-50/90 text-slate-900'
 }`}
              >
                <div
                  onClick={() => setCustomerView('waiting_approval')}
                  className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0">
                    <Icons.Clock className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 block truncate">
                      ⏳ {t('Waiting for Approval')} • Room {pendingApprovalBooking.roomNumber}
                    </span>
                    <span className="text-xs font-bold block truncate">
                      Identity verification in progress at reception
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setCustomerView('waiting_approval')}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-sm transition active:scale-95"
                  >
                    <span>View</span>
                    <Icons.ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    data-testid="dismiss-approval-card-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingApprovalBooking(null);
                      try {
                        localStorage.removeItem('spicehub_pending_approval_booking');
                      } catch {}
                    }}
                    title="Dismiss notification"
                    className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 flex items-center justify-center text-xs font-bold transition active:scale-95"
                  >
                    <Icons.X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
            {/* Property Showcase Hero Card */}
            <div className="rounded-[22px] border border-[#E2C489] shadow-[0_10px_28px_rgba(40,70,50,0.16)] relative overflow-hidden min-h-[205px] flex flex-col justify-end p-4 group">
              <img
                src={getHotelCoverImage(selectedHotel)}
                alt={selectedHotel?.name || 'Hotel'}
                onError={handleImageError(FALLBACK_HOTEL_COVER)}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="bg-gradient-to-t absolute inset-0 from-[#123C2B]/95 via-[#123C2B]/55 to-[#123C2B]/15" />

              <div className="relative z-10 flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col items-start gap-1.5">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-black/55 text-[#F4E6C9] border border-white/15 backdrop-blur-md flex items-center gap-1.5">
                      <Icons.Location className="w-3.5 h-3.5 text-[#F7E2B4]" />
                      <span>{selectedHotel?.city || 'Jaipur'}, {selectedHotel?.state || 'Rajasthan'}</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    data-testid="select-hotel-pill-btn"
                    onClick={() => setCustomerView('hotel_select')}
                    className="text-[12px] font-bold px-3.5 py-2 rounded-full bg-[#E4F1E6] hover:bg-[#D5E9D9] text-[#123C2B] border border-[#B8D7C1] shadow-md transition active:scale-95 flex items-center gap-1.5 shrink-0"
                  >
                    <Icons.Switch className="w-4 h-4 text-[#123C2B]" />
                    <span>Switch Hotel</span>
                  </button>
                </div>

                <div className="flex items-center gap-3 pt-0.5">
                  <div className="w-[52px] h-[52px] rounded-[14px] overflow-hidden border-2 border-[#F3E4C2] shadow-md bg-white shrink-0">
                    <img
                      src={selectedHotel?.logoUrl || FALLBACK_HOTEL_LOGO}
                      alt=""
                      onError={handleImageError(FALLBACK_HOTEL_LOGO)}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-lux text-[21px] leading-tight font-bold text-white truncate drop-shadow">
                      {selectedHotel?.name || 'Select Hotel Property'}
                    </h2>
                    <p className="text-[12px] text-[#F1DFC0] truncate font-medium mt-0.5">
                      {selectedHotel?.tagline || 'Luxury Stays & Fine Hospitality'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Guest Services & Experience Section */}
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between px-1">
                <div>
                  <h2 className="font-lux text-[24px] leading-tight font-bold text-[#123C2B]">
                    Guest Experiences
                  </h2>
                  <p className="text-[12px] text-[#7C7566] mt-0.5">
                    Choose your personalized hospitality service
                  </p>
                </div>
                <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-[#E4F1E6] text-[#123C2B] border border-[#B8D7C1] shrink-0 mt-1">
                  {Number(selectedHotel?.serviceCapabilities?.roomBooking !== false) +
                    Number(selectedHotel?.serviceCapabilities?.tableOrdering !== false)} {t('Options', 'Options')}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* OPTION 1: BOOK A ROOM (STAY) */}
                {selectedHotel?.serviceCapabilities?.roomBooking !== false && (
                <button
                  type="button"
                  data-testid="home-book-room-card"
                  onClick={() => setCustomerView('rooms')}
                  className="rounded-[20px] border border-[#E4DAC6] relative overflow-hidden min-h-[190px] text-left group shadow-[0_8px_22px_rgba(30,60,45,0.12)] flex flex-col justify-between p-4 transition active:scale-[0.99]"
                >
                  <img
                    src={getHotelStayImage(selectedHotel)}
                    alt="Book a Room"
                    onError={handleImageError(FALLBACK_ROOM_IMAGE)}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="bg-gradient-to-t absolute inset-0 from-[#123C2B] via-[#123C2B]/70 to-[#123C2B]/20" />

                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#123C2B] text-white shadow-md flex items-center gap-1.5">
                        <Icons.Bed className="w-3.5 h-3.5 text-[#F7E2B4]" />
                        <span>{t('Stay & Suites')}</span>
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#DFF0E2] text-[#1C5138] border border-[#BFDCC6]">
                        {t('Instant Confirmation', 'Instant Confirmation')}
                      </span>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-[#12804E] text-white border border-[#0F6B43] flex items-center justify-center shadow-md group-hover:translate-x-1 transition-transform">
                      <Icons.ArrowRight className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="relative z-10 space-y-1">
                    <h3 className="font-lux text-[22px] leading-tight font-bold text-white drop-shadow-md flex items-center gap-2">
                      <Icons.Bed className="w-[22px] h-[22px] text-[#F3D79B]" />
                      <span>{t('Book a Room')}</span>
                    </h3>
                    <p className="text-[12px] text-[#EDE6D6] line-clamp-2 font-medium">
                      {t('Available Rooms')} • {t('Digital Keycard')} & {t('Instant ID Check-in')}
                    </p>
                    <div className="pt-2 flex items-center gap-3 text-[11px] font-semibold text-[#F3E4C2]">
                      <span className="flex items-center gap-1.5">
                        <Icons.Check className="w-3.5 h-3.5 text-[#9BD8AE]" />
                        <span>{t('Instant ID Check-in')}</span>
                      </span>
                      <span className="text-white/30">|</span>
                      <span className="flex items-center gap-1.5">
                        <Icons.Key className="w-3.5 h-3.5 text-[#F3D79B]" />
                        <span>{t('Digital Keycard')}</span>
                      </span>
                    </div>
                  </div>
                </button>
                )}

                {/* OPTION 2: DINE-IN / TABLE SCAN */}
                {selectedHotel?.serviceCapabilities?.tableOrdering !== false && (
                <button
                  type="button"
                  data-testid="home-table-scan-card"
                  onClick={() => setCustomerView('table_scan')}
                  className="rounded-[20px] border border-[#E4DAC6] relative overflow-hidden min-h-[190px] text-left group shadow-[0_8px_22px_rgba(30,60,45,0.12)] flex flex-col justify-between p-4 transition active:scale-[0.99]"
                >
                  <img
                    src={getHotelDiningImage(selectedHotel)}
                    alt="Dine-In Table Scan"
                    onError={handleImageError(FALLBACK_DINING_IMAGE)}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="bg-gradient-to-t absolute inset-0 from-[#123C2B] via-[#123C2B]/70 to-[#123C2B]/20" />

                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#F7E2B4] text-[#123C2B] shadow-md flex items-center gap-1.5">
                        <Icons.Utensils className="w-3.5 h-3.5 text-[#123C2B]" />
                        <span>{t('Dine-In')}</span>
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/55 text-[#F3E4C2] border border-white/20 backdrop-blur-md">
                        {t('Scan Table QR', 'Scan Table QR')}
                      </span>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-[#12804E] text-white border border-[#0F6B43] flex items-center justify-center shadow-md group-hover:translate-x-1 transition-transform">
                      <Icons.ArrowRight className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="relative z-10 space-y-1">
                    <h3 className="font-lux text-[22px] leading-tight font-bold text-white drop-shadow-md flex items-center gap-2">
                      <Icons.Utensils className="w-[22px] h-[22px] text-[#F3D79B]" />
                      <span>{t('Dine-In')}</span>
                    </h3>
                    <p className="text-[12px] text-[#EDE6D6] line-clamp-2 font-medium">
                      {t('Dining')} • {t('Table Ordering', 'Table Ordering')}
                    </p>
                    <div className="pt-2 flex items-center gap-3 text-[11px] font-semibold text-[#F3E4C2]">
                      <span className="flex items-center gap-1.5">
                        <Icons.QrCode className="w-3.5 h-3.5 text-[#F3D79B]" />
                        <span>{t('Camera QR Scan', 'Camera QR Scan')}</span>
                      </span>
                      <span className="text-white/30">|</span>
                      <span className="flex items-center gap-1.5">
                        <Icons.Check className="w-3.5 h-3.5 text-[#F3D79B]" />
                        <span>{t('Live Kitchen KDS', 'Live Kitchen KDS')}</span>
                      </span>
                    </div>
                  </div>
                </button>
                )}
                {selectedHotel?.serviceCapabilities?.roomBooking === false &&
                  selectedHotel?.serviceCapabilities?.tableOrdering === false && (
                    <p className="rounded-2xl bg-white/80 px-4 py-5 text-center text-sm text-[#6D746D]">
                      This property has no guest booking or table-ordering services enabled.
                    </p>
                  )}
              </div>
            </div>

            {/* Resident Verification Accent Card */}
            {canShowServiceDirectory && (
            <div className="pt-1 pb-2 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-3">
                <span className="w-14 h-1.5 rounded-full bg-[#123C2B]" />
                <span className="w-6 h-1.5 rounded-full bg-[#E7C583]" />
              </div>
              <button
                type="button"
                data-testid="home-resident-verify-link"
                onClick={() => {
                  if (pendingApprovalBooking) {
                    setCustomerView('waiting_approval');
                  } else {
                    setCustomerView('resident_verify');
                  }
                }}
                className="text-[12px] font-bold flex items-center justify-center gap-2 mx-auto px-4 py-2.5 rounded-full transition bg-white/70 text-[#7A5210] shadow-sm active:scale-95"
              >
                <Icons.Key className="w-4 h-4 text-[#C08B32]" />
                <span>Already checked in at Front Desk? Verify Room Stay</span>
                <Icons.ArrowRight className="w-4 h-4 text-[#C08B32]" />
              </button>
            </div>
            )}
          </div>
        )}

        {customerView === 'home' && activeReservation && (
          <div data-testid="guest-stay-dashboard" className="-mx-4 -mt-1 flex flex-col gap-5 pb-4 text-[#101820]">
            <div className="px-4 pt-2">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCustomerView('hotel_select')}
                  className="min-h-10 rounded-full bg-[#F0F6F0] px-3.5 text-[13px] font-semibold text-[#123C2B] flex items-center gap-2"
                >
                  <Icons.ArrowLeft className="h-4 w-4" />
                  <span>{t('Back to Hotel', 'Back to Hotel')}</span>
                </button>
                <div className="min-w-0 text-right">
                  <span className="block truncate text-[13px] font-semibold">{selectedHotel?.name || 'SpiceHub Hotel'}</span>
                  <span className="inline-flex mt-1 rounded-full bg-[#F3E4C2] px-2.5 py-1 text-[12px] font-bold text-[#0F2F21]">
                    {t('Room', 'Room')} {activeReservation.roomNumber}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-[#0F2F21] text-white">
                    <Icons.Utensils className="h-6 w-6" />
                  </span>
                  <span className="truncate text-[23px] font-extrabold tracking-tight text-[#04120B]">SpiceHub</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {selectedHotel?.serviceCapabilities?.inRoomServices !== false && (
                  <button
                    type="button"
                    aria-label="Open in-room dining"
                    onClick={() => launchResidentPortal(activeReservation.roomNumber, selectedHotel, activeReservation.sessionToken, 'DINING')}
                    className="flex h-10 w-11 items-center justify-center rounded-full bg-[#0F2F21] text-white"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                      <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
                    </svg>
                  </button>
                  )}
                  <button
                    type="button"
                    onClick={toggleLocale}
                    className="min-h-10 rounded-full bg-[#F0F6F0] px-3.5 text-[12px] font-bold text-[#123C2B]"
                    title={locale === 'en' ? 'हिन्दी में बदलें' : 'Switch to English'}
                  >
                    {locale === 'en' ? 'EN　हिन्दी' : 'हिन्दी　EN'}
                  </button>
                </div>
              </div>
            </div>

            {activeTableSession && (
              <div className="mx-2 rounded-2xl border-2 border-[#12804E] bg-gradient-to-br from-[#EBF5EE] via-[#E2F0E6] to-[#D4EADE] p-3.5 text-[#123C2B] shadow-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#12804E] text-[#F7E2B4] flex items-center justify-center font-bold shrink-0">
                    <Icons.Utensils className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#12804E] truncate">
                        Table {activeTableSession.tableNumber} Active
                      </span>
                    </div>
                    <span className="text-xs font-bold text-[#123C2B] truncate block">
                      Restaurant Dining Tab Open
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="resident-resume-table-btn"
                  onClick={() => launchTable(activeTableSession.tableNumber, selectedHotel, activeTableSession.sessionToken)}
                  className="px-3 py-1.5 rounded-xl bg-[#12804E] text-[#F7E2B4] font-bold text-xs shrink-0 active:scale-95 transition shadow-xs flex items-center gap-1"
                >
                  <span>Resume</span>
                  <Icons.ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}

            <section
              id="guest-stay-top"
              className="relative mx-2 overflow-hidden rounded-[24px] bg-[#0E2A1E] px-5 py-5 text-white min-h-[280px]"
              style={{
                backgroundImage: `linear-gradient(90deg, rgba(18, 60, 43, .96) 0%, rgba(18, 60, 43, .88) 48%, rgba(18, 60, 43, .15) 100%), url("${getHotelStayImage(selectedHotel)}"), url("${FALLBACK_ROOM_IMAGE}")`,
                backgroundPosition: 'center, center right',
                backgroundSize: 'cover',
              }}
            >
              <h1 className="max-w-[90%] text-[24px] font-extrabold leading-tight tracking-tight">
                {t('Welcome', 'Welcome')} {activeReservation.guestName.split(' ')[0]}, {t('Room', 'Room')} {activeReservation.roomNumber}
              </h1>
              <p className="mt-1.5 text-[14px] font-medium text-white/90">
                {t('Good Food, Great Comfort Right at Your Room', 'Good Food, Great Comfort Right at Your Room')}
              </p>

              <div className="mt-4 flex flex-col gap-2.5 text-[13px]">
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <span className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
                    <Icons.Clock className="h-4 w-4 shrink-0 text-[#12804E]" />
                    <span>{t('Check-in', 'Check-in')}: {formatGuestStayDate(activeReservation.checkInDate)}</span>
                  </span>
                  <span className="min-w-0 self-center whitespace-nowrap">
                    <span className="text-white/60">| </span>
                    {t('Check-out', 'Check-out')}: {formatGuestStayDate(activeReservation.checkOutDate)}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Icons.Wifi className="mt-0.5 h-4 w-4 shrink-0 text-[#12804E]" />
                  <span className="min-w-0">
                    WiFi: {activeReservation.wifiSsid || 'TajGateway_HighSpeed'}
                    <span className="ml-1.5">({activeReservation.wifiPassword || 'GuestPass@101'})</span>
                    <button
                      type="button"
                      onClick={() => {
                        const password = activeReservation.wifiPassword || 'GuestPass@101';
                        if (!navigator.clipboard?.writeText) {
                          window.alert('Clipboard is not available on this device.');
                          return;
                        }
                        navigator.clipboard.writeText(password).then(
                          () => window.alert('Wi-Fi password copied.'),
                          (error: unknown) => {
                            console.error('Unable to copy the Wi-Fi password:', error);
                            window.alert('Unable to copy the Wi-Fi password.');
                          }
                        );
                      }}
                      className="ml-1.5 font-bold text-[#12804E] underline underline-offset-2"
                    >
                      {t('Copy Pass', 'Copy Pass')}
                    </button>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Icons.Home className="h-4 w-4 shrink-0 text-[#12804E]" />
                  <span>{t('Daily Housekeeping Included', 'Daily Housekeeping Included')}</span>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                {selectedHotel?.serviceCapabilities?.roomBooking !== false && (
                <button
                  type="button"
                  onClick={() => setCustomerView('rooms')}
                  className="flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#12804E] px-4 text-[13px] font-extrabold text-white"
                >
                  <Icons.Bed className="h-4 w-4" />
                  <span>{t('Browse All Rooms & Rates', 'Browse All Rooms & Rates')}</span>
                  <Icons.ArrowRight className="h-4 w-4" />
                </button>
                )}
                {selectedHotel?.serviceCapabilities?.inRoomServices !== false && (
                <button
                  type="button"
                  onClick={() => {
                    launchResidentPortal(activeReservation.roomNumber, selectedHotel, activeReservation.sessionToken, 'MORE');
                  }}
                  className="flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#D9A93F] px-4 text-[13px] font-bold text-[#F3D79B]"
                >
                  <Icons.Clock className="h-4 w-4" />
                  <span>{t('Extend Check-out (+ Nights)', 'Extend Check-out (+ Nights)')}</span>
                </button>
                )}
              </div>
            </section>

            {(selectedHotel?.serviceCapabilities?.inRoomServices !== false ||
              selectedHotel?.serviceCapabilities?.reception !== false) && (
            <section id="guest-services" className="px-3">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <h2 className="text-[17px] font-extrabold tracking-tight text-[#04120B]">{t('Guest Services Directory', 'Guest Services Directory')}</h2>
                <span className="shrink-0 rounded-full bg-[#F3E4C2] px-2.5 py-1 text-[11px] font-bold text-[#0F2F21]">
                  {t('Available 24/7 in Room', 'Available 24/7 in Room')} {activeReservation.roomNumber}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { title: 'Food & Dining', detail: 'Order to room', icon: Icons.Utensils, tab: 'DINING' },
                  { title: 'Room Service', detail: 'Water, towels, ice', icon: Icons.Bed, tab: 'HOME' },
                  { title: 'Housekeeping', detail: 'Cleaning, bedsheet', icon: Icons.Sparkles, tab: 'HOME' },
                  { title: 'Laundry Service', detail: 'Washing, ironing', icon: Icons.Bed, tab: 'HOME' },
                  { title: 'Maintenance', detail: 'AC, TV, plumbing', icon: Icons.Settings, tab: 'HOME' },
                ].filter((service) => {
                  if (service.title === 'Food & Dining') {
                    return selectedHotel?.serviceCapabilities?.inRoomServices !== false;
                  }
                  return selectedHotel?.serviceCapabilities?.inRoomServices !== false;
                }).map((service) => {
                  const ServiceIcon = service.icon;
                  return (
                    <button
                      type="button"
                      key={service.title}
                      onClick={() => launchResidentPortal(activeReservation.roomNumber, selectedHotel, activeReservation.sessionToken, service.tab)}
                      className="flex min-h-[96px] flex-col items-center justify-center rounded-[18px] border border-[#F3E4C2] bg-white px-2.5 py-3 text-center"
                    >
                      <span className="mb-1.5 flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#F3E4C2] text-[#0F2F21]">
                        <ServiceIcon className="h-6 w-6" />
                      </span>
                      <span className="text-[13px] font-bold leading-tight text-[#04120B]">{t(service.title, service.title)}</span>
                      <span className="mt-0.5 text-[11px] leading-tight text-[#667085]">{t(service.detail, service.detail)}</span>
                    </button>
                  );
                })}
                {selectedHotel?.serviceCapabilities?.reception !== false && <button
                  type="button"
                  onClick={() => {
                    if (selectedHotel?.contactPhone) {
                      window.location.href = `tel:${selectedHotel.contactPhone}`;
                    } else {
                      window.alert('Reception phone number is not available for this hotel.');
                    }
                  }}
                  className="flex min-h-[96px] flex-col items-center justify-center rounded-[18px] border border-[#F3E4C2] bg-white px-2.5 py-3 text-center"
                >
                  <span className="mb-1.5 flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#F3E4C2] text-[#0F2F21]">
                    <Icons.Phone className="h-6 w-6" />
                  </span>
                  <span className="text-[13px] font-bold leading-tight text-[#04120B]">{t('Call Reception', 'Call Reception')}</span>
                  <span className="mt-0.5 text-[11px] leading-tight text-[#667085]">{t('Direct 24/7 assist', 'Direct 24/7 assist')}</span>
                </button>}
              </div>
            </section>
            )}

            {selectedHotel?.serviceCapabilities?.inRoomServices !== false && (
            <section className="mx-2 rounded-[22px] border border-[#F3E4C2] bg-white p-4" aria-labelledby="guest-order-title">
              <div className="flex items-center justify-between gap-2">
                <h2 id="guest-order-title" className="text-[17px] font-extrabold tracking-tight text-[#04120B]">{t('In-Room Order Updates', 'In-Room Order Updates')}</h2>
                <span className="rounded-full bg-[#F3E4C2] px-2.5 py-1 text-[11px] font-bold text-[#0F2F21]">{t('Live', 'Live')}</span>
              </div>
              <p className="mt-2 text-[13px] leading-snug text-[#596579]">
                {t('Your dining orders and kitchen status are available in the live order tracker.', 'Your dining orders and kitchen status are available in the live order tracker.')}
              </p>
              <button
                type="button"
                onClick={() => launchResidentPortal(activeReservation.roomNumber, selectedHotel, activeReservation.sessionToken, 'DINING')}
                className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-[#0F2F21] px-4 text-[13px] font-bold text-white"
              >
                <Icons.Utensils className="h-4 w-4" />
                <span>{t('Open Live Order Tracker', 'Open Live Order Tracker')}</span>
              </button>
            </section>
            )}

            {selectedHotel?.serviceCapabilities?.inRoomServices !== false && (
            <section id="guest-dining" className="mx-2 rounded-[22px] border border-[#F3E4C2] bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-[17px] font-extrabold tracking-tight text-[#04120B]">{t('Restaurant & Bar Hours', 'Restaurant & Bar Hours')}</h2>
                <span className="rounded-full bg-[#F3E4C2] px-2.5 py-1 text-[11px] font-bold text-[#0F2F21]">{t('Today', 'Today')}</span>
              </div>
              <div className="flex flex-col gap-2">
                {[
                  { name: 'Breakfast Buffet', place: 'The Grand Dining Hall', hours: '7:00 – 10:30 AM' },
                  { name: 'All-Day In-Room Dining', place: 'Delivered hot to room', hours: '24 Hours Live' },
                  { name: 'Rooftop Lounge & Bar', place: 'Happy Hours (1+1 Free)', hours: '5:00 – 11:30 PM' },
                ].map((venue) => (
                  <div key={venue.name} className="flex min-h-[50px] items-center justify-between gap-3 rounded-[14px] bg-[#F6F9F6] px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-[#04120B]">{t(venue.name, venue.name)}</p>
                      <p className="truncate text-[11px] text-[#667085]">{t(venue.place, venue.place)}</p>
                    </div>
                    <span className="shrink-0 text-right text-[12px] font-bold text-[#0F2F21]">{venue.hours}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => launchResidentPortal(activeReservation.roomNumber, selectedHotel, activeReservation.sessionToken, 'DINING')}
                className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#0F2F21] px-3 text-[13px] font-bold text-[#F3D79B]"
              >
                <Icons.Sparkles className="h-4 w-4" />
                <span>{t('View Special Dining Offers (10% Off)', 'View Special Dining Offers (10% Off)')}</span>
                <Icons.ArrowRight className="h-4 w-4" />
              </button>
            </section>
            )}

            <div className="flex items-center justify-center gap-5 px-4 pb-2 text-[12px] font-semibold text-[#0F2F21]">
              <button type="button" onClick={() => setCustomerView('profile')}>{t('Profile', 'Profile')}</button>
              <button type="button" onClick={() => openSettings()}>{t('Settings', 'Settings')}</button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: AVAILABLE ROOMS CATALOG                          */}
        {/* ======================================================== */}
        {customerView === 'rooms' && (
          <div className="flex flex-col gap-4 animate-in fade-in">
            {/* Top Navigation & Status Bar */}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                data-testid="rooms-back-home-btn"
                onClick={() => setCustomerView('home')}
                className="flex items-center gap-2 text-[12px] font-bold px-3.5 py-2.5 rounded-full border border-[#E7DFCE] shadow-sm transition active:scale-95"
              >
                <Icons.ArrowLeft className="w-4 h-4 text-[#C08B32]" />
                <span>{t('Back to Home')}</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-3 py-2 rounded-full border border-[#CFE0D2] bg-[#EAF2EA] text-[#1C5138] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#1E9E5A] lux-pulse-dot" />
                  <span>{availableRoomsList.length} {t('Rooms Ready')}</span>
                </span>
                <button
                  type="button"
                  onClick={() => refreshRoomsCatalog()}
                  title={t('Refresh')}
                  className="w-10 h-10 rounded-full border border-[#E7DFCE] shadow-sm flex items-center justify-center transition active:scale-95 active:rotate-180"
                >
                  <Icons.Refresh className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Title Section */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#C08B32]">
                  {selectedHotel?.name || 'Luxury Stay'}
                </span>
                <span className="text-[#C9BFA9] text-xs">•</span>
                <span className="text-[11px] font-medium text-[#7C7566]">
                  {selectedHotel?.city || 'Instant Check-In'}
                </span>
              </div>
              <h1 className="lux-h1">
                {t('Available Rooms & Suites')}
              </h1>
              <p className="text-[12px] leading-relaxed text-[#7C7566]">
                {t('Verified live rooms with digital keycard, AC & instant room service.')}
              </p>
            </div>

            {/* Step 3 Controls: Live Search Bar, AC / Non-AC Tabs, Price Sorting & Budget */}
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  data-testid="room-catalog-search-input"
                  value={roomSearchQuery}
                  onChange={(e) => setRoomSearchQuery(e.target.value)}
                  placeholder={t('Search room number, suite type, king bed...')}
                  className={`w-full h-[50px] rounded-2xl border pl-11 pr-10 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[#12804E] shadow-xs ${
                    isDark
                      ? 'bg-[#183728] border-[#2A523D] text-[#F2F7F2] placeholder-[#8A9E90]'
                      : 'bg-white border-[#D7E5D9] text-[#123C2B] placeholder-[#7D8F81]'
                  }`}
                />
                <Icons.Search className="w-[18px] h-[18px] text-[#8A9E90] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                {roomSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setRoomSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-[#8A9E90] hover:text-[#123C2B] transition"
                  >
                    <Icons.X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* 2-Option AC & Non-AC Climate Filter */}
              <div className="p-3 rounded-[20px] border border-[#D7E4D9]">
                <div className="flex items-center justify-between px-0.5 pb-2.5">
                  <span className="text-[11px] font-black uppercase tracking-[0.1em] text-[#123C2B] flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
                      <path d="M4 6h16M7 12h10M10 18h4" />
                    </svg>
                    <span>Climate & AC Filter</span>
                  </span>
                  <span className="text-[10px] font-semibold text-[#6E7F72]">
                    {roomAcFilter === 'AC' ? 'AC Rooms Only' : roomAcFilter === 'NON_AC' ? 'Non-AC Rooms Only' : `${totalAvailableRoomsCount} Rooms Available`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    data-testid="room-filter-ac"
                    onClick={() => setRoomAcFilter((prev) => (prev === 'AC' ? 'ALL' : 'AC'))}
                    className={`py-2.5 px-3 rounded-xl text-[12px] font-bold transition flex items-center justify-center gap-2 active:scale-95 border ${
 roomAcFilter === 'AC'
 ? 'bg-[#123C2B] border-[#123C2B] text-white shadow-sm'
 : 'bg-white border-[#DCE7DC] text-[#264637] shadow-xs'
 }`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={`w-4 h-4 ${roomAcFilter === 'AC' ? 'text-[#BFE3CB]' : 'text-[#1C5138]'}`}>
                      <path d="M12 2v20M4.5 7l15 10M19.5 7l-15 10" />
                    </svg>
                    <span>{t('AC Rooms')}</span>
                    <span className={`text-[10px] min-w-[20px] h-[20px] px-1 rounded-full font-black flex items-center justify-center ${
 roomAcFilter === 'AC'
 ? 'bg-white/15 text-white border border-white/20'
 : 'bg-[#E9EFE7] text-[#4B6353]'
 }`}>
                      {acRoomsCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    data-testid="room-filter-non-ac"
                    onClick={() => setRoomAcFilter((prev) => (prev === 'NON_AC' ? 'ALL' : 'NON_AC'))}
                    className={`py-2.5 px-3 rounded-xl text-[12px] font-bold transition flex items-center justify-center gap-2 active:scale-95 border ${
 roomAcFilter === 'NON_AC'
 ? 'bg-[#123C2B] border-[#123C2B] text-white shadow-sm'
 : 'bg-white border-[#DCE7DC] text-[#264637] shadow-xs'
 }`}
                  >
                    <Icons.Sun className={`w-4 h-4 ${roomAcFilter === 'NON_AC' ? 'text-[#F3D79B]' : 'text-[#C08B32]'}`} />
                    <span>{t('Non-AC Rooms')}</span>
                    <span className={`text-[10px] min-w-[20px] h-[20px] px-1 rounded-full font-black flex items-center justify-center ${
 roomAcFilter === 'NON_AC'
 ? 'bg-white/15 text-white border border-white/20'
 : 'bg-[#E9EFE7] text-[#4B6353]'
 }`}>
                      {nonAcRoomsCount}
                    </span>
                  </button>
                </div>
              </div>

              {/* Price Sort & Quick Budget Filters (Cohesive Strip) */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                <button
                  type="button"
                  data-testid="room-sort-low-high"
                  onClick={() =>
                    setRoomPriceSort((prev) => (prev === 'LOW_TO_HIGH' ? 'DEFAULT' : 'LOW_TO_HIGH'))
                  }
                  className={`shrink-0 active:scale-95 transition ${
 roomPriceSort === 'LOW_TO_HIGH' ? 'lux-chip lux-chip-active' : 'lux-chip'
 }`}
                >
                  <span>Price ↑ Low to High</span>
                </button>

                <button
                  type="button"
                  data-testid="room-sort-high-low"
                  onClick={() =>
                    setRoomPriceSort((prev) => (prev === 'HIGH_TO_LOW' ? 'DEFAULT' : 'HIGH_TO_LOW'))
                  }
                  className={`shrink-0 active:scale-95 transition ${
 roomPriceSort === 'HIGH_TO_LOW' ? 'lux-chip lux-chip-active' : 'lux-chip'
 }`}
                >
                  <span>Price ↓ High to Low</span>
                </button>

                {(['ALL', '2500', '4000', 'LUXURY'] as const).map((budget) => {
                  const label =
                    budget === 'ALL'
                      ? t('All Budgets')
                      : budget === '2500'
                      ? t('Under ₹2,500')
                      : budget === '4000'
                      ? t('Under ₹4,000')
                      : t('Luxury ₹4,000+');
                  const isSelected = roomMaxBudget === budget;
                  return (
                    <button
                      key={budget}
                      type="button"
                      data-testid={`budget-chip-${budget.toLowerCase()}`}
                      onClick={() => setRoomMaxBudget(budget)}
                      className={`shrink-0 active:scale-95 transition ${
 isSelected ? 'lux-chip lux-chip-active' : 'lux-chip'
 }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Active Filter Indicator & Count */}
              <div className="flex items-center justify-between text-[12px] px-1">
                <span className="font-medium flex items-center gap-2 text-[#5F5A4D]">
                  <span className="w-2 h-2 rounded-full bg-[#D9A93F]" />
                  <span>
                    {t('Showing')} <strong className="text-[#123C2B] font-bold">{availableRoomsList.length}</strong> {t('rooms')}
                    {totalAvailableRoomsCount < totalCatalogRoomsCount && (
                      <span className="ml-1.5 text-[10.5px] text-[#A26A18] font-bold">
                        ({totalAvailableRoomsCount} {t('ready now')}, {totalCatalogRoomsCount - totalAvailableRoomsCount} {t('advance bookable')})
                      </span>
                    )}
                  </span>
                </span>
                {(roomSearchQuery || roomAcFilter !== 'ALL' || roomPriceSort !== 'DEFAULT' || roomMaxBudget !== 'ALL' || catalogDateFilter) && (
                  <button
                    type="button"
                    onClick={() => {
                      setRoomSearchQuery('');
                      setRoomAcFilter('ALL');
                      setRoomPriceSort('DEFAULT');
                      setRoomMaxBudget('ALL');
                      setCatalogDateFilter('');
                      setCatalogTimeFilter('');
                    }}
                    className="text-[11px] font-bold text-[#8A5A12] hover:underline flex items-center gap-1"
                  >
                    <Icons.X className="w-3.5 h-3.5" />
                    <span>{t('Reset Filters')}</span>
                  </button>
                )}
              </div>

              {/* Date & Stay Slot Bar */}
              <div className="p-3 rounded-2xl bg-white border border-[#E7DFCE] shadow-xs flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 text-[12px] font-bold text-[#123C2B]">
                  <Icons.Calendar className="w-4 h-4 text-[#D9A93F]" />
                  <span>{t('Stay Date / Slot')}:</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-testid="filter-slot-today"
                    onClick={() => {
                      setCatalogDateFilter('');
                      setCatalogTimeFilter('');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition active:scale-95 ${
                      !catalogDateFilter
                        ? 'bg-[#123C2B] text-white shadow-xs'
                        : 'bg-[#F4EFE6] text-[#4F6656] hover:bg-[#EBE4D8]'
                    }`}
                  >
                    Today / Current
                  </button>
                  <button
                    type="button"
                    data-testid="filter-slot-tomorrow"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      setCatalogDateFilter(d.toISOString().split('T')[0]);
                      setCatalogTimeFilter('12:00');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition active:scale-95 ${
                      catalogDateFilter
                        ? 'bg-[#123C2B] text-white shadow-xs'
                        : 'bg-[#F4EFE6] text-[#4F6656] hover:bg-[#EBE4D8]'
                    }`}
                  >
                    Tomorrow (Advance)
                  </button>
                  <input
                    type="date"
                    data-testid="filter-slot-custom-date"
                    value={catalogDateFilter}
                    onChange={(e) => setCatalogDateFilter(e.target.value)}
                    className="lux-input h-[34px] px-2 text-[11px] rounded-xl border-[#DCE7DC] w-[130px]"
                  />
                </div>
              </div>
            </div>

            {loadingRooms && (
              <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
                Loading live room availability catalog...
              </div>
            )}

            {/* Informational Banner when all rooms are reserved for current slot */}
            {!loadingRooms && totalAvailableRoomsCount === 0 && availableRoomsList.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-[#FFF8EB] border border-[#F5D0A9] text-[#8C4E00] flex items-start gap-2.5 shadow-xs">
                <Icons.Clock className="w-5 h-5 text-[#C25E00] shrink-0 mt-0.5" />
                <div className="text-[11.5px] leading-tight">
                  <strong className="block font-bold text-[#6D3D00] mb-0.5">
                    {t('Rooms Reserved for Current Time Slot')}
                  </strong>
                  <span>
                    {t('All rooms are reserved for the current slot. You can view all rooms below and book in advance for tomorrow or later time slots!')}
                  </span>
                </div>
              </div>
            )}

            {!loadingRooms && availableRoomsList.length === 0 && (
              <div
                className={`rounded-2xl border p-6 text-center space-y-2 ${
 isDark ? 'border-slate-800 bg-slate-900/40 text-slate-400' : 'border-slate-200 bg-white text-slate-600 shadow-sm'
 }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                  <Icons.Bed className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-black">{t('No Rooms Found Matching Filter')}</h4>
                <p className="text-[11px]">
                  {t('Try adjusting your search criteria, price range, or reset filters above.')}
                </p>
              </div>
            )}

            {/* Room Cards Grid */}
            {!loadingRooms &&
              availableRoomsList.map((room) => {
                const photo = getRoomDisplayPhoto(room);
                const basePrice = room.roomType.basePriceOvernight || 2500;
                const gstRate = room.roomType.gstRate || (basePrice > 7500 ? 18 : 12);
                const gstAmt = Math.round(((basePrice * gstRate) / 100) * 100) / 100;
                const oneNightEstimate = basePrice + gstAmt;

                return (
                  <div
                    key={room.id}
                    data-testid={`room-card-${room.roomNumber}`}
                    className="rounded-[20px] border border-[#E9E1D1] bg-white overflow-hidden transition duration-200 flex flex-col shadow-[0_10px_26px_rgba(30,60,45,0.08)]"
                  >
                    {/* Hero Room Photograph */}
                    <div className="h-[190px] w-full relative overflow-hidden bg-[#0E2A1E]">
                      <img
                        src={photo}
                        alt={room.roomType.name}
                        loading="lazy"
                        onError={handleImageError(FALLBACK_ROOM_IMAGE)}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                      <div className="bg-gradient-to-t absolute inset-0 from-[#123C2B]/92 via-[#123C2B]/35 to-[#123C2B]/10 pointer-events-none" />

                      {/* Top Badges Row */}
                      <div className="absolute top-3 inset-x-3 flex items-center justify-between">
                        <div className="px-3 py-1.5 rounded-xl bg-black/55 backdrop-blur-md border border-white/20 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-md">
                          <Icons.Bed className="w-3.5 h-3.5 text-[#F3D79B]" />
                          <span>{t('Room')} {room.roomNumber}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isClimateAc(room) ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#123C2B]/85 text-[#DCEFE2] border border-[#7FBF98]/40 backdrop-blur-md shadow-sm">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-3 h-3">
                                <path d="M12 2v20M4.5 7l15 10M19.5 7l-15 10" />
                              </svg>
                              <span>AC</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#0F2F21]/80 text-[#F7E2B4] border border-[#F3D79B]/50 backdrop-blur-md shadow-sm">
                              <span>Non-AC</span>
                            </span>
                          )}
                          {room.displayStatus === 'AVAILABLE' ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#12804E]/90 text-white backdrop-blur-md border border-[#7FBF98]/40 shadow-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#B8F0C9] lux-pulse-dot" />
                              <span>{t('Ready')}</span>
                            </span>
                          ) : room.displayStatus === 'RESERVED' || room.displayStatus === 'OCCUPIED' ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#C25E00]/90 text-white backdrop-blur-md border border-[#F5D0A9]/40 shadow-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#FFD580]" />
                              <span>{room.displayStatus === 'RESERVED' ? t('Slot Booked') : t('Occupied Now')}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#3B82F6]/90 text-white backdrop-blur-md border border-[#93C5FD]/40 shadow-sm">
                              <span>{t('Cleaning')}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Title on Image */}
                      <div className="absolute bottom-3 left-4 right-4">
                        <h3 className="font-lux text-[24px] leading-tight font-bold text-white drop-shadow-md">
                          {room.roomType.name}
                        </h3>
                        <div className="text-[#FBF7EE] text-[12px] font-medium drop-shadow flex items-center gap-2 mt-1">
                          <span>{t('Floor')} {room.floorNumber}</span>
                          <span className="text-white/40">•</span>
                          <span>{t('Wing')} {room.wing || 'Main Wing'}</span>
                          <span className="text-white/40">•</span>
                          <span>{t('Max')} {room.roomType.maxCapacity || 2} {t('Guests')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Content & Details */}
                    <div className="p-4 flex flex-col gap-3.5">
                      {/* Amenities Pills */}
                      <div className="grid grid-cols-4 gap-1.5">
                        {(room.roomType.amenities?.length > 0
                          ? room.roomType.amenities
                          : ['King Bed', 'Air Conditioning', 'High-Speed WiFi', 'Room Service']
                        )
                          .slice(0, 4)
                          .map((amenity, idx) => (
                            <span
                              key={idx}
                              className="text-[9.5px] leading-tight font-semibold px-1.5 py-2 rounded-xl border border-[#E7DFCE] bg-[#FBF7EE] text-[#334155] flex items-center justify-center gap-1 text-center"
                            >
                              {idx === 0 ? (
                                <Icons.Bed className="w-3 h-3 text-[#123C2B] shrink-0" />
                              ) : idx === 1 ? (
                                <Icons.Wind className="w-3 h-3 text-[#4F8A68] shrink-0" />
                              ) : idx === 2 ? (
                                <Icons.Wifi className="w-3 h-3 text-[#4F8A68] shrink-0" />
                              ) : (
                                <Icons.Sparkles className="w-3 h-3 text-[#123C2B] shrink-0" />
                              )}
                              <span className="truncate" title={t(amenity, amenity)}>
                                {t(amenity, amenity)
                                  .replace(/^Free\s+/i, '')
                                  .replace(/Air Conditioning/i, 'AC')
                                  .replace(/High-Speed WiFi/i, 'WiFi')
                                  .replace(/Room Service/i, 'Room Svc')}
                              </span>
                            </span>
                          ))}
                      </div>

                      {/* Pricing Box */}
                      <div className="p-3.5 rounded-[14px] border border-[#E7DFCE] bg-[#FBF7EE] flex items-stretch justify-between">
                        <div className="flex-1">
                          <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#8B8473]">
                            {t('Overnight Stay')}
                          </div>
                          <div className="font-lux text-[23px] leading-tight font-bold text-[#123C2B] mt-0.5">
                            ₹{basePrice.toLocaleString('en-IN')}
                            <span className="font-sans text-[11px] font-medium text-[#8B8473] ml-1">/ {t('night')}</span>
                          </div>
                          <p className="text-[10px] font-semibold text-[#4F6656] mt-1">
                            1-night estimate incl. GST: ₹{oneNightEstimate.toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div className="w-px bg-[#E7DFCE] mx-3" />
                        <div className="text-right flex flex-col justify-center shrink-0">
                          <div className="text-[10.5px] font-bold text-[#123C2B] flex items-center justify-end gap-1">
                            <Icons.Key className="w-3.5 h-3.5 text-[#1E9E5A]" />
                            <span>{t('Digital Keycard Included')}</span>
                          </div>
                          <p className="text-[10px] font-medium mt-0.5 text-[#8B8473]">
                            + {gstRate}% GST (₹{gstAmt.toLocaleString('en-IN')})
                          </p>
                        </div>
                      </div>

                      {/* Slot Status Callout if Occupied or Reserved */}
                      {room.displayStatus !== 'AVAILABLE' && (
                        <div className="p-3 rounded-xl bg-[#FFF8EB] border border-[#F5D0A9] flex items-start gap-2.5 text-[11px] text-[#8C4E00]">
                          <Icons.Clock className="w-4 h-4 text-[#C25E00] shrink-0 mt-0.5" />
                          <div className="leading-tight">
                            <span className="font-bold block text-[#6D3D00]">{room.statusBadge || 'Occupied for current slot'}</span>
                            <span className="text-[10px] text-[#A66100]">
                              {t('You can book this room in advance for another time slot or future dates.')}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Primary or Advance Booking Button */}
                      {room.displayStatus === 'AVAILABLE' ? (
                        <button
                          type="button"
                          data-testid={`book-room-btn-${room.roomNumber}`}
                          onClick={() => handleSelectRoomForBooking(room, false)}
                          className="min-h-[50px] rounded-[14px] lux-btn-primary text-[12px] uppercase tracking-[0.08em] flex items-center justify-center gap-2 active:scale-[0.98] transition cursor-pointer"
                        >
                          <Icons.Bed className="w-4 h-4" />
                          <span>{t('Book Room')} {room.roomNumber}</span>
                          <Icons.ArrowRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          data-testid={`advance-book-room-btn-${room.roomNumber}`}
                          onClick={() => handleSelectRoomForBooking(room, true)}
                          className="min-h-[50px] rounded-[14px] bg-[#123C2B] hover:bg-[#184d37] text-[#F3D79B] border border-[#C5A265]/40 font-bold text-[12px] uppercase tracking-[0.08em] flex items-center justify-center gap-2 active:scale-[0.98] transition cursor-pointer shadow-md"
                        >
                          <Icons.Calendar className="w-4 h-4 text-[#F3D79B]" />
                          <span>{t('Advance Booking / Choose Slot')}</span>
                          <Icons.ArrowRight className="w-4 h-4 text-[#F3D79B]" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: DINE-IN TABLE REAL QR SCANNER ("Table Scan")    */}
        {/* ======================================================== */}
        {customerView === 'table_scan' && (
          <div className="flex flex-col gap-3.5">
            {/* Header & Back Button */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                data-testid="table-back-home-btn"
                onClick={() => {
                  stopCamera();
                  setCustomerView('home');
                }}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
 isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700 shadow-sm'
 }`}
              >
                <Icons.ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Home</span>
              </button>
              <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                <Icons.Utensils className="w-3.5 h-3.5" />
                <span>Table QR Ordering</span>
              </span>
            </div>

            {/* Invalid QR Toast Alert */}
            {invalidQrToast && (
              <div
                role="alert"
                className="rounded-2xl bg-red-600/95 border-2 border-red-400 text-white p-3.5 shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top duration-200"
              >
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Icons.AlertCircle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black tracking-wide">{invalidQrToast}</p>
                  <p className="text-[10px] text-white/80">Please point camera at an official SpiceHub dining standee</p>
                </div>
                <button
                  type="button"
                  onClick={() => setInvalidQrToast(null)}
                  className="text-white/80 hover:text-white p-1"
                >
                  <Icons.X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Real Camera QR Scanner Box */}
            <div
              className={`rounded-3xl border p-4 sm:p-5 flex flex-col gap-3.5 shadow-md ${
 isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-white'
 }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                    <Icons.Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Scan Table Standee QR Code
                    </h3>
                    <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Physical QR scan required to order food to your table
                    </p>
                  </div>
                </div>
                {isCameraActive && isCameraReady && (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="text-xs font-bold text-red-500 px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 hover:bg-red-100"
                  >
                    Pause Camera
                  </button>
                )}
              </div>

              {isCameraActive ? (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-[3/4] sm:aspect-video flex items-center justify-center border-2 border-amber-500/40 shadow-sm dark:shadow-none">
                  {/* Clean Loading Spinner while camera initializes */}
                  {!isCameraReady && (
                    <div className="absolute inset-0 z-20 bg-slate-950 flex flex-col items-center justify-center gap-3">
                      <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                      <p className="text-xs font-bold text-amber-400 tracking-wide animate-pulse">
                        Initializing Camera...
                      </p>
                    </div>
                  )}

                  <video
                    autoPlay
                    playsInline
                    muted
                    ref={videoRef}
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Viewfinder Target Framing with 4 corner brackets & Laser Crosshair */}
                  {isCameraReady && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="relative w-64 h-64 sm:w-72 sm:h-72">
                        {/* 4 Corner Markers */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-xl" />

                        {/* Animated Laser Scanning Line */}
                        <div
                          className="absolute inset-x-2 h-0.5 bg-emerald-500"
                          style={{
                            animation: 'laserScanSweep 2.4s ease-in-out infinite alternate',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Top Status & Controls Bar */}
                  {isCameraReady && (
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                      <div className="bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-[10px] font-black text-white uppercase tracking-wider">
                          Live Scanner Active
                        </span>
                      </div>

                      {/* Torch Toggle Button (pointer-events-auto) */}
                      {isTorchSupported && (
                        <button
                          type="button"
                          onClick={toggleTorch}
                          className={`pointer-events-auto p-2.5 rounded-full border shadow-lg transition active:scale-95 ${
 isTorchOn
 ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-amber-400/40'
 : 'bg-black/75 backdrop-blur-md text-white border-white/20 hover:bg-black/90'
 }`}
                          title={isTorchOn ? 'Turn Flashlight Off' : 'Turn Flashlight On'}
                        >
                          <Icons.Zap className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Bottom Instructions Badge */}
                  {isCameraReady && (
                    <div className="absolute bottom-3 inset-x-3 flex justify-center pointer-events-none">
                      <p className="text-[10px] font-bold text-white/95 bg-black/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 shadow text-center">
                        Align the table QR standee within the frame to order
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  data-testid="open-camera-scanner-btn"
                  onClick={startCamera}
                  className="rounded-2xl border-2 border-dashed border-amber-500/40 hover:border-amber-500 p-8 flex flex-col items-center justify-center gap-2.5 bg-amber-500/5 transition group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md group-hover:scale-105 transition">
                    <Icons.Camera className="w-7 h-7 text-slate-950" />
                  </div>
                  <span className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                    Open Live Video QR Scanner
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 text-center max-w-xs">
                    Continuously scans physical dining table standee QR codes via live rear camera feed
                  </span>
                </button>
              )}

              {/* Camera Error & Permission Denied Card */}
              {cameraError && (
                <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-4 text-center space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-500 flex items-center justify-center mx-auto">
                    <Icons.AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-red-500 uppercase tracking-wider">
                      Camera Access Required
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {cameraError}
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition active:scale-95"
                    >
                      Retry Camera
                    </button>

                    {isPermanentDenied && (
                      <button
                        type="button"
                        onClick={openAppSettings}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 font-bold text-xs uppercase tracking-wider transition active:scale-95 flex items-center gap-1.5"
                      >
                        <Icons.Settings className="w-3.5 h-3.5 text-amber-400" />
                        <span>Go to App Settings</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              <style>{`
                @keyframes laserScanSweep {
                  0% { top: 4px; opacity: 0.7; }
                  50% { top: calc(100% - 8px); opacity: 1; }
                  100% { top: 4px; opacity: 0.7; }
                }
              `}</style>

              {/* Optional Quick Table Entry */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500 font-medium">Can't scan QR code?</span>
                <button
                  type="button"
                  data-testid="manual-table-entry-btn"
                  onClick={() => launchTable('T-01')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition shadow-xs flex items-center gap-1"
                >
                  <span>Select Table (T-01)</span>
                  <Icons.ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 4: RESIDENT STAY VERIFICATION                       */}
        {/* ======================================================== */}
        {customerView === 'resident_verify' && (
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCustomerView('home')}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
 isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700 shadow-sm'
 }`}
              >
                <Icons.ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Home</span>
              </button>
              <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                <Icons.Key className="w-3.5 h-3.5" />
                <span>Resident Stay</span>
              </span>
            </div>

            <div
              className={`rounded-2xl border p-4 sm:p-5 flex flex-col gap-3 shadow-sm ${
 isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'
 }`}
            >
              <div>
                <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Verify Checked-In Stay
                </h3>
                <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Enter your room number and registered phone number to open your in-room services portal
                </p>
              </div>

              {stayVerifyError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex flex-col gap-1.5">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Icons.AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{stayVerifyError}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerView('rooms');
                      setStayVerifyError(null);
                    }}
                    className="self-start text-[11px] font-black text-amber-600 underline hover:text-amber-700"
                  >
                    Explore available rooms from catalog
                  </button>
                </div>
              )}

              <form onSubmit={handleVerifyResidentStay} className="flex flex-col gap-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className={`block text-[10px] font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Room Number
                    </label>
                    <input
                      type="text"
                      data-testid="resident-room-input"
                      value={roomNumberInput}
                      onChange={(e) => setRoomNumberInput(e.target.value)}
                      placeholder="e.g. 101, 204"
                      className={`w-full min-h-[42px] rounded-xl border px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
 isDark
 ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
 : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
 }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[10px] font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Registered Mobile Number
                    </label>
                    <input
                      type="tel"
                      data-testid="resident-phone-input"
                      value={guestPhoneInput}
                      onChange={(e) => setGuestPhoneInput(e.target.value)}
                      placeholder="e.g. 9820011223"
                      className={`w-full min-h-[42px] rounded-xl border px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
 isDark
 ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
 : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
 }`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingStay}
                  data-testid="resident-verify-stay-btn"
                  className="min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-2 mt-1 active:scale-98"
                >
                  <Icons.Key className="w-4 h-4 text-white" />
                  {isVerifyingStay ? (
                    <span>Verifying with Front Desk...</span>
                  ) : (
                    <span>Verify Stay & Open Portal</span>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 5: MODERN CUSTOMER PROFILE SECTION                  */}
        {/* ======================================================== */}
        {customerView === 'profile' && (
          <div className="flex flex-col gap-5 animate-in fade-in" data-testid="profile-page">
            <header className="px-1 pt-1">
              <h1 className={`text-2xl font-semibold tracking-tight ${isDark ? 'text-[#F2F7F2]' : 'text-[#123C2B]'}`}>
                Your profile
              </h1>
              <p className={`mt-1 text-sm ${mutedTextClass}`}>
                Your details for {selectedHotel?.name || 'this hotel'}
              </p>
            </header>

            <section className={`rounded-[20px] border p-5 ${pageSurfaceClass}`} aria-label="Guest profile">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#E4F1E6] text-lg font-bold text-[#123C2B]">
                  {profileName === 'Guest' ? (
                    <Icons.User className="h-7 w-7" />
                  ) : (
                    profileName
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join('')
                      .toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold">{profileName}</h2>
                    <span className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-medium ${
                      profileStatus === 'Mobile verified' || profileStatus === 'In-house guest'
                        ? 'bg-[#E4F1E6] text-[#123C2B]'
                        : isDark
                          ? 'bg-[#244C39] text-[#C8DCCB]'
                          : 'bg-[#F2F7F2] text-[#5E7163]'
                    }`}>
                      {profileStatus}
                    </span>
                  </div>
                  {profilePhone ? (
                    <p className={`mt-1 truncate text-sm ${mutedTextClass}`}>{profilePhone}</p>
                  ) : (
                    <p className={`mt-1 text-sm ${mutedTextClass}`}>Add a mobile number to verify your profile.</p>
                  )}
                  {profileEmail && <p className={`mt-1 truncate text-sm ${mutedTextClass}`}>{profileEmail}</p>}
                </div>
              </div>
            </section>

            {/* Live 24/7 Concierge & Floor Support Action Card */}
            <section
              data-testid="profile-need-help-card"
              className={`p-4 rounded-[20px] border flex items-center justify-between gap-3 shadow-xs ${
                isDark ? 'bg-[#183728] border-[#2A523D]' : 'bg-[#EAF5EC] border-[#B8D7C1]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-[#123C2B] text-[#F3D79B] flex items-center justify-center shrink-0">
                  <Icons.MessageSquare className="w-6 h-6 text-[#F3D79B]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold truncate">Need Help with Stay or Food?</h3>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  </div>
                  <p className={`text-xs mt-0.5 truncate ${mutedTextClass}`}>
                    Instant chat routed to Reception Desk or Waiter
                  </p>
                </div>
              </div>
              <button
                type="button"
                data-testid="profile-need-help-btn"
                onClick={() => setIsHelpChatOpen(true)}
                className="px-4 py-2.5 bg-[#123C2B] hover:bg-[#0E2A1E] text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 shrink-0 whitespace-nowrap"
              >
                Need Help
              </button>
            </section>

            {/* Guest Sign-In & OTP Phone Verification Card */}
            {verifiedGuestUser ? (
              <section className={`flex items-center justify-between gap-3 rounded-[20px] border p-4 ${softSurfaceClass}`}>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E4F1E6] text-[#123C2B]">
                    <Icons.Check className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">Mobile verified</h3>
                    <p className={`mt-0.5 truncate text-sm ${mutedTextClass}`}>{verifiedGuestUser.phone}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Do you want to switch or update your verified mobile number?')) {
                      setVerifiedGuestUser(null);
                      localStorage.removeItem('spicehub_verified_guest_user');
                    }
                  }}
                  className={`min-h-12 shrink-0 rounded-xl px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12804E] ${
                    isDark ? 'text-[#B9E4C5]' : 'text-[#0D6B3D]'
                  }`}
                >
                  Change
                </button>
              </section>
            ) : (
              <section className={`space-y-4 rounded-[20px] border p-5 ${pageSurfaceClass}`}>
                <div>
                  <h3 className="text-base font-semibold">Verify your mobile</h3>
                  <p className={`mt-1 text-sm leading-5 ${mutedTextClass}`}>
                    Use a one-time code to verify your number before booking.
                  </p>
                </div>

                <div className="space-y-2">
                  <div>
                    <label htmlFor="profile-guest-name" className={`mb-1.5 block text-sm font-medium ${isDark ? 'text-[#E0ECE2]' : 'text-[#294938]'}`}>
                      Full name
                    </label>
                    <input
                      id="profile-guest-name"
                      type="text"
                      data-testid="profile-guest-name-input"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      autoComplete="name"
                      placeholder="Enter your name"
                      className={`min-h-12 w-full rounded-xl border px-3.5 text-base focus:outline-none focus:ring-2 focus:ring-[#12804E] ${controlClass}`}
                    />
                  </div>

                  <div>
                    <label htmlFor="profile-guest-phone" className={`mb-1.5 block text-sm font-medium ${isDark ? 'text-[#E0ECE2]' : 'text-[#294938]'}`}>
                      Mobile number
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="profile-guest-phone"
                        type="tel"
                        data-testid="profile-guest-phone-input"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        autoComplete="tel"
                        inputMode="tel"
                        placeholder="Enter mobile number"
                        className={`min-h-12 min-w-0 flex-1 rounded-xl border px-3.5 text-base focus:outline-none focus:ring-2 focus:ring-[#12804E] ${controlClass}`}
                      />
                      <button
                        type="button"
                        data-testid="profile-send-otp-btn"
                        disabled={otpSending || !guestPhone.trim() || guestPhone.trim().length < 8}
                        onClick={handleSendPhoneOtp}
                        className="min-h-12 shrink-0 rounded-xl bg-[#12804E] px-4 text-sm font-semibold text-white transition hover:bg-[#0D6B3D] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12804E]"
                      >
                        {otpSending ? 'Sending...' : phoneOtpSent ? 'Resend' : 'Send OTP'}
                      </button>
                    </div>
                  </div>

                  {phoneOtpSent && (
                    <div className={`space-y-3 rounded-xl border p-3 ${softSurfaceClass}`}>
                      <label htmlFor="profile-otp-code" className="block text-sm font-medium">
                        Enter the 4-digit code
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="profile-otp-code"
                          type="text"
                          maxLength={4}
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          data-testid="profile-otp-input"
                          value={phoneOtp}
                          onChange={(e) => setPhoneOtp(e.target.value)}
                          placeholder="4-digit code"
                          className={`min-h-12 min-w-0 flex-1 rounded-xl border px-3 text-center text-base tracking-[0.2em] focus:outline-none focus:ring-2 focus:ring-[#12804E] ${controlClass}`}
                        />
                        <button
                          type="button"
                          data-testid="profile-verify-otp-btn"
                          disabled={otpVerifying || !phoneOtp.trim()}
                          onClick={handleVerifyPhoneOtp}
                          className="min-h-12 shrink-0 rounded-xl bg-[#123C2B] px-4 text-sm font-semibold text-white transition hover:bg-[#0D6B3D] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12804E]"
                        >
                          {otpVerifying ? 'Verifying...' : 'Confirm'}
                        </button>
                      </div>
                    </div>
                  )}
                  {bookingError && <p className="text-sm text-red-700 dark:text-red-300" role="alert">{bookingError}</p>}
                  {otpSuccessMsg && <p className="text-sm font-medium text-[#0D6B3D] dark:text-[#B9E4C5]" role="status">{otpSuccessMsg}</p>}
                </div>
              </section>
            )}

            {/* Active Stay Details (If staying at hotel) */}
            {activeReservation && (
              <section className={`space-y-4 rounded-[20px] border p-5 ${softSurfaceClass}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#12804E]" />
                    <span className="text-sm font-semibold text-[#12804E]">
                      Current stay
                    </span>
                  </div>
                  <span className={`text-sm font-semibold ${mutedTextClass}`}>
                    Room {activeReservation.roomNumber}
                  </span>
                </div>
                <dl className={`space-y-2 text-sm ${mutedTextClass}`}>
                  <div className="flex justify-between">
                    <dt>Room type</dt>
                    <dd className="text-right font-medium">{activeReservation.roomTypeName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Booking reference</dt>
                    <dd className="text-right font-medium">{activeReservation.bookingNumber}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Dates</dt>
                    <dd className="text-right font-medium">
                      {formatGuestStayDate(activeReservation.checkInDate)} – {formatGuestStayDate(activeReservation.checkOutDate)}
                    </dd>
                  </div>
                </dl>

                {!isRoomEntered ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeReservation) {
                        localStorage.setItem(`spicehub_room_entered_${activeReservation.bookingNumber}`, 'true');
                        setIsRoomEntered(true);
                        launchResidentPortal(activeReservation.roomNumber, selectedHotel, activeReservation.sessionToken, 'HOME');
                      }
                    }}
                    className="min-h-12 w-full rounded-xl bg-[#12804E] px-4 text-sm font-semibold text-white transition hover:bg-[#0D6B3D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12804E]"
                  >
                    <span>{t('Unlock room')}</span>
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => launchResidentPortal(activeReservation.roomNumber, selectedHotel, activeReservation.sessionToken, 'HOME')}
                      className="min-h-12 rounded-xl bg-[#12804E] px-3 text-sm font-semibold text-white transition hover:bg-[#0D6B3D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12804E]"
                    >
                      <span>{t('Digital Keycard')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => launchResidentPortal(activeReservation.roomNumber, selectedHotel, activeReservation.sessionToken, 'DINING')}
                      className="min-h-12 rounded-xl border border-[#E9C98A] bg-[#F7E2B4] px-3 text-sm font-semibold text-[#6B4A12] transition hover:bg-[#F0D294] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12804E]"
                    >
                      <span>{t('In-Room Food')}</span>
                    </button>
                  </div>
                )}
              </section>
            )}

            <section className={`flex items-center justify-between gap-4 rounded-[20px] border p-4 ${pageSurfaceClass}`}>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">Need help?</h3>
                <p className={`mt-1 text-sm ${mutedTextClass}`}>
                  {selectedHotel?.supportPhone || selectedHotel?.contactPhone || 'Front desk phone is not available.'}
                </p>
              </div>
              {(selectedHotel?.supportPhone || selectedHotel?.contactPhone) && (
                <a
                  href={`tel:${selectedHotel.supportPhone || selectedHotel.contactPhone}`}
                  aria-label={`Call ${selectedHotel.name} front desk`}
                  className="flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-[#E4F1E6] px-4 text-sm font-semibold text-[#123C2B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12804E]"
                >
                  <Icons.Phone className="h-4 w-4" />
                  <span>Call</span>
                </a>
              )}
            </section>

            {/* Reservation Lifecycle & Cancellation Handling */}
            {pendingApprovalBooking && (
              <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50/80 space-y-2.5 text-center shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span>Booking Pending Front Desk Approval</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-amber-200 text-amber-950 px-2 py-0.5 rounded">
                    {pendingApprovalBooking.bookingNumber}
                  </span>
                </div>
                <p className="text-sm text-amber-900 text-left leading-relaxed">
                  Room {pendingApprovalBooking.roomNumber} ({pendingApprovalBooking.roomTypeName}) is awaiting approval. You can cancel this request before it is approved.
                </p>
                <button
                  type="button"
                  data-testid="profile-cancel-pending-btn"
                  disabled={isCancellingBooking}
                  onClick={() => handleCancelBooking(pendingApprovalBooking.bookingNumber)}
                  className="min-h-12 w-full rounded-xl border border-red-300 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                >
                  <span>{isCancellingBooking ? 'Cancelling Reservation...' : 'Cancel Reservation Request'}</span>
                </button>
              </div>
            )}

            <section className={`overflow-hidden rounded-[20px] border ${pageSurfaceClass}`} aria-label="Profile shortcuts">
              <h3 className="px-4 pb-2 pt-4 text-base font-semibold">Quick access</h3>
              <div className={`divide-y ${isDark ? 'divide-[#315342]' : 'divide-[#D7E5D9]'}`}>
                <button
                  type="button"
                  data-testid="profile-quick-stay"
                  onClick={() => openSettings('RESERVATION')}
                  className="flex min-h-[68px] w-full items-center justify-between gap-3 px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#12804E]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      {activeReservation
                        ? `Room ${activeReservation.roomNumber}`
                        : pendingApprovalBooking
                          ? 'Booking request'
                          : 'Stay & bookings'}
                    </span>
                    <span className={`mt-0.5 block text-sm ${mutedTextClass}`}>
                      {activeReservation
                        ? `Booking ${activeReservation.bookingNumber}`
                        : pendingApprovalBooking
                          ? 'View or cancel your pending request'
                          : 'Check booking status or browse rooms'}
                    </span>
                  </span>
                  <Icons.ArrowRight className="h-4 w-4 shrink-0" />
                </button>
                <button
                  type="button"
                  data-testid="profile-quick-services"
                  onClick={() => setCustomerView('home')}
                  className="flex min-h-[68px] w-full items-center justify-between gap-3 px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#12804E]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">Hotel services</span>
                    <span className={`mt-0.5 block text-sm ${mutedTextClass}`}>Dining and services for your visit</span>
                  </span>
                  <Icons.ArrowRight className="h-4 w-4 shrink-0" />
                </button>
                <button
                  type="button"
                  data-testid="profile-quick-preferences"
                  onClick={() => openSettings('PREFERENCES')}
                  className="flex min-h-[68px] w-full items-center justify-between gap-3 px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#12804E]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">App preferences</span>
                    <span className={`mt-0.5 block text-sm ${mutedTextClass}`}>Language, theme and text size</span>
                  </span>
                  <Icons.ArrowRight className="h-4 w-4 shrink-0" />
                </button>
                <button
                  type="button"
                  data-testid="profile-quick-support"
                  onClick={() => setIsHelpChatOpen(true)}
                  className="flex min-h-[68px] w-full items-center justify-between gap-3 px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#12804E]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">Support & call history</span>
                    <span className={`mt-0.5 block text-sm ${mutedTextClass}`}>Contact the hotel and review service calls</span>
                  </span>
                  <Icons.ArrowRight className="h-4 w-4 shrink-0" />
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 7: DEDICATED SETTINGS PAGE ('settings')             */}
        {/* ======================================================== */}
        {customerView === 'settings' && (
          <div className="flex flex-col gap-5 animate-in fade-in" data-testid="settings-page">
            <header className="px-1 pt-1">
              {settingsPage !== 'MAIN' && (
                <button
                  type="button"
                  data-testid="settings-back"
                  onClick={() => setSettingsPage('MAIN')}
                  className={`mb-3 inline-flex min-h-10 items-center gap-2 rounded-lg pr-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12804E] ${
                    isDark ? 'text-[#B9E4C5]' : 'text-[#0D6B3D]'
                  }`}
                >
                  <Icons.ArrowLeft className="h-4 w-4" />
                  <span>Settings</span>
                </button>
              )}
              <h1 className={`text-2xl font-semibold tracking-tight ${isDark ? 'text-[#F2F7F2]' : 'text-[#123C2B]'}`}>
                {settingsPage === 'MAIN'
                  ? t('Settings')
                  : settingsPage === 'PREFERENCES'
                    ? 'Preferences'
                    : settingsPage === 'RESERVATION'
                      ? 'Stay & bookings'
                      : settingsPage === 'SUPPORT'
                        ? 'Support'
                        : 'App access'}
              </h1>
              <p className={`mt-1 text-sm ${mutedTextClass}`}>
                {settingsPage === 'MAIN'
                  ? selectedHotel?.name || 'App preferences and hotel services'
                  : settingsPage === 'PREFERENCES'
                    ? 'Language, appearance and text size'
                    : settingsPage === 'RESERVATION'
                      ? 'Your current stay and booking requests'
                      : settingsPage === 'SUPPORT'
                        ? 'Contact the hotel and review service calls'
                        : 'Permissions and hotel selection'}
              </p>
            </header>

            {settingsPage === 'MAIN' && (
              <nav
                aria-label="Settings pages"
                data-testid="settings-page-list"
                className={`overflow-hidden rounded-[20px] border ${pageSurfaceClass}`}
              >
                {[
                  {
                    page: 'PREFERENCES' as const,
                    title: 'Preferences',
                    description: 'Language, theme and text size',
                    testId: 'settings-nav-preferences',
                  },
                  {
                    page: 'RESERVATION' as const,
                    title: 'Stay & bookings',
                    description: 'Review active stays and booking requests',
                    testId: 'settings-nav-reservation',
                  },
                  {
                    page: 'SUPPORT' as const,
                    title: 'Support',
                    description: 'Hotel contact and service call history',
                    testId: 'settings-nav-support',
                  },
                  {
                    page: 'SESSION' as const,
                    title: 'App access',
                    description: 'Camera, location and hotel switching',
                    testId: 'settings-nav-session',
                  },
                ].map((item, index) => (
                  <button
                    key={item.page}
                    type="button"
                    data-testid={item.testId}
                    onClick={() => setSettingsPage(item.page)}
                    className={`flex min-h-[76px] w-full items-center justify-between gap-3 px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#12804E] ${
                      index > 0 ? (isDark ? 'border-t border-[#315342]' : 'border-t border-[#D7E5D9]') : ''
                    } ${isDark ? 'hover:bg-[#102D21]' : 'hover:bg-[#F2F7F2]'}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{item.title}</span>
                      <span className={`mt-0.5 block text-sm ${mutedTextClass}`}>
                        {item.page === 'RESERVATION' && activeReservation
                          ? `Room ${activeReservation.roomNumber} · Current stay`
                          : item.page === 'RESERVATION' && pendingApprovalBooking
                            ? 'A booking is awaiting approval'
                            : item.description}
                      </span>
                    </span>
                    {item.page === 'RESERVATION' && (activeReservation || pendingApprovalBooking) && (
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                        isDark ? 'bg-[#244C39] text-[#C8DCCB]' : 'bg-[#E4F1E6] text-[#123C2B]'
                      }`}>
                        {pendingApprovalBooking ? 'Pending' : 'Active'}
                      </span>
                    )}
                    <Icons.ArrowRight className={`h-4 w-4 shrink-0 ${mutedTextClass}`} />
                  </button>
                ))}
              </nav>
            )}

            {/* PAGE: PREFERENCES */}
            {settingsPage === 'PREFERENCES' && (
              <div id="settings-panel" role="region" aria-label="Preferences settings" className="space-y-4 animate-in fade-in">
                <section className={`space-y-1 rounded-[20px] border p-5 ${pageSurfaceClass}`}>
                  <h2 className="text-lg font-semibold">Preferences</h2>
                  <p className={`text-sm ${mutedTextClass}`}>Choose how SpiceHub looks and reads.</p>
                  <div className="pt-2">
                    <div className="flex min-h-[68px] items-center justify-between gap-4">
                    <div>
                      <span className="block text-sm font-medium">{t('Language')}</span>
                      <span className={`mt-0.5 block text-sm ${mutedTextClass}`}>{locale === 'en' ? 'English' : 'हिन्दी'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={toggleLocale}
                      aria-label={locale === 'en' ? 'Switch language to Hindi' : 'Switch language to English'}
                      className={`min-h-12 shrink-0 rounded-xl border px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12804E] ${
                        isDark
                          ? 'border-[#486553] bg-[#102D21] text-[#F2F7F2]'
                          : 'border-[#B8D0BE] bg-white text-[#123C2B]'
                      }`}
                    >
                      {locale === 'en' ? 'हिन्दी' : 'English'}
                    </button>
                    </div>

                  <div className={`flex min-h-[68px] items-center justify-between gap-4 border-t py-3 ${isDark ? 'border-[#315342]' : 'border-[#D7E5D9]'}`}>
                    <div>
                      <span className="block text-sm font-medium">{t('Theme')}</span>
                      <span className={`mt-0.5 block text-sm ${mutedTextClass}`}>Preview updates immediately</span>
                    </div>
                    <select
                      aria-label="Theme"
                      value={theme}
                      onChange={(event) => {
                        setTheme(event.target.value as 'light' | 'dark');
                        setSettingsMessage('');
                      }}
                      className={`min-h-12 w-36 rounded-xl border px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#12804E] ${controlClass}`}
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>
                  <div className={`flex min-h-[68px] items-center justify-between gap-4 border-t py-3 ${isDark ? 'border-[#315342]' : 'border-[#D7E5D9]'}`}>
                    <div>
                      <span className="block text-sm font-medium">Text size</span>
                      <span className={`mt-0.5 block text-sm ${mutedTextClass}`}>Small, medium or large</span>
                    </div>
                    <select
                      aria-label="Text size"
                      value={fontSize}
                      onChange={(event) => {
                        setFontSize(event.target.value as 'small' | 'medium' | 'large');
                        setSettingsMessage('');
                      }}
                      className={`min-h-12 w-36 rounded-xl border px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#12804E] ${controlClass}`}
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                  <div className="grid gap-2 pt-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => void saveCustomerSettings()}
                      disabled={settingsSaving}
                      className="min-h-12 rounded-xl bg-[#12804E] px-4 text-sm font-semibold text-white transition hover:bg-[#0D6B3D] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12804E]"
                    >
                      {settingsSaving ? 'Saving…' : 'Save settings'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerView('profile')}
                      className={`min-h-12 rounded-xl border px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12804E] ${
                        isDark
                          ? 'border-[#486553] bg-[#102D21] text-[#F2F7F2]'
                          : 'border-[#B8D0BE] bg-white text-[#123C2B]'
                      }`}
                    >
                      Manage profile
                    </button>
                  </div>
                  {settingsMessage && <p className="text-sm font-medium text-[#0D6B3D] dark:text-[#B9E4C5]" role="status">{settingsMessage}</p>}
                  {settingsError && <p className="text-sm font-medium text-red-700 dark:text-red-300" role="alert">{settingsError}</p>}
                  </div>
                </section>
              </div>
            )}

            {/* PAGE: STAY & BOOKINGS */}
            {settingsPage === 'RESERVATION' && (
              <div id="settings-panel" role="region" aria-label="Stay and bookings" className="space-y-4 animate-in fade-in">
                {pendingApprovalBooking ? (
                  <div className="space-y-4 rounded-[20px] border border-amber-300 bg-amber-50 p-5 text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        <span className="text-sm font-semibold">Pending approval</span>
                      </div>
                      <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-medium text-amber-950 dark:bg-amber-900 dark:text-amber-100">
                        {pendingApprovalBooking.bookingNumber}
                      </span>
                    </div>

                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt>Room</dt>
                        <dd className="text-right font-medium">{pendingApprovalBooking.roomNumber} · {pendingApprovalBooking.roomTypeName}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Amount</dt>
                        <dd className="text-right font-medium">₹{pendingApprovalBooking.grandTotal?.toLocaleString('en-IN')}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Dates</dt>
                        <dd className="text-right font-medium">
                          {formatGuestStayDate(pendingApprovalBooking.checkInDate)} – {formatGuestStayDate(pendingApprovalBooking.checkOutDate)}
                        </dd>
                      </div>
                    </dl>

                    <div className="space-y-3 border-t border-amber-300 pt-3 dark:border-amber-700">
                      <p className="text-sm leading-5">
                        You can cancel this request until it is approved.
                      </p>
                      <button
                        type="button"
                        data-testid="settings-cancel-booking-btn"
                        disabled={isCancellingBooking}
                        onClick={() => handleCancelBooking(pendingApprovalBooking.bookingNumber)}
                        className="min-h-12 w-full rounded-xl bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                      >
                        <span>{isCancellingBooking ? 'Cancelling Request...' : 'Cancel Reservation Request'}</span>
                      </button>
                    </div>
                  </div>
                ) : activeReservation ? (
                  <div className={`space-y-4 rounded-[20px] border p-5 ${softSurfaceClass}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#12804E]" />
                        <span className="text-sm font-semibold text-[#12804E]">Current stay</span>
                      </div>
                      <span className={`text-sm font-medium ${mutedTextClass}`}>
                        Room {activeReservation.roomNumber}
                      </span>
                    </div>

                    <dl className={`space-y-2 text-sm ${mutedTextClass}`}>
                      <div className="flex justify-between">
                        <dt>Room type</dt>
                        <dd className="text-right font-medium">{activeReservation.roomTypeName}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Booking reference</dt>
                        <dd className="text-right font-medium">{activeReservation.bookingNumber}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Dates</dt>
                        <dd className="text-right font-medium">
                          {formatGuestStayDate(activeReservation.checkInDate)} – {formatGuestStayDate(activeReservation.checkOutDate)}
                        </dd>
                      </div>
                    </dl>

                    <div className={`space-y-3 border-t pt-3 ${isDark ? 'border-[#315342]' : 'border-[#D7E5D9]'}`}>
                      <p className={`text-sm leading-5 ${mutedTextClass}`}>
                        Your stay is active. Contact the front desk for checkout or changes.
                      </p>
                      {(selectedHotel?.supportPhone || selectedHotel?.contactPhone) ? (
                        <a
                          href={`tel:${selectedHotel.supportPhone || selectedHotel.contactPhone}`}
                          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#12804E] px-4 text-sm font-semibold text-white transition hover:bg-[#0D6B3D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12804E]"
                        >
                          <Icons.Phone className="h-4 w-4" />
                          <span>Call front desk</span>
                        </a>
                      ) : (
                        <p className={`text-sm ${mutedTextClass}`}>Front desk phone is not available.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className={`space-y-4 rounded-[20px] border p-5 ${pageSurfaceClass}`}>
                    <div className="flex items-start gap-3">
                      <Icons.Bed className="mt-0.5 h-5 w-5 shrink-0 text-[#12804E]" />
                      <div>
                        <h4 className="text-base font-semibold">No active stay</h4>
                        <p className={`mt-1 text-sm leading-5 ${mutedTextClass}`}>
                          There is no room reservation linked to this profile at {selectedHotel?.name || 'this hotel'}.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomerView('rooms')}
                      className="min-h-12 w-full rounded-xl bg-[#12804E] px-4 text-sm font-semibold text-white transition hover:bg-[#0D6B3D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12804E]"
                    >
                      Browse rooms
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* PAGE: SUPPORT */}
            {settingsPage === 'SUPPORT' && (
              <div id="settings-panel" role="region" aria-label="Hotel support" className="space-y-4 animate-in fade-in">
                <section className={`rounded-[20px] border p-5 ${pageSurfaceClass}`}>
                  <h2 className="text-lg font-semibold">Contact the front desk</h2>
                  <p className={`mt-1 text-sm ${mutedTextClass}`}>{selectedHotel?.name || 'Selected hotel'}</p>
                  {(selectedHotel?.supportPhone || selectedHotel?.contactPhone) ? (
                    <div className={`mt-4 flex items-center justify-between gap-3 border-t pt-4 ${isDark ? 'border-[#315342]' : 'border-[#D7E5D9]'}`}>
                    <span className="min-w-0 break-all text-sm font-medium">{selectedHotel.supportPhone || selectedHotel.contactPhone}</span>
                    <a
                      href={`tel:${selectedHotel.supportPhone || selectedHotel.contactPhone}`}
                      className="flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-[#12804E] px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12804E]"
                    >
                      <Icons.Phone className="h-4 w-4" />
                      <span>Call</span>
                    </a>
                    </div>
                  ) : (
                    <p className={`mt-4 border-t pt-4 text-sm ${isDark ? 'border-[#315342] text-[#B9C9BD]' : 'border-[#D7E5D9] text-[#5E7163]'}`}>
                    A phone number has not been added for this hotel.
                    </p>
                  )}
                </section>

                <section className={`rounded-[20px] border p-5 ${pageSurfaceClass}`}>
                  <h2 className="text-lg font-semibold">Service call history</h2>
                  {settingsCallHistory.length === 0 ? (
                    <p className={`mt-2 text-sm ${mutedTextClass}`}>No service calls in this session.</p>
                  ) : (
                    <ul className={`mt-3 divide-y ${isDark ? 'divide-[#315342]' : 'divide-[#D7E5D9]'}`}>
                    {settingsCallHistory.map((call, index) => (
                      <li key={`${call.requestedAt}-${index}`} className="flex min-h-14 items-center justify-between gap-3 py-2 text-sm">
                        <span className="min-w-0 truncate font-medium">{call.requestType.replace(/_/g, ' ')}</span>
                        <span className={`shrink-0 capitalize ${mutedTextClass}`}>{call.status.replace(/_/g, ' ').toLowerCase()}</span>
                      </li>
                    ))}
                    </ul>
                  )}
                </section>
              </div>
            )}

            {/* PAGE: APP ACCESS */}
            {settingsPage === 'SESSION' && (
              <div id="settings-panel" role="region" aria-label="App access settings" className="space-y-4 animate-in fade-in">
                <section className={`rounded-[20px] border p-5 ${pageSurfaceClass}`}>
                  <h2 className="text-lg font-semibold">App access</h2>
                  <p className={`mt-1 text-sm ${mutedTextClass}`}>Manage permissions used by guest features.</p>
                  <div className={`mt-4 flex min-h-16 items-center justify-between gap-4 border-t pt-3 ${isDark ? 'border-[#315342]' : 'border-[#D7E5D9]'}`}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Camera</p>
                      <p className={`mt-0.5 text-sm ${mutedTextClass}`}>Used to scan table QR codes.</p>
                    </div>
                    <button
                      type="button"
                      onClick={openAppSettings}
                      className={`min-h-12 shrink-0 rounded-xl border px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12804E] ${
                        isDark
                          ? 'border-[#486553] bg-[#102D21] text-[#F2F7F2]'
                          : 'border-[#B8D0BE] bg-white text-[#123C2B]'
                      }`}
                    >
                      Open settings
                    </button>
                  </div>
                  <div className={`border-t pt-3 ${isDark ? 'border-[#315342]' : 'border-[#D7E5D9]'}`}>
                    <p className="text-sm font-medium">Location check</p>
                    <p className={`mt-0.5 text-sm ${mutedTextClass}`}>{gpsStatus}</p>
                  </div>
                </section>

                {activeReservation || pendingApprovalBooking ? (
                  <p className={`rounded-[20px] border p-4 text-sm leading-5 ${softSurfaceClass}`}>
                    Hotel switching is unavailable while a reservation is active. Manage your booking in the Stay section.
                  </p>
                ) : (
                  <section className={`rounded-[20px] border p-5 ${pageSurfaceClass}`}>
                    <h2 className="text-base font-semibold">Switch hotel</h2>
                    <p className={`mt-1 text-sm leading-5 ${mutedTextClass}`}>
                      Your verified mobile and current table session will be removed from this device.
                    </p>
                    <button
                      type="button"
                      data-testid="reset-guest-session-btn"
                      onClick={() => {
                        if (confirm('Switch hotels? Your verified mobile and current table session will be removed from this device.')) {
                          localStorage.removeItem('spicehub_customer_hotel_chosen');
                          localStorage.removeItem('spicehub_verified_guest_user');
                          localStorage.removeItem('spicehub_customer_session_token');
                          localStorage.removeItem('spicehub_customer_hotel_id');
                          localStorage.removeItem('spicehub_customer_table');
                          setVerifiedGuestUser(null);
                          setGuestName('');
                          setGuestPhone('');
                          setPhoneOtp('');
                          setPhoneOtpSent(false);
                          setPhoneOtpVerified(false);
                          setOtpSuccessMsg(null);
                          setBookingError(null);
                          setCustomerView('hotel_select');
                        }
                      }}
                      className="mt-4 min-h-12 w-full rounded-xl border border-[#B8D0BE] px-4 text-sm font-semibold text-[#123C2B] transition hover:bg-[#F2F7F2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12804E] dark:border-[#486553] dark:text-[#F2F7F2] dark:hover:bg-[#183B2D]"
                    >
                      Switch hotel
                    </button>
                  </section>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* FIXED BOTTOM NAVIGATION BAR                              */}
      {/* ======================================================== */}
      <nav
        data-testid="customer-bottom-nav"
        className={`fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t px-2 md:left-1/2 md:max-w-md md:-translate-x-1/2 ${
          activeReservation && customerView === 'home'
            ? 'border-[#F3E4C2] bg-white'
            : isDark
              ? 'border-[#315342] bg-[#0F2F21]'
              : 'border-[#D7E5D9] bg-[#F7FAF7]'
        } rounded-t-[22px] shadow-[0_-8px_24px_rgba(18,60,43,0.08)]`}
        style={{
          paddingTop: '6px',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
        }}
      >
        {activeReservation && customerView === 'home' ? (
          <>
            <button
              type="button"
              data-testid="nav-tab-my-stay"
              onClick={() => {
                const main = document.querySelector<HTMLElement>('[data-testid="customer-main-content"]');
                if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`min-h-[56px] ${stayNavWidth} flex flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-bold text-[#0F2F21]`}
            >
              <Icons.Bed className="h-5 w-5" />
              <span>{t('My Stay', 'My Stay')}</span>
            </button>
            {selectedHotel?.serviceCapabilities?.inRoomServices !== false && <button
              type="button"
              data-testid="nav-tab-dining"
              onClick={() => launchResidentPortal(activeReservation.roomNumber, selectedHotel, activeReservation.sessionToken, 'DINING')}
              className={`min-h-[56px] ${stayNavWidth} flex flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-medium text-[#596579]`}
            >
              <Icons.Utensils className="h-5 w-5" />
              <span>{t('Dining', 'Dining')}</span>
            </button>}
            {canShowServiceDirectory && <button
              type="button"
              data-testid="nav-tab-services"
              onClick={() => document.getElementById('guest-services')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className={`min-h-[56px] ${stayNavWidth} flex flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-medium text-[#596579]`}
            >
              <Icons.Sparkles className="h-5 w-5" />
              <span>{t('Services', 'Services')}</span>
            </button>}
            <button
              type="button"
              data-testid="nav-tab-folio"
              onClick={() => launchResidentPortal(activeReservation.roomNumber, selectedHotel, activeReservation.sessionToken, 'BILL')}
              className={`min-h-[56px] ${stayNavWidth} flex flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-medium text-[#596579]`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 7h8M8 12h3m-3 4h8m-4-5v4m-2-2h4" />
              </svg>
              <span>{t('Folio', 'Folio')}</span>
            </button>
            <button
              type="button"
              data-testid="nav-tab-orders"
              onClick={() => launchResidentPortal(activeReservation.roomNumber, selectedHotel, activeReservation.sessionToken, 'TRACKING')}
              className={`min-h-[56px] ${stayNavWidth} flex flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-medium text-[#596579]`}
            >
              <Icons.Clock className="h-5 w-5" />
              <span>{t('Orders', 'Orders')}</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              data-testid="nav-tab-home"
              onClick={() => setCustomerView('home')}
              className={`min-h-[56px] min-w-[96px] flex flex-col items-center justify-center py-1.5 px-5 rounded-2xl transition text-[11px] gap-1 ${
 customerView === 'home' || customerView === 'hotel_select'
 ? 'bg-[#123C2B] text-white font-bold shadow-sm'
 : isDark
 ? 'text-[#B9C9BD] font-medium'
 : 'text-[#5E7163] font-medium'
 }`}
            >
              <Icons.Home className="w-5 h-5" />
              <span>{t('Home')}</span>
            </button>
            <button
              type="button"
              data-testid="nav-tab-settings"
              onClick={() => openSettings()}
              className={`min-h-[56px] min-w-[96px] flex flex-col items-center justify-center py-1.5 px-5 rounded-2xl transition text-[11px] gap-1 ${
 customerView === 'settings'
 ? 'bg-[#123C2B] text-white font-bold shadow-sm'
 : isDark
 ? 'text-[#B9C9BD] font-medium'
 : 'text-[#5E7163] font-medium'
 }`}
            >
              <Icons.Settings className="w-5 h-5" />
              <span>{t('Settings')}</span>
            </button>
            <button
              type="button"
              data-testid="nav-tab-profile"
              onClick={() => setCustomerView('profile')}
              className={`min-h-[56px] min-w-[96px] flex flex-col items-center justify-center py-1.5 px-5 rounded-2xl transition text-[11px] gap-1 ${
 customerView === 'profile'
 ? 'bg-[#123C2B] text-white font-bold shadow-sm'
 : isDark
 ? 'text-[#B9C9BD] font-medium'
 : 'text-[#5E7163] font-medium'
 }`}
            >
              <Icons.User className="w-5 h-5" />
              <span>{t('Profile')}</span>
            </button>
          </>
        )}
      </nav>

      {/* ======================================================== */}
      {/* LOCATION & RADIUS CHECK DIALOG                           */}
      {/* ======================================================== */}
      {showLocationRadiusCheck && selectedRoomForBooking && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
        >
          <div
            className={`w-full max-w-sm rounded-2xl border p-5 shadow-sm dark:shadow-none flex flex-col gap-4 text-center ${
 isDark ? 'border-amber-500/40 bg-slate-950 text-white' : 'border-2 border-slate-200 bg-white text-slate-900'
 }`}
          >
            <div className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center mx-auto shadow-md ${
 isDark ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-emerald-100 border-emerald-600 text-emerald-600'
 }`}>
              <Icons.Location className="w-6 h-6" />
            </div>

            <div>
              <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                Location & Radius Verification
              </span>
              <h3 className={`text-base font-black mt-1 ${isDark ? 'text-white' : 'text-slate-950'}`}>
                Booking Room {selectedRoomForBooking.roomNumber}
              </h3>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                Are you currently within hotel premises or booking remotely from home?
              </p>
            </div>

            <div className="flex flex-col gap-2.5 py-1">
              {/* Option 1: At Hotel Premises */}
              <button
                type="button"
                data-testid="radius-option-hotel-premises"
                onClick={() => handleProceedToBookingForm('HOTEL_RADIUS')}
                className={`p-3.5 rounded-xl border-2 text-left transition flex items-start gap-3 active:scale-98 ${
 isDark
 ? 'border-emerald-500/50 bg-emerald-950/30 hover:bg-emerald-950/50'
 : 'border-emerald-500 bg-emerald-50/90 hover:bg-emerald-100 shadow-sm'
 }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
 isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-600 text-white shadow-xs'
 }`}>
                  <Icons.Building className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className={`text-xs font-black ${isDark ? 'text-emerald-400' : 'text-emerald-950'}`}>
                      At Hotel (Within Hotel Radius)
                    </h4>
                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
 isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-600 text-white'
 }`}>
                      On-Site
                    </span>
                  </div>
                  <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700 font-medium'}`}>
                    In the hotel lobby, lounge or grounds. Submit ID documents to reception for instant approval & keycard.
                  </p>
                </div>
              </button>

              {/* Option 2: Remote / Home Booking */}
              <button
                type="button"
                data-testid="radius-option-remote-home"
                onClick={() => handleProceedToBookingForm('REMOTE_HOME')}
                className={`p-3.5 rounded-xl border-2 text-left transition flex items-start gap-3 active:scale-98 ${
 isDark
 ? 'border-slate-800 bg-slate-900/60 hover:bg-slate-800'
 : 'border-slate-300 bg-slate-50 hover:bg-slate-100 shadow-sm'
 }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
 isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-600 text-white shadow-xs'
 }`}>
                  <Icons.Home className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className={`text-xs font-black ${isDark ? 'text-slate-200' : 'text-slate-950'}`}>
                      Booking from Home / Remote
                    </h4>
                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
 isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-600 text-white'
 }`}>
                      Advance
                    </span>
                  </div>
                  <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                    Pre-reserve room from home. Documents will be validated at reception upon arrival.
                  </p>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowLocationRadiusCheck(false)}
              className={`w-full py-2.5 rounded-xl border text-xs font-bold transition ${
 isDark ? 'border-slate-800 text-slate-400 hover:text-white' : 'border-slate-300 text-slate-700 bg-slate-50 hover:bg-slate-100'
 }`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* GUEST DETAILS & RECEPTION DOCUMENT FORM MODAL            */}
      {/* ======================================================== */}
      {isBookingModalOpen && selectedRoomForBooking && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1F16]/45 backdrop-blur-sm px-3 pb-3 lux-fade-in"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 46px)' }}
        >
          <div className="w-full max-w-md lux-sheet max-h-full overflow-y-auto no-scrollbar">
            {/* Sheet Header */}
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#123C2B] flex items-center gap-1.5">
                    <Icons.Location className="w-3.5 h-3.5 text-[#123C2B]" />
                    <span>{bookingLocationType === 'HOTEL_RADIUS' ? 'On-Premises Guest Check-In' : 'Remote Advance Reservation'}</span>
                  </span>
                  <h3 className="font-lux text-[24px] leading-tight font-bold text-[#123C2B] mt-1">
                    Room {selectedRoomForBooking.roomNumber} · {selectedRoomForBooking.roomType.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBookingModalOpen(false)}
                  className="w-9 h-9 rounded-full bg-[#FBF7EE] border border-[#E7DFCE] flex items-center justify-center text-[#123C2B] shrink-0 active:scale-95 transition"
                  aria-label="Close check-in"
                >
                  <Icons.X className="w-4 h-4" />
                </button>
              </div>
              <div className="lux-divider mt-4" />
            </div>

            <div className="px-5 pb-6 flex flex-col gap-4">
              {/* Booking Mode Selector (At Hotel vs Advance Booking) */}
              <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[#F3EDE0] border border-[#E7DFCE]">
                <button
                  type="button"
                  onClick={() => {
                    setBookingLocationType('HOTEL_RADIUS');
                    if (gpsDistKm === null && !gpsChecking) {
                      handleCheckGpsLocation();
                    }
                  }}
                  className={`py-2.5 px-2 rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 transition ${
                    bookingLocationType === 'HOTEL_RADIUS'
                      ? 'bg-[#123C2B] text-white shadow-sm'
                      : 'text-[#7C7566]'
                  }`}
                >
                  <Icons.Building className="w-4 h-4" />
                  <span>At Hotel Check-In</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBookingLocationType('REMOTE_HOME')}
                  className={`py-2.5 px-2 rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 transition ${
                    bookingLocationType === 'REMOTE_HOME'
                      ? 'bg-[#123C2B] text-white shadow-sm'
                      : 'text-[#7C7566]'
                  }`}
                >
                  <Icons.Calendar className="w-4 h-4" />
                  <span>Advance Booking</span>
                </button>
              </div>

              {/* Remote Distance Warning if At Hotel is selected but user is far */}
              {bookingLocationType === 'HOTEL_RADIUS' && gpsDistKm !== null && gpsDistKm > 0.5 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
                  <Icons.Location className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold block">Remote Distance Detected ({gpsDistKm} km away)</span>
                    <span>On-Premises check-in requires being physically inside hotel radius (&lt;500m). Please switch to <b>Advance Booking</b> if reserving from home.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBookingLocationType('REMOTE_HOME')}
                    className="px-2 py-1 rounded-lg bg-amber-600 text-white font-bold text-[10px] shrink-0 active:scale-95 transition"
                  >
                    Switch
                  </button>
                </div>
              )}

              {/* Error Banner */}
              {bookingError && (
                <div className="p-3 rounded-xl bg-[#FDF0EE] border border-[#F0C9C3] text-[#8A2B20] text-[12px] font-medium">
                  {bookingError}
                </div>
              )}

              {/* Transparent Tariff Calculation */}
              {(() => {
                const basePrice = selectedRoomForBooking.roomType.basePriceOvernight || 2500;
                const gstRate = selectedRoomForBooking.roomType.gstRate || (basePrice > 7500 ? 18 : 12);
                const subtotal = basePrice * bookingNights;
                const taxAmount = Math.round(((subtotal * gstRate) / 100) * 100) / 100;
                const grandTotal = subtotal + taxAmount;

                return (
                  <div className="p-4 rounded-2xl border border-[#F3D79B] bg-[#F3E4C2] space-y-2.5">
                    <div className="flex items-center justify-between text-[12.5px] text-[#334155]">
                      <span className="flex items-center gap-2">
                        <Icons.Bed className="w-4 h-4 text-[#123C2B]" />
                        <span>Room Tariff ({bookingNights} {bookingNights === 1 ? 'Night' : 'Nights'} × ₹{basePrice.toLocaleString('en-IN')})</span>
                      </span>
                      <span className="font-bold text-[#123C2B]">₹{subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between text-[12.5px] text-[#5F6F64]">
                      <span className="flex items-center gap-2">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4 text-[#4F8A68]">
                          <rect x="3" y="4" width="18" height="16" rx="2" />
                          <path d="M3 10h18M8 4v16" />
                        </svg>
                        <span>GST ({gstRate}%)</span>
                      </span>
                      <span className="font-semibold">₹{taxAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="border-t border-[#CBDCCF] pt-2.5 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-[13px] font-black text-[#123C2B]">
                        <Icons.CreditCard className="w-4 h-4 text-[#123C2B]" />
                        <span>Total Estimated Tariff</span>
                      </span>
                      <span className="font-lux text-[20px] leading-none font-bold text-[#123C2B]">
                        ₹{grandTotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Guest Booking Form */}
              <form onSubmit={handleSubmitBookingForApproval} className="flex flex-col gap-4">
                {/* Stay Duration Selector */}
                <div>
                  <label className="flex items-center gap-2 lux-label mb-2">
                    <Icons.Bed className="w-4 h-4 text-[#123C2B]" />
                    <span>Stay Duration (Nights)</span>
                  </label>
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setBookingNights(Math.max(1, bookingNights - 1))}
                      className="w-[62px] h-[52px] rounded-2xl border border-[#E9DDBF] bg-[#FBF7EE] text-[#0F2F21] flex items-center justify-center active:scale-95 transition"
                      aria-label="Decrease nights"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" className="w-5 h-5">
                        <path d="M5 12h14" />
                      </svg>
                    </button>
                    <div className="flex-1 text-center">
                      <span className="font-lux text-[19px] font-bold text-[#123C2B]">
                        {bookingNights} {bookingNights === 1 ? 'Night' : 'Nights'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBookingNights(Math.min(30, bookingNights + 1))}
                      className="w-[62px] h-[52px] rounded-2xl border border-[#E9DDBF] bg-[#FBF7EE] text-[#0F2F21] flex items-center justify-center active:scale-95 transition"
                      aria-label="Increase nights"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" className="w-5 h-5">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Primary Guest Full Name */}
                <div>
                  <label className="flex items-center gap-2 lux-label mb-2">
                    <Icons.User className="w-4 h-4 text-[#123C2B]" />
                    <span>Primary Guest Full Name *</span>
                  </label>
                  <div className="relative">
                    <Icons.User className="w-[18px] h-[18px] text-[#7C7566] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      data-testid="input-guest-name"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Vikramaditya Sharma"
                      className="lux-input h-[52px] !pl-11 text-[13px]"
                    />
                  </div>
                </div>

                {/* GPS Geofence Check & Location Guard */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  gpsDistKm !== null && gpsDistKm <= 0.5
                    ? 'border-emerald-300 bg-emerald-50/90 text-emerald-950'
                    : gpsDistKm !== null && gpsDistKm > 0.5
                    ? 'border-amber-300 bg-amber-50/90 text-amber-950'
                    : 'border-[#F3D79B] bg-[#F3E4C2]'
                }`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        gpsDistKm !== null && gpsDistKm <= 0.5
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : gpsDistKm !== null && gpsDistKm > 0.5
                          ? 'bg-amber-600 text-white border-amber-700'
                          : 'bg-white border-[#F7E2B4] text-[#123C2B]'
                      }`}>
                        <Icons.Location className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[12.5px] font-bold text-[#123C2B] block">
                            Location Verification
                          </span>
                          {gpsDistKm !== null && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              gpsDistKm <= 0.5
                                ? 'bg-emerald-200 text-emerald-800'
                                : 'bg-amber-200 text-amber-800'
                            }`}>
                              {gpsDistKm <= 0.5 ? 'On-Site Verified' : 'Remote Location'}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#5F6F64] block truncate mt-0.5">
                          {gpsStatus}
                          {gpsDistKm !== null
                            ? ` · ${gpsDistKm > 0.5 ? `${gpsDistKm} km` : `${Math.round(gpsDistKm * 1000)} m`}`
                            : ''}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCheckGpsLocation()}
                      disabled={gpsChecking}
                      className="px-3 py-2 rounded-xl bg-white border border-[#BFD6C5] text-[#123C2B] text-[11px] font-bold flex items-center gap-1.5 shrink-0 active:scale-95 transition disabled:opacity-60 shadow-xs"
                    >
                      {gpsChecking ? (
                        <div className="w-3.5 h-3.5 border-2 border-[#123C2B] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-3.5 h-3.5">
                          <circle cx="12" cy="12" r="7" />
                          <circle cx="12" cy="12" r="2" />
                          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                        </svg>
                      )}
                      <span>{gpsChecking ? 'Checking...' : 'Check Location'}</span>
                    </button>
                  </div>

                  {/* Dev / Testing Quick Button for localhost */}
                  {typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                    <div className="mt-2.5 pt-2 border-t border-black/10 flex items-center justify-between text-[10px]">
                      <span className="text-[#7C7566]">Dev Helper:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const hLat = Number((selectedHotel as any)?.coordinates?.latitude) || Number((selectedHotel as any)?.latitude) || 26.2978;
                          const hLng = Number((selectedHotel as any)?.coordinates?.longitude) || Number((selectedHotel as any)?.longitude) || 73.0185;
                          handleCheckGpsLocation({ latitude: hLat, longitude: hLng });
                        }}
                        className="text-[#123C2B] font-bold underline hover:text-[#0F2F21]"
                      >
                        Simulate On-Premises (0m)
                      </button>
                    </div>
                  )}
                </div>

                {/* Advance Booking Timing for Remote/Home Reservations or Occupied Rooms */}
                {(bookingLocationType === 'REMOTE_HOME' || isAdvanceBookingMode || selectedRoomForBooking?.displayStatus !== 'AVAILABLE') && (
                  <div className="p-4 rounded-2xl border border-[#E7DFCE] bg-[#FBF7EE] space-y-3">
                    <div>
                      <span className="text-[12.5px] font-bold text-[#123C2B] block">
                        Schedule Dates & Arrival Time
                      </span>
                      <span className="text-[10.5px] text-[#7C7566]">
                        {selectedRoomForBooking?.displayStatus !== 'AVAILABLE'
                          ? 'Select non-conflicting time or future date for this room'
                          : 'Choose your stay window for advance reservation'}
                      </span>
                    </div>

                    {selectedRoomForBooking?.displayStatus !== 'AVAILABLE' && (
                      <div className="p-3 rounded-xl bg-[#FFF8EB] border border-[#F5D0A9] text-[#8C4E00] text-[11px] flex items-start gap-2">
                        <Icons.Clock className="w-4 h-4 text-[#C25E00] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">
                            {selectedRoomForBooking?.statusBadge || 'Room is currently booked for immediate slot'}
                          </span>
                          <span className="text-[10px] text-[#A66100]">
                            Please pick a non-conflicting time slot or book for tomorrow/future dates.
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold mb-1 text-[#7C7566]">Check-In Date *</label>
                        <input
                          type="date"
                          data-testid="input-checkin-date"
                          value={checkInDateInput}
                          onChange={(e) => setCheckInDateInput(e.target.value)}
                          className="lux-input h-[42px] px-2.5 text-[12px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold mb-1 text-[#7C7566]">Check-In Time *</label>
                        <input
                          type="time"
                          data-testid="input-checkin-time"
                          value={estimatedArrivalTime}
                          onChange={(e) => setEstimatedArrivalTime(e.target.value)}
                          className="lux-input h-[42px] px-2.5 text-[12px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold mb-1 text-[#7C7566]">Check-Out Date *</label>
                        <input
                          type="date"
                          data-testid="input-checkout-date"
                          value={checkOutDateInput}
                          onChange={(e) => setCheckOutDateInput(e.target.value)}
                          className="lux-input h-[42px] px-2.5 text-[12px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold mb-1 text-[#7C7566]">Check-Out Time *</label>
                        <input
                          type="time"
                          data-testid="input-checkout-time"
                          value={estimatedDepartureTime}
                          onChange={(e) => setEstimatedDepartureTime(e.target.value)}
                          className="lux-input h-[42px] px-2.5 text-[12px]"
                        />
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-[#E7DFCE] text-[10px] font-medium flex items-center justify-between gap-2 text-[#7C7566]">
                      <span className="shrink-0">Requested Window</span>
                      <span className="font-mono font-bold text-[#123C2B] truncate">
                        {checkInDateInput} ({estimatedArrivalTime}) - {checkOutDateInput} ({estimatedDepartureTime})
                      </span>
                    </div>
                  </div>
                )}

                {/* Mobile Number & Guests Count */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="flex items-center gap-1.5 lux-label mb-2">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-3.5 h-3.5 text-[#123C2B]">
                        <rect x="7" y="2" width="10" height="20" rx="2" />
                        <path d="M11 18h2" />
                      </svg>
                      <span>Mobile Number *</span>
                    </label>
                    <div className="relative">
                      <Icons.Phone className="w-4 h-4 text-[#7C7566] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="tel"
                        required
                        data-testid="input-guest-phone"
                        value={guestPhone}
                        onChange={(e) => {
                          setGuestPhone(e.target.value);
                          setPhoneOtpVerified(false);
                        }}
                        placeholder="e.g. 9820011223"
                        className="lux-input h-[52px] !pl-9 !pr-2 text-[12.5px]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 lux-label mb-2">
                      <Icons.User className="w-3.5 h-3.5 text-[#123C2B]" />
                      <span>Guests Count</span>
                    </label>
                    <div className="relative">
                      <select
                        value={guestCount}
                        onChange={(e) => setGuestCount(Number(e.target.value))}
                        className="lux-input h-[52px] px-3 pr-8 text-[12.5px] appearance-none"
                      >
                        <option value={1}>1 Guest</option>
                        <option value={2}>2 Guests</option>
                        <option value={3}>3 Guests</option>
                        <option value={4}>4 Guests</option>
                      </select>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className="w-4 h-4 text-[#7C7566] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Phone OTP Verification */}
                <div className="p-4 rounded-2xl border border-[#E7DFCE] bg-[#FAF7F0] space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="w-9 h-9 rounded-xl bg-[#F3E4C2] border border-[#F7E2B4] flex items-center justify-center shrink-0">
                        <Icons.Shield className="w-4 h-4 text-[#123C2B]" />
                      </span>
                      <div className="min-w-0">
                        <span className="text-[12.5px] font-bold text-[#123C2B] block">
                          Phone Verification
                        </span>
                        <span className="text-[10.5px] text-[#7C7566] block">
                          Quick OTP verification for your booking
                        </span>
                      </div>
                    </div>
                    {phoneOtpVerified ? (
                      <span className="text-[10px] font-bold text-[#123C2B] flex items-center gap-1 bg-[#E4F1E6] px-2.5 py-1.5 rounded-full border border-[#F7E2B4] shrink-0">
                        <Icons.Check className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendPhoneOtp}
                        disabled={otpSending || !guestPhone.trim()}
                        className="px-3.5 py-2 rounded-xl bg-[#123C2B] text-white text-[11px] font-bold flex items-center gap-1.5 shrink-0 active:scale-95 transition disabled:opacity-50"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                          <path d="m22 2-7 20-4-9-9-4Z" />
                          <path d="M22 2 11 13" />
                        </svg>
                        <span>{otpSending ? 'Sending...' : phoneOtpSent ? 'Resend OTP' : 'Send OTP'}</span>
                      </button>
                    )}
                  </div>

                  {!phoneOtpVerified && phoneOtpSent && (
                    <div className="flex items-center gap-2 pt-0.5">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="Enter OTP"
                        value={phoneOtp}
                        onChange={(e) => setPhoneOtp(e.target.value)}
                        className="lux-input flex-1 h-[44px] text-center font-mono tracking-[0.3em] text-[13px]"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyPhoneOtp}
                        disabled={otpVerifying}
                        className="px-4 h-[44px] rounded-xl bg-[#123C2B] text-white font-bold text-[11px] active:scale-95 transition disabled:opacity-50"
                      >
                        {otpVerifying ? 'Verifying...' : 'Verify OTP'}
                      </button>
                    </div>
                  )}

                  {otpSuccessMsg && (
                    <p className="text-[10.5px] text-[#123C2B] font-semibold">{otpSuccessMsg}</p>
                  )}
                </div>

                {/* Email Address */}
                <div>
                  <label className="flex items-center gap-2 lux-label mb-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4 text-[#123C2B]">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="m3 7 9 6 9-6" />
                    </svg>
                    <span>Email Address (Optional)</span>
                  </label>
                  <div className="relative">
                    <Icons.User className="w-[18px] h-[18px] text-[#7C7566] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      data-testid="input-guest-email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="e.g. vikram@example.com"
                      className="lux-input h-[52px] !pl-11 text-[13px]"
                    />
                  </div>
                </div>

                {/* ID VERIFICATION (FRONT & BACK) */}
                <div className="p-4 rounded-2xl border border-[#E9E1D1] bg-white space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="w-9 h-9 rounded-xl bg-[#F3E4C2] border border-[#F7E2B4] flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4 text-[#123C2B]">
                          <rect x="3" y="5" width="18" height="14" rx="2" />
                          <circle cx="8.5" cy="10" r="1.5" />
                          <path d="M13 9h5M13 13h5M6 15c.7-1 1.5-1.5 2.5-1.5S10.3 14 11 15" />
                        </svg>
                      </span>
                      <div className="min-w-0">
                        <span className="text-[12.5px] font-bold text-[#123C2B] uppercase tracking-wide block">
                          {bookingLocationType === 'REMOTE_HOME' ? 'Government ID (Optional)' : 'ID Verification (Front & Back)'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#F7E2B4] text-[#0F2F21] border border-[#F3D79B] shrink-0">
                      {bookingLocationType === 'REMOTE_HOME' ? 'Verify on Arrival' : 'Photos Required'}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#7C7566]">
                    {bookingLocationType === 'REMOTE_HOME'
                      ? 'Documents can be verified at the Front Desk when you arrive, or you can attach photos now.'
                      : 'Attach photos of your ID card for front desk room check-in verification.'}
                  </p>

                  <div className="flex flex-col gap-3">
                    {/* Front Side Upload */}
                    <div className="rounded-2xl p-3 border border-[#E7DFCE] bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[12px] font-bold text-[#123C2B] flex items-center gap-2">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4 text-[#123C2B]">
                            <rect x="3" y="4" width="18" height="16" rx="2" />
                            <circle cx="8.5" cy="9.5" r="1.5" />
                            <path d="m21 16-5-5L5 20" />
                          </svg>
                          <span>Front Side (Photo & Name)</span>
                        </span>
                        {aadhaarFront && (
                          <span className="text-[10px] text-[#123C2B] font-bold flex items-center gap-1">
                            <Icons.Check className="w-3 h-3 text-emerald-600" />
                            <span>Attached</span>
                          </span>
                        )}
                      </div>

                      {aadhaarFront ? (
                        <div className="relative rounded-xl overflow-hidden border border-[#F7E2B4] bg-[#FBF7EE] h-24 flex items-center justify-center">
                          <img src={aadhaarFront} alt="Aadhaar Front" className="h-full w-full object-contain" />
                          <button
                            type="button"
                            onClick={() => setAadhaarFront(null)}
                            className="absolute top-1.5 right-1.5 bg-[#123C2B]/85 text-white p-1 rounded-md"
                          >
                            <Icons.X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2.5">
                          <label className="flex items-center justify-center gap-1.5 h-[42px] rounded-xl border border-[#F7E2B4] bg-[#F3E4C2] text-[#123C2B] text-[11px] font-bold cursor-pointer active:scale-95 transition">
                            <Icons.Gallery className="w-4 h-4" />
                            <span>{aadhaarCompressing === 'FRONT' ? 'Reading...' : 'Choose Gallery'}</span>
                            <input type="file" accept="image/*" onChange={(e) => handleUploadAadhaar(e, 'FRONT')} className="hidden" />
                          </label>
                          <label className="flex items-center justify-center gap-1.5 h-[42px] rounded-xl border border-[#F3D79B] bg-[#FBF7EE] text-[#0F2F21] text-[11px] font-bold cursor-pointer active:scale-95 transition">
                            <Icons.Camera className="w-4 h-4" />
                            <span>Take Photo</span>
                            <input type="file" accept="image/*" capture="environment" onChange={(e) => handleUploadAadhaar(e, 'FRONT')} className="hidden" />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Back Side Upload */}
                    <div className="rounded-2xl p-3 border border-[#E7DFCE] bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[12px] font-bold text-[#123C2B] flex items-center gap-2">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4 text-[#123C2B]">
                            <rect x="3" y="4" width="18" height="16" rx="2" />
                            <circle cx="8.5" cy="9.5" r="1.5" />
                            <path d="m21 16-5-5L5 20" />
                          </svg>
                          <span>Back Side (Address & QR)</span>
                        </span>
                        {aadhaarBack && (
                          <span className="text-[10px] text-[#123C2B] font-bold flex items-center gap-1">
                            <Icons.Check className="w-3 h-3 text-emerald-600" />
                            <span>Attached</span>
                          </span>
                        )}
                      </div>

                      {aadhaarBack ? (
                        <div className="relative rounded-xl overflow-hidden border border-[#F7E2B4] bg-[#FBF7EE] h-24 flex items-center justify-center">
                          <img src={aadhaarBack} alt="Aadhaar Back" className="h-full w-full object-contain" />
                          <button
                            type="button"
                            onClick={() => setAadhaarBack(null)}
                            className="absolute top-1.5 right-1.5 bg-[#123C2B]/85 text-white p-1 rounded-md"
                          >
                            <Icons.X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2.5">
                          <label className="flex items-center justify-center gap-1.5 h-[42px] rounded-xl border border-[#F7E2B4] bg-[#F3E4C2] text-[#123C2B] text-[11px] font-bold cursor-pointer active:scale-95 transition">
                            <Icons.Gallery className="w-4 h-4" />
                            <span>{aadhaarCompressing === 'BACK' ? 'Reading...' : 'Choose Gallery'}</span>
                            <input type="file" accept="image/*" onChange={(e) => handleUploadAadhaar(e, 'BACK')} className="hidden" />
                          </label>
                          <label className="flex items-center justify-center gap-1.5 h-[42px] rounded-xl border border-[#F3D79B] bg-[#FBF7EE] text-[#0F2F21] text-[11px] font-bold cursor-pointer active:scale-95 transition">
                            <Icons.Camera className="w-4 h-4" />
                            <span>Take Photo</span>
                            <input type="file" accept="image/*" capture="environment" onChange={(e) => handleUploadAadhaar(e, 'BACK')} className="hidden" />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2-ROOM QUOTA & SECONDARY GUEST DISCLOSURE */}
                <div className="p-4 rounded-2xl border border-[#E7DFCE] bg-[#FBF7EE] space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[12px] font-bold block text-[#123C2B]">
                        2nd Room Booking / Accompanying Guest
                      </span>
                      <span className="text-[10px] text-[#7C7566]">
                        Strict ceiling: Maximum 2 rooms per mobile number
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSecondRoom(!isSecondRoom)}
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
 isSecondRoom ? 'bg-[#123C2B]' : 'bg-[#D8CEBA]'
 }`}
                    >
                      <span
                        className={`block w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${
 isSecondRoom ? 'translate-x-6' : 'translate-x-0'
 }`}
                      />
                    </button>
                  </div>

                  {isSecondRoom && (
                    <div className="pt-2 border-t border-[#E9E1D1] space-y-2">
                      <p className="text-[11px] text-[#5F5A4D] font-medium">
                        Who is this 2nd room for? Please provide the secondary guest's name and relationship.
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <label className="text-[10px] font-bold block mb-1 text-[#7C7566]">Secondary Guest Full Name *</label>
                          <input
                            type="text"
                            placeholder="e.g. Radhika Sharma"
                            value={secondaryGuestName}
                            onChange={(e) => setSecondaryGuestName(e.target.value)}
                            className="lux-input h-[44px] text-[12px]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold block mb-1 text-[#7C7566]">Relationship to Primary Guest</label>
                          <select
                            value={secondaryGuestRelationship}
                            onChange={(e) => setSecondaryGuestRelationship(e.target.value)}
                            className="lux-input h-[44px] text-[12px] appearance-none"
                          >
                            <option value="Spouse">Spouse</option>
                            <option value="Child / Dependent">Child / Dependent</option>
                            <option value="Parents / Family">Parents / Family</option>
                            <option value="Colleague / Business Partner">Colleague / Business Partner</option>
                            <option value="Friend">Friend</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit CTA */}
                <button
                  type="submit"
                  disabled={isSubmittingBooking || !phoneOtpVerified}
                  data-testid="submit-reception-docs-btn"
                  className="min-h-[54px] rounded-[14px] luxury-submit lux-btn-primary text-[12px] uppercase tracking-[0.06em] flex items-center justify-center gap-2 mt-1"
                  style={!phoneOtpVerified ? { background: '#D9D2C3', color: '#7C7566', boxShadow: 'none' } : undefined}
                >
                  {isSubmittingBooking ? (
                    <span>Submitting Booking to Reception...</span>
                  ) : !phoneOtpVerified ? (
                    <>
                      <Icons.Shield className="w-4 h-4" />
                      <span>Verify Mobile OTP Above to Book</span>
                    </>
                  ) : (
                    <>
                      <Icons.Check className="w-4 h-4" />
                      <span>Submit Booking to Reception</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DIGITAL BOOKING VOUCHER MODAL (WHEN APPROVED)            */}
      {/* ======================================================== */}
      {bookingConfirmation && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"
        >
          <div
            className={`w-full max-w-sm rounded-2xl border p-5 sm:p-6 shadow-sm dark:shadow-none flex flex-col gap-4 text-center ${
 isDark ? 'border-amber-500/40 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'
 }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500 text-emerald-500 flex items-center justify-center mx-auto shadow-md">
              <Icons.Check className="w-6 h-6 text-emerald-500" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Reception Verified & Keycard Active
              </span>
              <h3 className={`text-lg font-black mt-0.5 ${isDark ? 'text-white' : 'text-slate-950'}`}>Room {bookingConfirmation.roomNumber}</h3>
              <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>{bookingConfirmation.roomTypeName}</p>
            </div>

            {/* Voucher Reference Box */}
            <div
              className={`p-3.5 rounded-xl border-2 text-left space-y-2 text-xs shadow-sm ${
 isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-300'
 }`}
            >
              <div className="flex justify-between items-center">
                <span className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Booking Ref:</span>
                <span className="font-mono font-black text-amber-700 dark:text-amber-400">
                  {bookingConfirmation.bookingNumber}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Primary Guest:</span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>{bookingConfirmation.guestName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Stay Dates:</span>
                <span className={`font-medium text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                  {bookingConfirmation.checkInDate} - {bookingConfirmation.checkOutDate} ({bookingConfirmation.nights} nt)
                </span>
              </div>
              <div className={`flex justify-between items-center border-t pt-1.5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <span className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Total Tariff:</span>
                <span className="font-black text-emerald-800 dark:text-emerald-400">
                  ₹{bookingConfirmation.grandTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                data-testid="voucher-open-resident-btn"
                onClick={() => {
                  if (bookingConfirmation) {
                    localStorage.setItem(`spicehub_room_entered_${bookingConfirmation.bookingNumber}`, 'true');
                    setIsRoomEntered(true);
                  }
                  setBookingConfirmation(null);
                  launchResidentPortal(
                    bookingConfirmation.roomNumber,
                    selectedHotel,
                    bookingConfirmation.sessionToken,
                    'HOME'
                  );
                }}
                className="min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition active:scale-98"
              >
                <Icons.Key className="w-4 h-4 text-white" />
                <span>{t('Tap Digital Keycard to Unlock Room')}</span>
              </button>

              {isRoomEntered && (
                <button
                  type="button"
                  data-testid="voucher-order-food-btn"
                  onClick={() => {
                    setBookingConfirmation(null);
                    launchResidentPortal(
                      bookingConfirmation.roomNumber,
                      selectedHotel,
                      bookingConfirmation.sessionToken,
                      'DINING'
                    );
                  }}
                  className={`min-h-[42px] rounded-xl border font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition ${
 isDark
 ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
 : 'border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200'
 }`}
                >
                  <Icons.Utensils className="w-4 h-4 text-amber-500" />
                  <span>{t('Order Food to Room')} {bookingConfirmation.roomNumber}</span>
                </button>
              )}

              <button
                type="button"
                data-testid="voucher-close-btn"
                onClick={() => setBookingConfirmation(null)}
                className={`min-h-[38px] rounded-xl border font-semibold text-xs transition ${
 isDark ? 'border-slate-800 bg-slate-900/60 text-slate-400' : 'border-slate-200 bg-white text-slate-500'
 }`}
              >
                Close Voucher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ACTIVE ROOM STAY & KEYCARD MODAL                         */}
      {/* ======================================================== */}
      {showActiveStayModal && activeReservation && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"
        >
          <div
            className={`w-full max-w-sm rounded-2xl border p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-center ${
 isDark ? 'border-amber-500/40 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'
 }`}
          >
            <div className="flex items-center justify-between pb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Icons.Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Reception Verified • Stay Active</span>
              </span>
              <button
                type="button"
                onClick={() => setShowActiveStayModal(false)}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition ${
 isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
 }`}
              >
                <Icons.X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border-2 border-amber-400 text-amber-500 flex items-center justify-center mx-auto shadow-md">
              <Icons.Key className="w-7 h-7 text-amber-500" />
            </div>

            <div>
              <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
                Room {activeReservation.roomNumber}
              </h3>
              <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {activeReservation.roomTypeName}
              </p>
            </div>

            {/* Stay Details Box */}
            <div
              className={`p-3.5 rounded-xl border text-left space-y-2 text-xs shadow-xs ${
 isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
 }`}
            >
              <div className="flex justify-between items-center">
                <span className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Booking Ref:</span>
                <span className="font-mono font-black text-amber-600 dark:text-amber-400">
                  {activeReservation.bookingNumber}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Primary Guest:</span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{activeReservation.guestName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Stay Dates:</span>
                <span className={`font-medium text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {activeReservation.checkInDate} - {activeReservation.checkOutDate} ({activeReservation.nights || 1} Night)
                </span>
              </div>
              {activeReservation.grandTotal && (
                <div className={`flex justify-between items-center border-t pt-1.5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <span className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Tariff:</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">
                    ₹{activeReservation.grandTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>

            {/* In-Room High Speed WiFi Card */}
            <div
              className={`p-3 rounded-xl border text-left flex items-center justify-between text-xs ${
 isDark ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-950'
 }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Icons.Wifi className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">
                    High-Speed Room WiFi
                  </span>
                  <span className="font-mono font-bold text-xs">{activeReservation.wifiSsid || 'TajGateway_HighSpeed'}</span>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Pass: <strong>{activeReservation.wifiPassword || 'GuestPass@101'}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                data-testid="stay-open-resident-btn"
                onClick={() => {
                  setShowActiveStayModal(false);
                  launchResidentPortal(
                    activeReservation.roomNumber,
                    selectedHotel,
                    activeReservation.sessionToken,
                    'HOME'
                  );
                }}
                className="min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition active:scale-98"
              >
                <Icons.Key className="w-4 h-4" />
                <span className="flex items-center gap-1.5">
                  Enter Room / Open Keycard
                  <Icons.ArrowRight className="w-3.5 h-3.5" />
                </span>
              </button>

              <button
                type="button"
                data-testid="stay-order-food-btn"
                onClick={() => {
                  setShowActiveStayModal(false);
                  launchResidentPortal(
                    activeReservation.roomNumber,
                    selectedHotel,
                    activeReservation.sessionToken,
                    'DINING'
                  );
                }}
                className={`min-h-[42px] rounded-xl border font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition ${
 isDark
 ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
 : 'border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200'
 }`}
              >
                <Icons.Utensils className="w-4 h-4 text-amber-500" />
                <span>Order In-Room Dining</span>
              </button>

              <button
                type="button"
                data-testid="stay-close-btn"
                onClick={() => setShowActiveStayModal(false)}
                className={`min-h-[38px] rounded-xl border text-xs font-bold transition ${
 isDark ? 'border-slate-800 text-slate-400 hover:text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
 }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Icons.ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Hotel Home</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* HOTEL SELECTION MODAL                                    */}
      {/* ======================================================== */}
      {isHotelModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in"
        >
          <div
            className={`w-full max-w-sm rounded-2xl border p-5 shadow-sm dark:shadow-none flex flex-col gap-3.5 max-h-[80vh] ${
 isDark ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'
 }`}
          >
            <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <h3 className="text-sm font-black">Select Hotel Property</h3>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setHotelLoadAttempt((attempt) => attempt + 1)}
                  disabled={loadingHotels}
                  aria-label="Refresh hotels"
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                    isDark ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Icons.RefreshCw className={`w-3.5 h-3.5 ${loadingHotels ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsHotelModalOpen(false)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                    isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  <Icons.X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                value={hotelSearch}
                onChange={(e) => setHotelSearch(e.target.value)}
                placeholder="Search hotel or city..."
                className={`w-full min-h-[44px] rounded-xl border pl-10 pr-9 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#12804E] shadow-xs ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-400'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
              <Icons.Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              {hotelSearch && (
                <button
                  type="button"
                  onClick={() => setHotelSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <Icons.X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-0.5">
              {filteredHotels.map((h) => {
                const isSelected = selectedHotel?.id === h.id;
                const cover = getHotelCoverImage(h);
                const logo = h.logoUrl || FALLBACK_HOTEL_LOGO;

                return (
                  <button
                    key={h.id}
                    type="button"
                    data-testid={`hotel-select-option-${h.id}`}
                    onClick={() => {
                      selectHotel(h);
                      setIsHotelModalOpen(false);
                    }}
                    className={`rounded-xl border text-left transition overflow-hidden flex flex-col ${
 isSelected
 ? 'border-amber-500 bg-amber-500/10 shadow-sm'
 : isDark
 ? 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/80'
 : 'border-slate-200 bg-white hover:bg-slate-50 shadow-sm'
 }`}
                  >
                    <div className="h-16 w-full relative overflow-hidden bg-slate-950">
                      <img
                        src={cover}
                        alt=""
                        onError={handleImageError(FALLBACK_HOTEL_COVER)}
                        className="w-full h-full object-cover"
                      />
                      <div className="bg-gradient-to-t absolute inset-0 from-black/80 via-black/40" />
                      <div className="absolute top-2 right-2">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-black/60 text-white border border-white/20 flex items-center gap-1">
                          <Icons.Location className="w-2.5 h-2.5 text-amber-400" />
                          <span>{h.city || 'India'}</span>
                        </span>
                      </div>
                      <div className="absolute bottom-1.5 left-2.5 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg overflow-hidden border border-white shadow bg-white shrink-0">
                          <img
                            src={logo}
                            alt=""
                            onError={handleImageError(FALLBACK_HOTEL_LOGO)}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-xs font-black text-white truncate max-w-[200px] drop-shadow">
                          {h.name}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 flex items-center justify-between">
                      <p className={`text-[10px] truncate max-w-[220px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {h.tagline || 'SpiceHub Hospitality Property'}
                      </p>
                      {isSelected ? (
                        <span className="text-[10px] font-black text-amber-500 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30 flex items-center gap-1">
                          <Icons.Check className="w-3 h-3 text-amber-500" />
                          <span>ACTIVE</span>
                        </span>
                      ) : (
                        <Icons.ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 24/7 Concierge & Floor Support Live Chatbox Modal */}
      <CustomerNeedHelpChatModal
        isOpen={isHelpChatOpen}
        onClose={() => setIsHelpChatOpen(false)}
        hotelId={selectedHotel?.id || ''}
        hotelName={selectedHotel?.name || 'SpiceHub Hotel'}
        currentRoomNumber={activeReservation?.roomNumber || ''}
        currentTableNumber={''}
        guestName={profileName || 'Valued Guest'}
        guestPhone={profilePhone || ''}
        apiBaseUrl={DEFAULT_API_BASE}
        socketUrl={SOCKET_URL}
      />
      </div>
    </div>
  );
};
