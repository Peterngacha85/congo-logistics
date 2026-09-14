import { createContext, useCallback, useEffect, useState } from 'react'
import { authService } from '../services/authService'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadCurrentUser = useCallback(async () => {
    try {
      const { data } = await authService.me()
      setUser(data.user)
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCurrentUser()
  }, [loadCurrentUser])

  const login = async (email, password, rememberMe, asAdmin = false) => {
    setError(null)
    try {
      const { data } = await (asAdmin
        ? authService.loginAdmin(email, password, rememberMe)
        : authService.loginManager(email, password, rememberMe))
      setUser(data.user)
      return data.user
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Login failed'
      setError(message)
      throw err
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
    } finally {
      setUser(null)
    }
  }

  const clearError = () => setError(null)

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        logout,
        clearError,
        refreshUser: loadCurrentUser
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
