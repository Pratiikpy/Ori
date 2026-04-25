import { API_URL } from './chain-config'

export type TrustBreakdown = {
  accountAge: { days: number; weight: number; points: number }
  paymentsSent: { value: number; weight: number; points: number }
  tipsGiven: { value: number; weight: number; points: number }
  tipsReceived: { value: number; weight: number; points: number }
  followersCount: { value: number; weight: number; points: number }
  badges: { value: number; weight: number; points: number }
}

export type TrustScore = {
  address: string
  score: number
  maxScore: number
  grade: string
  breakdown: TrustBreakdown
  explain: Record<string, string>
}

export async function fetchTrustScore(address: string): Promise<TrustScore> {
  const res = await fetch(
    `${API_URL}/v1/profiles/${encodeURIComponent(address)}/trust-score`,
  )
  if (!res.ok) throw new Error(`trust-score failed: ${res.status}`)
  return (await res.json()) as TrustScore
}
