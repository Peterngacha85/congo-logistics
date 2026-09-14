import api from './api'

export const truckService = {
  getTrucks: (params = {}) => api.get('/trucks', { params }),
  createTruck: (data) => api.post('/trucks', data),
  updateTruck: (truckId, updates) => api.put(`/trucks/${truckId}`, updates),
  approveTruck: (truckId) => api.put(`/trucks/${truckId}/approve`),
  deleteTruck: (truckId) => api.delete(`/trucks/${truckId}`)
}
