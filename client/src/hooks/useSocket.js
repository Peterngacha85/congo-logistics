import { useContext, useEffect, useRef } from 'react'
import { SocketContext } from '../context/SocketContext'

export function useSocket() {
  return useContext(SocketContext)
}

// Subscribes to a socket event for the lifetime of the component. Keeps the
// latest `handler` in a ref so callers can pass an inline closure without
// causing a resubscribe (or capturing stale state) on every render.
export function useSocketEvent(event, handler) {
  const socket = useSocket()
  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    if (!socket || !event) return undefined
    const listener = (...args) => handlerRef.current?.(...args)
    socket.on(event, listener)
    return () => socket.off(event, listener)
  }, [socket, event])
}
