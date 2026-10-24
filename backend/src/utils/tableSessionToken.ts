import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/security';

export interface TableSessionTokenClaims {
  purpose: 'TABLE_SESSION';
  hotelId: string;
  tableId: string;
  tableSessionId: string;
}

export const hashTableSessionToken = (token: string): string =>
  crypto.createHash('sha256').update(String(token)).digest('hex');

export const signTableSessionToken = (claims: Omit<TableSessionTokenClaims, 'purpose'>): string =>
  jwt.sign(
    {
      purpose: 'TABLE_SESSION',
      hotelId: String(claims.hotelId),
      tableId: String(claims.tableId),
      tableSessionId: String(claims.tableSessionId),
    },
    getJwtSecret(),
    { expiresIn: '12h' }
  );

export const verifyTableSessionToken = (token: string): TableSessionTokenClaims | null => {
  try {
    const decoded = jwt.verify(String(token), getJwtSecret()) as Partial<TableSessionTokenClaims>;
    if (
      decoded?.purpose !== 'TABLE_SESSION' ||
      !decoded.hotelId ||
      !decoded.tableId ||
      !decoded.tableSessionId
    ) {
      return null;
    }
    return {
      purpose: 'TABLE_SESSION',
      hotelId: String(decoded.hotelId),
      tableId: String(decoded.tableId),
      tableSessionId: String(decoded.tableSessionId),
    };
  } catch {
    return null;
  }
};

/**
 * Accepts either a signed guest table-session token or the legacy hashed
 * session token. Validation is always bound to the session record.
 */
export const matchesTableSessionToken = (
  providedToken: string,
  session: { _id: unknown; hotelId: unknown; tableId: unknown; sessionTokenHash?: string | null }
): boolean => {
  if (!providedToken) return false;

  const claims = verifyTableSessionToken(providedToken);
  if (
    claims &&
    claims.tableSessionId === String(session._id) &&
    claims.hotelId === String(session.hotelId) &&
    claims.tableId === String(session.tableId)
  ) {
    return true;
  }

  return Boolean(
    session.sessionTokenHash && hashTableSessionToken(providedToken) === session.sessionTokenHash
  );
};
