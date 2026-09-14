const express = require('express');
const auditLogController = require('../controllers/auditLogController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

const router = express.Router();

router.use(requireAuth);

router.get('/trip/:tripId', auditLogController.getTripAuditTrail);
router.get('/', requireRole(ROLES.SUPER_ADMIN), auditLogController.listAuditLogs);

module.exports = router;
