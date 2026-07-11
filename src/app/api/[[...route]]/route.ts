import { Hono } from "hono";
import { handle } from "hono/vercel";
import { getCookie, setCookie } from "hono/cookie";
import { auth } from "@/utils/auth.server";
import { prisma } from "@/utils/db.server";
import { sendInviteEmail } from "@/utils/email";
import { parseRawTransactionText } from "@/utils/parser";
import {
  ParseTransactionSchema,
  RegisterSchema,
  InviteSchema,
  UpdateRoleSchema,
  UpdateWorkspaceSchema,
  CompleteSetupSchema,
} from "@/lib/validations";
import { INVITE_EXPIRY_DAYS, DEFAULT_PAGE_SIZE } from "@/lib/constants";
import type { SessionContext } from "@/lib/types";

/** Cookie name used to persist the user's active workspace selection. */
const ACTIVE_WORKSPACE_COOKIE = "verio-active-workspace";

const app = new Hono().basePath("/api");

// ────────────────────────────────────────────────────────────────
// Session Context Resolution
// ────────────────────────────────────────────────────────────────

/**
 * Resolves the authenticated user's workspace context from the
 * Better Auth session cookie attached to the incoming request.
 *
 * Returns `null` when:
 * - No valid session token is present (unauthenticated).
 * - The user has no workspace membership (onboarding incomplete).
 *
 * Every protected route calls this first and returns 401 on `null`.
 *
 * @param headers - Incoming request headers containing the session cookie.
 * @returns The resolved workspace context, or `null` if unauthorized.
 */
async function getSessionContext(headers: Headers, cookieHeader?: string | null): Promise<SessionContext | null> {
  const session = await auth.api.getSession({ headers });
  if (!session || !session.user) {
    return null;
  }

  // Fetch ALL memberships for this user
  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    include: { organization: true },
  });

  if (memberships.length === 0) {
    return null;
  }

  // Check if the user has an active workspace cookie
  let membership = memberships[0];
  if (cookieHeader) {
    const activeOrgId = parseCookieValue(cookieHeader, ACTIVE_WORKSPACE_COOKIE);
    if (activeOrgId) {
      const match = memberships.find((m) => m.organizationId === activeOrgId);
      if (match) {
        membership = match;
      }
    }
  }

  return {
    organizationId: membership.organizationId,
    organizationName: membership.organization.name,
    userId: session.user.id,
    userName: session.user.name,
    role: membership.role,
  };
}

/**
 * Extracts a cookie value from a raw Cookie header string.
 * Avoids depending on Hono's context object so this can be called
 * from the standalone `getSessionContext()` helper.
 */
function parseCookieValue(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// ────────────────────────────────────────────────────────────────
// Registration
// ────────────────────────────────────────────────────────────────

/**
 * POST /api/register
 *
 * Creates a new user account via Better Auth and optionally creates
 * a new organization (normal flow) or joins an existing one (invite flow).
 *
 * Request body validated by {@link RegisterSchema}.
 */
app.post("/register", async (c) => {
  const body = await c.req.json();
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0].message }, 400);
  }
  const { fullName, email, orgName, password, inviteOrg } = parsed.data;
  const isInvited = !!inviteOrg;

  if (!isInvited && !orgName) {
    return c.json({ error: "Organization name is required" }, 400);
  }

  try {
    // 1. Sign up user using Better Auth server API
    const userSession = await auth.api.signUpEmail({
      body: { email, password, name: fullName },
    });

    if (!userSession || !userSession.user) {
      return c.json({ error: "Failed to create user account." }, 400);
    }

    if (isInvited) {
      // Invited flow — accept the pending invite and skip creating a new org
      const inviteIdentifier = `invite:${inviteOrg}:${email}`;
      const invite = await prisma.verification.findFirst({
        where: { identifier: inviteIdentifier, value: inviteOrg, expiresAt: { gt: new Date() } },
      });

      if (invite) {
        // Check not already a member
        const existing = await prisma.membership.findFirst({
          where: { organizationId: inviteOrg, userId: userSession.user.id },
        });
        if (!existing) {
          await prisma.membership.create({
            data: { organizationId: inviteOrg, userId: userSession.user.id, role: "Member" },
          });
          await prisma.auditLog.create({
            data: { organizationId: inviteOrg, userId: userSession.user.id, eventName: "Member Joined", details: email },
          });
        }
        await prisma.verification.delete({ where: { id: invite.id } });
      }
      // Even if invite not found, account is created — Sidebar will handle redirect

      return c.json({ success: true });
    }

    // Normal flow — create organization and bind as Owner
    const organization = await prisma.organization.create({ data: { name: orgName! } });

    await prisma.membership.create({
      data: { organizationId: organization.id, userId: userSession.user.id, role: "Owner" },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: organization.id,
        userId: userSession.user.id,
        eventName: "Workspace Created",
        details: orgName!,
      },
    });

    return c.json({ success: true });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Workspace creation failed. Email may already be registered.";
    return c.json({ error: errorMsg }, 400);
  }
});

