import api from './api'

export const branchService = {
  getBranches: () => api.get('/branches'),
  getBranchById: (branchId) => api.get(`/branches/${branchId}`),
  createBranch: (data) => api.post('/branches', data),
  updateBranch: (branchId, updates) => api.put(`/branches/${branchId}`, updates),
  deleteBranch: (branchId) => api.delete(`/branches/${branchId}`)
}
