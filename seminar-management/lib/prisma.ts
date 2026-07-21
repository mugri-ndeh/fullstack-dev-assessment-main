import { PrismaClient } from "@prisma/client";

// Next.js hot-reload re-evaluates modules; cache the client on globalThis in
// dev so we don't exhaust the connection pool with stale clients.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
