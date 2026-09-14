const express = require('express');
const transporterController = require('../controllers/transporterController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

const router = express.Router();

router.use(requireAuth);

router.get('/', transporterController.listTransporters);
router.post('/', transporterController.createTransporter);
router.put('/:transporterId', requireRole(ROLES.SUPER_ADMIN), transporterController.updateTransporter);
router.put('/:transporterId/approve', requireRole(ROLES.SUPER_ADMIN), transporterController.approveTransporter);
router.delete('/:transporterId', requireRole(ROLES.SUPER_ADMIN), transporterController.deleteTransporter);

module.exports = router;
