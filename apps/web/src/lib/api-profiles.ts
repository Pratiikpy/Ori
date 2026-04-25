import { API_URL } from './chain-config'

export type ProfileLink = { label: string; url: string }

export type Profile = {
  address: string
  initName: string | null
  bio: string
  avatarUrl: string
  links: ProfileLink[]
  hideBalance: boolean
  hideActivity: boolean
  whitelistOnly: boolean
}

export async function fetchProfile(address: string): Promise<Profile> {
  const res = await fetch(
    `${API_URL}/v1/profiles/${encodeURIComponent(address)}`,
  )
  if (!res.ok) throw new Error(`profile failed: ${res.status}`)
  return (await res.json()) as Profile
}

export type Badge = {
  badgeType: string
  level: number
  metadataUri: string
  mintedAt: string
}

export async function fetchBadges(address: string): Promise<Badge[]> {
  const res = await fetch(
    `${API_URL}/v1/profiles/${encodeURIComponent(address)}/badges`,
  )
  if (!res.ok) throw new Error(`badges failed: ${res.status}`)
  const body = (await res.json()) as { badges: Badge[] }
  return body.badges ?? []
}