// ────────────────────────────────────────────────────────────────
// Transaction Parsing
// ────────────────────────────────────────────────────────────────

/**
 * POST /api/transactions/parse
 *
 * Accepts raw financial text (bank SMS, statement line, etc.), runs
 * the extraction parser, and atomically persists both the Transaction
 * and its ParseResult in a single database transaction.
 *
 * Request body validated by {@link ParseTransactionSchema}.
 */
app.post("/transactions/parse", async (c) => {
  const context = await getSessionContext(c.req.raw.headers, c.req.raw.headers.get("cookie"));
  if (!context) {
    return c.json({ error: "Unauthorized workspace context" }, 401);
  }

  const body = await c.req.json();
  const parsed = ParseTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0].message }, 400);
  }
  const { text } = parsed.data;

  const parse = parseRawTransactionText(text);

  // Atomic write: transaction + parseResult succeed or fail together
  const result = await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        organizationId: context.organizationId,
        date: parse.date,
        description: parse.merchant,
        amount: parse.amount,
        category: parse.category,
        rawText: text,
      },
    });

    const parseResult = await tx.parseResult.create({
      data: {
        transactionId: transaction.id,
        merchant: parse.merchant,
        amount: parse.amount,
        date: parse.date,
        category: parse.category,
        merchantMatch: parse.merchantMatch,
        amountMatch: parse.amountMatch,
        dateMatch: parse.dateMatch,
        categoryMatch: parse.categoryMatch,
        finalConfidenceScore: parse.finalConfidenceScore,
      },
    });

    return { transaction, parseResult };
  });

  // Log activity (outside the transaction — non-critical)
  await prisma.auditLog.create({
    data: {
      organizationId: context.organizationId,
      userId: context.userId,
      eventName: "Transaction Parsed",
      details: `${parse.merchant} (${parse.amount > 0 ? "+" : ""}₹${Math.abs(parse.amount).toFixed(2)})`,
    },
  });

  return c.json({ transaction: { ...result.transaction, parseResult: result.parseResult } });
});

// ────────────────────────────────────────────────────────────────
// Transaction Queries
// ────────────────────────────────────────────────────────────────

/**
 * GET /api/transactions
 *
 * Returns a cursor-paginated, filterable list of transactions
 * scoped to the authenticated user's organization.
 *
 * Query params: `search`, `category`, `limit`, `cursor`.
 */
