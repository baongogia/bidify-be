const express = require('express');
const router = express.Router();
const notifController = require('../controllers/notificationController');
const { authenticateToken } = require('../middlewares/auth');

router.get('/', authenticateToken, notifController.getMyNotifications);
router.patch('/:id/read', authenticateToken, notifController.markRead);

module.exports = router;
