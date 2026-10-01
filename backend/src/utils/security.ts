/**
 * Security Utilities for SpiceHub Enterprise Hospitality ERP
 */

/**
 * Escapes all regular expression special characters to prevent
 * Catastrophic Backtracking and ReDoS (Regular Expression Denial of Service) attacks.
 */
export function escapeRegex(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}