app.get("/transactions", async (c) => {
  const context = await getSessionContext(c.req.raw.headers, c.req.raw.headers.get("cookie"));
  if (!context) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const search = c.req.query("search") || "";
  const category = c.req.query("category") || "";
  const limit = parseInt(c.req.query("limit") || String(DEFAULT_PAGE_SIZE), 10);
  const cursor = c.req.query("cursor");

  const transactions = await prisma.transaction.findMany({
    where: {
      organizationId: context.organizationId,
      AND: [
        {
          OR: [
            { description: { contains: search, mode: "insensitive" } },
            { category: { contains: search, mode: "insensitive" } },
          ],
        },
        category ? { category: { equals: category } } : {},
      ],
    },
    include: {
      parseResult: true,
    },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    orderBy: { date: "desc" },
  });

  let nextCursor: typeof cursor | undefined = undefined;
  if (transactions.length > limit) {
    const nextItem = transactions.pop();
    nextCursor = nextItem!.id;
  }

  return c.json({ transactions, nextCursor });
});

/**
 * GET /api/transactions/:id
 *
 * Returns a single transaction with its parse result, scoped
 * to the authenticated user's organization (prevents IDOR).
 */
app.get("/transactions/:id", async (c) => {
  const context = await getSessionContext(c.req.raw.headers, c.req.raw.headers.get("cookie"));
  if (!context) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  const transaction = await prisma.transaction.findFirst({
    where: {
      id,
      organizationId: context.organizationId,
    },
    include: {
      parseResult: true,
    },
  });

  if (!transaction) {
    return c.json({ error: "Transaction not found" }, 404);
  }

  return c.json({ transaction });
});

// ────────────────────────────────────────────────────────────────
// Workspace Members
// ────────────────────────────────────────────────────────────────

/**
 * GET /api/workspace/members
 *
 * Returns all active members of the authenticated user's organization.
 */
app.get("/workspace/members", async (c) => {
  const context = await getSessionContext(c.req.raw.headers, c.req.raw.headers.get("cookie"));
  if (!context) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const members = await prisma.membership.findMany({
    where: { organizationId: context.organizationId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { role: "asc" },
  });

  return c.json({ members });
});

/**
 * GET /api/workspace/members/pending
 *
 * Returns all unexpired pending invitations for the organization.
 */
app.get("/workspace/members/pending", async (c) => {
  const context = await getSessionContext(c.req.raw.headers, c.req.raw.headers.get("cookie"));
  if (!context) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const prefix = `invite:${context.organizationId}:`;
  const pending = await prisma.verification.findMany({
    where: {
      identifier: { startsWith: prefix },
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  const invites = pending.map((v) => ({
    id: v.id,
    email: v.identifier.replace(prefix, ""),
    expiresAt: v.expiresAt,
  }));

  return c.json({ invites });
});

/**
 * DELETE /api/workspace/members/invite/:id
 *
 * Cancels a pending invitation. Owner-only.
 */
app.delete("/workspace/members/invite/:id", async (c) => {
  const context = await getSessionContext(c.req.raw.headers, c.req.raw.headers.get("cookie"));
  if (!context) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  if (context.role !== "Owner") {
    return c.json({ error: "Forbidden: Only Owners can cancel invites" }, 403);
  }

  const id = c.req.param("id");
  const invite = await prisma.verification.findFirst({
    where: { id, identifier: { startsWith: `invite:${context.organizationId}:` } },
  });

  if (!invite) {
    return c.json({ error: "Invite not found" }, 404);
  }

  await prisma.verification.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      organizationId: context.organizationId,
      userId: context.userId,
      eventName: "Invite Cancelled",
      details: invite.identifier.replace(`invite:${context.organizationId}:`, ""),
    },
  });

  return c.json({ success: true });
});

/**
 * POST /api/workspace/members/invite
 *
 * Invites a user to the workspace by email. If the user already has
 * an account, they are added immediately. Otherwise, a pending invite
 * token is stored in the Verification table.
 *
 * Owner-only. Request body validated by {@link InviteSchema}.
 */
app.post("/workspace/members/invite", async (c) => {
  const context = await getSessionContext(c.req.raw.headers, c.req.raw.headers.get("cookie"));
  if (!context) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (context.role !== "Owner") {
    return c.json({ error: "Forbidden: Only Owners can invite members" }, 403);
  }

  const body = await c.req.json();
  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0].message }, 400);
  }
  const { email } = parsed.data;

  // If the user already exists in Better Auth (has a real Account), check for existing membership
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { accounts: true },
  });

  if (existingUser) {
    // Check if they're already a member of THIS workspace
    const existingMembership = await prisma.membership.findFirst({
      where: { organizationId: context.organizationId, userId: existingUser.id },
    });
    if (existingMembership) {
      return c.json({ error: "User is already a member of this workspace" }, 400);
    }

    // User already has a real account — add membership directly
    if (existingUser.accounts.length > 0) {
      const membership = await prisma.membership.create({
        data: {
          organizationId: context.organizationId,
          userId: existingUser.id,
          role: "Member",
        },
      });

      await prisma.auditLog.create({
        data: {
          organizationId: context.organizationId,
          userId: context.userId,
          eventName: "Member Invited",
          details: email,
        },
      });

      sendInviteEmail({
        toEmail: email,
        inviterName: context.userName,
        workspaceName: context.organizationName,
        joinUrl: `${process.env.APP_URL || "http://localhost:3000"}/login`,
      }).catch((err) => {
        console.error("[invite] Failed to send invite email:", err.message);
      });

      return c.json({ membership });
    }

    // Stub user with no accounts — delete the broken stub so they can register properly
    await prisma.user.delete({ where: { id: existingUser.id } });
  }

  // Store a pending invite in the Verification table
  // identifier = "invite:<orgId>:<email>", value = orgId, expires in INVITE_EXPIRY_DAYS
  const inviteIdentifier = `invite:${context.organizationId}:${email}`;
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  // Upsert so re-inviting the same email refreshes the expiry
  const existing = await prisma.verification.findFirst({
    where: { identifier: inviteIdentifier, value: context.organizationId },
  });
  if (existing) {
    await prisma.verification.update({
      where: { id: existing.id },
      data: { expiresAt },
    });
  } else {
    await prisma.verification.create({
      data: {
        identifier: inviteIdentifier,
        value: context.organizationId,
        expiresAt,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      organizationId: context.organizationId,
      userId: context.userId,
      eventName: "Member Invited",
      details: email,
    },
  });

  const joinUrl = `${process.env.APP_URL || "http://localhost:3000"}/register?invite=${encodeURIComponent(email)}&org=${context.organizationId}`;
  sendInviteEmail({
    toEmail: email,
    inviterName: context.userName,
    workspaceName: context.organizationName,
    joinUrl,
  }).catch((err) => {
    console.error("[invite] Failed to send invite email:", err.message);
  });

  return c.json({ success: true, message: "Invite sent. The user will join when they sign up or log in." });
});

