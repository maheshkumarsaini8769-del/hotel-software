import React, { useState, useEffect, useRef, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { App as CapApp } from '@capacitor/app';
import { registerPlugin } from '@capacitor/core';
import jsQR from 'jsqr';
import { useTranslation, LanguageToggle } from '@spicehub/ui';

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
  enabledPortals?: string[];
  contactPhone?: string;
  wifiSsid?: string;
  wifiPassword?: string;
}

export interface CatalogRoom {
  id: string;
  roomNumber: string;
  floorNumber: number;
  wing: string;
  displayStatus: 'AVAILABLE' | 'CLEANING' | 'MAINTENANCE' | 'OCCUPIED';
  statusBadge: string;
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

const generateSampleAadhaarImage = (side: 'FRONT' | 'BACK', name: string, phone: string): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 380;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = side === 'FRONT' ? '#f8fafc' : '#f1f5f9';
    ctx.fillRect(0, 0, 600, 380);
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(0, 0, 600, 28);
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(0, 352, 600, 28);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(
      side === 'FRONT' ? 'GOVERNMENT OF INDIA - AADHAAR CARD' : 'UNIQUE IDENTIFICATION AUTHORITY OF INDIA',
      24,
      64
    );
    ctx.font = '14px sans-serif';
    if (side === 'FRONT') {
      ctx.fillText(`Name: ${name || 'Resident Guest'}`, 170, 115);
      ctx.fillText(`DOB: 15/08/1990`, 170, 145);
      ctx.fillText(`Gender: MALE`, 170, 175);
      ctx.font = 'bold 22px monospace';
      ctx.fillText(`XXXX XXXX ${phone.slice(-4) || '9012'}`, 170, 230);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(24, 90, 120, 150);
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('ID PHOTO', 55, 170);
    } else {
      ctx.fillText(`Address: H-44, Civil Lines, Jaipur, Rajasthan - 302006`, 24, 115);
      ctx.fillText(`Guardian: K. S. Oberoi`, 24, 145);
      ctx.fillText(`UIDAI Official Helpline: 1947`, 24, 195);
      ctx.font = 'bold 22px monospace';
      ctx.fillText(`XXXX XXXX ${phone.slice(-4) || '9012'}`, 24, 250);
      ctx.fillStyle = '#334155';
      ctx.fillRect(440, 95, 130, 130);
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px monospace';
      ctx.fillText('VERIFIED QR', 460, 165);
    }
  }
  return canvas.toDataURL('image/jpeg', 0.8);
};

// Resilient Offline-Safe SVG Fallbacks
const FALLBACK_HOTEL_COVER = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
  <defs>
    <linearGradient id="hotelBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="50%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
  </defs>
  <rect width="800" height="400" fill="url(#hotelBg)"/>
  <circle cx="400" cy="180" r="140" fill="#d97706" opacity="0.08"/>
  <path d="M260 280 L260 160 L330 110 L400 160 L400 280 Z" fill="#334155" opacity="0.6"/>
  <path d="M400 280 L400 130 L470 80 L540 130 L540 280 Z" fill="#1e293b" opacity="0.8"/>
  <path d="M330 280 L330 140 L400 90 L470 140 L470 280 Z" fill="#475569" opacity="0.8"/>
  <g fill="#fbbf24" opacity="0.75">
    <rect x="355" y="160" width="16" height="20" rx="3"/>
    <rect x="390" y="160" width="16" height="20" rx="3"/>
    <rect x="425" y="160" width="16" height="20" rx="3"/>
    <rect x="355" y="200" width="16" height="20" rx="3"/>
    <rect x="390" y="200" width="16" height="20" rx="3"/>
    <rect x="425" y="200" width="16" height="20" rx="3"/>
    <rect x="355" y="240" width="16" height="20" rx="3"/>
    <rect x="390" y="240" width="16" height="20" rx="3"/>
    <rect x="425" y="240" width="16" height="20" rx="3"/>
  </g>
  <text x="400" y="340" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="22" font-weight="800" text-anchor="middle" letter-spacing="2">SPICEHUB LUXURY RESORT</text>
  <text x="400" y="365" fill="#f59e0b" font-family="system-ui, sans-serif" font-size="12" font-weight="600" text-anchor="middle" letter-spacing="4">HERITAGE HOSPITALITY &amp; SUITES</text>
</svg>
`);

const FALLBACK_HOTEL_LOGO = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
  </defs>
  <rect width="120" height="120" rx="30" fill="url(#logoBg)"/>
  <circle cx="60" cy="60" r="46" fill="none" stroke="#fef3c7" stroke-width="2" stroke-dasharray="4,4"/>
  <text x="60" y="72" fill="#ffffff" font-family="system-ui, sans-serif" font-size="36" font-weight="900" text-anchor="middle">S</text>
  <circle cx="60" cy="24" r="3.5" fill="#fbbf24"/>
</svg>
`);

