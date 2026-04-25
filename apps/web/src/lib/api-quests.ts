import { API_URL } from './chain-config'

export type QuestEntry = {
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
  entries: QuestEntry[]
}

export async function fetchQuests(address: string): Promise<QuestsResponse> {
  const res = await fetch(
    `${API_URL}/v1/profiles/${encodeURIComponent(address)}/quests`,
  )
  if (!res.ok) throw new Error(`quests failed: ${res.status}`)
  return (await res.json()) as QuestsResponse
}
