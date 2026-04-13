const pool = require('../config/db');

const getProductForUpdate = async (id, conn) => {
    const [rows] = await conn.query('SELECT * FROM products WHERE id = ? FOR UPDATE', [id]);
    return rows[0];
};

const getHighestBidder = async (product_id, conn) => {
    const [rows] = await (conn || pool).query(
        'SELECT bidder_id FROM bids WHERE product_id = ? ORDER BY amount DESC, created_at ASC LIMIT 1', 
        [product_id]
    );
    return rows[0]?.bidder_id || null;
};

const createBid = async (product_id, bidder_id, amount, conn) => {
    const [result] = await conn.query(
        'INSERT INTO bids (product_id, bidder_id, amount) VALUES (?, ?, ?)',
        [product_id, bidder_id, amount]
    );
    return result.insertId;
};

const updateProductAfterBid = async (id, current_price, end_time, conn) => {
    await conn.query(
        'UPDATE products SET current_price = ?, end_time = ? WHERE id = ?',
        [current_price, end_time, id]
    );
};

const getBidHistory = async (product_id, limit, offset) => {
    const [rows] = await pool.query(
        `SELECT b.id, b.amount, b.created_at, u.name as bidder_name 
         FROM bids b JOIN users u ON b.bidder_id = u.id 
         WHERE b.product_id = ? 
         ORDER BY b.amount DESC, b.created_at DESC LIMIT ? OFFSET ?`,
        [product_id, limit, offset]
    );
    
    const [countRows] = await pool.query('SELECT COUNT(*) as total FROM bids WHERE product_id = ?', [product_id]);

    return { data: rows, total: countRows[0].total };
};

module.exports = {
    getProductForUpdate,
    getHighestBidder,
    createBid,
    updateProductAfterBid,
    getBidHistory
};
