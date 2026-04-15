const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

router.use(authenticateToken, requireAdmin);

router.get('/users', adminController.getUsers);
router.put('/users/:id/lock', adminController.lockUser);
router.put('/users/:id/unlock', adminController.unlockUser);
router.delete('/users/:id', adminController.deleteUser);
router.get('/users/:id/activity', adminController.getUserActivity);

router.get('/moderation/products', adminController.getModerationProducts);
router.put('/moderation/products/:id/dismiss-review', adminController.dismissReview);
router.put('/moderation/products/:id/approve', adminController.approveProduct);
router.put('/moderation/products/:id/reject', adminController.rejectProduct);
router.put('/moderation/products/:id/request-edit', adminController.requestEditProduct);
router.delete('/moderation/products/:id', adminController.deleteProduct);

router.get('/logs', adminController.getActionLogs);

router.get('/settings', adminController.getSettings);
router.put('/settings/:key', adminController.updateSetting);

module.exports = router;
