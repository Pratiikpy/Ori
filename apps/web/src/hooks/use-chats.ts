'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchChats } from '@/lib/api-chats'
import {
  fetchMessages,
  postMessage,
  markMessageRead,
  type SendMessageInput,
} from '@/lib/api-messages'

export function useChats() {
  return useQuery({
    queryKey: ['chats'],
    queryFn: fetchChats,
    staleTime: 10_000,
  })
}

export function useChatMessages(chatId: string | null | undefined) {
  return useQuery({
    queryKey: ['messages', chatId],
    queryFn: () => fetchMessages(chatId!),
    enabled: Boolean(chatId),
    staleTime: 5_000,
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
