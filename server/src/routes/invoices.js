const express = require('express');
const invoiceController = require('../controllers/invoiceController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', invoiceController.listInvoices);
router.get('/:invoiceId', invoiceController.getInvoice);

module.exports = router;
