const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const reportService = require('../services/reportService');
const { ROLES } = require('../config/constants');

// GET /reports/branch-summary
const branchSummary = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, format } = req.query;
  let branchId = req.query.branchId;

  if (req.user.role === ROLES.BRANCH_MANAGER) {
    branchId = req.user.branchId;
  } else if (!branchId) {
    throw ApiError.badRequest('MISSING_BRANCH', 'branchId is required');
  }

  if (!dateFrom || !dateTo) {
    throw ApiError.badRequest('MISSING_DATE_RANGE', 'dateFrom and dateTo are required');
  }

  const data = await reportService.getBranchSummary(branchId, dateFrom, dateTo);

  if (format === 'csv') {
    const rows = data.topTransporters.map((t) => ({
      transporter: t.name,
      trips: t.trips,
      revenue: t.revenue
    }));
    const csv = reportService.toCsv(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Report_${data.branch?.branchName || 'branch'}_${dateFrom}_${dateTo}.csv"`
    );
    return res.send(csv);
  }

  res.json({ success: true, data });
});

// GET /reports/company-overview (Super Admin only)
const companyOverview = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, format } = req.query;
  if (!dateFrom || !dateTo) {
    throw ApiError.badRequest('MISSING_DATE_RANGE', 'dateFrom and dateTo are required');
  }

  const data = await reportService.getCompanyOverview(dateFrom, dateTo);

  if (format === 'csv') {
    const csv = reportService.toCsv(data.branchBreakdown);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="Report_Company_${dateFrom}_${dateTo}.csv"`);
    return res.send(csv);
  }

  res.json({ success: true, data });
});

// GET /reports/outstanding-invoices
const outstandingInvoices = asyncHandler(async (req, res) => {
  let branchId = req.query.branchId;
  if (req.user.role === ROLES.BRANCH_MANAGER) {
    branchId = req.user.branchId;
  }

  const result = await reportService.getOutstandingInvoices({
    branchId,
    transporterId: req.query.transporterId,
    overdueOnly: req.query.overdueOnly === 'true'
  });

  res.json({ success: true, ...result });
});

module.exports = { branchSummary, companyOverview, outstandingInvoices };
