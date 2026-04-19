/**
 * Sponsored-onboarding service.
 *
 * Two flows, same signer + same guard rails:
 *   1. seedPayment(to)           — send SPONSOR_SEED_AMOUNT_UMIN INIT to a new
 *                                  user so their first send isn't blocked by
 *                                  "fund your wallet from a faucet".
 *   2. sponsorUsername(to, name) — TODO when the usernames module's register
 *                                  entry function is callable from a 3rd-party
 *                                  signer. The budget-ledger scaffolding is
 *                                  here so we only have to swap the inner tx.
 *
 * Safety rails (all three required):
 *   - SPONSOR_ENABLED flag — mainnet launch toggles this off if the signer
 *     balance isn't topped up.
 *   - Per-IP cooldown (Redis TTL key) — blocks drain attacks via loop signups.
 *   - Daily budget (Redis INCRBY with expiry) — hard cap on spend per UTC day.
 */
import { getMoveSigner } from './moveSigner.js'
import { config } from '../config.js'
import { redis } from '../lib/redis.js'

const BUDGET_KEY_PREFIX = 'sponsor:budget:' // + YYYY-MM-DD
const IP_KEY_PREFIX = 'sponsor:ip:' // + ip
const DENOM = process.env.ISSUER_GAS_DENOM ?? 'umin'

export type SponsorDecision =
  | { ok: true }
  | { ok: false; reason: 'disabled' | 'cooldown' | 'budget_exhausted' | 'invalid_address' }

function utcDate(): string {
  return new Date().toISOString().slice(0, 10)
}

async function checkCooldown(ip: string): Promise<boolean> {
  const key = IP_KEY_PREFIX + ip
  const existed = await redis.get(key)
  return !existed
}

async function markCooldown(ip: string): Promise<void> {
  const key = IP_KEY_PREFIX + ip
  const ttl = config.SPONSOR_PER_IP_COOLDOWN_HOURS * 3600
  await redis.set(key, '1', 'EX', ttl)
}

async function reserveBudget(amountUmin: number): Promise<boolean> {
  // INCRBY-then-check is atomic on a single Redis instance; if the new total
  // exceeds the cap we refund with DECRBY and refuse. Works under concurrent
  // calls without a Lua script because Redis serialises commands.
  const key = BUDGET_KEY_PREFIX + utcDate()
  const newTotal = await redis.incrby(key, amountUmin)
  if (newTotal === amountUmin) {
    // First tick of the day — set expiry to ~36h so we cover DST edges.
    await redis.expire(key, 36 * 3600)
  }
  if (newTotal > config.SPONSOR_DAILY_BUDGET_UMIN) {
    await redis.decrby(key, amountUmin)
    return false
  }
  return true
}

function isInitAddress(addr: string): boolean {
  return /^init1[a-z0-9]{38,}$/i.test(addr)
}

export async function seedPayment(
  to: string,
  ip: string,
): Promise<{ decision: SponsorDecision; txHash?: string }> {
  if (!config.SPONSOR_ENABLED) return { decision: { ok: false, reason: 'disabled' } }
  if (!isInitAddress(to)) return { decision: { ok: false, reason: 'invalid_address' } }

  if (!(await checkCooldown(ip))) return { decision: { ok: false, reason: 'cooldown' } }

  const amount = config.SPONSOR_SEED_AMOUNT_UMIN
  if (amount === 0) return { decision: { ok: true } } // configured off — no-op OK
  if (!(await reserveBudget(amount))) {
    return { decision: { ok: false, reason: 'budget_exhausted' } }
  }

  try {
    const { address, client } = await getMoveSigner()
    // SigningStargateClient.sendTokens wraps a bank MsgSend with the gas
    // price we configured at construction — no MsgSend import needed.
    const res = await client.sendTokens(
      address,
      to,
      [{ denom: DENOM, amount: amount.toString() }],
      'auto',
    )
    if (res.code !== 0) throw new Error(`code=${res.code} ${res.rawLog}`)
    await markCooldown(ip)
    return { decision: { ok: true }, txHash: res.transactionHash }
  } catch (e) {
    // Refund the reserved budget — the tx never landed so nothing was spent.
    const key = BUDGET_KEY_PREFIX + utcDate()
    await redis.decrby(key, amount)
    throw e
  }
}

/**
 * Sponsored `.init` registration. The Initia L1 usernames module is called
 * from the backend signer; the user never pays the on-chain fee. Same budget
 * + cooldown rails as `seedPayment`, different cost envelope.
 *
 * Note: for testnet this is straightforward because the usernames module
 * accepts a 3rd-party `register_for(beneficiary, name)` path. For mainnet
 * launch we revisit — if only self-register exists, swap to a "pay the user's
 * registration fee into their wallet then they call register" pattern. The
 * service contract here stays stable either way.
 */
export async function sponsorUsername(
  beneficiary: string,
  name: string,
  ip: string,
): Promise<{ decision: SponsorDecision; txHash?: string }> {
  if (!config.SPONSOR_ENABLED) return { decision: { ok: false, reason: 'disabled' } }
  if (!isInitAddress(beneficiary)) return { decision: { ok: false, reason: 'invalid_address' } }
  if (!/^[a-z0-9_-]{3,24}$/i.test(name)) return { decision: { ok: false, reason: 'invalid_address' } }

  if (!(await checkCooldown(ip))) return { decision: { ok: false, reason: 'cooldown' } }

  const amount = config.SPONSOR_USERNAME_FEE_UMIN
  if (!(await reserveBudget(amount))) {
    return { decision: { ok: false, reason: 'budget_exhausted' } }
  }

  // The cheapest reliable implementation: pay the registration fee into the
  // user's wallet as a plain bank transfer, then the frontend immediately
  // calls the usernames module with the now-funded wallet. This sidesteps
  // the 3rd-party-register unknown entirely — we're just a faucet for the
  // exact fee amount, no more.
  try {
    const { address, client } = await getMoveSigner()
    const res = await client.sendTokens(
      address,
      beneficiary,
      [{ denom: DENOM, amount: amount.toString() }],
      'auto',
    )
    if (res.code !== 0) throw new Error(`code=${res.code} ${res.rawLog}`)
    await markCooldown(ip)
    return { decision: { ok: true }, txHash: res.transactionHash }
  } catch (e) {
    const key = BUDGET_KEY_PREFIX + utcDate()
    await redis.decrby(key, amount)
    throw e
  }
}
