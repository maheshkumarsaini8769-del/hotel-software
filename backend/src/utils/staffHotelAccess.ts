import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ITenant } from '../models/Tenant';
import { getJwtSecret } from '../config/security';

export const normalizeStaffHotelCode = (code: unknown): string =>
  String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export const isValidStaffHotelCode = (code: unknown): boolean => {
  const normalized = normalizeStaffHotelCode(code);
  if (!normalized) return false;
  // Numeric-only codes must be exactly six digits; prefixed/alphanumeric
  // codes keep the existing 4-10 character format (e.g. SH4277, ROYAL1).
  if (/^\d+$/.test(normalized)) return /^\d{6}$/.test(normalized);
  return /^[A-Z0-9]{4,10}$/.test(normalized);
};

export const hashStaffHotelCode = (code: string): string =>
  crypto.createHmac('sha256', getJwtSecret()).update(normalizeStaffHotelCode(code)).digest('hex');

export const generateStaffHotelCode = (hotelName: string): string => {
  const initials = hotelName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
    .replace(/[^A-Z]/g, '')
    .padEnd(2, 'H')
    .slice(0, 2);
  const suffix = String(crypto.randomInt(1000, 10000)).padStart(4, '0');
  return `${initials}${suffix}`;
};

export const isStaffHotelCodeValid = (code: unknown, tenant: ITenant): boolean => {
  const normalized = normalizeStaffHotelCode(code);
  if (!normalized || !tenant.staffAccessCodeHash) return false;
  const provided = Buffer.from(hashStaffHotelCode(normalized), 'hex');
  const expected = Buffer.from(tenant.staffAccessCodeHash, 'hex');
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
};

export const issueStaffHotelAccessToken = (tenant: ITenant): string =>
  jwt.sign(
    {
      hotelId: tenant._id.toString(),
      purpose: 'staff-hotel-code',
      codeVersion: tenant.staffAccessCodeVersion,
    },
    getJwtSecret(),
    { expiresIn: '30d' }
  );

export const verifyStaffHotelAccessToken = (
  accessToken: unknown,
  hotelId: string,
  codeVersion?: string
): boolean => {
  if (typeof accessToken !== 'string' || !accessToken) return false;
  try {
    const payload = jwt.verify(accessToken, getJwtSecret()) as jwt.JwtPayload;
    return (
      payload.purpose === 'staff-hotel-code' &&
      String(payload.hotelId) === hotelId &&
      typeof payload.codeVersion === 'string' &&
      Boolean(codeVersion) &&
      payload.codeVersion === codeVersion
    );
  } catch {
    return false;
  }
};
