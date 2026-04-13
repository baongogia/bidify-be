const express = require('express');
const router = express.Router();
const sellerApplicationController = require('../controllers/sellerApplicationController');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

// User routes (authenticated)
router.post('/', authenticateToken, sellerApplicationController.submitApplication);
router.get('/me', authenticateToken, sellerApplicationController.getMyApplication);

// Admin routes
router.get('/admin/all', authenticateToken, requireAdmin, sellerApplicationController.getAllApplications);
router.put('/admin/:id/approve', authenticateToken, requireAdmin, sellerApplicationController.approveApplication);
router.put('/admin/:id/reject', authenticateToken, requireAdmin, sellerApplicationController.rejectApplication);

module.exports = router;
