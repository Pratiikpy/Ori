/**
 * Ori API Configuration — validated at startup via Zod.
 *
 * Pattern from iUSD Pay's config — fail fast if any required env is missing,
 * so the server never starts in a half-configured state that surfaces later.
 */
import 'dotenv/config'
import { z } from 'zod'

const ConfigSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // CORS origins (comma-separated)
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((s) => s.split(',').map((x) => x.trim())),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // JWT / session secrets
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(720), // 30 days

  // Initia network
  CHAIN_ID: z.string().default('ori-1'),
  ORI_RPC_URL: z.string().url(),
  ORI_REST_URL: z.string().url(),
  ORI_MODULE_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]+$/, 'ORI_MODULE_ADDRESS must be hex'),

  // Initia L1 (for .init username resolution)
  L1_CHAIN_ID: z.string().default('initiation-2'),
  L1_REST_URL: z.string().url(),
  L1_USERNAMES_MODULE: z
    .string()
    .regex(/^0x[a-fA-F0-9]+$/)
    .default('0x42cd8467b1c86e59bf319e5664a09b6b5840bb3fac64f5ce690b5041c530565a'),

  // Web Push (VAPID)
  VAPID_PUBLIC_KEY: z.string().min(1),
  VAPID_PRIVATE_KEY: z.string().min(1),
  VAPID_SUBJECT: z.string().startsWith('mailto:'),

  // Badge issuer (for Achievement SBT minting) — mnemonic is 12/24 BIP-39 words
  BADGE_ISSUER_MNEMONIC: z.string().optional(),

  // Privy-connector compatibility: allow signature-address mismatch in non-prod.
  // iUSD Pay ships this bypass because Privy embedded wallets can sign with
  // a different derivation path than they advertise. Single-use nonces bound
  // to the claimed address preserve safety.
  PRIVY_COMPAT: z
    .enum(['true', 'false'])
    .default('true')
    .transform((s) => s === 'true'),

  // Rate limit tiers
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().positive().default(600),
  RATE_LIMIT_MESSAGES_MAX: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(30),

  // Sponsored onboarding — testnet defaults on, mainnet launch flips SPONSOR_ENABLED=false
  // if you don't want to fund it. Budget is a daily cap measured in base units
  // (umin = 1e-6 INIT). Rate limit is per-IP per-24h.
  SPONSOR_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((s) => s === 'true'),
  SPONSOR_SEED_AMOUNT_UMIN: z.coerce.number().int().nonnegative().default(10_000), // 0.01 INIT
  SPONSOR_USERNAME_FEE_UMIN: z.coerce.number().int().nonnegative().default(500_000), // 0.5 INIT ceiling
  SPONSOR_DAILY_BUDGET_UMIN: z.coerce.number().int().positive().default(5_000_000), // 5 INIT/day cap
  SPONSOR_PER_IP_COOLDOWN_HOURS: z.coerce.number().int().positive().default(24),

  // Observability
  SENTRY_DSN: z.string().optional(),

  // Public base URL -- used for self-referential endpoints like the A2A
  // agent card and webhook receipts. Falls back to http://localhost:PORT
  // when unset so local dev works without extra config.
  PUBLIC_API_URL: z.string().url().optional(),
})

export type Config = z.infer<typeof ConfigSchema>

function loadConfig(): Config {
  const parsed = ConfigSchema.safeParse(process.env)
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('❌ Invalid environment configuration:')
    for (const issue of parsed.error.issues) {
      // eslint-disable-next-line no-console
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
    }
    process.exit(1)
  }
  return parsed.data
}

export const config = loadConfig()

export const isProd = config.NODE_ENV === 'production'
export const isDev = config.NODE_ENV === 'development'
export const isTest = config.NODE_ENV === 'test'
