const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);

// Expose a route to get current user info using token
router.get('/me', authenticateToken, (req, res) => {
    res.json({ success: true, data: req.user });
});

module.exports = router;
