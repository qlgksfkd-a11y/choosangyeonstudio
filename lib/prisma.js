const { PrismaClient } = require("@prisma/client");

// Reuse a single PrismaClient instance across hot reloads in dev so we
// don't exhaust database connections.
const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

module.exports = { prisma };
