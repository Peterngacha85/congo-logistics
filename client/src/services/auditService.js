import api from './api'

export const auditService = {
  getTripAuditTrail: (tripId, params = {}) => api.get(`/auditlogs/trip/${tripId}`, { params }),
  getAllAuditLogs: (params = {}) => api.get('/auditlogs', { params })
}
