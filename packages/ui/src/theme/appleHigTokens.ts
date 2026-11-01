/**
 * Apple Human Interface Guidelines (HIG) Design Tokens
 * Strict color, typography, and spacing tokens according to Apple Design Standards.
 */

export const AppleColorTokens = {
  light: {
    background: '#FBFBFD',       // Apple off-white canvas
    surface: '#FFFFFF',          // Clean card/surface
    textPrimary: '#1D1D1F',      // Primary label (never pure black)
    textSecondary: '#86868B',    // Secondary / subhead label
    textTertiary: '#A1A1A6',     // Placeholder / muted
    accent: '#007AFF',           // System Blue
    accentHover: '#0062CC',      // System Blue Pressed/Hover
    destructive: '#FF3B30',      // System Red
    success: '#34C759',          // System Green
    warning: '#FF9500',          // System Orange
    border: '#D2D2D7',           // Standard separator
    borderSubtle: 'rgba(210, 210, 215, 0.5)',
    fill: '#F5F5F7',             // Grouped table / tertiary fill
  },
  dark: {
    background: '#000000',       // Pure black background
    surface: '#1C1C1E',          // Apple dark card surface
    textPrimary: '#F5F5F7',      // Primary light text
    textSecondary: '#86868B',    // Secondary subhead label
    textTertiary: '#636366',     // Placeholder / muted
    accent: '#0A84FF',           // Dark mode System Blue
    accentHover: '#409CFF',
    destructive: '#FF453A',      // Dark mode System Red
    success: '#30D158',          // Dark mode System Green
    warning: '#FF9F0A',          // Dark mode System Orange
    border: '#38383A',           // Dark mode separator
    borderSubtle: 'rgba(56, 56, 58, 0.5)',
    fill: '#2C2C2E',             // Dark mode fill
  },
} as const;

export const AppleFontStack =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, Inter, sans-serif';

export const AppleTypeScale = {
  largeTitle: {
    fontSize: '34px',
    lineHeight: '41px',
    fontWeight: '700',
    letterSpacing: '0.37px',
  },
  title: {
    fontSize: '28px',
    lineHeight: '34px',
    fontWeight: '600',
    letterSpacing: '0.36px',
  },
  headline: {
    fontSize: '17px',
    lineHeight: '22px',
    fontWeight: '600',
    letterSpacing: '-0.41px',
  },
  body: {
    fontSize: '17px',
    lineHeight: '22px',
    fontWeight: '400',
    letterSpacing: '-0.41px',
  },
  callout: {
    fontSize: '16px',
    lineHeight: '21px',
    fontWeight: '400',
    letterSpacing: '-0.32px',
  },
  caption: {
    fontSize: '12px',
    lineHeight: '16px',
    fontWeight: '400',
    letterSpacing: '0px',
  },
} as const;

export const AppleSpacingGrid = {
  xxs: '4px',   // 0.5x
  xs: '8px',    // 1x (8pt base)
  sm: '12px',   // 1.5x
  md: '16px',   // 2x
  lg: '24px',   // 3x
  xl: '32px',   // 4x
  xxl: '40px',  // 5x
  xxxl: '48px', // 6x
} as const;
