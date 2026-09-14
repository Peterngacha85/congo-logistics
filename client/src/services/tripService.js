import api from './api'

export const tripService = {
  getTrips: (filters = {}) => api.get('/trips', { params: filters }),
  getTripById: (tripId) => api.get(`/trips/${tripId}`),
  createTrip: (tripData) => api.post('/trips', tripData),
  updateTrip: (tripId, updates) => api.put(`/trips/${tripId}`, updates),
  deleteTrip: (tripId) => api.delete(`/trips/${tripId}`),
  updateStatus: (tripId, status, notes) => api.put(`/trips/${tripId}/status`, { status, notes }),
  approveTrip: (tripId) => api.put(`/trips/${tripId}/approve`),
  markAsPaid: (tripId, paymentData) => api.put(`/trips/${tripId}/mark-paid`, paymentData),
  invoiceDownloadUrl: (tripId) => `${api.defaults.baseURL}/trips/${tripId}/invoice/download`
}