/**
 * POST /api/workspace/accept-invite
 *
 * Called after a user logs in or registers to claim any pending
 * workspace invitations addressed to their email.
 */
app.post("/workspace/accept-invite", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session || !session.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const userEmail = session.user.email;
  const userId = session.user.id;

  // Find all pending invites for this email
  const pendingInvites = await prisma.verification.findMany({
    where: {
      identifier: { startsWith: `invite:` },
      expiresAt: { gt: new Date() },
    },
  });

  const myInvites = pendingInvites.filter((v) =>
    v.identifier === `invite:${v.value}:${userEmail}`
  );

  if (myInvites.length === 0) {
    return c.json({ joined: false, message: "No pending invites found." });
  }

  const joined: string[] = [];
  for (const invite of myInvites) {
    const orgId = invite.value;

    // Skip if already a member
    const existing = await prisma.membership.findFirst({
      where: { organizationId: orgId, userId },
    });
    if (existing) {
      await prisma.verification.delete({ where: { id: invite.id } });
      continue;
    }

    await prisma.membership.create({
      data: { organizationId: orgId, userId, role: "Member" },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        eventName: "Member Joined",
        details: userEmail,
      },
    });

    await prisma.verification.delete({ where: { id: invite.id } });
    joined.push(orgId);
  }

  return c.json({ joined: joined.length > 0, organizations: joined });
});

