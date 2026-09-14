import api from './api'

export const invoiceService = {
  getInvoices: (filters = {}) => api.get('/invoices', { params: filters }),
  getInvoiceById: (invoiceId) => api.get(`/invoices/${invoiceId}`),
  downloadUrl: (invoiceId) => `${api.defaults.baseURL}/invoices/${invoiceId}/download`
}
