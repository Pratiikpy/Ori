'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchChats } from '@/lib/api-chats'
import {
  fetchMessages,
  postMessage,
  markMessageRead,
  type SendMessageInput,
} from '@/lib/api-messages'
import { WS_URL } from '@/lib/chain-config'

// On Vercel WS_URL is empty (no Socket.IO host on the catchall route), so
// we fall back to React-Query polling. Real Socket.IO deploys can leave the
// poll interval as a safety net or override to a longer cadence.
const WS_ENABLED = WS_URL.length > 0
const CHATS_POLL_MS = WS_ENABLED ? false : 15_000
const MESSAGES_POLL_MS = WS_ENABLED ? false : 5_000

export function useChats() {
  return useQuery({
    queryKey: ['chats'],
    queryFn: fetchChats,
    staleTime: 10_000,
    refetchInterval: CHATS_POLL_MS,
    refetchIntervalInBackground: false,
  })
}

export function useChatMessages(chatId: string | null | undefined) {
  return useQuery({
    queryKey: ['messages', chatId],
    queryFn: () => fetchMessages(chatId!),
    enabled: Boolean(chatId),
    staleTime: 5_000,
    refetchInterval: chatId ? MESSAGES_POLL_MS : false,
    refetchIntervalInBackground: false,
  })
}

export function useSendMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SendMessageInput) => postMessage(input),
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ['messages', input.chatId] })
      qc.invalidateQueries({ queryKey: ['chats'] })
    },
  })
}

export function useMarkMessageRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (messageId: string) => markMessageRead(messageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chats'] })
    },
  })
}
