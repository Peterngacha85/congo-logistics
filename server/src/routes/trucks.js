const express = require('express');
const truckController = require('../controllers/truckController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

const router = express.Router();

router.use(requireAuth);

router.get('/', truckController.listTrucks);
router.post('/', truckController.createTruck);
router.put('/:truckId', requireRole(ROLES.SUPER_ADMIN), truckController.updateTruck);
router.put('/:truckId/approve', requireRole(ROLES.SUPER_ADMIN), truckController.approveTruck);
router.delete('/:truckId', requireRole(ROLES.SUPER_ADMIN), truckController.deleteTruck);

module.exports = router;
