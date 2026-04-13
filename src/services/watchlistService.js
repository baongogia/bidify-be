const watchlistRepo = require('../repositories/watchlistRepository');

const toggleWatchlist = async (userId, productId) => {
    const existing = await watchlistRepo.findWatchlistEntry(userId, productId);
    
    if (existing) {
        await watchlistRepo.removeFromWatchlist(userId, productId);
        return { isWatchlisted: false };
    } else {
        await watchlistRepo.addToWatchlist(userId, productId);
        return { isWatchlisted: true };
    }
};

const getMyWatchlist = async (userId, page, limit) => {
    const offset = (page - 1) * limit;
    const result = await watchlistRepo.getUserWatchlist(userId, limit, offset);

    return {
        data: result.data,
        pagination: {
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit)
        }
    };
};

module.exports = {
    toggleWatchlist,
    getMyWatchlist
};