/**
 * DELETE /api/workspace/members/:id
 *
 * Removes a member from the workspace. Owner-only.
 * An owner cannot remove themselves.
 */
app.delete("/workspace/members/:id", async (c) => {
  const context = await getSessionContext(c.req.raw.headers, c.req.raw.headers.get("cookie"));
  if (!context) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (context.role !== "Owner") {
    return c.json({ error: "Forbidden: Only Owners can remove members" }, 403);
  }

  const id = c.req.param("id");

  // Verify the membership belongs to this organization
  const membership = await prisma.membership.findFirst({
    where: {
      id,
      organizationId: context.organizationId,
    },
    include: {
      user: true,
    },
  });

  if (!membership) {
    return c.json({ error: "Membership not found in this organization" }, 404);
  }

  // Owner cannot remove themselves if they are the only Owner
  if (membership.userId === context.userId) {
    return c.json({ error: "Cannot remove yourself from organization" }, 400);
  }

  await prisma.membership.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      organizationId: context.organizationId,
      userId: context.userId,
      eventName: "Member Removed",
      details: membership.user.email,
    },
  });

  return c.json({ success: true });
});

/**
 * PATCH /api/workspace/members/:id
 *
 * Updates a member's role. Owner-only.
 * Request body validated by {@link UpdateRoleSchema}.
 */
app.patch("/workspace/members/:id", async (c) => {
  const context = await getSessionContext(c.req.raw.headers, c.req.raw.headers.get("cookie"));
  if (!context) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (context.role !== "Owner") {
    return c.json({ error: "Forbidden: Only Owners can modify member roles" }, 403);
  }

  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = UpdateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0].message }, 400);
  }
  const { role } = parsed.data;

  const membership = await prisma.membership.findFirst({
    where: {
      id,
      organizationId: context.organizationId,
    },
    include: {
      user: true,
    },
  });

  if (!membership) {
    return c.json({ error: "Membership not found" }, 404);
  }

  await prisma.membership.update({
    where: { id },
    data: { role },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: context.organizationId,
      userId: context.userId,
      eventName: "Member Role Changed",
      details: `${membership.user.email} -> ${role}`,
    },
  });

  return c.json({ success: true });
});

// ────────────────────────────────────────────────────────────────
// Workspace Activity & Stats
// ────────────────────────────────────────────────────────────────

/**
 * GET /api/workspace/activity
 *
 * Returns the organization-scoped audit log, ordered newest first.
 */
app.get("/workspace/activity", async (c) => {
  const context = await getSessionContext(c.req.raw.headers, c.req.raw.headers.get("cookie"));
  if (!context) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const logs = await prisma.auditLog.findMany({
    where: { organizationId: context.organizationId },
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { timestamp: "desc" },
  });

  return c.json({ logs });
});

/**
 * GET /api/workspace/stats
 *
 * Returns aggregate workspace statistics: member count, parsed
 * transaction count, workspace name, and last activity timestamp.
 */
app.get("/workspace/stats", async (c) => {
  const context = await getSessionContext(c.req.raw.headers, c.req.raw.headers.get("cookie"));
  if (!context) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const [membersCount, parsedCount, lastActivity] = await Promise.all([
    prisma.membership.count({ where: { organizationId: context.organizationId } }),
    prisma.transaction.count({ where: { organizationId: context.organizationId } }),
    prisma.auditLog.findFirst({
      where: { organizationId: context.organizationId },
      orderBy: { timestamp: "desc" },
    }),
  ]);

  return c.json({
    workspaceName: context.organizationName,
    membersCount,
    parsedCount,
    lastActivity: lastActivity ? lastActivity.timestamp : null,
  });
});

// ────────────────────────────────────────────────────────────────
// Workspace Setup & Settings
// ────────────────────────────────────────────────────────────────

/**
 * POST /api/workspace/complete-setup
 *
 * Called after Google OAuth sign-up to create the user's first
 * organization and membership. Updates the user name if changed.
 *
 * Request body validated by {@link CompleteSetupSchema}.
 */
