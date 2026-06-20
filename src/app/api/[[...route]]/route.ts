import { Hono } from "hono";
import { handle } from "hono/vercel";
import { auth } from "@/utils/auth.server";
import { prisma } from "@/utils/db.server";
import { sendInviteEmail } from "@/utils/email";

const app = new Hono().basePath("/api");

// Context helper to securely resolve organization workspace context from Better Auth session
async function getSessionContext(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  if (!session || !session.user) {
    return null;
  }
  
  // Find organization membership for this user
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    include: { organization: true },
  });

  if (!membership) {
    return null;
  }

  return {
    organizationId: membership.organizationId,
    organizationName: membership.organization.name,
    userId: session.user.id,
    userName: session.user.name,
    role: membership.role,
  };
}

import { parseRawTransactionText } from "@/utils/parser";

// Debug endpoint — shows exactly what URL Better Auth is using (remove after fix)
app.get("/debug-config", (c) => {
  return c.json({
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "NOT SET",
    VERCEL_URL: process.env.VERCEL_URL || "NOT SET",
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL || "NOT SET",
    google_redirect_uri: `${process.env.BETTER_AUTH_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : `https://${process.env.VERCEL_URL}`)}/api/auth/callback/google`,
  });
});

// Organization & Account Registration API
app.post("/register", async (c) => {
  const { fullName, email, orgName, password, inviteOrg } = await c.req.json();
  const isInvited = !!inviteOrg;

  if (!email || !password || !fullName) {
    return c.json({ error: "All fields are required" }, 400);
  }
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
    const organization = await prisma.organization.create({ data: { name: orgName } });

    await prisma.membership.create({
      data: { organizationId: organization.id, userId: userSession.user.id, role: "Owner" },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: organization.id,
        userId: userSession.user.id,
        eventName: "Workspace Created",
        details: orgName,
      },
    });

    return c.json({ success: true });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Workspace creation failed. Email may already be registered.";
    return c.json({ error: errorMsg }, 400);
  }
});


// 1. Transaction Parsing API
app.post("/transactions/parse", async (c) => {
  const context = await getSessionContext(c.req.raw.headers);
  if (!context) {
    return c.json({ error: "Unauthorized workspace context" }, 401);
  }

  const { text } = await c.req.json();
  if (!text || typeof text !== "string") {
    return c.json({ error: "Input text is required" }, 400);
  }

  const parse = parseRawTransactionText(text);

  // Create Transaction
  const transaction = await prisma.transaction.create({
    data: {
      organizationId: context.organizationId,
      date: parse.date,
      description: parse.merchant,
      amount: parse.amount,
      category: parse.category,
      rawText: text,
    },
  });

  // Create Parse Result
  const parseResult = await prisma.parseResult.create({
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

  // Log Activity
  await prisma.auditLog.create({
    data: {
      organizationId: context.organizationId,
      userId: context.userId,
      eventName: "Transaction Parsed",
      details: `${parse.merchant} (${parse.amount > 0 ? "+" : ""}₹${Math.abs(parse.amount).toFixed(2)})`,
    },
  });

  return c.json({ transaction: { ...transaction, parseResult } });
});

// 2. Fetch Transactions (Workspace Scoped with Pagination, Search, Filtering)
app.get("/transactions", async (c) => {
  const context = await getSessionContext(c.req.raw.headers);
  if (!context) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const search = c.req.query("search") || "";
  const category = c.req.query("category") || "";
  const limit = parseInt(c.req.query("limit") || "10", 10);
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

// 3. Fetch Transaction Detail (IDOR Scoped)
app.get("/transactions/:id", async (c) => {
  const context = await getSessionContext(c.req.raw.headers);
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

// 4. Workspace Members API
app.get("/workspace/members", async (c) => {
  const context = await getSessionContext(c.req.raw.headers);
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

// 4b. List Pending Invitations (Verification records with invite: prefix)
app.get("/workspace/members/pending", async (c) => {
  const context = await getSessionContext(c.req.raw.headers);
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

// 4c. Cancel Pending Invitation
app.delete("/workspace/members/invite/:id", async (c) => {
  const context = await getSessionContext(c.req.raw.headers);
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

// 5. Invite Member — stores a pending invite token, does NOT pre-create stub users
app.post("/workspace/members/invite", async (c) => {
  const context = await getSessionContext(c.req.raw.headers);
  if (!context) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (context.role !== "Owner") {
    return c.json({ error: "Forbidden: Only Owners can invite members" }, 403);
  }

  const { email } = await c.req.json();
  if (!email) {
    return c.json({ error: "Email is required" }, 400);
  }

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
  // identifier = "invite:<orgId>:<email>", value = orgId, expires in 7 days
  const inviteIdentifier = `invite:${context.organizationId}:${email}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

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

// 5b. Accept Pending Invite — called after a user logs in/registers to claim their pending membership
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



// 6. Delete Member (Authorization Protected)
app.delete("/workspace/members/:id", async (c) => {
  const context = await getSessionContext(c.req.raw.headers);
  if (!context) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Only Owner can delete members
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

  // Log Activity
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

// 7. Update Member Role (Authorization Protected)
app.patch("/workspace/members/:id", async (c) => {
  const context = await getSessionContext(c.req.raw.headers);
  if (!context) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Only Owner can change roles
  if (context.role !== "Owner") {
    return c.json({ error: "Forbidden: Only Owners can modify member roles" }, 403);
  }

  const id = c.req.param("id");
  const { role } = await c.req.json();
  if (role !== "Owner" && role !== "Member") {
    return c.json({ error: "Invalid role specified" }, 400);
  }

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

  // Log Activity
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

// 8. Fetch Scoped Audit Logs
app.get("/workspace/activity", async (c) => {
  const context = await getSessionContext(c.req.raw.headers);
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

// 9. Fetch Workspace Stats
app.get("/workspace/stats", async (c) => {
  const context = await getSessionContext(c.req.raw.headers);
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

// 10. Complete Workspace Setup (Google Registration Onboarding)
app.post("/workspace/complete-setup", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session || !session.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { fullName, orgName } = await c.req.json();
  if (!fullName || !orgName) {
    return c.json({ error: "All fields are required" }, 400);
  }

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

// 11. Update Workspace Settings (Organization name)
app.patch("/workspace", async (c) => {
  const context = await getSessionContext(c.req.raw.headers);
  if (!context) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Only Owner can modify organization settings
  if (context.role !== "Owner") {
    return c.json({ error: "Forbidden: Only Owners can edit workspace settings" }, 403);
  }

  const { name } = await c.req.json();
  if (!name || name.trim().length < 2) {
    return c.json({ error: "Workspace name must be at least 2 characters" }, 400);
  }

  try {
    const oldName = context.organizationName;
    const organization = await prisma.organization.update({
      where: { id: context.organizationId },
      data: { name: name.trim() },
    });

    // Log Activity
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

export const GET = handle(app);
export const POST = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
export const PUT = handle(app);
