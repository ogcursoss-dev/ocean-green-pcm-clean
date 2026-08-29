import { PrismaClient } from '@prisma/client'

// URL do Supabase HARDCODED — a Z.ai injeta DATABASE_URL no formato JDBC
// (jdbc:postgresql://) que é incompatível com Prisma.
// Forçamos a URL correta do Supabase independente do ambiente.
process.env.DATABASE_URL = 'postgresql://postgres.qqpalstkdwqgarqajozh:Skopek231165@aws-0-sa-east-1.pooler.supabase.com:5432/postgres'
process.env.DIRECT_URL = 'postgresql://postgres.qqpalstkdwqgarqajozh:Skopek231165@aws-0-sa-east-1.pooler.supabase.com:5432/postgres'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
