/**
 * Application-wide constants for the Verio platform.
 *
 * Centralizes magic numbers, cookie names, and route lists
 * so they are defined once and referenced everywhere.
 */

/** Maximum character length accepted by the transaction parser. */
export const MAX_PARSE_INPUT_LENGTH = 2000;

/** Number of days before a pending workspace invite expires. */
export const INVITE_EXPIRY_DAYS = 7;

/** Default number of items per page for cursor-paginated endpoints. */
export const DEFAULT_PAGE_SIZE = 10;

/**
 * Cookie names used by Better Auth for session tokens.
 * The `__Secure-` prefix is set automatically in production (HTTPS).
 */
export const SESSION_COOKIE_NAMES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
] as const;

/**
 * Routes that do not require authentication.
 * Used by the Next.js middleware redirect guard.
 */
export const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/how-it-works",
  "/api/auth",
  "/api/register",
  "/_next",
  "/favicon",
] as const;

/**
 * Transaction categories recognized by the parser.
 * Kept as a const array so both the parser and frontend can reference it.
 */
export const TRANSACTION_CATEGORIES = [
  "Food & Beverage",
  "Transport",
  "Shopping",
  "Income",
  "Miscellaneous",
] as const;

export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];
