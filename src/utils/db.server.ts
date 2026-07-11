import { PrismaClient } from "@prisma/client";

/**
 * Singleton Prisma client instance.
 *
 * In development, Next.js hot-reloads modules on every save, which would
 * otherwise create a new PrismaClient (and a new database connection pool)
 * on each reload. Storing the instance on `globalThis` prevents connection
 * exhaustion during development.
 *
 * In production, module-level state persists for the lifetime of the
 * serverless function cold-start, so the singleton pattern is harmless.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
