import { PrismaClient } from '@prisma/client';

import path from 'path';

// Singleton pattern — prevents multiple Prisma instances in dev (hot reload)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const dbPath = path.resolve(__dirname, '../../../prisma/dev.db').replace(/\\/g, '/');

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: `file:${dbPath}`,
      },
    },
    log: ['query', 'error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
