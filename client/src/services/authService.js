import api from './api'

export const authService = {
  loginManager: (email, password, rememberMe = false) =>
    api.post('/auth/login', { email, password, rememberMe }),

  loginAdmin: (email, password, rememberMe = false) =>
    api.post('/admin/auth/login', { email, password, rememberMe }),

  logout: () => api.post('/auth/logout'),

  me: () => api.get('/auth/me'),

  changePassword: (currentPassword, newPassword, confirmPassword) =>
    api.put('/auth/change-password', { currentPassword, newPassword, confirmPassword }),

  registerManager: (data) => api.post('/auth/register', data),

  signup: (data) => api.post('/auth/signup', data),

  resetPassword: (userId, newPassword) => api.post('/auth/reset-password', { userId, newPassword })
}
