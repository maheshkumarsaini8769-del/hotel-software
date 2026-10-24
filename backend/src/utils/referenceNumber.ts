/**
 * Generates a human-readable yet collision-resistant order/bill number.
 *
 * The legacy format used only a truncated timestamp (e.g. last 5 digits of
 * `Date.now()`), which collides when multiple terminals punch orders within
 * the same millisecond. A short random suffix guarantees uniqueness even for
 * fully concurrent requests while keeping the number readable.
 */
export function generateReferenceNumber(prefix: string, suffixLength = 5): string {
  const random = Math.random().toString(36).slice(2, 2 + suffixLength).toUpperCase().padEnd(suffixLength, '0');
  return `${prefix}-${Date.now().toString().slice(-6)}-${random}`;
}

export function isDuplicateKeyError(error: any): boolean {
  return Boolean(error && (error.code === 11000 || error.code === 11001));
}
