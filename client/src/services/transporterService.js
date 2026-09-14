import api from './api'

export const transporterService = {
  getTransporters: (params = {}) => api.get('/transporters', { params }),
  createTransporter: (data) => api.post('/transporters', data),
  updateTransporter: (transporterId, updates) => api.put(`/transporters/${transporterId}`, updates),
  approveTransporter: (transporterId) => api.put(`/transporters/${transporterId}/approve`),
  deleteTransporter: (transporterId) => api.delete(`/transporters/${transporterId}`)
}
