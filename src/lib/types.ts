/**
 * Centralized type definitions for the Verio application.
 *
 * Every interface used by more than one file lives here.
 * Page-specific component props are still co-located with their components.
 */

// ────────────────────────────────────────────────────────────────
// Database Entity Types
// ────────────────────────────────────────────────────────────────

/** Parse result attached to a transaction after extraction. */
export interface ParseResult {
  id: string;
  transactionId: string;
  merchant: string;
  amount: number;
  date: string;
  category: string;
  merchantMatch: boolean;
  amountMatch: boolean;
  dateMatch: boolean;
  categoryMatch: boolean;
  finalConfidenceScore: number;
  createdAt: string;
  updatedAt: string;
}

/** Percentage allocation of a transaction to a workspace user. */
export interface TransactionSplit {
  id: string;
  transactionId: string;
  userId: string;
  percentage: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

/** A financial transaction record scoped to an organization. */
export interface Transaction {
  id: string;
  organizationId: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  rawText: string;
  createdAt: string;
  updatedAt: string;
  parseResult?: ParseResult | null;
  splits?: TransactionSplit[];
}

/** Workspace membership joined with user details. */
export interface MemberWithUser {
  id: string;
  organizationId: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

/** A pending invitation stored in the Verification table. */
export interface PendingInvite {
  id: string;
  email: string;
  expiresAt: string;
}

/** An entry in the audit log with the acting user's name. */
export interface AuditLogEntry {
  id: string;
  eventName: string;
  details: string | null;
  timestamp: string;
  user: {
    name: string;
  };
}

// ────────────────────────────────────────────────────────────────
// API Response Shapes
// ────────────────────────────────────────────────────────────────

/** Workspace stats returned by GET /api/workspace/stats. */
export interface WorkspaceStats {
  workspaceName: string;
  membersCount: number;
  parsedCount: number;
  lastActivity: string | null;
}

/** Resolved session context for authenticated API requests. */
export interface SessionContext {
  organizationId: string;
  organizationName: string;
  userId: string;
  userName: string;
  role: string;
}

/** Standard error response returned by all API endpoints. */
export interface ApiErrorResponse {
  error: string;
}

/** Standard success response returned by mutation endpoints. */
export interface ApiSuccessResponse {
  success: true;
}

// ────────────────────────────────────────────────────────────────
// Parser Types
// ────────────────────────────────────────────────────────────────

/** Result returned by the transaction text parser. */
export interface ParsedTransaction {
  merchant: string;
  amount: number;
  date: Date;
  category: string;
  merchantMatch: boolean;
  amountMatch: boolean;
  dateMatch: boolean;
  categoryMatch: boolean;
  finalConfidenceScore: number;
}

// ────────────────────────────────────────────────────────────────
// User Profile
// ────────────────────────────────────────────────────────────────

/** Minimal user profile returned by the auth session. */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
}
