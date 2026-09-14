import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true
})

let isRefreshing = false
let pendingQueue = []

function flushQueue(error) {
  pendingQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve()))
  pendingQueue = []
}

// Auth uses HTTP-only cookies (set by the backend), so the browser attaches
// tokens automatically - no Authorization header wiring needed here. On a 401
// we try /auth/refresh once (which rotates the cookie) and replay the request.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status
    const isAuthRoute = originalRequest?.url?.includes('/auth/')

    if (status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject })
        }).then(() => api(originalRequest))
      }

      isRefreshing = true
      try {
        await api.post('/auth/refresh')
        flushQueue(null)
        return api(originalRequest)
      } catch (refreshError) {
        flushQueue(refreshError)
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
