import api from './api'

export const reportService = {
  getBranchSummary: (branchId, dateFrom, dateTo) =>
    api.get('/reports/branch-summary', { params: { branchId, dateFrom, dateTo } }),

  getCompanyOverview: (dateFrom, dateTo) =>
    api.get('/reports/company-overview', { params: { dateFrom, dateTo } }),

  getOutstandingInvoices: (params = {}) => api.get('/reports/outstanding-invoices', { params }),

  exportReportCSV: async (reportType, params) => {
    const url = reportType === 'company' ? '/reports/company-overview' : '/reports/branch-summary'
    const response = await api.get(url, { params: { ...params, format: 'csv' }, responseType: 'blob' })
    const blobUrl = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = blobUrl
    link.setAttribute('download', `report-${params.dateFrom}-${params.dateTo}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(blobUrl)
  }
}
