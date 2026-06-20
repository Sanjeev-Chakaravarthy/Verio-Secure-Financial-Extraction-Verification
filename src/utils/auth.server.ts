import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./db.server";

// Vercel automatically provides these env vars:
// VERCEL_PROJECT_PRODUCTION_URL — stable production URL (never changes between deploys)
// VERCEL_URL — current deployment URL (unique per deploy)
// BETTER_AUTH_URL — manually set fallback

const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.BETTER_AUTH_URL || null;

const deploymentUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : null;

const baseURL = productionUrl || deploymentUrl || "http://localhost:3000";

const trustedOrigins = [
  "http://localhost:3000",
  ...(productionUrl ? [productionUrl] : []),
  ...(deploymentUrl ? [deploymentUrl] : []),
  ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
].filter((v, i, a) => a.indexOf(v) === i); // deduplicate

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL,
  trustedOrigins,
  rateLimit: {
    enabled: false,
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    sendResetPassword: async ({ user, url }) => {
      const { sendPasswordResetEmail } = await import("./email");
      await sendPasswordResetEmail({
        toEmail: user.email,
        userName: user.name,
        resetUrl: url,
      });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "dummy-google-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dummy-google-client-secret",
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
});
