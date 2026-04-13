const express = require('express');
const router = express.Router();
const watchlistController = require('../controllers/watchlistController');
const { authenticateToken } = require('../middlewares/auth');

router.post('/:productId', authenticateToken, watchlistController.toggle);
router.get('/', authenticateToken, watchlistController.getMyWatchlist);

module.exports = router;
