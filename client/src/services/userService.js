import api from './api'

export const userService = {
  getUsers: (params = {}) => api.get('/users', { params }),
  getUserById: (userId) => api.get(`/users/${userId}`),
  updateUser: (userId, updates) => api.put(`/users/${userId}`, updates),
  approveUser: (userId, branchId) => api.put(`/users/${userId}/approve`, { branchId }),
  deleteUser: (userId) => api.delete(`/users/${userId}`)
}
