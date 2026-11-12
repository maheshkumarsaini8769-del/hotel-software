import { isValidStaffHotelCode, normalizeStaffHotelCode } from '../utils/staffHotelAccess';

describe('staff hotel access codes', () => {
  test('accepts a six-digit numeric code', () => {
    expect(isValidStaffHotelCode('774273')).toBe(true);
  });

  test('continues to accept the existing prefixed code format', () => {
    expect(isValidStaffHotelCode('SH4277')).toBe(true);
  });

  test('rejects numeric codes that are not exactly six digits', () => {
    expect(isValidStaffHotelCode('77427')).toBe(false);
    expect(isValidStaffHotelCode('7742730')).toBe(false);
  });

  test('normalizes code input consistently', () => {
    expect(normalizeStaffHotelCode(' 77-4273 ')).toBe('774273');
  });
});
