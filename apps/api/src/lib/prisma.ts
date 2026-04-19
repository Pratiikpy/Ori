import { PrismaClient } from '@prisma/client'
import { isDev } from '../config.js'

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

export const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    log: isDev ? ['query', 'error', 'warn'] : ['error'],
  })

if (isDev) globalThis.__prisma = prisma
