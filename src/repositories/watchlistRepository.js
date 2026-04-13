const pool = require('../config/db');

const findWatchlistEntry = async (user_id, product_id) => {
    const [rows] = await pool.query('SELECT * FROM watchlist WHERE user_id = ? AND product_id = ?', [user_id, product_id]);
    return rows[0];
};

const addToWatchlist = async (user_id, product_id) => {
    await pool.query('INSERT INTO watchlist (user_id, product_id) VALUES (?, ?)', [user_id, product_id]);
};

const removeFromWatchlist = async (user_id, product_id) => {
    await pool.query('DELETE FROM watchlist WHERE user_id = ? AND product_id = ?', [user_id, product_id]);
};

const getUserWatchlist = async (user_id, limit, offset) => {
    const [rows] = await pool.query(
        `SELECT w.id as watchlist_id, w.created_at as added_at, p.id, p.title, p.current_price, p.status, p.end_time, p.images 
         FROM watchlist w JOIN products p ON w.product_id = p.id 
         WHERE w.user_id = ? 
         ORDER BY w.created_at DESC LIMIT ? OFFSET ?`,
        [user_id, limit, offset]
    );

    const [countRows] = await pool.query('SELECT COUNT(*) as total FROM watchlist WHERE user_id = ?', [user_id]);

    return { data: rows, total: countRows[0].total };
};

module.exports = {
    findWatchlistEntry,
    addToWatchlist,
    removeFromWatchlist,
    getUserWatchlist
};
