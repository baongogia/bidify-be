const pool = require('../config/db');

const findUserByEmail = async (email) => {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
};

const findUserById = async (id) => {
    const [rows] = await pool.query('SELECT id, name, email, role, seller_status, is_locked, lock_reason FROM users WHERE id = ?', [id]);
    return rows[0];
};

const createUser = async (name, email, passwordHash) => {
    const [result] = await pool.query(
        'INSERT INTO users (name, email, password_hash, role, seller_status) VALUES (?, ?, ?, ?, ?)',
        [name, email, passwordHash, 'BUYER', 'NONE']
    );
    return result.insertId;
};

const updateUserRole = async (userId, role, sellerStatus) => {
    const [result] = await pool.query(
        'UPDATE users SET role = ?, seller_status = ?, seller_approved_date = NOW() WHERE id = ?',
        [role, sellerStatus, userId]
    );
    return result.affectedRows > 0;
};

const updateUserSellerStatus = async (userId, sellerStatus) => {
    const [result] = await pool.query(
        'UPDATE users SET seller_status = ?, seller_request_date = NOW() WHERE id = ?',
        [sellerStatus, userId]
    );
    return result.affectedRows > 0;
};

module.exports = {
    findUserByEmail,
    findUserById,
    createUser,
    updateUserRole,
    updateUserSellerStatus
};