const FALLBACK_ROOM_IMAGE = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
  <defs>
    <linearGradient id="roomBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="600" height="400" fill="url(#roomBg)"/>
  <rect x="150" y="80" width="300" height="150" rx="8" fill="#334155" opacity="0.6"/>
  <rect x="180" y="100" width="240" height="110" rx="4" fill="#475569" opacity="0.8"/>
  <rect x="160" y="210" width="280" height="120" rx="12" fill="#e2e8f0"/>
  <path d="M160 250 L440 250 L440 330 L160 330 Z" fill="#cbd5e1"/>
  <rect x="180" y="180" width="100" height="45" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <rect x="320" y="180" width="100" height="45" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <circle cx="110" cy="180" r="18" fill="#fef08a" opacity="0.8"/>
  <circle cx="490" cy="180" r="18" fill="#fef08a" opacity="0.8"/>
  <text x="300" y="375" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="16" font-weight="800" text-anchor="middle" letter-spacing="1">PREMIUM EXECUTIVE SUITE</text>
</svg>
`);

const CURATED_ROOM_IMAGES = [
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=900&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=900&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=900&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=900&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=900&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=900&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=900&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=900&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=900&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&auto=format&fit=crop&q=80',
];

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
};

const PROD_API_BASE = 'https://spicehub-backend.vercel.app';
const PROD_TABLE_PORTAL_BASE = 'https://spicehub-customer-table.vercel.app';
const PROD_ROOM_PORTAL_BASE = 'https://spicehub-guest-portal.vercel.app';
const PROD_SOCKET_URL = 'https://spicehub-socket-server.onrender.com';
const DEV_LAN_HOST = '127.0.0.1';

const resolveInitialServerHost = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('spicehub_server_host');
    if (saved && saved !== '127.0.0.1' && saved !== 'localhost' && !saved.startsWith('192.168.') && !saved.startsWith('10.')) {
      return saved;
    }
  }
  return PROD_API_BASE;
};

export const App: React.FC = () => {
  // Standalone Global Cloud APK: Automatically bind to Live Production Backend
  useEffect(() => {
    try {
      const current = localStorage.getItem('spicehub_server_host');
      if (!current || current === '127.0.0.1' || current === 'localhost' || current.startsWith('192.168.') || current.startsWith('10.')) {
        localStorage.setItem('spicehub_server_host', PROD_API_BASE);
        setServerHost(PROD_API_BASE);
      }
    } catch {}
  }, []);

  // Configurable Host: Connected Live Production Backend Engine Host
  const [serverHost, setServerHost] = useState<string>(resolveInitialServerHost);

  const isProductionHost =
    serverHost.includes('vercel.app') ||
    serverHost.includes('onrender.com') ||
    (serverHost.startsWith('https://') && !serverHost.includes('localhost') && !serverHost.includes('127.0.0.1'));

  const BASE = serverHost.startsWith('http://') || serverHost.startsWith('https://')
    ? serverHost.replace(/\/+$/, '')
    : `http://${serverHost}`;

  const DEFAULT_API_BASE = isProductionHost
    ? serverHost.replace(/\/+$/, '')
    : `${BASE.includes(':5000') ? BASE : BASE + ':5000'}`;

  const TABLE_PORTAL_BASE = isProductionHost
    ? PROD_TABLE_PORTAL_BASE
    : `${BASE.includes(':3001') ? BASE : BASE + ':3001'}`;

  const ROOM_PORTAL_BASE = isProductionHost
    ? PROD_ROOM_PORTAL_BASE
    : `${BASE.includes(':3004') ? BASE : BASE + ':3004'}`;

  const SOCKET_URL = isProductionHost
    ? PROD_SOCKET_URL
    : `${BASE.includes(':5000') ? BASE : BASE + ':5000'}`;

  // Theme state: Strictly Bright Mode (Light Theme) per global standard
  const [theme] = useState<'light'>('light');
  const toggleTheme = () => {};
  const isDark = false;
  const { t, locale } = useTranslation();

  // Synchronize HTML element & body background with active theme
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#f8fafc';
      document.body.style.color = '#0f172a';
    }
  }, []);

  // Navigation state: 'hotel_select' (Step 1) -> 'home' (Step 2: Service Choice) -> 'rooms' (Step 3: Room Catalog) -> 'waiting_approval' (Step 5)
  const [customerView, setCustomerView] = useState<'hotel_select' | 'home' | 'rooms' | 'waiting_approval' | 'table_scan' | 'resident_verify' | 'profile'>(() => {
    if (typeof window !== 'undefined') {
      const pending = localStorage.getItem('spicehub_pending_approval_booking');
      if (pending) return 'waiting_approval';
      const active = localStorage.getItem('spicehub_active_guest_reservation');
      if (active) return 'home';
      const chosen = localStorage.getItem('spicehub_customer_hotel_chosen');
      if (chosen === 'true') return 'home';
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
  const [isHotelModalOpen, setIsHotelModalOpen] = useState(false);
  const [hotelSearch, setHotelSearch] = useState('');

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

  // Mandatory Aadhaar Front & Back Photos
  const [aadhaarFront, setAadhaarFront] = useState<string | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<string | null>(null);
  const [aadhaarCompressing, setAadhaarCompressing] = useState<'FRONT' | 'BACK' | null>(null);

  // Phone OTP Verification (Mandatory for Hotel on-site bookings)
  const [phoneOtp, setPhoneOtp] = useState('9999');
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
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsPage, setSettingsPage] = useState<'MAIN' | 'RESERVATION' | 'SUPPORT' | 'SESSION'>('MAIN');

  // Real-time Socket Connection for Reception Approval Events
  const socketRef = useRef<Socket | null>(null);

  // 0. Capacitor Physical Android Back Button Event Handling
  const backStackRef = useRef({
    activePortalUrl,
    isSettingsModalOpen,
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
      isSettingsModalOpen,
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
    isSettingsModalOpen,
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

          // 1. If inside an active embedded portal (Room Portal or Table Ordering iframe), close it and return safely to Customer Home screen
          if (s.activePortalUrl) {
            setActivePortalUrl(null);
            setCustomerView('home');
            return;
          }

          // 2. Close active modals/drawers in strict top-down z-index order
          if (s.isSettingsModalOpen) {
            setIsSettingsModalOpen(false);
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

          // 5. On Home / Root screens, safely exit app
          if (s.customerView === 'home') {
            CapApp.exitApp().catch(() => {});
            return;
          }

          // On hotel_select root view -> exit app cleanly
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

  // 1. Fetch Active Hotels on Mount (Instant Parallel Host Resolution)
  useEffect(() => {
    let isMounted = true;
    async function fetchHotels() {
      setLoadingHotels(true);

      const probe = async (host: string): Promise<{ host: string; hotels: ActiveHotel[] } | null> => {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 2500);
          const url = host.startsWith('http://') || host.startsWith('https://')
            ? `${host.replace(/\/+$/, '')}/api/v1/auth/active-hotels`
            : `http://${host}:5000/api/v1/auth/active-hotels`;
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timer);
          if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.data) && json.data.length > 0) {
              return { host, hotels: json.data };
            }
          }
        } catch {
          // Probe failed or timed out
        }
        return null;
      };

      const candidates = Array.from(
        new Set([PROD_API_BASE, serverHost, DEV_LAN_HOST, '127.0.0.1'].filter(Boolean))
      );
      try {
        const results = await Promise.all(candidates.map(probe));
        const winner = results.find(Boolean);
        if (winner && isMounted) {
          setServerHost(winner.host);
          localStorage.setItem('spicehub_server_host', winner.host);
          setHotels(winner.hotels);
          const savedHotelId = localStorage.getItem('spicehub_customer_hotel_id');
          const matched = winner.hotels.find((h) => h.id === savedHotelId);
          setSelectedHotel(matched || winner.hotels[0]);
          return;
        }
      } catch (err) {
        console.warn('⚠️ [CustomerAndroid] Fast probe note:', err);
      } finally {
        if (isMounted) setLoadingHotels(false);
      }

      if (isMounted) {
        const fallbackHotel: ActiveHotel = {
          id: '6ae06d00ddbafddfbb0a8013',
          name: 'Mahesh Hotel',
          slug: 'mahesh-hotel-4119',
          city: 'Jodhpur',
          state: 'Rajasthan',
          tagline: 'Luxury Stays & Fine Hospitality',
          coverImageUrl: FALLBACK_HOTEL_COVER,
          logoUrl: FALLBACK_HOTEL_LOGO,
          stayImageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&auto=format&fit=crop&q=80',
          diningImageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
        };
        setHotels([fallbackHotel]);
        setSelectedHotel(fallbackHotel);
      }
    }
    fetchHotels();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch Live Room Availability Catalog for Selected Hotel
  const refreshRoomsCatalog = async (hotel = selectedHotel) => {
    if (!hotel) return;
    try {
      setLoadingRooms(true);
      const resRooms = await fetch(`${DEFAULT_API_BASE}/api/v1/guest-portal/rooms/catalog?hotelId=${hotel.id}`);
      if (resRooms.ok) {
        const json = await resRooms.json();
        if (json.success && json.data) {
          setAvailableRoomCount(json.data.counts?.available ?? 0);
          setCatalogRooms(json.data.rooms || []);
        }
      }
    } catch (err) {
      console.warn('⚠️ [CustomerAndroid] Rooms catalog load note:', err);
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    refreshRoomsCatalog(selectedHotel);
  }, [selectedHotel]);

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
            if (matchedHotel) targetHotel = matchedHotel;
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
              if (matched) targetHotel = matched;
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
              if (matchedHotel) targetHotel = matchedHotel;
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
  const launchTable = (tbl: string, hotel = selectedHotel, token?: string) => {
    if (!hotel) return;
    const finalTable = tbl.trim();
    if (!finalTable) return;

    const numOnly = finalTable.replace(/[^0-9]/g, '');
    const formatted = finalTable.toUpperCase().startsWith('T-')
      ? finalTable.toUpperCase()
      : numOnly
      ? `T-${numOnly.padStart(2, '0')}`
      : finalTable;

    const url = new URL(TABLE_PORTAL_BASE);
    url.searchParams.set('hotelId', hotel.id);
    url.searchParams.set('table', formatted);
    url.searchParams.set('theme', theme);
    url.searchParams.set('apiBase', DEFAULT_API_BASE);
    url.searchParams.set('socketUrl', SOCKET_URL);
    if (token) {
      url.searchParams.set('token', token);
      url.searchParams.set('qrToken', token);
    }
    const existingClientToken = localStorage.getItem('spicehub_customer_session_token');
    if (existingClientToken) {
      url.searchParams.set('sessionToken', existingClientToken);
    }

    try {
      localStorage.setItem('spicehub_customer_table', formatted);
      localStorage.setItem('spicehub_customer_hotel', hotel.name);
      if (token) localStorage.setItem('spicehub_customer_qr_token', token);
    } catch {}

    setActiveSessionLabel(`${hotel.name} • Table ${formatted}`);
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

  const handleCheckGpsLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocation not supported by device');
      return;
    }
    setGpsChecking(true);
    setGpsStatus('Requesting GPS device coordinates...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        const hLat = (selectedHotel as any)?.latitude || 26.9124; // Jaipur coordinates
        const hLng = (selectedHotel as any)?.longitude || 75.7873;

        const dist = calculateDistance(uLat, uLng, hLat, hLng);
        setGpsDistKm(dist);

        if (dist <= 0.5) {
          setGpsStatus(`Verified on-site: within hotel premises (${Math.round(dist * 1000)}m)`);
          setBookingLocationType('HOTEL_RADIUS');
        } else {
          setGpsStatus(`Remote location: ${dist} km away. Auto-switched to Home Booking.`);
          setBookingLocationType('REMOTE_HOME');
        }
        setGpsChecking(false);
      },
      (err) => {
        setGpsChecking(false);
        setGpsStatus('GPS permission skipped/denied. You may proceed manually.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
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
        if (json.data?.devOtp) setPhoneOtp(json.data.devOtp);
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
      const res = await fetch(`${DEFAULT_API_BASE}/api/v1/guest-portal/rooms/verify-phone-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelId: selectedHotel?.id, phone: guestPhone.trim(), otp: phoneOtp.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setPhoneOtpVerified(true);
        setOtpSuccessMsg('✓ Mobile number successfully verified!');
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

  const handleAttachSampleAadhaar = (side: 'FRONT' | 'BACK') => {
    const uri = generateSampleAadhaarImage(side, guestName || 'Resident Guest', guestPhone || '9820011223');
    if (side === 'FRONT') setAadhaarFront(uri);
    else setAadhaarBack(uri);
  };

  // Step 1 of Booking: User clicks an available room -> Location & Radius Check Dialog
  const handleSelectRoomForBooking = (room: CatalogRoom) => {
    if (activeReservation) {
      launchResidentPortal(
        activeReservation.roomNumber,
        selectedHotel,
        activeReservation.sessionToken,
        'HOME'
      );
      return;
    }
    if (pendingApprovalBooking) {
      setCustomerView('waiting_approval');
      return;
    }
    setSelectedRoomForBooking(room);
    setBookingNights(1);
    setBookingError(null);
    setShowLocationRadiusCheck(true);
  };

  // Step 2 of Booking: User confirms location -> Proceed to Guest Details & Reception Documents Form
  const handleProceedToBookingForm = (locationType: 'HOTEL_RADIUS' | 'REMOTE_HOME') => {
    setBookingLocationType(locationType);
    setShowLocationRadiusCheck(false);
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

      const checkInDate = bookingLocationType === 'REMOTE_HOME' && checkInDateInput
        ? new Date(checkInDateInput)
        : new Date();
      const checkOutDate = bookingLocationType === 'REMOTE_HOME' && checkOutDateInput
        ? new Date(checkOutDateInput)
        : new Date(checkInDate.getTime() + bookingNights * 24 * 60 * 60 * 1000);
      if (bookingLocationType !== 'REMOTE_HOME') {
        checkOutDate.setHours(11, 0, 0, 0); // 11:00 AM check-out standard
      }

      const basePrice = selectedRoomForBooking.roomType.basePriceOvernight || 2500;
      const gstRate = basePrice > 7500 ? 18 : 12;
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
        checkInTime: bookingLocationType === 'REMOTE_HOME' ? estimatedArrivalTime : '12:00',
        checkOutTime: bookingLocationType === 'REMOTE_HOME' ? estimatedDepartureTime : '11:00',
        nights: bookingNights,
        estimatedArrivalTime: bookingLocationType === 'REMOTE_HOME' ? estimatedArrivalTime : undefined,
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
        deviceLocation: gpsDistKm !== null ? {
          distanceKm: gpsDistKm,
          isRemote: gpsDistKm > 0.5,
        } : undefined,
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
          originBadge: bookingLocationType === 'HOTEL_RADIUS' ? '🏨 Hotel Premises (होटल से)' : '🏠 Remote / Home Booking (घर से)',
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
          setBookingError(`🚫 ${json.message}`);
        } else if (json.errorCode === 'SECONDARY_GUEST_REQUIRED') {
          setIsSecondRoom(true);
          setBookingError(`⚠️ ${json.message}`);
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
        `Reservation Verified & Checked-In:\n\nRoom ${activeReservation.roomNumber} (${activeReservation.bookingNumber}) is an active in-house stay. Self-cancellation is not permitted for verified stays.\n\nPlease contact Front Desk Reception at ${selectedHotel?.contactPhone || '+91 141 2345678'} for checkout or cancellation support.`
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
        setIsSettingsModalOpen(false);
      } else if (data.receptionContactRequired) {
        alert(data.message || `Please contact Front Desk at ${data.helplinePhone || '+91 141 2345678'} to modify or cancel your stay.`);
      } else {
        alert(data.message || 'Cancellation could not be completed.');
      }
    } catch (err: any) {
      // Local fallback in case network error
      localStorage.removeItem('spicehub_pending_approval_booking');
      setPendingApprovalBooking(null);
      setCustomerView('home');
      setIsSettingsModalOpen(false);
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

  // Filtered available rooms list based on search, AC/Non-AC, budget and price sorting (Step 3)
  const filteredRooms = useMemo(() => {
    let list = catalogRooms.filter((r) => r.displayStatus === 'AVAILABLE');

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
  const totalAvailableRoomsCount = catalogRooms.filter((r) => r.displayStatus === 'AVAILABLE').length;
  const acRoomsCount = catalogRooms.filter((r) => r.displayStatus === 'AVAILABLE' && isClimateAc(r)).length;
  const nonAcRoomsCount = catalogRooms.filter((r) => r.displayStatus === 'AVAILABLE' && !isClimateAc(r)).length;
  const availableRoomsList = filteredRooms;

  // If a portal is active (e.g. In-Room Dining or Dine-In Table Menu), render embedded portal with single clean navbar
  if (activePortalUrl) {
    return (
      <div className={`w-full h-full flex flex-col ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} relative`}>
        {/* Dedicated Slim Portal Control Bar - never overlaps web content */}
        <div
          className="w-full shrink-0 z-40 px-3 py-2 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shadow-md"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)' }}
        >
          <button
            type="button"
            data-testid="portal-floating-home-btn"
            onClick={() => setActivePortalUrl(null)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition"
          >
            <Icons.ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('← Exit to App', '← Exit to App')}</span>
          </button>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{selectedHotel?.name || 'SpiceHub'} • Room Portal</span>
          </div>
          <button
            type="button"
            onClick={() => setActivePortalUrl(null)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs font-bold"
            title={t('Close', 'Close')}
          >
            ✕
          </button>
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
    <div className="h-[100dvh] w-full overflow-hidden flex justify-center bg-slate-50">
      <div className="max-w-md w-full h-[100dvh] flex flex-col bg-slate-50 text-slate-900 border-x border-slate-200 overflow-hidden relative shadow-2xl">
      {/* Brand Navbar: w-full flex justify-between items-center px-4 py-3 pt-[env(safe-area-inset-top)] */}
      <header
        className="w-full flex justify-between items-center px-4 py-3 bg-white border-b border-slate-200 text-slate-900 sticky top-0 z-30 shrink-0"
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)',
        }}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={() => setCustomerView('hotel_select')}
          className="flex items-center gap-2.5 min-w-0 cursor-pointer active:opacity-80 transition"
          title="Switch Hotel Property"
        >
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 shadow-xs bg-slate-100 shrink-0">
            <img
              src={selectedHotel?.logoUrl || FALLBACK_HOTEL_LOGO}
              alt={selectedHotel?.name || 'Hotel Logo'}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = FALLBACK_HOTEL_LOGO;
              }}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <h1 className="text-xs font-bold tracking-tight truncate text-slate-900">
                {selectedHotel?.name || 'SpiceHub Guest'}
              </h1>
            </div>
            <p className="text-[10px] truncate font-medium text-slate-500">
              {selectedHotel?.city ? `${selectedHotel.city}, ${selectedHotel.state || 'India'}` : 'Guest Stay & Dining'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Profile Button */}
          <button
            type="button"
            data-testid="customer-header-profile-btn"
            onClick={() => setCustomerView('profile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition active:scale-95 ${
              customerView === 'profile'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
            }`}
            title={t('Profile')}
          >
            <Icons.User className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden xs:inline">{t('Profile')}</span>
          </button>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 overflow-y-auto overscroll-contain max-w-lg w-full mx-auto p-4 flex flex-col gap-4 pb-28">

        {/* ======================================================== */}
        {/* STEP 1: DEDICATED HOTEL SELECTION SCREEN ('hotel_select')*/}
        {/* ======================================================== */}
        {customerView === 'hotel_select' && (
          <div className="flex flex-col gap-4 animate-in fade-in">
            {/* Hotel Search Bar */}
            <div className="relative">
              <input
                type="text"
                data-testid="hotel-search-input"
                value={hotelSearch}
                onChange={(e) => setHotelSearch(e.target.value)}
                placeholder="Search hotel name, city (e.g. Jaipur, Rajasthan)..."
                className={`w-full min-h-[42px] rounded-xl border pl-9 pr-9 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 shadow-xs'
                }`}
              />
              <Icons.Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              {hotelSearch && (
                <button
                  type="button"
                  onClick={() => setHotelSearch('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white"
                >
                  <Icons.X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between px-1">
              <span className={`text-[11px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {filteredHotels.length} Verified Properties Ready
              </span>
              {selectedHotel && (
                <button
                  type="button"
                  onClick={() => setCustomerView('home')}
                  className="text-xs font-black text-amber-500 hover:underline flex items-center gap-1"
                >
                  <span>Continue with {selectedHotel.name.split(' ')[0]}</span>
                  <Icons.ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Hotel Cards List */}
            <div className="flex flex-col gap-3">
              {filteredHotels.map((h) => {
                const isSelected = selectedHotel?.id === h.id;
                const cover = h.coverImageUrl || FALLBACK_HOTEL_COVER;
                const logo = h.logoUrl || FALLBACK_HOTEL_LOGO;

                return (
                  <div
                    key={h.id}
                    data-testid={`hotel-card-${h.id}`}
                    onClick={() => {
                      setSelectedHotel(h);
                      try {
                        localStorage.setItem('spicehub_customer_hotel_chosen', 'true');
                      } catch {}
                      setCustomerView('home');
                      setStayVerifyError(null);
                    }}
                    className={`rounded-2xl border cursor-pointer transition-all duration-200 overflow-hidden shadow-md flex flex-col group active:scale-98 ${
                      isSelected
                        ? 'border-2 border-amber-500 ring-2 ring-amber-500/20'
                        : isDark
                        ? 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                        : 'border-slate-200 bg-white hover:border-amber-400'
                    }`}
                  >
                    <div className="h-28 w-full relative overflow-hidden bg-slate-950">
                      <img
                        src={cover}
                        alt={h.name}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = FALLBACK_HOTEL_COVER;
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-black/60 text-white border border-white/20 backdrop-blur-md flex items-center gap-1">
                          <Icons.Location className="w-3 h-3 text-amber-400" />
                          <span>{h.city || 'India'}{h.state ? `, ${h.state}` : ''}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/80 text-white backdrop-blur-md flex items-center gap-1">
                          <Icons.Check className="w-3 h-3" />
                          <span>Verified</span>
                        </span>
                      </div>

                      <div className="absolute bottom-2 left-3 right-3 flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white shadow bg-white shrink-0">
                          <img
                            src={logo}
                            alt=""
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = FALLBACK_HOTEL_LOGO;
                            }}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-black text-white truncate drop-shadow">
                            {h.name}
                          </h3>
                          <p className="text-[11px] text-amber-200/90 truncate font-semibold">
                            {h.tagline || 'Experience luxury hospitality & fine dining'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-amber-400 text-xs">
                        <Icons.Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <Icons.Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <Icons.Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <Icons.Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <Icons.Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-[10px] font-bold text-slate-400 ml-1">5-Star Luxury</span>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-black text-amber-500 group-hover:translate-x-1 transition-transform">
                        <span>{isSelected ? 'Selected' : 'Select Hotel'}</span>
                        <Icons.ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 5: WAITING FOR APPROVAL & RECEPTION DIGITAL PASS    */}
        {/* ======================================================== */}
        {customerView === 'waiting_approval' && (
          <div className="flex flex-col gap-4 animate-in fade-in">
            {/* Top Back Action Bar */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                data-testid="approval-back-home-btn"
                onClick={() => setCustomerView('home')}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700 shadow-sm'
                }`}
              >
                <Icons.ArrowLeft className="w-3.5 h-3.5" />
                <span>{t('Back to Home')}</span>
              </button>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>{pendingApprovalBooking?.bookingOrigin === 'REMOTE_HOME' ? 'Advance Booking Pass' : 'Instant Approval Mode'}</span>
              </span>
            </div>

            {/* Glowing Status Radar Centerpiece */}
            <div className={`p-5 rounded-3xl border text-center relative overflow-hidden flex flex-col items-center justify-center gap-3 ${
              isDark
                ? 'bg-slate-900 border-slate-800 shadow-sm'
                : 'bg-white border-slate-200 shadow-sm'
            }`}>
              {/* Radar Rings Effect */}
              <div className="relative w-28 h-28 flex items-center justify-center my-1">
                <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-ping opacity-60" style={{ animationDuration: '2.5s' }} />
                <div className="absolute -inset-2 rounded-full border-2 border-dashed border-blue-400/30 animate-spin" style={{ animationDuration: '14s' }} />
                <div className="absolute -inset-4 rounded-full border border-blue-400/20" />
                
                {/* Core Shield */}
                <div className="relative z-10 w-20 h-20 rounded-2xl bg-blue-600 p-0.5 shadow-md flex items-center justify-center">
                  <div className="w-full h-full rounded-[14px] bg-slate-950 flex flex-col items-center justify-center gap-0.5 p-2">
                    <Icons.Shield className="w-7 h-7 text-blue-400" />
                    <span className="text-[8px] font-black text-blue-300 uppercase tracking-widest text-center">
                      PMS DESK
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className={`text-base sm:text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
                  {pendingApprovalBooking?.bookingOrigin === 'REMOTE_HOME'
                    ? 'Advance Reservation Confirmed • Present Pass at Reception'
                    : 'Awaiting Reception ID Verification'}
                </h3>
                <p className={`text-xs mt-1 max-w-sm mx-auto leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {pendingApprovalBooking?.bookingOrigin === 'REMOTE_HOME'
                    ? 'Your advance reservation is active! Present this digital pass to the Reception desk when you arrive to complete quick physical ID verification and collect your room keycard.'
                    : 'Your booking details and Aadhaar card photos have been forwarded to Front Desk Reception for guest verification.'}
                </p>
              </div>

              {/* Real-time Socket Indicator */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 text-[10px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live PMS Socket Sync Active • Auto-unlocks when Reception approves check-in</span>
              </div>
            </div>

            {/* Scannable Reception Digital Booking Pass / Voucher */}
            {pendingApprovalBooking ? (
              <div className={`p-5 rounded-3xl border-2 space-y-4 shadow-md relative overflow-hidden ${
                isDark ? 'bg-slate-900 border-amber-500/40 text-white' : 'bg-white border-amber-300 text-slate-900'
              }`}>
                {/* Voucher Top Ribbon */}
                <div className="flex items-center justify-between pb-3 border-b border-dashed border-amber-400/40">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-sm shadow">
                      🏨
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                        Official Digital Booking Pass
                      </span>
                      <h4 className="text-sm font-black">
                        Room {pendingApprovalBooking.roomNumber} • {pendingApprovalBooking.roomTypeName}
                      </h4>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Booking No</span>
                    <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400">
                      {pendingApprovalBooking.bookingNumber}
                    </span>
                  </div>
                </div>

                {/* Scannable Visual Barcode / QR Simulation for Reception Scanner */}
                <div className={`p-3 rounded-2xl border text-center space-y-1.5 ${
                  isDark ? 'bg-black/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex justify-center items-center gap-1 font-mono tracking-widest text-[11px] text-slate-500 dark:text-slate-400">
                    <span>||||| ||| |||| || ||||| |||| ||| |||||</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono px-2 text-slate-500">
                    <span>HOTEL ID: {pendingApprovalBooking.hotelId ? pendingApprovalBooking.hotelId.slice(0, 8) : 'SPICEHUB'}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{pendingApprovalBooking.bookingNumber}</span>
                    <span>ROOM #{pendingApprovalBooking.roomNumber}</span>
                  </div>
                  <p className="text-[9px] text-slate-500 font-medium">
                    Show this screen to Front Desk Receptionist for instant lookup upon arrival
                  </p>
                </div>

                {/* Guest & Reservation Dates Matrix */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className={`p-2.5 rounded-xl border ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'}`}>
                    <span className={`text-[10px] font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Primary Guest
                    </span>
                    <span className="font-bold text-sm block truncate">{pendingApprovalBooking.guestName}</span>
                    <span className="text-[11px] text-slate-400 block">{pendingApprovalBooking.guestPhone}</span>
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5 mt-0.5">
                      <Icons.Check className="w-2.5 h-2.5" /> Mobile OTP Verified
                    </span>
                  </div>

                  <div className={`p-2.5 rounded-xl border ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'}`}>
                    <span className={`text-[10px] font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Reservation Stay
                    </span>
                    <span className="font-bold text-xs block">
                      {pendingApprovalBooking.nights} Night{pendingApprovalBooking.nights > 1 ? 's' : ''} • ₹{pendingApprovalBooking.grandTotal?.toLocaleString('en-IN') || '—'}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {pendingApprovalBooking.checkInDate
                        ? new Date(pendingApprovalBooking.checkInDate).toLocaleDateString([], { day: '2-digit', month: 'short' })
                        : 'Today'}
                      {' ➔ '}
                      {pendingApprovalBooking.checkOutDate
                        ? new Date(pendingApprovalBooking.checkOutDate).toLocaleDateString([], { day: '2-digit', month: 'short' })
                        : 'Tomorrow'}
                    </span>
                    <span className="text-[9px] font-bold text-blue-500 mt-0.5 block">
                      {pendingApprovalBooking.bookingOrigin === 'REMOTE_HOME' ? 'Advance Scheduled' : 'Instant Check-in'}
                    </span>
                  </div>
                </div>

                {/* Document Verification Notice Banner */}
                <div className={`p-3 rounded-2xl border flex items-start gap-2.5 ${
                  pendingApprovalBooking.bookingOrigin === 'REMOTE_HOME'
                    ? isDark ? 'border-blue-500/30 bg-blue-950/30 text-blue-200' : 'border-blue-200 bg-blue-50 text-blue-900'
                    : isDark ? 'border-amber-500/30 bg-amber-950/30 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-900'
                }`}>
                  <Icons.Shield className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                  <div className="text-[11px] leading-snug">
                    <strong className="block font-bold">
                      {pendingApprovalBooking.bookingOrigin === 'REMOTE_HOME'
                        ? 'Government ID Verification at Front Desk'
                        : 'Aadhaar Verification in Progress'}
                    </strong>
                    <span>
                      {pendingApprovalBooking.bookingOrigin === 'REMOTE_HOME'
                        ? 'When you arrive at the property on your check-in date, show this digital pass and your physical ID card to the receptionist. Once verified, your digital keycard and in-room services will activate immediately.'
                        : 'Front Desk is reviewing your uploaded documents. Keycard unlocks automatically as soon as verified.'}
                    </span>
                  </div>
                </div>

                {/* Aadhaar Photos Preview (If uploaded) */}
                {(pendingApprovalBooking.aadhaarFrontUrl || pendingApprovalBooking.aadhaarBackUrl) && (
                  <div className={`p-3 rounded-xl border space-y-2 ${isDark ? 'bg-black/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="flex items-center gap-1 text-amber-500">
                        <Icons.Shield className="w-3.5 h-3.5" />
                        <span>Uploaded Aadhaar Verification Photos</span>
                      </span>
                      <span className="text-emerald-500 flex items-center gap-0.5 text-[10px]">
                        <Icons.Check className="w-3 h-3" />
                        <span>Attached</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg border p-1 text-center bg-black/50 border-slate-800">
                        <span className="text-[9px] font-bold block text-slate-400 mb-1">Aadhaar Front</span>
                        {pendingApprovalBooking.aadhaarFrontUrl ? (
                          <img
                            src={pendingApprovalBooking.aadhaarFrontUrl}
                            alt="Front"
                            className="h-16 w-full object-contain rounded border border-slate-700 bg-black"
                          />
                        ) : (
                          <div className="h-16 flex items-center justify-center text-[10px] text-slate-500">Attached</div>
                        )}
                      </div>
                      <div className="rounded-lg border p-1 text-center bg-black/50 border-slate-800">
                        <span className="text-[9px] font-bold block text-slate-400 mb-1">Aadhaar Back</span>
                        {pendingApprovalBooking.aadhaarBackUrl ? (
                          <img
                            src={pendingApprovalBooking.aadhaarBackUrl}
                            alt="Back"
                            className="h-16 w-full object-contain rounded border border-slate-700 bg-black"
                          />
                        ) : (
                          <div className="h-16 flex items-center justify-center text-[10px] text-slate-500">Attached</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Verification Actions */}
                <div className="pt-2 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="btn-check-approval-status"
                      onClick={handleCheckApprovalStatus}
                      disabled={isCheckingApproval}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition active:scale-98 disabled:opacity-50"
                    >
                      <Icons.Refresh className={`w-3.5 h-3.5 ${isCheckingApproval ? 'animate-spin' : ''}`} />
                      <span>{isCheckingApproval ? t('Checking...') : t('Check Approval Status')}</span>
                    </button>

                    <button
                      type="button"
                      data-testid="btn-cancel-pending-approval"
                      disabled={isCancellingBooking}
                      onClick={() => handleCancelBooking(pendingApprovalBooking.bookingNumber)}
                      className={`py-2.5 px-3 rounded-xl border font-bold text-xs transition flex items-center justify-center gap-1 ${
                        isDark ? 'border-red-500/40 text-red-400 hover:bg-red-500/10' : 'border-red-300 text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <span>{isCancellingBooking ? 'Cancelling...' : t('Cancel Request')}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl border text-center space-y-2 border-slate-800 bg-slate-900/40">
                <p className="text-xs text-slate-400">No pending booking verification active.</p>
                <button
                  type="button"
                  onClick={() => setCustomerView('rooms')}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs"
                >
                  Browse Available Rooms
                </button>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 2: SERVICE CHOICE SCREEN ('home')                   */}
        {/* ======================================================== */}
        {customerView === 'home' && (
          <div className="flex flex-col gap-4">
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
                    ✕
                  </button>
                </div>
              </div>
            )}
            {/* Authoritative Property Showcase Hero Card */}
            <div
              className="rounded-2xl border border-amber-500/30 shadow-lg relative overflow-hidden min-h-[175px] flex flex-col justify-end p-4 group"
            >
              <img
                src={selectedHotel?.coverImageUrl || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1600&auto=format&fit=crop&q=80'}
                alt={selectedHotel?.name || 'Hotel'}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = FALLBACK_HOTEL_COVER;
                }}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/25" />

              {/* Banner Content */}
              <div className="relative z-10 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-black/60 text-amber-300 border border-amber-500/30 backdrop-blur-md flex items-center gap-1">
                      <Icons.Location className="w-3 h-3 text-amber-400" />
                      <span>{selectedHotel?.city || 'Jaipur'}, {selectedHotel?.state || 'Rajasthan'}</span>
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 backdrop-blur-md flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Verified Property</span>
                    </span>
                  </div>

                  {/* Single Consolidated Authoritative Switch Hotel Action Button */}
                  <button
                    type="button"
                    data-testid="select-hotel-pill-btn"
                    onClick={() => setCustomerView('hotel_select')}
                    className="text-[11px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold border border-amber-300 shadow-md transition active:scale-95 flex items-center gap-1.5 shrink-0"
                  >
                    <Icons.Switch className="w-3.5 h-3.5 text-slate-950" />
                    <span>Switch Hotel</span>
                  </button>
                </div>

                <div className="flex items-center gap-3 pt-0.5">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-amber-400 shadow-md bg-white shrink-0">
                    <img
                      src={selectedHotel?.logoUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300&auto=format&fit=crop&q=80'}
                      alt=""
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = FALLBACK_HOTEL_LOGO;
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-lg font-black text-white truncate drop-shadow">
                      {selectedHotel?.name || 'Select Hotel Property'}
                    </h2>
                    <p className="text-[11px] text-amber-200/90 truncate font-semibold">
                      {selectedHotel?.tagline || 'Experience luxury hospitality & fine dining'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Guest Services & Experience Section */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h2 className={`text-sm font-black uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    {activeReservation ? `Resident Suite • Room ${activeReservation.roomNumber}` : 'Guest Experiences'}
                  </h2>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {activeReservation ? 'Active Stay Verified & Digital Keycard Ready' : 'Choose your personalized hospitality service'}
                  </p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {activeReservation ? 'Resident Guest' : '2 Options'}
                </span>
              </div>

              {/* CASE A: GUEST HAS AN ACTIVE APPROVED STAY (SHOW MY STAY FIRST, HIDE ROOMS PROMO) */}
              {activeReservation && !pendingApprovalBooking ? (
                <div className="flex flex-col gap-3.5">
                  {/* 1. PRIMARY HERO CARD: ACTIVE STAY & DIGITAL KEYCARD */}
                  <div
                    data-testid="active-stay-card"
                    className={`p-5 rounded-3xl border shadow-sm space-y-4 relative overflow-hidden ${
                      isDark
                        ? 'bg-slate-900 border-slate-800 text-white'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                        <span className={`text-xs font-black uppercase tracking-wider ${
                          isDark ? 'text-emerald-400' : 'text-emerald-800'
                        }`}>
                          {t('My Stay')} • {t('Room')} {activeReservation.roomNumber}
                        </span>
                      </div>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                        {activeReservation.bookingNumber}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-black">{activeReservation.roomTypeName}</h3>
                      <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        {t('Guest', 'Guest')}: <strong className="font-bold">{activeReservation.guestName}</strong> ({activeReservation.guestPhone})
                      </p>
                      <p className={`text-[11px] mt-0.5 flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span>WiFi: <strong>{activeReservation.wifiSsid || 'TajGateway_HighSpeed'}</strong></span>
                        <span>•</span>
                        <span>Pass: <strong className="font-mono">{activeReservation.wifiPassword || `TajGuest@${activeReservation.roomNumber}`}</strong></span>
                      </p>
                    </div>

                    {!isRoomEntered ? (
                      <button
                        type="button"
                        data-testid="enter-active-room-btn"
                        onClick={() => {
                          if (activeReservation) {
                            localStorage.setItem(`spicehub_room_entered_${activeReservation.bookingNumber}`, 'true');
                            setIsRoomEntered(true);
                            launchResidentPortal(
                              activeReservation.roomNumber,
                              selectedHotel,
                              activeReservation.sessionToken,
                              'HOME'
                            );
                          }
                        }}
                        className="w-full py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20 transition active:scale-98"
                      >
                        <Icons.Key className="w-4 h-4 text-white" />
                        <span>{t('Digital Keycard')}</span>
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-2.5 pt-1">
                        <button
                          type="button"
                          data-testid="enter-active-room-btn"
                          onClick={() =>
                            launchResidentPortal(
                              activeReservation.roomNumber,
                              selectedHotel,
                              activeReservation.sessionToken,
                              'HOME'
                            )
                          }
                          className="py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20 transition active:scale-98"
                        >
                          <Icons.Key className="w-4 h-4 text-white" />
                          <span>{t('Digital Keycard')}</span>
                        </button>

                        <button
                          type="button"
                          data-testid="room-in-room-dining-btn"
                          onClick={() =>
                            launchResidentPortal(
                              activeReservation.roomNumber,
                              selectedHotel,
                              activeReservation.sessionToken,
                              'DINING'
                            )
                          }
                          className={`py-3 px-3 rounded-2xl border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-98 shadow-sm ${
                            isDark
                              ? 'border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-200'
                              : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <Icons.Utensils className="w-4 h-4 text-amber-500" />
                          <span>{t('In-Room Food')}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 2. DINE-IN OPTIONS: IN-ROOM FOOD MENU & RESTAURANT TABLE SCAN */}
                  <button
                    type="button"
                    data-testid="home-table-scan-card"
                    onClick={() =>
                      launchResidentPortal(
                        activeReservation.roomNumber,
                        selectedHotel,
                        activeReservation.sessionToken,
                        'DINING'
                      )
                    }
                    className="rounded-2xl border border-amber-500/40 relative overflow-hidden min-h-[150px] text-left group shadow-md flex flex-col justify-between p-4 transition active:scale-98"
                  >
                    <img
                      src={selectedHotel?.diningImageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80'}
                      alt="In-Room Dining Menu"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/25" />

                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-md flex items-center gap-1">
                          <Icons.Utensils className="w-3.5 h-3.5 text-slate-950" />
                          <span>{t('In-Room Dining')}</span>
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 backdrop-blur-md">
                          {t('Room')} {activeReservation.roomNumber}
                        </span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-sm font-black shadow-md group-hover:translate-x-1 transition-transform">
                        <Icons.ArrowRight className="w-4 h-4 text-slate-950" />
                      </div>
                    </div>

                    <div className="relative z-10 space-y-1">
                      <h3 className="text-base font-black text-white drop-shadow-md flex items-center gap-2">
                        <Icons.Utensils className="w-4 h-4 text-amber-400" />
                        <span>{t('In-Room Food')}</span>
                      </h3>
                      <p className="text-xs text-slate-200 line-clamp-2 drop-shadow font-normal">
                        {t('In-Room Dining Menu')} • {t('Room')} {activeReservation.roomNumber}
                      </p>
                    </div>
                  </button>

                  {/* 3. RESTAURANT TABLE SCAN (OPTIONAL FOR RESIDENTS DINING AT COURTYARD) */}
                  <div className="flex items-center justify-between px-1 pt-1">
                    <button
                      type="button"
                      onClick={() => setCustomerView('table_scan')}
                      className={`text-xs font-semibold hover:underline flex items-center gap-1.5 ${
                        isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-700 hover:text-amber-800'
                      }`}
                    >
                      <Icons.QrCode className="w-3.5 h-3.5" />
                      <span>{t('Scan Table QR', 'Scan Table QR')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCustomerView('rooms')}
                      className={`text-xs font-medium hover:underline flex items-center gap-1 ${
                        isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      <span>{t('Browse Rooms')}</span>
                      <Icons.ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                /* CASE B: NEW / PROSPECTIVE GUEST (SHOW FULL BOOK A ROOM & DINE-IN CARDS) */
                <div className="grid grid-cols-1 gap-3.5">
                  {/* OPTION 1: BOOK A ROOM (STAY) WITH ROOM PHOTO */}
                  <button
                    type="button"
                    data-testid="home-book-room-card"
                    onClick={() => {
                      if (activeReservation) {
                        launchResidentPortal(
                          activeReservation.roomNumber,
                          selectedHotel,
                          activeReservation.sessionToken,
                          'HOME'
                        );
                      } else if (pendingApprovalBooking) {
                        setCustomerView('waiting_approval');
                      } else {
                        setCustomerView('rooms');
                      }
                    }}
                    className="rounded-2xl border border-blue-500/40 relative overflow-hidden min-h-[175px] text-left group shadow-md flex flex-col justify-between p-4 transition active:scale-98"
                  >
                    <img
                      src={selectedHotel?.stayImageUrl || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&auto=format&fit=crop&q=80'}
                      alt="Book a Room"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/25" />

                    {/* Card Header Badges */}
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-md flex items-center gap-1">
                          <Icons.Bed className="w-3.5 h-3.5" />
                          <span>{t('Stay & Suites')}</span>
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 backdrop-blur-md">
                          {availableRoomCount !== null ? `${availableRoomCount} ${t('Available Rooms')}` : t('Available Rooms')}
                        </span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-blue-600/90 text-white flex items-center justify-center text-sm font-black shadow-md group-hover:translate-x-1 transition-transform">
                        <Icons.ArrowRight className="w-4 h-4 text-white" />
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="relative z-10 space-y-1">
                      <h3 className="text-lg font-black text-white drop-shadow-md flex items-center gap-2">
                        <Icons.Bed className="w-5 h-5 text-blue-400" />
                        <span>{t('Book a Room')}</span>
                      </h3>
                      <p className="text-xs text-slate-200 line-clamp-2 drop-shadow font-normal">
                        {t('Available Rooms')} • {t('Digital Keycard')} & {t('Instant ID Check-in')}
                      </p>
                      <div className="pt-1.5 flex items-center gap-3 text-[11px] font-bold text-blue-300">
                        <span className="flex items-center gap-1">
                          <Icons.Check className="w-3.5 h-3.5 text-blue-400" />
                          <span>{t('Instant ID Check-in')}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Icons.Key className="w-3.5 h-3.5 text-blue-400" />
                          <span>{t('Digital Keycard')}</span>
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* OPTION 2: DINE-IN / TABLE SCAN (DINING) WITH RESTAURANT PHOTO */}
                  <button
                    type="button"
                    data-testid="home-table-scan-card"
                    onClick={() => setCustomerView('table_scan')}
                    className="rounded-2xl border border-amber-500/40 relative overflow-hidden min-h-[175px] text-left group shadow-md flex flex-col justify-between p-4 transition active:scale-98"
                  >
                    <img
                      src={selectedHotel?.diningImageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80'}
                      alt="Dine-In Table Scan"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/25" />

                    {/* Card Header Badges */}
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-md flex items-center gap-1">
                          <Icons.Utensils className="w-3.5 h-3.5 text-slate-950" />
                          <span>{t('Dine-In')}</span>
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/30 text-amber-300 border border-amber-500/40 backdrop-blur-md">
                          {t('Scan Table QR', 'Scan Table QR')}
                        </span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-sm font-black shadow-md group-hover:translate-x-1 transition-transform">
                        <Icons.ArrowRight className="w-4 h-4 text-slate-950" />
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="relative z-10 space-y-1">
                      <h3 className="text-lg font-black text-white drop-shadow-md flex items-center gap-2">
                        <Icons.Utensils className="w-5 h-5 text-amber-400" />
                        <span>{t('Dine-In')}</span>
                      </h3>
                      <p className="text-xs text-slate-200 line-clamp-2 drop-shadow font-normal">
                        {t('Dining')} • {t('In-Room Dining Menu')}
                      </p>
                      <div className="pt-1.5 flex items-center gap-3 text-[11px] font-bold text-amber-300">
                        <span className="flex items-center gap-1">
                          <Icons.QrCode className="w-3.5 h-3.5 text-amber-400" />
                          <span>{t('Camera QR Scan', 'Camera QR Scan')}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Icons.Check className="w-3.5 h-3.5 text-amber-400" />
                          <span>{t('Live Kitchen KDS', 'Live Kitchen KDS')}</span>
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Resident Verification Accent Card */}
            <div className="pt-2 text-center">
              {/* Highlight Accent Line */}
              <div className="w-24 h-1 mx-auto bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 rounded-full mb-3 shadow-sm shadow-amber-500/30" />
              <button
                type="button"
                data-testid="home-resident-verify-link"
                onClick={() => {
                  if (activeReservation) {
                    launchResidentPortal(
                      activeReservation.roomNumber,
                      selectedHotel,
                      activeReservation.sessionToken,
                      'HOME'
                    );
                  } else {
                    setCustomerView('resident_verify');
                  }
                }}
                className={`text-xs font-bold hover:underline flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-xl transition ${
                  isDark
                    ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30'
                    : 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 shadow-xs'
                }`}
              >
                <Icons.Key className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {activeReservation
                    ? `Already checked in? Open My Stay (Room ${activeReservation.roomNumber})`
                    : 'Already checked in at Front Desk? Verify Room Stay'}
                </span>
                <Icons.ArrowRight className="w-3.5 h-3.5 text-amber-500" />
              </button>
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
                className={`flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl border transition active:scale-95 ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                    : 'bg-white border-slate-200 text-slate-700 shadow-xs hover:bg-slate-50'
                }`}
              >
                <Icons.ArrowLeft className="w-4 h-4 text-amber-500" />
                <span>{t('Back to Home')}</span>
              </button>

              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-black px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${
                  isDark
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-xs'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{availableRoomsList.length} {t('Rooms Ready')}</span>
                </span>
                <button
                  type="button"
                  onClick={() => refreshRoomsCatalog()}
                  title={t('Refresh')}
                  className={`p-2 rounded-xl border transition active:scale-95 ${
                    isDark
                      ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                      : 'bg-white border-slate-200 text-slate-600 shadow-xs hover:text-slate-900'
                  }`}
                >
                  <Icons.Refresh className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Title Section */}
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">
                  {selectedHotel?.name || 'Luxury Stay'}
                </span>
                <span className="text-slate-400 text-xs">•</span>
                <span className={`text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {selectedHotel?.city || 'Instant Check-In'}
                </span>
              </div>
              <h1 className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {t('Available Rooms & Suites')}
              </h1>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
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
                  className={`w-full min-h-[42px] pl-9 pr-9 py-2 rounded-xl border text-xs font-semibold outline-none transition ${
                    isDark
                      ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-xs'
                  }`}
                />
                <Icons.Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                {roomSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setRoomSearchQuery('')}
                    className="absolute right-3 top-3 p-0.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <Icons.X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* 2-Option AC & Non-AC Climate Filter */}
              <div className={`p-1.5 rounded-2xl border transition-all ${
                isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}>
                <div className="flex items-center justify-between px-1 pb-1.5">
                  <span className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <span>❄️ AC & Non-AC Filter</span>
                  </span>
                  <span className={`text-[10px] font-semibold ${
                    roomAcFilter === 'AC' ? 'text-sky-400' : roomAcFilter === 'NON_AC' ? 'text-amber-400' : isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    {roomAcFilter === 'AC' ? 'AC Rooms Only' : roomAcFilter === 'NON_AC' ? 'Non-AC Rooms Only' : `${totalAvailableRoomsCount} Rooms Available`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    data-testid="room-filter-ac"
                    onClick={() => setRoomAcFilter((prev) => (prev === 'AC' ? 'ALL' : 'AC'))}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 border ${
                      roomAcFilter === 'AC'
                        ? 'bg-sky-600 border-sky-400 text-white font-black shadow-md ring-2 ring-sky-400/40'
                        : isDark
                        ? 'bg-slate-950/80 border-slate-800 text-slate-300 hover:text-white hover:border-sky-500/50'
                        : 'bg-white border-slate-300 text-slate-700 hover:text-slate-950 hover:border-sky-400 shadow-xs'
                    }`}
                  >
                    <Icons.Wind className="w-3.5 h-3.5 text-sky-400" />
                    <span>❄️ {t('AC Rooms')}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      roomAcFilter === 'AC'
                        ? 'bg-sky-950/80 text-sky-200 border border-sky-400/40'
                        : isDark
                        ? 'bg-slate-800 text-slate-300'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {acRoomsCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    data-testid="room-filter-non-ac"
                    onClick={() => setRoomAcFilter((prev) => (prev === 'NON_AC' ? 'ALL' : 'NON_AC'))}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 border ${
                      roomAcFilter === 'NON_AC'
                        ? 'bg-amber-600 border-amber-400 text-white font-black shadow-md ring-2 ring-amber-400/40'
                        : isDark
                        ? 'bg-slate-950/80 border-slate-800 text-slate-300 hover:text-white hover:border-amber-500/50'
                        : 'bg-white border-slate-300 text-slate-700 hover:text-slate-950 hover:border-amber-400 shadow-xs'
                    }`}
                  >
                    <Icons.Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>🌀 {t('Non-AC Rooms')}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      roomAcFilter === 'NON_AC'
                        ? 'bg-amber-950/80 text-amber-200 border border-amber-400/40'
                        : isDark
                        ? 'bg-slate-800 text-slate-300'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {nonAcRoomsCount}
                    </span>
                  </button>
                </div>
              </div>

              {/* Price Sort & Quick Budget Filters (Cohesive Strip) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <button
                  type="button"
                  data-testid="room-sort-low-high"
                  onClick={() =>
                    setRoomPriceSort((prev) => (prev === 'LOW_TO_HIGH' ? 'DEFAULT' : 'LOW_TO_HIGH'))
                  }
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition flex items-center gap-1 shrink-0 active:scale-95 ${
                    roomPriceSort === 'LOW_TO_HIGH'
                      ? 'bg-amber-500 border-amber-400 text-slate-950 font-black shadow-xs'
                      : isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      : 'bg-white border-slate-200 text-slate-700 shadow-xs hover:bg-slate-50'
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
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition flex items-center gap-1 shrink-0 active:scale-95 ${
                    roomPriceSort === 'HIGH_TO_LOW'
                      ? 'bg-amber-500 border-amber-400 text-slate-950 font-black shadow-xs'
                      : isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      : 'bg-white border-slate-200 text-slate-700 shadow-xs hover:bg-slate-50'
                  }`}
                >
                  <span>Price ↓ High to Low</span>
                </button>

                <div className={`w-px h-5 mx-0.5 shrink-0 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

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
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition shrink-0 active:scale-95 ${
                        isSelected
                          ? isDark
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-black shadow-xs'
                            : 'bg-emerald-600 border-emerald-600 text-white font-black shadow-xs'
                          : isDark
                          ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-xs'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Active Filter Indicator & Count */}
              <div className="flex items-center justify-between text-xs px-1">
                <span className={`font-semibold flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>
                    {t('Showing')} <strong className={isDark ? 'text-white' : 'text-slate-900'}>{availableRoomsList.length}</strong> {t('rooms available')}
                  </span>
                </span>
                {(roomSearchQuery || roomAcFilter !== 'ALL' || roomPriceSort !== 'DEFAULT' || roomMaxBudget !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setRoomSearchQuery('');
                      setRoomAcFilter('ALL');
                      setRoomPriceSort('DEFAULT');
                      setRoomMaxBudget('ALL');
                    }}
                    className="text-xs font-bold text-amber-500 hover:underline flex items-center gap-1"
                  >
                    <Icons.X className="w-3.5 h-3.5" />
                    <span>{t('Reset Filters')}</span>
                  </button>
                )}
              </div>
            </div>

            {loadingRooms && (
              <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
                Loading live room availability catalog...
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
                <h4 className="text-xs font-black">All Rooms Currently Occupied</h4>
                <p className="text-[11px]">
                  Housekeeping is preparing the next batch of rooms. Please check back shortly or speak with the reception desk.
                </p>
              </div>
            )}

            {/* Room Cards Grid */}
            {!loadingRooms &&
              availableRoomsList.map((room) => {
                const photo = getRoomDisplayPhoto(room);
                const basePrice = room.roomType.basePriceOvernight || 2500;
                const gstRate = basePrice > 7500 ? 18 : 12;
                const gstAmt = Math.round((basePrice * gstRate) / 100);

                return (
                  <div
                    key={room.id}
                    data-testid={`room-card-${room.roomNumber}`}
                    className={`rounded-2xl border overflow-hidden transition duration-200 flex flex-col ${
                      isDark
                        ? 'bg-slate-950 border-slate-800/90 shadow-lg shadow-black/20'
                        : 'bg-white border-slate-200/90 shadow-md'
                    }`}
                  >
                    {/* Hero Room Photograph */}
                    <div className="h-48 w-full relative overflow-hidden bg-slate-950">
                      <img
                        src={photo}
                        alt={room.roomType.name}
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = CURATED_ROOM_IMAGES[0];
                        }}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                      {/* Premium Dark Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 pointer-events-none" />

                      {/* Top Badges Row */}
                      <div className="absolute top-3 inset-x-3 flex items-center justify-between">
                        <div className="px-3 py-1 rounded-xl bg-black/65 backdrop-blur-md border border-white/20 text-white font-black text-xs flex items-center gap-1.5 shadow-md">
                          <Icons.Bed className="w-3.5 h-3.5 text-amber-400" />
                          <span>{t('Room')} {room.roomNumber}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isClimateAc(room) ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-sky-950/80 text-sky-200 border border-sky-400/60 backdrop-blur-md shadow-md">
                              <span>❄️ AC</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-200 border border-amber-400/60 backdrop-blur-md shadow-md">
                              <span>🌀 Non-AC</span>
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-600/90 text-white backdrop-blur-md border border-emerald-400/50 shadow-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            <span>{t('Ready')}</span>
                          </span>
                        </div>
                      </div>

                      {/* Bottom Title on Image */}
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="text-white font-black text-base sm:text-lg drop-shadow-md leading-tight">
                          {room.roomType.name}
                        </h3>
                        <div className="text-amber-200 text-xs font-semibold drop-shadow flex items-center gap-2 mt-1">
                          <span>{t('Floor')} {room.floorNumber}</span>
                          <span>•</span>
                          <span>{t('Wing')} {room.wing || 'Main'}</span>
                          <span>•</span>
                          <span>{t('Max')} {room.roomType.maxCapacity || 2} {t('Guests')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Content & Details */}
                    <div className="p-4 flex flex-col gap-3.5">
                      {/* Amenities Pills */}
                      <div className="flex flex-wrap gap-1.5">
                        {(room.roomType.amenities?.length > 0
                          ? room.roomType.amenities
                          : ['Free High-Speed WiFi', 'Air Conditioning', 'King Bed', 'Room Service']
                        )
                          .slice(0, 4)
                          .map((amenity, idx) => (
                            <span
                              key={idx}
                              className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                                isDark
                                  ? 'bg-slate-900 border-slate-800 text-slate-300'
                                  : 'bg-slate-100/80 border-slate-200 text-slate-700'
                              }`}
                            >
                              <Icons.Sparkles className="w-3 h-3 text-amber-500" />
                              <span>{t(amenity, amenity)}</span>
                            </span>
                          ))}
                      </div>

                      {/* Pricing Box */}
                      <div
                        className={`p-3.5 rounded-xl border flex items-center justify-between ${
                          isDark
                            ? 'bg-slate-950/70 border-slate-800'
                            : 'bg-slate-50 border-slate-200 shadow-xs'
                        }`}
                      >
                        <div>
                          <div className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {t('Overnight Stay')}
                          </div>
                          <div className={`text-lg font-black ${isDark ? 'text-amber-400' : 'text-slate-900'}`}>
                            ₹{basePrice.toLocaleString('en-IN')}{' '}
                            <span className="text-xs font-medium text-slate-500">/ {t('night')}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                            <Icons.Key className="w-3 h-3 text-emerald-500" />
                            <span>{t('Digital Keycard Included')}</span>
                          </div>
                          <p className={`text-[10px] font-medium mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            + {gstRate}% GST (₹{gstAmt.toLocaleString('en-IN')})
                          </p>
                        </div>
                      </div>

                      {/* Primary Booking Button */}
                      <button
                        type="button"
                        data-testid={`book-room-btn-${room.roomNumber}`}
                        onClick={() => handleSelectRoomForBooking(room)}
                        className="min-h-[46px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition cursor-pointer"
                      >
                        <Icons.Bed className="w-4 h-4 text-white" />
                        <span>{t('Book Room')} {room.roomNumber}</span>
                        <Icons.ArrowRight className="w-3.5 h-3.5 text-white" />
                      </button>
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
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />

                        {/* Animated Laser Scanning Line */}
                        <div
                          className="absolute inset-x-2 h-0.5 bg-blue-500"
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
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition shadow-xs"
                >
                  Select Table (T-01) ➔
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
              <span className="text-xs font-bold text-blue-500 flex items-center gap-1">
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
                  <span className="font-semibold">⚠️ {stayVerifyError}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerView('rooms');
                      setStayVerifyError(null);
                    }}
                    className="self-start text-[11px] font-black text-amber-600 underline hover:text-amber-700"
                  >
                    👉 Explore available rooms from catalog instead
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
                      className={`w-full min-h-[42px] rounded-xl border px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                      className={`w-full min-h-[42px] rounded-xl border px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                  className="min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-2 mt-1 active:scale-98"
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
          <div className="flex flex-col gap-4 animate-in fade-in">
            {/* Profile Identity Card */}
            <div className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden flex flex-col gap-3.5 ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-amber-600 text-white font-bold text-xl flex items-center justify-center shadow-sm shrink-0">
                  {activeReservation?.guestName
                    ? activeReservation.guestName.slice(0, 2).toUpperCase()
                    : verifiedGuestUser?.name
                    ? verifiedGuestUser.name.slice(0, 2).toUpperCase()
                    : <Icons.User className="w-7 h-7 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black truncate">
                      {activeReservation?.guestName || verifiedGuestUser?.name || pendingApprovalBooking?.guestName || 'Valued Guest'}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center gap-0.5">
                      <Icons.Check className="w-2.5 h-2.5 text-emerald-500" />
                      <span>{verifiedGuestUser?.isVerified || activeReservation ? 'Verified' : 'Guest'}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {activeReservation?.guestPhone || verifiedGuestUser?.phone || pendingApprovalBooking?.guestPhone || '+91 98765 43210'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {activeReservation?.guestEmail || pendingApprovalBooking?.guestEmail || 'guest@spicehub.com'}
                  </p>
                </div>
              </div>

              {/* KYC & Verification Status Bar */}
              <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                isDark ? 'bg-black/30 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-2">
                  <Icons.Shield className="w-4 h-4 text-emerald-500" />
                  <div>
                    <span className="font-bold text-[11px] block">Front Desk KYC Verification</span>
                    <span className="text-[10px] text-slate-400">
                      {activeReservation ? 'Aadhaar ID Verified & Checked-In' : 'Standard Guest Profile'}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                  ACTIVE
                </span>
              </div>

              {/* SpiceHub Loyalty & VIP Member Card */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-xs ${
                isDark
                  ? 'bg-slate-900 border-slate-800'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-md">
                    👑
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`font-black text-xs uppercase tracking-wider ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                        Gold Privilege Club
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${
                        isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-200 text-amber-900 border-amber-300'
                      }`}>
                        VIP
                      </span>
                    </div>
                    <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      450 Reward Points • 10% Off In-Room Dining
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => alert('Loyalty Points: 450. Points can be redeemed for room upgrades or complimentary dining courses at checkout!')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                    isDark
                      ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border-amber-500/40'
                      : 'bg-amber-200/60 hover:bg-amber-200 text-amber-900 border-amber-300'
                  }`}
                >
                  View Perks
                </button>
              </div>
            </div>

            {/* Guest Sign-In & OTP Phone Verification Card */}
            {verifiedGuestUser ? (
              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 text-emerald-950 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    ✓
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <span>{verifiedGuestUser.name}</span>
                      <span className="text-[9px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-bold uppercase">
                        OTP Verified
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-emerald-800">{verifiedGuestUser.phone}</p>
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
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-bold underline px-2 py-1"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/70 text-slate-900 space-y-3 shadow-xs">
                <div>
                  <h3 className="text-xs font-bold text-blue-950 flex items-center gap-1.5 uppercase tracking-wider">
                    <span>📱</span>
                    <span>Guest Mobile Sign-In & Verification</span>
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Verify your identity via mobile OTP before booking. Front Desk will audit this verified number upon arrival.
                  </p>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      Guest Full Name *
                    </label>
                    <input
                      type="text"
                      data-testid="profile-guest-name-input"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Mahesh Saini"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      Mobile Number *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        data-testid="profile-guest-phone-input"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        placeholder="10-digit mobile number"
                        className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        data-testid="profile-send-otp-btn"
                        disabled={otpSending || !guestPhone.trim() || guestPhone.trim().length < 8}
                        onClick={handleSendPhoneOtp}
                        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shrink-0 transition"
                      >
                        {otpSending ? 'Sending...' : phoneOtpSent ? 'Resend' : 'Send OTP'}
                      </button>
                    </div>
                  </div>

                  {phoneOtpSent && (
                    <div className="p-2.5 bg-white rounded-xl border border-blue-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-700 uppercase">
                          Enter 4-Digit OTP Code
                        </span>
                        <span className="text-[10px] text-blue-600 font-mono">Default: 9999</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          data-testid="profile-otp-input"
                          value={phoneOtp}
                          onChange={(e) => setPhoneOtp(e.target.value)}
                          placeholder="9999"
                          className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-center text-sm font-mono font-bold tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          data-testid="profile-verify-otp-btn"
                          disabled={otpVerifying || !phoneOtp.trim()}
                          onClick={handleVerifyPhoneOtp}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shrink-0 transition"
                        >
                          {otpVerifying ? 'Verifying...' : 'Confirm'}
                        </button>
                      </div>
                      {otpSuccessMsg && (
                        <p className="text-[11px] font-semibold text-emerald-600">{otpSuccessMsg}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Active Stay Details (If staying at hotel) */}
            {activeReservation && (
              <div className={`p-4 rounded-2xl border shadow-sm space-y-3 ${
                isDark ? 'bg-emerald-950/40 border-emerald-500/40 text-white' : 'bg-emerald-50/80 border-emerald-300 text-slate-900'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-500">
                      Active In-House Stay
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    Room #{activeReservation.roomNumber}
                  </span>
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Room Category:</span>
                    <span className="font-bold">{activeReservation.roomTypeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Booking Reference:</span>
                    <span className="font-mono font-bold text-amber-500">{activeReservation.bookingNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dates:</span>
                    <span className="font-medium">{activeReservation.checkInDate} ➔ {activeReservation.checkOutDate}</span>
                  </div>
                </div>

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
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow"
                  >
                    <Icons.Key className="w-3.5 h-3.5 text-white" />
                    <span>{t('Tap Digital Keycard to Unlock Room')}</span>
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => launchResidentPortal(activeReservation.roomNumber, selectedHotel, activeReservation.sessionToken, 'HOME')}
                      className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow"
                    >
                      <Icons.Key className="w-3.5 h-3.5 text-white" />
                      <span>{t('Digital Keycard')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => launchResidentPortal(activeReservation.roomNumber, selectedHotel, activeReservation.sessionToken, 'DINING')}
                      className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow"
                    >
                      <Icons.Utensils className="w-3.5 h-3.5 text-slate-950" />
                      <span>{t('In-Room Food')}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* App Settings & Preferences */}
            <div className={`p-4 rounded-2xl border shadow-sm space-y-3 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Preferences & Geofencing
              </h3>

              {/* Theme Preference */}
              <div className="flex items-center justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Icons.Sun className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-semibold">Appearance Theme</span>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`px-3 py-1 rounded-xl text-xs font-bold border transition ${
                    isDark ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  {isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}
                </button>
              </div>

              {/* GPS Geofence Proximity Status */}
              <div className="flex items-center justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Icons.Location className="w-4 h-4 text-emerald-500" />
                  <div>
                    <span className="text-xs font-semibold block">GPS Location Guard</span>
                    <span className="text-[10px] text-slate-400">On-premises dining verified</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                  Verified &lt;500m
                </span>
              </div>

              {/* Cloud Sync Status */}
              <div className="flex items-center justify-between py-1 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <span className="text-xs font-semibold block">Cloud Services</span>
                    <span className="text-[10px] text-slate-400">Secure Live Synchronization</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200">
                  CONNECTED
                </span>
              </div>

              {/* Front Desk Phone */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Icons.Phone className="w-4 h-4 text-amber-500" />
                  <div>
                    <span className="text-xs font-semibold block">Reception Helpline</span>
                    <span className="text-[10px] text-slate-400">{selectedHotel?.name || 'Hotel Front Desk'}</span>
                  </div>
                </div>
                <a
                  href={`tel:${selectedHotel?.contactPhone || '+91 141 2345678'}`}
                  className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5"
                >
                  <Icons.Phone className="w-3 h-3" />
                  <span>Call Desk</span>
                </a>
              </div>
            </div>

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
                <p className="text-[11px] text-amber-900 text-left leading-relaxed">
                  Room {pendingApprovalBooking.roomNumber} ({pendingApprovalBooking.roomTypeName}) is awaiting Front Desk verification. You can cancel this request directly before Reception approves it.
                </p>
                <button
                  type="button"
                  data-testid="profile-cancel-pending-btn"
                  disabled={isCancellingBooking}
                  onClick={() => handleCancelBooking(pendingApprovalBooking.bookingNumber)}
                  className="w-full py-2.5 rounded-xl border border-red-400 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Icons.Trash className="w-3.5 h-3.5 text-red-600" />
                  <span>{isCancellingBooking ? 'Cancelling Reservation...' : 'Cancel Reservation Request'}</span>
                </button>
              </div>
            )}

            {activeReservation && (
              <div className="p-4 rounded-2xl border border-emerald-300 bg-emerald-50/80 space-y-2.5 text-center shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Verified Resident Stay • Room {activeReservation.roomNumber}</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-emerald-200 text-emerald-950 px-2 py-0.5 rounded">
                    {activeReservation.bookingNumber}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-900 text-left leading-relaxed">
                  Your stay has been confirmed and keycard issued. For date extensions, room changes, or cancellation, please contact the Front Desk Reception desk directly.
                </p>
                <a
                  href={`tel:${selectedHotel?.contactPhone || '+91 141 2345678'}`}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Icons.Phone className="w-3.5 h-3.5" />
                  <span>Contact Reception for Cancellation / Changes</span>
                </a>
              </div>
            )}

            {/* Account & Cache Reset Action (Strictly hidden when booking exists) */}
            {!activeReservation && !pendingApprovalBooking && (
              <div className={`p-4 rounded-2xl border shadow-sm space-y-2 text-center ${
                isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <button
                  type="button"
                  data-testid="clear-customer-cache-btn"
                  onClick={() => {
                    if (confirm('Clear local guest cache on this device?')) {
                      localStorage.removeItem('spicehub_customer_hotel_chosen');
                      localStorage.removeItem('spicehub_verified_guest_user');
                      setVerifiedGuestUser(null);
                      setCustomerView('hotel_select');
                      alert('Local session cache cleared successfully.');
                    }
                  }}
                  className="w-full py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 font-bold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Icons.Trash className="w-4 h-4 text-slate-500" />
                  <span>Clear App Cache</span>
                </button>
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
        className={`fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:max-w-md z-40 border-t backdrop-blur-md px-6 flex items-center justify-around transition-colors ${
          isDark ? 'bg-slate-950/95 border-slate-800 text-slate-400' : 'bg-white/95 border-slate-200 text-slate-600 shadow-lg'
        }`}
        style={{
          paddingTop: '6px',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
        }}
      >
        {/* 1. Home */}
        <button
          type="button"
          data-testid="nav-tab-home"
          onClick={() => setCustomerView('home')}
          className={`min-h-[48px] min-w-[64px] flex flex-col items-center justify-center py-1 px-4 rounded-xl transition font-medium text-[11px] gap-1 ${
            customerView === 'home'
              ? isDark ? 'text-amber-400 bg-amber-500/15 font-semibold' : 'text-amber-600 bg-amber-50 font-semibold'
              : 'hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Icons.Home className="w-5 h-5" />
          <span>{t('Home')}</span>
        </button>

        {/* 2. Settings */}
        <button
          type="button"
          data-testid="nav-tab-settings"
          onClick={() => setIsSettingsModalOpen(true)}
          className={`min-h-[48px] min-w-[64px] flex flex-col items-center justify-center py-1 px-4 rounded-xl transition font-medium text-[11px] gap-1 ${
            isSettingsModalOpen
              ? isDark ? 'text-slate-200 bg-slate-800 font-semibold' : 'text-slate-900 bg-slate-100 font-semibold'
              : 'hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Icons.Settings className="w-5 h-5 text-slate-500" />
          <span>{t('Settings')}</span>
        </button>

        {/* 3. Profile */}
        <button
          type="button"
          data-testid="nav-tab-profile"
          onClick={() => setCustomerView('profile')}
          className={`min-h-[48px] min-w-[64px] flex flex-col items-center justify-center py-1 px-4 rounded-xl transition font-medium text-[11px] gap-1 ${
            customerView === 'profile'
              ? isDark ? 'text-blue-400 bg-blue-500/15 font-semibold' : 'text-blue-600 bg-blue-50 font-semibold'
              : 'hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Icons.User className="w-5 h-5" />
          <span>{t('Profile')}</span>
        </button>
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
              isDark ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-blue-100 border-blue-600 text-blue-600'
            }`}>
              <Icons.Location className="w-6 h-6" />
            </div>

            <div>
              <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
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
                  isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-600 text-white shadow-xs'
                }`}>
                  <Icons.Home className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className={`text-xs font-black ${isDark ? 'text-slate-200' : 'text-slate-950'}`}>
                      Booking from Home / Remote
                    </h4>
                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                      isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-600 text-white'
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in"
        >
          <div
            className={`w-full max-w-md rounded-2xl border p-5 sm:p-6 shadow-sm dark:shadow-none flex flex-col gap-4 max-h-[90vh] overflow-y-auto ${
              isDark ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'
            }`}
          >
            {/* Modal Header */}
            <div className={`flex items-start justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Icons.Location className="w-3 h-3 text-emerald-500" />
                  <span>{bookingLocationType === 'HOTEL_RADIUS' ? 'On-Premises Guest Check-In' : 'Remote Advance Reservation'}</span>
                </span>
                <h3 className="text-base font-black mt-0.5">
                  Room {selectedRoomForBooking.roomNumber} • {selectedRoomForBooking.roomType.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBookingModalOpen(false)}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                  isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                ✕
              </button>
            </div>

            {/* Error Banner */}
            {bookingError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
                ⚠️ {bookingError}
              </div>
            )}

            {/* Transparent Tariff Calculation */}
            {(() => {
              const basePrice = selectedRoomForBooking.roomType.basePriceOvernight || 2500;
              const gstRate = basePrice > 7500 ? 18 : 12;
              const subtotal = basePrice * bookingNights;
              const taxAmount = Math.round(((subtotal * gstRate) / 100) * 100) / 100;
              const grandTotal = subtotal + taxAmount;

              return (
                <div
                  className={`p-3.5 rounded-xl border space-y-1.5 text-xs ${
                    isDark ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-300' : 'bg-emerald-50/70 border-emerald-200 text-slate-700'
                  }`}
                >
                  <div className="flex justify-between font-medium">
                    <span>
                      Room Tariff ({bookingNights} {bookingNights === 1 ? 'Night' : 'Nights'} × ₹{basePrice.toLocaleString('en-IN')})
                    </span>
                    <span className="font-bold">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>GST ({gstRate}%)</span>
                    <span>₹{taxAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="border-t border-emerald-500/30 pt-1.5 flex justify-between font-black text-sm text-emerald-600 dark:text-emerald-400">
                    <span>Total Estimated Tariff</span>
                    <span>₹{grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              );
            })()}

            {/* Guest Booking Form */}
            <form onSubmit={handleSubmitBookingForApproval} className="flex flex-col gap-3">
              {/* Stay Duration Selector */}
              <div>
                <label className={`block text-[11px] font-bold uppercase mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Stay Duration (Nights)
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setBookingNights(Math.max(1, bookingNights - 1))}
                    className={`w-10 h-10 rounded-xl border font-black text-base flex items-center justify-center ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-800'
                    }`}
                  >
                    -
                  </button>
                  <span className="text-sm font-black px-4">
                    {bookingNights} {bookingNights === 1 ? 'Night' : 'Nights'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBookingNights(Math.min(30, bookingNights + 1))}
                    className={`w-10 h-10 rounded-xl border font-black text-base flex items-center justify-center ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-800'
                    }`}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Guest Details */}
              <div>
                <label className={`block text-[11px] font-bold uppercase mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Primary Guest Full Name *
                </label>
                <input
                  type="text"
                  required
                  data-testid="input-guest-name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. Vikramaditya Sharma"
                  className={`w-full min-h-[42px] rounded-xl border px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
                  }`}
                />
              </div>

              {/* GPS Geofence Check & Location Guard */}
              <div className={`p-3 rounded-xl border flex flex-col gap-2 ${
                isDark ? 'border-blue-500/30 bg-blue-500/10' : 'border-blue-200 bg-blue-50/70'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Icons.Location className="w-4 h-4 text-blue-500" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
                      GPS Geofence Location Guard
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCheckGpsLocation}
                    disabled={gpsChecking}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50 shadow-xs"
                  >
                    {gpsChecking ? 'Checking GPS...' : 'Check Device GPS'}
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{gpsStatus}</span>
                  {gpsDistKm !== null && (
                    <span className={`font-mono font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                      {gpsDistKm > 0.5 ? `${gpsDistKm} km (Remote)` : `${Math.round(gpsDistKm * 1000)}m (On-Site)`}
                    </span>
                  )}
                </div>
              </div>

              {/* Advance Booking Timing for Remote/Home Reservations */}
              {bookingLocationType === 'REMOTE_HOME' && (
                <div className={`p-3.5 rounded-2xl border space-y-3 ${
                  isDark ? 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800' : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">🏠</span>
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 dark:text-slate-700 dark:text-slate-300 block">
                          Book from Home • Time Slot Selection (घर से बुकिंग)
                        </span>
                        <span className="text-[9px] text-slate-400">
                          Real-time date & time interval overlap collision protection
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                      Time-Slot Mode
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className={`block text-[10px] font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Check-In Date *
                      </label>
                      <input
                        type="date"
                        data-testid="input-checkin-date"
                        value={checkInDateInput}
                        onChange={(e) => setCheckInDateInput(e.target.value)}
                        className={`w-full min-h-[38px] rounded-xl border px-2 text-xs font-medium ${
                          isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[10px] font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Check-In Time *
                      </label>
                      <input
                        type="time"
                        data-testid="input-checkin-time"
                        value={estimatedArrivalTime}
                        onChange={(e) => setEstimatedArrivalTime(e.target.value)}
                        className={`w-full min-h-[38px] rounded-xl border px-2 text-xs font-medium ${
                          isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[10px] font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Check-Out Date *
                      </label>
                      <input
                        type="date"
                        data-testid="input-checkout-date"
                        value={checkOutDateInput}
                        onChange={(e) => setCheckOutDateInput(e.target.value)}
                        className={`w-full min-h-[38px] rounded-xl border px-2 text-xs font-medium ${
                          isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[10px] font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Check-Out Time *
                      </label>
                      <input
                        type="time"
                        data-testid="input-checkout-time"
                        value={estimatedDepartureTime}
                        onChange={(e) => setEstimatedDepartureTime(e.target.value)}
                        className={`w-full min-h-[38px] rounded-xl border px-2 text-xs font-medium ${
                          isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div className={`p-2 rounded-xl text-[10px] font-medium flex items-center justify-between ${
                    isDark ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                  }`}>
                    <span>🕒 Requested Window:</span>
                    <span className="font-mono font-bold">
                      {checkInDateInput} ({estimatedArrivalTime}) ➔ {checkOutDateInput} ({estimatedDepartureTime})
                    </span>
                  </div>
                </div>
              )}

              {/* Mobile Number & Phone OTP Verification */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`block text-[11px] font-bold uppercase mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Mobile Number *
                    </label>
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
                      className={`w-full min-h-[42px] rounded-xl border px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        isDark
                          ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
                          : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[11px] font-bold uppercase mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Guests Count
                    </label>
                    <select
                      value={guestCount}
                      onChange={(e) => setGuestCount(Number(e.target.value))}
                      className={`w-full min-h-[42px] rounded-xl border px-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        isDark
                          ? 'bg-slate-950 border-slate-700 text-white'
                          : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                      }`}
                    >
                      <option value={1}>1 Guest</option>
                      <option value={2}>2 Guests</option>
                      <option value={3}>3 Guests</option>
                      <option value={4}>4 Guests</option>
                    </select>
                  </div>
                </div>

                {/* Phone OTP Verification Row (Required for All Reservations) */}
                <div
                  className={`p-3 rounded-xl border space-y-2 ${
                    isDark
                      ? 'border-slate-800 bg-slate-950/70 text-slate-300'
                      : 'border-amber-200 bg-amber-50/70 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`text-[10px] font-black uppercase tracking-wider block ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                        Mobile OTP Verification (Mandatory)
                      </span>
                      <span className="text-[9px] text-slate-500">
                        Verifies reservation so you can present digital confirmation pass at Reception
                      </span>
                    </div>
                    {phoneOtpVerified ? (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-300">
                        <Icons.Check className="w-3 h-3" />
                        <span>OTP Verified</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendPhoneOtp}
                        disabled={otpSending || !guestPhone.trim()}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition disabled:opacity-50 shadow-xs"
                      >
                        {otpSending ? 'Sending OTP...' : phoneOtpSent ? 'Resend OTP' : 'Send Mobile OTP'}
                      </button>
                    )}
                  </div>

                  {!phoneOtpVerified && phoneOtpSent && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="4-digit OTP"
                        value={phoneOtp}
                        onChange={(e) => setPhoneOtp(e.target.value)}
                        className={`w-1/2 rounded-lg px-2.5 py-1.5 text-xs font-mono text-center tracking-widest border ${
                          isDark
                            ? 'bg-black border-slate-700 text-white'
                            : 'bg-white border-slate-300 text-slate-900 focus:bg-white shadow-xs'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={handleVerifyPhoneOtp}
                        disabled={otpVerifying}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow disabled:opacity-50"
                      >
                        {otpVerifying ? 'Verifying...' : 'Verify OTP'}
                      </button>
                      <span className="text-[10px] font-mono text-slate-500">Dev: 9999</span>
                    </div>
                  )}

                  {otpSuccessMsg && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">{otpSuccessMsg}</p>
                  )}
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-bold uppercase mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  data-testid="input-guest-email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="e.g. vikram@example.com"
                  className={`w-full min-h-[42px] rounded-xl border px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
                  }`}
                />
              </div>

              {/* AADHAAR CARD PHOTO UPLOAD (OPTIONAL FOR ADVANCE / MANDATORY FOR ON-PREMISES) */}
              <div
                className={`p-3.5 rounded-2xl border space-y-3 ${
                  isDark
                    ? 'border-amber-500/40 bg-amber-950/20'
                    : 'border-amber-200 bg-amber-50/50 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Icons.Shield className="w-4 h-4 text-amber-500" />
                    <span className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                      {bookingLocationType === 'REMOTE_HOME'
                        ? 'Government ID Verification (Optional Now)'
                        : 'Aadhaar Card Photo Upload (Mandatory)'}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      bookingLocationType === 'REMOTE_HOME'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : isDark
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {bookingLocationType === 'REMOTE_HOME' ? 'Verify at Reception on Arrival' : 'Front & Back Required'}
                  </span>
                </div>
                <p className={`text-[11px] leading-tight ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {bookingLocationType === 'REMOTE_HOME'
                    ? 'Documents will be verified physically at Front Desk Reception when you arrive. You can optionally upload photos now, or simply show your ID to the receptionist.'
                    : 'Upload clear photos of your Aadhaar card. Front Desk reception will verify them before unlocking your digital keycard.'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Front Side Upload */}
                  <div
                    className={`rounded-xl p-2.5 border space-y-2 ${
                      isDark ? 'border-slate-700/80 bg-slate-900/60' : 'border-slate-200 bg-white shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-bold flex items-center gap-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                        <span>🪪</span> Front Side (Photo & Name)
                      </span>
                      {aadhaarFront && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✓ Attached</span>}
                    </div>

                    {aadhaarFront ? (
                      <div className={`relative rounded-lg overflow-hidden border h-24 flex items-center justify-center ${
                        isDark ? 'border-emerald-500/40 bg-black' : 'border-emerald-300 bg-slate-50'
                      }`}>
                        <img src={aadhaarFront} alt="Aadhaar Front" className="h-full w-full object-contain" />
                        <button
                          type="button"
                          onClick={() => setAadhaarFront(null)}
                          className="absolute top-1 right-1 bg-black/70 hover:bg-red-600 text-white p-1 rounded-md text-[10px]"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <label className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-bold cursor-pointer transition ${
                          isDark
                            ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300'
                            : 'bg-amber-100/70 hover:bg-amber-100 border-amber-300 text-amber-900 shadow-xs'
                        }`}>
                          <Icons.Camera className="w-3.5 h-3.5" />
                          <span>{aadhaarCompressing === 'FRONT' ? 'Compressing...' : 'Upload Front Side'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => handleUploadAadhaar(e, 'FRONT')}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAttachSampleAadhaar('FRONT')}
                          className={`text-[10px] underline transition text-center ${
                            isDark ? 'text-slate-400 hover:text-amber-400' : 'text-slate-500 hover:text-amber-700'
                          }`}
                        >
                          Use Sample Front ID
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Back Side Upload */}
                  <div
                    className={`rounded-xl p-2.5 border space-y-2 ${
                      isDark ? 'border-slate-700/80 bg-slate-900/60' : 'border-slate-200 bg-white shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-bold flex items-center gap-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                        <span>🪪</span> Back Side (Address & QR)
                      </span>
                      {aadhaarBack && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✓ Attached</span>}
                    </div>

                    {aadhaarBack ? (
                      <div className={`relative rounded-lg overflow-hidden border h-24 flex items-center justify-center ${
                        isDark ? 'border-emerald-500/40 bg-black' : 'border-emerald-300 bg-slate-50'
                      }`}>
                        <img src={aadhaarBack} alt="Aadhaar Back" className="h-full w-full object-contain" />
                        <button
                          type="button"
                          onClick={() => setAadhaarBack(null)}
                          className="absolute top-1 right-1 bg-black/70 hover:bg-red-600 text-white p-1 rounded-md text-[10px]"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <label className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-bold cursor-pointer transition ${
                          isDark
                            ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300'
                            : 'bg-amber-100/70 hover:bg-amber-100 border-amber-300 text-amber-900 shadow-xs'
                        }`}>
                          <Icons.Camera className="w-3.5 h-3.5" />
                          <span>{aadhaarCompressing === 'BACK' ? 'Compressing...' : 'Upload Back Side'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => handleUploadAadhaar(e, 'BACK')}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAttachSampleAadhaar('BACK')}
                          className={`text-[10px] underline transition text-center ${
                            isDark ? 'text-slate-400 hover:text-amber-400' : 'text-slate-500 hover:text-amber-700'
                          }`}
                        >
                          Use Sample Back ID
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2-ROOM QUOTA & SECONDARY GUEST DISCLOSURE */}
              <div
                className={`p-3.5 rounded-2xl border space-y-2.5 ${
                  isDark ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-slate-50/80 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-xs font-bold block ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      2nd Room Booking / Accompanying Guest
                    </span>
                    <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Strict ceiling: Maximum 2 rooms per mobile number
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSecondRoom(!isSecondRoom)}
                    className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                      isSecondRoom ? 'bg-slate-800 dark:bg-slate-200' : isDark ? 'bg-slate-700' : 'bg-slate-300'
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
                  <div className={`pt-2 border-t space-y-2 ${isDark ? 'border-slate-700/60' : 'border-slate-200'}`}>
                    <p className={`text-[11px] ${isDark ? 'text-slate-700 dark:text-slate-300' : 'text-slate-700 dark:text-slate-300 font-medium'}`}>
                      Who is this 2nd room for? Please provide the secondary guest's name and relationship.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className={`text-[10px] font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Secondary Guest Full Name *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Radhika Sharma"
                          value={secondaryGuestName}
                          onChange={(e) => setSecondaryGuestName(e.target.value)}
                          className={`w-full rounded-xl px-2.5 py-1.5 text-xs border ${
                            isDark
                              ? 'bg-slate-950 border-slate-700 text-white'
                              : 'bg-white border-slate-300 text-slate-900 focus:bg-white'
                          }`}
                        />
                      </div>
                      <div>
                        <label className={`text-[10px] font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Relationship to Primary Guest
                        </label>
                        <select
                          value={secondaryGuestRelationship}
                          onChange={(e) => setSecondaryGuestRelationship(e.target.value)}
                          className={`w-full rounded-xl px-2.5 py-1.5 text-xs border ${
                            isDark
                              ? 'bg-slate-950 border-slate-700 text-white'
                              : 'bg-white border-slate-300 text-slate-900 focus:bg-white'
                          }`}
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
                disabled={isSubmittingBooking}
                data-testid="submit-reception-docs-btn"
                className="min-h-[46px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-50 mt-1"
              >
                {isSubmittingBooking ? (
                  <span>Submitting Aadhaar & Booking to Reception...</span>
                ) : (
                  <>
                    <Icons.Check className="w-4 h-4 text-white" />
                    <span>Submit Aadhaar & Booking to Reception</span>
                  </>
                )}
              </button>
            </form>
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
                  {bookingConfirmation.checkInDate} ➔ {bookingConfirmation.checkOutDate} ({bookingConfirmation.nights} nt)
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
                className="min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition active:scale-98"
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
              <button
                type="button"
                onClick={() => setIsHotelModalOpen(false)}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                  isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                ✕
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={hotelSearch}
                onChange={(e) => setHotelSearch(e.target.value)}
                placeholder="Search hotel or city..."
                className={`w-full min-h-[40px] rounded-xl border pl-9 pr-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
                }`}
              />
              <Icons.Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-0.5">
              {filteredHotels.map((h) => {
                const isSelected = selectedHotel?.id === h.id;
                const cover = h.coverImageUrl || FALLBACK_HOTEL_COVER;
                const logo = h.logoUrl || FALLBACK_HOTEL_LOGO;

                return (
                  <button
                    key={h.id}
                    type="button"
                    data-testid={`hotel-select-option-${h.id}`}
                    onClick={() => {
                      setSelectedHotel(h);
                      setIsHotelModalOpen(false);
                      setStayVerifyError(null);
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
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = FALLBACK_HOTEL_COVER;
                        }}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
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
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = FALLBACK_HOTEL_LOGO;
                            }}
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

      {/* ======================================================== */}
      {/* APP & STAY SETTINGS MODAL                                */}
      {/* ======================================================== */}
      {isSettingsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="settings-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
        >
          <div
            className={`w-full max-w-sm rounded-3xl border p-5 shadow-2xl flex flex-col gap-3.5 max-h-[88vh] overflow-y-auto ${
              isDark ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'
            }`}
          >
            {/* Modal Header */}
            <div className={`flex items-center justify-between pb-2.5 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <Icons.Settings className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight">{t('Settings')}</h3>
                  <p className="text-[10px] text-slate-400 font-medium">{selectedHotel?.name || 'SpiceHub'}</p>
                </div>
              </div>
              <button
                type="button"
                data-testid="close-settings-modal"
                onClick={() => setIsSettingsModalOpen(false)}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition ${
                  isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                ✕
              </button>
            </div>

            {/* Multi-Page Navigation Bar (4 Simple Tabs) */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-bold">
              <button
                type="button"
                data-testid="settings-nav-main"
                onClick={() => setSettingsPage('MAIN')}
                className={`flex-1 py-1.5 px-1 rounded-lg text-center transition ${
                  settingsPage === 'MAIN'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                ⚙️ General
              </button>
              <button
                type="button"
                data-testid="settings-nav-reservation"
                onClick={() => setSettingsPage('RESERVATION')}
                className={`flex-1 py-1.5 px-1 rounded-lg text-center transition relative ${
                  settingsPage === 'RESERVATION'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                🛏️ Stay
                {(activeReservation || pendingApprovalBooking) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block ml-1 animate-pulse" />
                )}
              </button>
              <button
                type="button"
                data-testid="settings-nav-support"
                onClick={() => setSettingsPage('SUPPORT')}
                className={`flex-1 py-1.5 px-1 rounded-lg text-center transition ${
                  settingsPage === 'SUPPORT'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                📞 Desk
              </button>
              <button
                type="button"
                data-testid="settings-nav-session"
                onClick={() => setSettingsPage('SESSION')}
                className={`flex-1 py-1.5 px-1 rounded-lg text-center transition ${
                  settingsPage === 'SESSION'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                📱 System
              </button>
            </div>

            {/* TAB 1: GENERAL & PREFERENCES */}
            {settingsPage === 'MAIN' && (
              <div className="space-y-3 animate-in fade-in">
                {/* Verified Identity Status */}
                <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Guest Identity</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {verifiedGuestUser?.isVerified ? '✓ OTP Verified' : 'Guest'}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900">
                    {verifiedGuestUser?.name || guestName || activeReservation?.guestName || 'Valued Guest'}
                  </div>
                  <div className="text-[11px] font-mono text-slate-600">
                    {verifiedGuestUser?.phone || guestPhone || activeReservation?.guestPhone || 'Mobile not registered'}
                  </div>
                </div>

                {/* Appearance & Language */}
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">{t('Language')}</span>
                      <span className="text-[10px] text-slate-500">English / हिंदी भाषा</span>
                    </div>
                    <LanguageToggle isDark={isDark} />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">{t('Theme')}</span>
                      <span className="text-[10px] text-slate-500">Standard Bright Mode</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                      <Icons.Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>Light</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: STAY & RESERVATION (CANCELLATION & RECEPTION GATING) */}
            {settingsPage === 'RESERVATION' && (
              <div className="space-y-3 animate-in fade-in">
                {pendingApprovalBooking ? (
                  <div className="p-4 rounded-2xl border-2 border-amber-400 bg-amber-50/90 text-slate-900 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                        <span className="text-xs font-black text-amber-950 uppercase">Pending Approval</span>
                      </div>
                      <span className="font-mono text-[10px] font-bold bg-amber-200 text-amber-950 px-2 py-0.5 rounded">
                        {pendingApprovalBooking.bookingNumber}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Room:</span>
                        <strong className="text-slate-900">Room {pendingApprovalBooking.roomNumber} ({pendingApprovalBooking.roomTypeName})</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Tariff:</span>
                        <strong className="font-mono text-slate-900">₹{pendingApprovalBooking.grandTotal?.toLocaleString('en-IN')}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Stay Window:</span>
                        <span className="text-[11px] font-medium text-slate-700">
                          {pendingApprovalBooking.checkInDate} ➔ {pendingApprovalBooking.checkOutDate}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-amber-300/80 space-y-2">
                      <p className="text-[10px] text-amber-900 leading-tight">
                        ✓ You can cancel this booking request anytime before Front Desk verifies it.
                      </p>
                      <button
                        type="button"
                        data-testid="settings-cancel-booking-btn"
                        disabled={isCancellingBooking}
                        onClick={() => handleCancelBooking(pendingApprovalBooking.bookingNumber)}
                        className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition active:scale-98"
                      >
                        <Icons.Trash className="w-3.5 h-3.5 text-white" />
                        <span>{isCancellingBooking ? 'Cancelling Request...' : 'Cancel Reservation Request'}</span>
                      </button>
                    </div>
                  </div>
                ) : activeReservation ? (
                  <div className="p-4 rounded-2xl border-2 border-emerald-400 bg-emerald-50/90 text-slate-900 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-black text-emerald-950 uppercase">Verified In-House Stay</span>
                      </div>
                      <span className="font-mono text-[10px] font-bold bg-emerald-200 text-emerald-950 px-2 py-0.5 rounded">
                        Room #{activeReservation.roomNumber}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Category:</span>
                        <strong className="text-slate-900">{activeReservation.roomTypeName}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Booking Ref:</span>
                        <strong className="font-mono text-slate-900">{activeReservation.bookingNumber}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Dates:</span>
                        <span className="text-[11px] font-medium text-slate-700">
                          {activeReservation.checkInDate} ➔ {activeReservation.checkOutDate}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-emerald-300/80 space-y-2">
                      <div className="p-2.5 rounded-xl bg-white/80 border border-emerald-200 text-[11px] text-emerald-900 leading-snug">
                        <strong>🔒 Cancellation Gate:</strong> Because your stay is already approved and checked-in by Reception, self-cancellation is restricted. Please contact the Front Desk for checkout or cancellation support.
                      </div>
                      <a
                        href={`tel:${selectedHotel?.contactPhone || '+91 141 2345678'}`}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition active:scale-98"
                      >
                        <Icons.Phone className="w-3.5 h-3.5 text-white" />
                        <span>Call Reception Support</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 text-center space-y-2.5">
                    <span className="text-2xl">🛏️</span>
                    <h4 className="text-xs font-bold text-slate-900">No Active Reservation</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      You do not have any room booked at {selectedHotel?.name || 'this hotel'}. Browse our catalog to reserve luxury suites.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsModalOpen(false);
                        setCustomerView('rooms');
                      }}
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
                    >
                      Browse Available Rooms
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: DESK & SUPPORT */}
            {settingsPage === 'SUPPORT' && (
              <div className="space-y-3 animate-in fade-in">
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Reception Desk Helpline</span>
                      <span className="text-[10px] text-slate-500">{selectedHotel?.name || 'Hotel Front Desk'}</span>
                    </div>
                    <a
                      href={`tel:${selectedHotel?.contactPhone || '+91 141 2345678'}`}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 flex items-center gap-1 shadow-xs"
                    >
                      <Icons.Phone className="w-3.5 h-3.5" />
                      <span>Call Now</span>
                    </a>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Standard Hotel Timings</span>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Check-In:</span>
                    <strong className="text-slate-900">02:00 PM</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Check-Out:</span>
                    <strong className="text-slate-900">11:00 AM Departure</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Night Dining:</span>
                    <strong className="text-slate-900">11:30 PM - 06:00 AM</strong>
                  </div>
                </div>

                <div className="p-3 rounded-2xl border border-slate-200 bg-white text-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">In-Room Phone Extensions</span>
                  <p className="text-[11px] text-slate-700">• Reception Manager: <strong>Dial 9</strong></p>
                  <p className="text-[11px] text-slate-700">• Kitchen & Dining: <strong>Dial 101</strong></p>
                  <p className="text-[11px] text-slate-700">• Housekeeping Butler: <strong>Dial 102</strong></p>
                  <p className="text-[11px] text-slate-700">• Emergency / Security: <strong>Dial 0</strong></p>
                </div>
              </div>
            )}

            {/* TAB 4: APP & SYSTEM */}
            {settingsPage === 'SESSION' && (
              <div className="space-y-3 animate-in fade-in">
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-2.5 shadow-xs text-xs">
                  <div className="flex items-center justify-between">
                    <span>Camera (QR Scanner)</span>
                    <button
                      type="button"
                      onClick={openAppSettings}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      Permissions
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>GPS Location Guard</span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Cloud Services Sync</span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Connected
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-slate-500">App Version</span>
                    <span className="font-mono text-slate-700">v2.6.0 (Production)</span>
                  </div>
                </div>

                {/* Session Reset / Cache Clear: STRICTLY GATED WHEN ROOM IS BOOKED */}
                {activeReservation || pendingApprovalBooking ? (
                  <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/80 text-[11px] text-blue-950 leading-relaxed">
                    <strong>ℹ️ Stay Session Protected:</strong> A room reservation is currently active on this device. Cache reset is disabled to protect your stay and digital keycard. To cancel your reservation, please use the Stay tab.
                  </div>
                ) : (
                  <button
                    type="button"
                    data-testid="reset-guest-session-btn"
                    onClick={() => {
                      if (confirm('Clear local guest session cache on this device?')) {
                        localStorage.removeItem('spicehub_customer_hotel_chosen');
                        localStorage.removeItem('spicehub_verified_guest_user');
                        setVerifiedGuestUser(null);
                        setIsSettingsModalOpen(false);
                        setCustomerView('hotel_select');
                        alert('Local session cache cleared successfully.');
                      }
                    }}
                    className="w-full py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs font-bold transition active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Icons.Trash className="w-4 h-4 text-slate-500" />
                    <span>Clear App Cache</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
