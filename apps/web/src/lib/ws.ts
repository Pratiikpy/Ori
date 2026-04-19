'use client'

import { io, type Socket } from 'socket.io-client'
import { WS_URL } from './chain-config'
import { getSessionToken } from './api'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (socket) return socket

  socket = io(WS_URL, {
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  })

  socket.on('connect', () => {
    const token = getSessionToken()
    if (token) socket!.emit('auth', { token })
  })

  return socket
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
