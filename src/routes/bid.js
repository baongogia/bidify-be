const express = require('express');
const router = express.Router({ mergeParams: true });
const bidController = require('../controllers/bidController');
const { authenticateToken } = require('../middlewares/auth');

router.post('/', authenticateToken, bidController.placeBid);
router.get('/', bidController.getBidHistory);

module.exports = router;
