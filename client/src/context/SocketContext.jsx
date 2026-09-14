import { createContext, useEffect, useState } from 'react'
import { connectSocket, disconnectSocket } from '../services/socket'
import { useAuth } from '../hooks/useAuth'

export const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket()
      setSocket(null)
      return
    }

    const instance = connectSocket()
    setSocket(instance)

    return () => {
      disconnectSocket()
    }
  }, [isAuthenticated])

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
}
