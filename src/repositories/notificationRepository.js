const pool = require('../config/db');

const getUserNotifications = async (user_id, limit, offset) => {
    const [rows] = await pool.query(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [user_id, limit, offset]
    );
    const [countRows] = await pool.query('SELECT COUNT(*) as total FROM notifications WHERE user_id = ?', [user_id]);
    return { data: rows, total: countRows[0].total };
};

const markAsRead = async (notification_id, user_id) => {
    const [result] = await pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
        [notification_id, user_id]
    );
    return result.affectedRows > 0;
};

const createNotification = async (user_id, type, title, message, conn) => {
    await (conn || pool).query(
        'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
        [user_id, type, title, message]
    );
};

module.exports = {
    getUserNotifications,
    markAsRead,
    createNotification
};
