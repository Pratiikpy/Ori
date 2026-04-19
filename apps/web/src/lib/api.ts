/**
 * Thin client over the Ori API. All requests use fetch with the stored session
 * token as Bearer auth when available.
 */
import { API_URL } from './chain-config'

const TOKEN_KEY = 'ori.session_token'

export function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setSessionToken(token: string): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(TOKEN_KEY, token)
  }
}

export function clearSessionToken(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(TOKEN_KEY)
  }
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getSessionToken()
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers })
  if (!res.ok) {
    let code = 'UNKNOWN'
    let message = res.statusText
    try {
      const body = (await res.json()) as { error?: string; message?: string }
      code = body.error ?? code
      message = body.message ?? message
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, code, message)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

// ========== Auth ==========

export type AuthedUser = {
  id: string
  initiaAddress: string
  hexAddress: string
  initName: string | null
}

export type Challenge = {
  nonce: string
  challenge: string
  expiresAt: string
}

export async function requestChallenge(initiaAddress: string): Promise<Challenge> {
  return request('/v1/auth/challenge', {
    method: 'POST',
    body: JSON.stringify({ initiaAddress }),
  })
}

export type VerifyInput = {
  initiaAddress: string
  hexAddress: string
  nonce: string
  signature: string
}

export type Session = {
  token: string
  expiresAt: string
  user: AuthedUser
}

export async function verifyChallenge(input: VerifyInput): Promise<Session> {
  return request<Session>('/v1/auth/verify', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function getCurrentUser(): Promise<AuthedUser> {
  const { user } = await request<{ user: AuthedUser }>('/v1/auth/me')
  return user
}

export async function logout(): Promise<void> {
  try {
    await request('/v1/auth/logout', { method: 'POST' })
  } finally {
    clearSessionToken()
  }
}

// ========== Messages ==========

export type StoredMessage = {
  id: string
  chatId: string
  senderId: string
  recipientId: string
  senderInitiaAddress: string
  recipientInitiaAddress: string
  ciphertextBase64: string
  senderCiphertextBase64: string | null
  senderSignatureBase64: string
  createdAt: string
  deliveredAt: string | null
  readAt: string | null
}

export async function postMessage(input: {
  chatId: string
  recipientInitiaAddress: string
  ciphertextBase64: string
  senderCiphertextBase64?: string
  senderSignatureBase64: string
  expiresInHours?: number
}): Promise<{ id: string; chatId: string; createdAt: string }> {
  return request('/v1/messages', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function fetchMessages(
  chatId: string,
  params?: { before?: string; limit?: number },
): Promise<{ messages: StoredMessage[] }> {
  const qs = new URLSearchParams()
  if (params?.before) qs.set('before', params.before)
  if (params?.limit) qs.set('limit', String(params.limit))
  const query = qs.toString() ? `?${qs.toString()}` : ''
  return request(`/v1/messages/${encodeURIComponent(chatId)}${query}`)
}

export async function markMessageRead(id: string): Promise<void> {
  await request(`/v1/messages/${encodeURIComponent(id)}/read`, { method: 'POST' })
}

// ========== Payment links ==========

export async function createPaymentLink(input: {
  amount: string
  denom: string
  theme: number
  message: string
  secretHashHex: string
  onChainGiftId?: string
}): Promise<{ shortCode: string; expiresAt: string }> {
  return request('/v1/links', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export type LinkPreview = {
  shortCode: string
  amount: string
  denom: string
  theme: number
  message: string
  claimed: boolean
  expiresAt: string
  creator: { initiaAddress: string; initName: string | null }
  onChainGiftId: string | null
}

export async function getLinkPreview(shortCode: string): Promise<LinkPreview> {
  return request(`/v1/links/${encodeURIComponent(shortCode)}`)
}

export async function markLinkClaimed(
  shortCode: string,
  claimedByAddress: string,
): Promise<{ ok: true }> {
  return request(`/v1/links/${encodeURIComponent(shortCode)}/mark-claimed`, {
    method: 'POST',
    body: JSON.stringify({ claimedByAddress }),
  })
}

// ========== Profile ==========

export type ProfileData = {
  address: string
  initName: string | null
  bio: string
  avatarUrl: string
  links: Array<{ label: string; url: string }>
  hideBalance: boolean
  hideActivity: boolean
  whitelistOnly: boolean
}

export async function getProfile(address: string): Promise<ProfileData> {
  return request(`/v1/profiles/${encodeURIComponent(address)}`)
}

export type BadgeRecord = {
  badgeType: number
  level: number
  metadataUri: string
  mintedAt: string
}

export async function getBadges(address: string): Promise<BadgeRecord[]> {
  const res = await request<{ badges: BadgeRecord[] }>(
    `/v1/profiles/${encodeURIComponent(address)}/badges`,
  )
  return res.badges
}

export async function publishEncryptionPubkey(pubkeyBase64: string): Promise<void> {
  await request('/v1/profiles/encryption-pubkey', {
    method: 'POST',
    body: JSON.stringify({ pubkeyBase64 }),
  })
}

// ========== Follow graph ==========

export type FollowStats = { address: string; followers: number; following: number }
export type FollowEntry = { address: string; followedAt: string }
export type FollowListPage = { address: string; entries: FollowEntry[]; nextCursor: string | null }

export async function getFollowStats(address: string): Promise<FollowStats> {
  return request(`/v1/profiles/${encodeURIComponent(address)}/follow-stats`)
}

export async function getFollowers(
  address: string,
  params?: { cursor?: string; limit?: number },
): Promise<FollowListPage> {
  const qs = new URLSearchParams()
  if (params?.cursor) qs.set('cursor', params.cursor)
  if (params?.limit) qs.set('limit', String(params.limit))
  const query = qs.toString() ? `?${qs.toString()}` : ''
  return request(`/v1/profiles/${encodeURIComponent(address)}/followers${query}`)
}

export async function getFollowing(
  address: string,
  params?: { cursor?: string; limit?: number },
): Promise<FollowListPage> {
  const qs = new URLSearchParams()
  if (params?.cursor) qs.set('cursor', params.cursor)
  if (params?.limit) qs.set('limit', String(params.limit))
  const query = qs.toString() ? `?${qs.toString()}` : ''
  return request(`/v1/profiles/${encodeURIComponent(address)}/following${query}`)
}

export async function checkFollowing(from: string, to: string): Promise<boolean> {
  const res = await request<{ following: boolean }>(
    `/v1/follows/check?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  )
  return res.following
}

// ========== Leaderboards ==========

export type LeaderboardEntry = {
  rank: number
  address: string
  initName: string | null
  avatarUrl: string
  tipsReceived?: number
  tipsReceivedVolume?: string
  tipsGiven?: number
  tipsGivenVolume?: string
  tipCount?: number
  volume?: string
}

export async function getTopCreators(limit = 10): Promise<LeaderboardEntry[]> {
  const r = await request<{ entries: LeaderboardEntry[] }>(
    `/v1/leaderboards/top-creators?limit=${limit}`,
  )
  return r.entries
}

export async function getTopTippers(limit = 10): Promise<LeaderboardEntry[]> {
  const r = await request<{ entries: LeaderboardEntry[] }>(
    `/v1/leaderboards/top-tippers?limit=${limit}`,
  )
  return r.entries
}

export async function getCreatorTopTippers(
  creator: string,
  limit = 5,
): Promise<LeaderboardEntry[]> {
  const r = await request<{ entries: LeaderboardEntry[] }>(
    `/v1/profiles/${encodeURIComponent(creator)}/top-tippers?limit=${limit}`,
  )
  return r.entries
}

// ========== Discover ==========

export type DiscoverEntry = {
  address: string
  initName: string | null
  bio: string
  avatarUrl: string
  lastActiveAt?: string
  tipsReceived?: number
  tipsReceivedVolume?: string
  paymentsReceived24h?: number
}

export async function getDiscoverRecent(limit = 20): Promise<DiscoverEntry[]> {
  const r = await request<{ entries: DiscoverEntry[] }>(`/v1/discover/recent?limit=${limit}`)
  return r.entries
}

export async function getDiscoverTopCreators(limit = 20): Promise<DiscoverEntry[]> {
  const r = await request<{ entries: DiscoverEntry[] }>(`/v1/discover/top-creators?limit=${limit}`)
  return r.entries
}

export async function getDiscoverRising(limit = 20): Promise<DiscoverEntry[]> {
  const r = await request<{ entries: DiscoverEntry[] }>(`/v1/discover/rising?limit=${limit}`)
  return r.entries
}

// ========== Activity ==========

export type ActivityEntry =
  | {
      kind: 'tip'
      id: string
      direction: 'given' | 'received'
      counterparty: string
      amount: string
      denom: string
      message: string
      at: string
    }
  | {
      kind: 'payment'
      id: string
      direction: 'sent' | 'received'
      counterparty: string
      amount: string
      denom: string
      memo: string
      at: string
    }
  | {
      kind: 'follow'
      id: string
      direction: 'started_following' | 'new_follower'
      counterparty: string
      at: string
    }

export async function getActivityFeed(
  address: string,
  params?: { cursor?: string; limit?: number },
): Promise<{ entries: ActivityEntry[]; nextCursor: string | null }> {
  const qs = new URLSearchParams()
  if (params?.cursor) qs.set('cursor', params.cursor)
  if (params?.limit) qs.set('limit', String(params.limit))
  const query = qs.toString() ? `?${qs.toString()}` : ''
  return request(`/v1/profiles/${encodeURIComponent(address)}/activity${query}`)
}

// ========== Trust score ==========

export type TrustBreakdownEntry = { weight: number; points: number; value?: number; days?: number }
export type TrustScore = {
  address: string
  score: number
  maxScore: number
  grade: string
  breakdown: Record<string, TrustBreakdownEntry>
  explain: Record<string, string>
}

export async function getTrustScore(address: string): Promise<TrustScore> {
  return request(`/v1/profiles/${encodeURIComponent(address)}/trust-score`)
}

// ========== Quests ==========

export type Quest = {
  id: string
  title: string
  description: string
  icon: string
  threshold: number
  progress: number
  completed: boolean
  xp: number
  awarded: boolean
}
export type QuestsResponse = {
  address: string
  totalXp: number
  maxXp: number
  level: number
  entries: Quest[]
}

export async function getQuests(address: string): Promise<QuestsResponse> {
  return request(`/v1/profiles/${encodeURIComponent(address)}/quests`)
}

// ========== Portfolio ==========

export type PortfolioResponse = {
  address: string
  initName: string | null
  avatarUrl: string
  stats: {
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
  recent: {
    tipsReceived: Array<{ from: string; amount: string; denom: string; message: string; at: string }>
    paymentsReceived: Array<{ from: string; amount: string; denom: string; memo: string; at: string }>
  }
}

export async function getPortfolio(address: string): Promise<PortfolioResponse> {
  return request(`/v1/profiles/${encodeURIComponent(address)}/portfolio`)
}

// ========== Sponsored onboarding ==========

export type SponsorStatus = {
  enabled: boolean
  seedAmountUmin: number
  usernameFeeUmin: number
}

export async function getSponsorStatus(): Promise<SponsorStatus> {
  return request('/v1/sponsor/status')
}

export async function claimSeedPayment(
  address: string,
): Promise<{ ok: true; txHash: string | null }> {
  return request('/v1/sponsor/seed', {
    method: 'POST',
    body: JSON.stringify({ address }),
  })
}

export async function claimUsernameSponsorship(
  address: string,
  name: string,
): Promise<{ ok: true; txHash: string | null }> {
  return request('/v1/sponsor/username', {
    method: 'POST',
    body: JSON.stringify({ address, name }),
  })
}

// ========== Connect oracle (proxied to avoid CORS from rollup REST) ==========

export type OraclePrice = {
  pair: string
  price: string        // raw integer, scaled by `decimals`
  decimals: number
  blockTimestamp: string | null
  blockHeight: string | null
  nonce: string | null
  id: string | null
}

export async function getOraclePrice(pair: string): Promise<OraclePrice> {
  return request(`/v1/oracle/price?pair=${encodeURIComponent(pair)}`)
}

export async function getOracleTickers(): Promise<{ tickers: string[]; updated: string }> {
  return request('/v1/oracle/tickers')
}

// ========== Weekly agent stats (for Today tab) ==========

export type WeeklyStats = {
  address: string
  windowDays: number
  since: string
  agentSpend: { totalBaseUnits: string; txCount: number }
  tipsGiven: { totalBaseUnits: string; count: number }
  tipsReceived: { totalBaseUnits: string; count: number }
  paymentsInCount: number
  topCreator: { address: string; displayName: string } | null
  predictionResults: { wins: number; losses: number; pendingMarkets: number }
}

export async function getWeeklyStats(address: string): Promise<WeeklyStats> {
  return request(`/v1/profiles/${encodeURIComponent(address)}/weekly-stats`)
}

// ========== Agent action log ==========

export type AgentActionEntry = {
  id: string
  ownerAddr: string
  agentAddr: string
  toolName: string
  args: unknown
  promptHash: string | null
  txHash: string | null
  result: unknown
  status: 'pending' | 'success' | 'failed'
  errorMsg: string | null
  createdAt: string
  settledAt: string | null
}

export type AgentActionsPage = {
  agentAddr?: string
  ownerAddr?: string
  entries: AgentActionEntry[]
  nextCursor: string | null
}

export async function getAgentActions(
  signer: string,
  params: { cursor?: string; limit?: number } = {},
): Promise<AgentActionsPage> {
  const qs = new URLSearchParams()
  if (params.cursor) qs.set('cursor', params.cursor)
  if (params.limit) qs.set('limit', String(params.limit))
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return request(`/v1/agent/${encodeURIComponent(signer)}/actions${suffix}`)
}

export async function getUserAgentActions(
  owner: string,
  params: { cursor?: string; limit?: number } = {},
): Promise<AgentActionsPage> {
  const qs = new URLSearchParams()
  if (params.cursor) qs.set('cursor', params.cursor)
  if (params.limit) qs.set('limit', String(params.limit))
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return request(`/v1/agent/user/${encodeURIComponent(owner)}/actions${suffix}`)
}

// ========== Agent policy (on-chain view) ==========

import {
  RESTClient as InitiaRestClient,
  bcs as initiaBcs,
} from '@initia/initia.js'
import { ORI_REST_URL, ORI_CHAIN_ID, ORI_MODULE_ADDRESS } from './chain-config'

export type AgentPolicyView = {
  owner: string
  agent: string
  dailyCap: string
  spentToday: string
  windowStart: number
  active: boolean
  createdAt: number
  lastSpendAt: number
}

/**
 * Read an on-chain agent policy. Returns null if none exists (uses a
 * policy_exists view to avoid a view-fn abort on missing records).
 */
export async function getAgentPolicy(
  owner: string,
  agent: string,
): Promise<AgentPolicyView | null> {
  const rest = new InitiaRestClient(ORI_REST_URL, { chainId: ORI_CHAIN_ID })
  const existsRes = await rest.move.view(
    ORI_MODULE_ADDRESS,
    'agent_policy',
    'policy_exists',
    [],
    [
      initiaBcs.address().serialize(owner).toBase64(),
      initiaBcs.address().serialize(agent).toBase64(),
    ],
  )
  const exists = typeof existsRes.data === 'string'
    ? JSON.parse(existsRes.data) === true
    : existsRes.data === true
  if (!exists) return null

  const res = await rest.move.view(
    ORI_MODULE_ADDRESS,
    'agent_policy',
    'get_policy',
    [],
    [
      initiaBcs.address().serialize(owner).toBase64(),
      initiaBcs.address().serialize(agent).toBase64(),
    ],
  )
  const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
  return {
    owner: String(data.owner),
    agent: String(data.agent),
    dailyCap: String(data.daily_cap),
    spentToday: String(data.spent_today),
    windowStart: Number(data.window_start),
    active: Boolean(data.active),
    createdAt: Number(data.created_at),
    lastSpendAt: Number(data.last_spend_at),
  }
}

