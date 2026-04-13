const pool = require('../config/db');

const createApplication = async (applicationData) => {
    const { user_id, shop_name, phone, address, business_description, category_id } = applicationData;
    
    const [result] = await pool.query(
        `INSERT INTO seller_applications 
        (user_id, shop_name, phone, address, business_description, category_id, status) 
        VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`,
        [user_id, shop_name, phone, address || '', business_description || '', category_id || null]
    );

    return result.insertId;
};

const findById = async (id) => {
    const [rows] = await pool.query(
        `SELECT sa.*, u.name as user_name, u.email as user_email 
         FROM seller_applications sa
         JOIN users u ON sa.user_id = u.id
         WHERE sa.id = ?`,
        [id]
    );
    return rows[0];
};

const findByUserId = async (userId) => {
    const [rows] = await pool.query(
        `SELECT * FROM seller_applications 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [userId]
    );
    return rows[0];
};

const findByStatus = async (status) => {
    const [rows] = await pool.query(
        `SELECT sa.*, u.name as user_name, u.email as user_email 
         FROM seller_applications sa
         JOIN users u ON sa.user_id = u.id
         WHERE sa.status = ?
         ORDER BY sa.created_at ASC`,
        [status]
    );
    return rows;
};

const findAll = async () => {
    const [rows] = await pool.query(
        `SELECT sa.*, u.name as user_name, u.email as user_email, c.name as category_name
         FROM seller_applications sa
         JOIN users u ON sa.user_id = u.id
         LEFT JOIN categories c ON sa.category_id = c.id
         ORDER BY 
            CASE sa.status 
                WHEN 'PENDING' THEN 1 
                WHEN 'APPROVED' THEN 2 
                WHEN 'REJECTED' THEN 3 
            END,
            sa.created_at DESC`
    );
    return rows;
};

const updateStatus = async (id, status, adminId, adminNote = null) => {
    const [result] = await pool.query(
        `UPDATE seller_applications 
         SET status = ?, admin_id = ?, admin_note = ?, updated_at = NOW()
         WHERE id = ?`,
        [status, adminId, adminNote, id]
    );
    return result.affectedRows > 0;
};

const hasActivePendingApplication = async (userId) => {
    const [rows] = await pool.query(
        `SELECT id FROM seller_applications 
         WHERE user_id = ? AND status = 'PENDING'
         LIMIT 1`,
        [userId]
    );
    return rows.length > 0;
};

module.exports = {
    createApplication,
    findById,
    findByUserId,
    findByStatus,
    findAll,
    updateStatus,
    hasActivePendingApplication
};
