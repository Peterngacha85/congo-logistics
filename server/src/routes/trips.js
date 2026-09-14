const express = require('express');
const tripController = require('../controllers/tripController');
const { requireAuth, requireOwnBranch } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', requireOwnBranch, tripController.listTrips);
router.get('/:tripId', tripController.getTrip);
router.post('/', requireOwnBranch, tripController.createTrip);
router.put('/:tripId', tripController.updateTrip);
router.delete('/:tripId', tripController.deleteTrip);
router.put('/:tripId/status', tripController.updateStatus);
router.put('/:tripId/approve', tripController.approveTrip);
router.get('/:tripId/invoice/download', tripController.downloadInvoice);
router.put('/:tripId/mark-paid', tripController.markAsPaid);

module.exports = router;