app.post("/workspace/complete-setup", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session || !session.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const parsed = CompleteSetupSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0].message }, 400);
  }
  const { fullName, orgName } = parsed.data;

  try {
    // 1. Update user name if changed
    if (fullName !== session.user.name) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { name: fullName },
      });
    }

    // 2. Create organization
    const organization = await prisma.organization.create({
      data: {
        name: orgName,
      },
    });

    // 3. Create membership as Owner
    await prisma.membership.create({
      data: {
        organizationId: organization.id,
        userId: session.user.id,
        role: "Owner",
      },
    });

    // 4. Log activity
    await prisma.auditLog.create({
      data: {
        organizationId: organization.id,
        userId: session.user.id,
        eventName: "Workspace Created",
        details: orgName,
      },
    });

    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Failed to complete setup" }, 400);
  }
});

/**
 * PATCH /api/workspace
 *
 * Updates the organization name. Owner-only.
 * Request body validated by {@link UpdateWorkspaceSchema}.
 */
app.patch("/workspace", async (c) => {
  const context = await getSessionContext(c.req.raw.headers, c.req.raw.headers.get("cookie"));
  if (!context) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (context.role !== "Owner") {
    return c.json({ error: "Forbidden: Only Owners can edit workspace settings" }, 403);
  }

  const body = await c.req.json();
  const parsed = UpdateWorkspaceSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0].message }, 400);
  }
  const { name } = parsed.data;

  try {
    const oldName = context.organizationName;
    const organization = await prisma.organization.update({
      where: { id: context.organizationId },
      data: { name: name.trim() },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: context.organizationId,
        userId: context.userId,
        eventName: "Workspace Renamed",
        details: `${oldName} -> ${name.trim()}`,
      },
    });

    return c.json({ success: true, organization });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Failed to update workspace" }, 400);
  }
});

// ────────────────────────────────────────────────────────────────
// Multi-Workspace: List & Switch
// ────────────────────────────────────────────────────────────────

/**
 * GET /api/workspace/list
 *
 * Returns all workspaces the authenticated user belongs to,
 * along with which one is currently active.
 */
app.get("/workspace/list", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session || !session.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    include: { organization: true },
  });

  const activeOrgId = getCookie(c, ACTIVE_WORKSPACE_COOKIE) || memberships[0]?.organizationId;

  const workspaces = memberships.map((m) => ({
    id: m.organizationId,
    name: m.organization.name,
    role: m.role,
    isActive: m.organizationId === activeOrgId,
  }));

  return c.json({ workspaces });
});

/**
 * POST /api/workspace/switch
 *
 * Sets the active workspace for the authenticated user by writing
 * a cookie. Validates that the user actually belongs to the target
 * organization before setting it.
 */
app.post("/workspace/switch", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session || !session.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { organizationId } = await c.req.json();
  if (!organizationId) {
    return c.json({ error: "organizationId is required" }, 400);
  }

  // Verify the user is a member of this organization
  const membership = await prisma.membership.findFirst({
    where: { organizationId, userId: session.user.id },
    include: { organization: true },
  });

  if (!membership) {
    return c.json({ error: "You are not a member of this workspace" }, 403);
  }

  // Set the active workspace cookie (30 days, httpOnly, sameSite)
  setCookie(c, ACTIVE_WORKSPACE_COOKIE, organizationId, {
    path: "/",
    httpOnly: false, // Frontend needs to read this for UX
    sameSite: "Lax",
    maxAge: 30 * 24 * 60 * 60,
    secure: process.env.NODE_ENV === "production",
  });

  return c.json({
    success: true,
    workspace: {
      id: membership.organizationId,
      name: membership.organization.name,
      role: membership.role,
    },
  });
});

// ────────────────────────────────────────────────────────────────
// HTTP Method Exports (Next.js App Router convention)
// ────────────────────────────────────────────────────────────────

export const GET = handle(app);
export const POST = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
export const PUT = handle(app);
