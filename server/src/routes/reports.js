const express = require('express');
const reportController = require('../controllers/reportController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

const router = express.Router();

router.use(requireAuth);

router.get('/branch-summary', reportController.branchSummary);
router.get('/company-overview', requireRole(ROLES.SUPER_ADMIN), reportController.companyOverview);
router.get('/outstanding-invoices', reportController.outstandingInvoices);

module.exports = router;
