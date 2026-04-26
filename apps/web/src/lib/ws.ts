'use client'

import { io, type Socket } from 'socket.io-client'
import { WS_URL } from './chain-config'
import { getSessionToken } from './api'

let socket: Socket | null = null

// On Vercel the Fastify server is invoked through the catchall HTTP route
// (apps/web/src/app/api/[...path]/route.ts), which does not host Socket.IO.
// If WS_URL is empty we'd default Socket.IO to window.location.origin and
// reconnect-loop forever against a domain that returns 404 for the upgrade.
// Short-circuit when the deployment hasn't been configured with a real WS
// host so realtime stays disabled cleanly instead of hammering the server.
export function getSocket(): Socket | null {
  if (socket) return socket
  if (!WS_URL || WS_URL.length === 0) return null

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
