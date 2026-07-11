/**
 * Zod validation schemas for all API request bodies.
 *
 * Every POST/PATCH/DELETE endpoint validates its input against
 * the corresponding schema before processing. This prevents
 * malformed data from reaching business logic or the database.
 *
 * Compatible with Zod v4 API.
 */

import { z } from "zod";
import { MAX_PARSE_INPUT_LENGTH } from "./constants";

// ────────────────────────────────────────────────────────────────
// Transaction Parsing
// ────────────────────────────────────────────────────────────────

/** Schema for POST /api/transactions/parse */
export const ParseTransactionSchema = z.object({
  text: z
    .string()
    .min(1, "Input text cannot be empty")
    .max(
      MAX_PARSE_INPUT_LENGTH,
      `Input text must not exceed ${MAX_PARSE_INPUT_LENGTH} characters`
    ),
});

export type ParseTransactionInput = z.infer<typeof ParseTransactionSchema>;

// ────────────────────────────────────────────────────────────────
// User Registration
// ────────────────────────────────────────────────────────────────

/** Schema for POST /api/register */
export const RegisterSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must not exceed 100 characters"),
  email: z
    .string()
    .email("Invalid email address"),
  orgName: z
    .string()
    .min(2, "Organization name must be at least 2 characters")
    .max(100, "Organization name must not exceed 100 characters")
    .optional(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
  inviteOrg: z.string().optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

// ────────────────────────────────────────────────────────────────
// Member Invitation
// ────────────────────────────────────────────────────────────────

/** Schema for POST /api/workspace/members/invite */
export const InviteSchema = z.object({
  email: z
    .string()
    .email("Invalid email address"),
});

export type InviteInput = z.infer<typeof InviteSchema>;

// ────────────────────────────────────────────────────────────────
// Role Update
// ────────────────────────────────────────────────────────────────

/** Schema for PATCH /api/workspace/members/:id */
export const UpdateRoleSchema = z.object({
  role: z.enum(["Owner", "Member"]),
});

export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;

// ────────────────────────────────────────────────────────────────
// Workspace Settings
// ────────────────────────────────────────────────────────────────

/** Schema for PATCH /api/workspace */
export const UpdateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(2, "Workspace name must be at least 2 characters")
    .max(100, "Workspace name must not exceed 100 characters"),
});

export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceSchema>;

// ────────────────────────────────────────────────────────────────
// Complete Setup (Google OAuth onboarding)
// ────────────────────────────────────────────────────────────────

/** Schema for POST /api/workspace/complete-setup */
export const CompleteSetupSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must not exceed 100 characters"),
  orgName: z
    .string()
    .min(2, "Organization name must be at least 2 characters")
    .max(100, "Organization name must not exceed 100 characters"),
});

export type CompleteSetupInput = z.infer<typeof CompleteSetupSchema>;
