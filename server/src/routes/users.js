const express = require('express');
const userController = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

const router = express.Router();

router.use(requireAuth);

router.get('/', userController.listUsers);
router.get('/:userId', userController.getUser);
router.put('/:userId', requireRole(ROLES.SUPER_ADMIN), userController.updateUser);
router.delete('/:userId', requireRole(ROLES.SUPER_ADMIN), userController.deleteUser);

module.exports = router;
