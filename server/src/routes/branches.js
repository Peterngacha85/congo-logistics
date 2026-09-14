const express = require('express');
const branchController = require('../controllers/branchController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

const router = express.Router();

router.use(requireAuth);

router.get('/', branchController.listBranches);
router.get('/:branchId', branchController.getBranch);
router.post('/', requireRole(ROLES.SUPER_ADMIN), branchController.createBranch);
router.put('/:branchId', branchController.updateBranch);

module.exports = router;
