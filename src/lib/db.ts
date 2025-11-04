import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// For local development, prefer DATABASE_URL (pooled connection on port 6543)
// DIRECT_URL (port 5432) is often not accessible from localhost
// For production, DIRECT_URL can be used if needed, but DATABASE_URL with ?pgbouncer=true works best
const dbUrl = process.env.NODE_ENV === 'development' 
  ? (process.env.DATABASE_URL || process.env.DIRECT_URL)
  : (process.env.DIRECT_URL || process.env.DATABASE_URL)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
