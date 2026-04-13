const watchlistService = require('../services/watchlistService');

const toggle = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user.id;

        const result = await watchlistService.toggleWatchlist(userId, productId);
        res.status(200).json({ success: true, message: 'Watchlist updated', data: result });
    } catch (error) {
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        console.error('toggleWatchlist error:', error);
        res.status(500).json({ success: false, message: 'Server error updating watchlist' });
    }
};

const getMyWatchlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const result = await watchlistService.getMyWatchlist(userId, page, limit);
        res.status(200).json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('getMyWatchlist error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching watchlist' });
    }
};

module.exports = {
    toggle,
    getMyWatchlist
};
