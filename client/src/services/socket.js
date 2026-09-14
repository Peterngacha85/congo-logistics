import { io } from 'socket.io-client'

// VITE_API_URL is like http://localhost:5000/api/v1 - the socket server lives
// at the bare origin, not under /api/v1.
const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/api\/v1\/?$/, '')

let socket = null

// Lazily creates a single shared socket, authenticated via the same
// HTTP-only cookie the REST API uses (see server/src/config/socket.js).
// Call connectSocket() once the user is known to be authenticated.
export function connectSocket() {
  if (socket?.connected) return socket

  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: false
    })
  }

  socket.connect()
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
}

export function getSocket() {
  return socket
}
