/**
 * Oracle proxy — wraps the rollup's Connect (Slinky) /oracle/v2 endpoints
 * via our Fastify proxy. 2s Redis cache on the backend; safe to poll here
 * every few seconds.
 */
import { API_URL } from './chain-config'

export type OracleTickers = { tickers: string[]; updated: string }

export type OraclePrice = {
  pair: string
  price: string
  decimals: number
  blockTimestamp: string | null
  blockHeight: string | null
  nonce: string | null
  id: string | null
}

export async function fetchOracleTickers(): Promise<OracleTickers> {
  const res = await fetch(`${API_URL}/v1/oracle/tickers`)
  if (!res.ok) throw new Error(`oracle tickers failed: ${res.status}`)
  return (await res.json()) as OracleTickers
}

export async function fetchOraclePrice(pair: string): Promise<OraclePrice> {
  const res = await fetch(
    `${API_URL}/v1/oracle/price?pair=${encodeURIComponent(pair)}`,
  )
  if (!res.ok) throw new Error(`oracle price ${pair} failed: ${res.status}`)
  return (await res.json()) as OraclePrice
}

/** Convert raw oracle string to a USD-rendered price using the decimals field. */
export function formatOraclePrice(p: OraclePrice): string {
  const num = Number(p.price) / Math.pow(10, p.decimals)
  if (!Number.isFinite(num)) return '$—'
  return `$${num.toLocaleString(undefined, {
    maximumFractionDigits: num > 100 ? 0 : 2,
  })}`
}
