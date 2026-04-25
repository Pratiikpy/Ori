import { API_URL } from './chain-config'

export type PortfolioStats = {
  paymentsSent: number
  paymentsReceived: number
  tipsGiven: number
  tipsReceived: number
  tipsGivenVolume: string
  tipsReceivedVolume: string
  giftsSent: number
  giftsClaimed: number
  wagersWon: number
  billsSplit: number
  referrals: number
  followersCount: number
  followingCount: number
  badgeCount: number
  firstSeenAt: string | null
  lastActiveAt: string | null
}

export type PortfolioRecentTip = {
  from: string
  amount: string
  denom: string
  message: string
  at: string
}
export type PortfolioRecentPayment = {
  from: string
  amount: string
  denom: string
  memo: string
  at: string
}

export type Portfolio = {
  address: string
  initName: string | null
  avatarUrl: string
  stats: PortfolioStats
  recent: {
    tipsReceived: PortfolioRecentTip[]
    paymentsReceived: PortfolioRecentPayment[]
  }
}

export async function fetchPortfolio(address: string): Promise<Portfolio> {
  const res = await fetch(
    `${API_URL}/v1/profiles/${encodeURIComponent(address)}/portfolio`,
  )
  if (!res.ok) throw new Error(`portfolio failed: ${res.status}`)
  return (await res.json()) as Portfolio
}
