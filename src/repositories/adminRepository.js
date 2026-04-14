const pool = require('../config/db');

const DEFAULT_SETTINGS = [
    {
        setting_key: 'auction.default_bid_increment',
        setting_value: '5000',
        description: 'Buoc gia mac dinh cho dau gia (VND)'
    },
    {
        setting_key: 'auction.max_duration_hours',
        setting_value: '168',
        description: 'Thoi gian dau gia toi da (gio)'
    },
    {
        setting_key: 'media.max_image_size_mb',
        setting_value: '5',
        description: 'Kich thuoc toi da cua anh (MB)'
    },
    {
        setting_key: 'static.about_page',
        setting_value: 'Nen tang dau gia C2C an toan va minh bach.',
        description: 'Noi dung trang gioi thieu'
    }
];

const columnExists = async (tableName, columnName) => {
    const [rows] = await pool.query(
        `SELECT 1
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [tableName, columnName]
    );
    return rows.length > 0;
};

const initAdminTables = async () => {
    if (!(await columnExists('users', 'is_locked'))) {
        await pool.query('ALTER TABLE users ADD COLUMN is_locked TINYINT(1) NOT NULL DEFAULT 0');
    }

    if (!(await columnExists('users', 'lock_reason'))) {
        await pool.query('ALTER TABLE users ADD COLUMN lock_reason TEXT NULL');
    }

    if (!(await columnExists('users', 'locked_at'))) {
        await pool.query('ALTER TABLE users ADD COLUMN locked_at DATETIME NULL');
    }

    if (!(await columnExists('categories', 'parent_id'))) {
        await pool.query('ALTER TABLE categories ADD COLUMN parent_id INT NULL');
        await pool.query('ALTER TABLE categories ADD INDEX idx_categories_parent_id (parent_id)');
    }

    await pool.query(
        `CREATE TABLE IF NOT EXISTS product_moderation (
            id INT AUTO_INCREMENT PRIMARY KEY,
            product_id INT NOT NULL UNIQUE,
            status ENUM('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_EDIT', 'DELETED') NOT NULL DEFAULT 'PENDING',
            admin_id INT NULL,
            moderation_reason TEXT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_product_moderation_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
            CONSTRAINT fk_product_moderation_admin FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL,
            INDEX idx_product_moderation_status_created (status, created_at)
        )`
    );

    await pool.query(
        `CREATE TABLE IF NOT EXISTS admin_action_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            admin_user_id INT NOT NULL,
            target_type ENUM('USER', 'PRODUCT', 'CATEGORY', 'SETTING', 'SYSTEM') NOT NULL,
            target_id INT NULL,
            action_type VARCHAR(80) NOT NULL,
            metadata_json JSON NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_admin_action_logs_admin FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_admin_logs_target_time (target_type, created_at),
            INDEX idx_admin_logs_admin_time (admin_user_id, created_at)
        )`
    );

    await pool.query(
        `CREATE TABLE IF NOT EXISTS system_settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            setting_key VARCHAR(120) NOT NULL UNIQUE,
            setting_value TEXT NOT NULL,
            description VARCHAR(255) NULL,
            updated_by INT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_system_settings_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
            INDEX idx_system_settings_key (setting_key)
        )`
    );

    for (const item of DEFAULT_SETTINGS) {
        await pool.query(
            `INSERT INTO system_settings (setting_key, setting_value, description)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE
                setting_value = setting_value,
                description = COALESCE(description, VALUES(description))`,
            [item.setting_key, item.setting_value, item.description]
        );
    }
};

const getUsers = async ({ query, role, lock_status, offset, limit }) => {
    let sql = `SELECT id, name, email, role, seller_status, is_locked, lock_reason, locked_at, created_at
               FROM users
               WHERE 1 = 1`;
    let countSql = 'SELECT COUNT(*) AS total FROM users WHERE 1 = 1';
    const params = [];

    if (query) {
        sql += ' AND (name LIKE ? OR email LIKE ?)';
        countSql += ' AND (name LIKE ? OR email LIKE ?)';
        const keyword = `%${query}%`;
        params.push(keyword, keyword);
    }

    if (role) {
        sql += ' AND role = ?';
        countSql += ' AND role = ?';
        params.push(role);
    }

    if (lock_status === 'LOCKED') {
        sql += ' AND is_locked = 1';
        countSql += ' AND is_locked = 1';
    }

    if (lock_status === 'ACTIVE') {
        sql += ' AND is_locked = 0';
        countSql += ' AND is_locked = 0';
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

    const [rows] = await pool.query(sql, [...params, limit, offset]);
    const [countRows] = await pool.query(countSql, params);

    return {
        users: rows,
        total: countRows[0].total
    };
};

const findUserForAdmin = async (id) => {
    const [rows] = await pool.query(
        `SELECT id, name, email, role, seller_status, is_locked
         FROM users
         WHERE id = ?`,
        [id]
    );
    return rows[0];
};

const lockOrUnlockUser = async (id, isLocked, reason) => {
    const [result] = await pool.query(
        `UPDATE users
         SET is_locked = ?,
             lock_reason = ?,
             locked_at = ?
         WHERE id = ?`,
        [isLocked ? 1 : 0, isLocked ? reason : null, isLocked ? new Date() : null, id]
    );
    return result.affectedRows > 0;
};

const deleteUser = async (id) => {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows > 0;
};

const getUserActivity = async (userId, limit) => {
    const [rows] = await pool.query(
        `SELECT action_type, action_detail, created_at
         FROM (
            SELECT 'BID' AS action_type,
                   CONCAT('Dat gia ', FORMAT(amount, 0), ' cho san pham #', product_id) AS action_detail,
                   created_at
            FROM bids
            WHERE bidder_id = ?

            UNION ALL

            SELECT 'WATCHLIST' AS action_type,
                   CONCAT('Them san pham #', product_id, ' vao theo doi') AS action_detail,
                   created_at
            FROM watchlist
            WHERE user_id = ?

            UNION ALL

            SELECT 'PRODUCT' AS action_type,
                   CONCAT('Dang tin #', id, ': ', title) AS action_detail,
                   created_at
            FROM products
            WHERE seller_id = ?

            UNION ALL

            SELECT 'NOTIFICATION' AS action_type,
                   CONCAT('Nhan thong bao: ', title) AS action_detail,
                   created_at
            FROM notifications
            WHERE user_id = ?
         ) activities
         ORDER BY created_at DESC
         LIMIT ?`,
        [userId, userId, userId, userId, limit]
    );

    return rows;
};

const createProductModeration = async (productId, status = 'PENDING', adminId = null, reason = null) => {
    await pool.query(
        `INSERT INTO product_moderation (product_id, status, admin_id, moderation_reason)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            status = VALUES(status),
            admin_id = VALUES(admin_id),
            moderation_reason = VALUES(moderation_reason),
            updated_at = CURRENT_TIMESTAMP`,
        [productId, status, adminId, reason]
    );
};

const getModerationProducts = async ({ status, query, offset, limit }) => {
    let sql = `SELECT p.id,
                      p.title,
                      p.description,
                      p.status AS product_status,
                      p.starting_price,
                      p.current_price,
                      p.images,
                      p.created_at,
                      u.id AS seller_id,
                      u.name AS seller_name,
                      u.email AS seller_email,
                      c.name AS category_name,
                      COALESCE(pm.status, CASE WHEN p.status = 'DRAFT' THEN 'PENDING' ELSE 'APPROVED' END) AS moderation_status,
                      pm.moderation_reason,
                      pm.updated_at AS moderated_at
               FROM products p
               JOIN users u ON u.id = p.seller_id
               JOIN categories c ON c.id = p.category_id
               LEFT JOIN product_moderation pm ON pm.product_id = p.id
               WHERE p.status <> 'CANCELLED'`;
    let countSql = `SELECT COUNT(*) AS total
                    FROM products p
                    LEFT JOIN product_moderation pm ON pm.product_id = p.id
                    WHERE p.status <> 'CANCELLED'`;
    const params = [];

    if (status) {
        sql += ` AND COALESCE(pm.status, CASE WHEN p.status = 'DRAFT' THEN 'PENDING' ELSE 'APPROVED' END) = ?`;
        countSql += ` AND COALESCE(pm.status, CASE WHEN p.status = 'DRAFT' THEN 'PENDING' ELSE 'APPROVED' END) = ?`;
        params.push(status);
    }

    if (query) {
        sql += ' AND (p.title LIKE ? OR u.name LIKE ? OR u.email LIKE ?)';
        countSql += ' AND (p.title LIKE ? OR u.name LIKE ? OR u.email LIKE ?)';
        const keyword = `%${query}%`;
        params.push(keyword, keyword, keyword);
    }

    sql += ' ORDER BY p.created_at ASC LIMIT ? OFFSET ?';

    const [rows] = await pool.query(sql, [...params, limit, offset]);
    const [countRows] = await pool.query(countSql, params);

    return {
        products: rows,
        total: countRows[0].total
    };
};

const findProductForModeration = async (productId) => {
    const [rows] = await pool.query(
        `SELECT p.id, p.title, p.status, p.seller_id,
                COALESCE(pm.status, CASE WHEN p.status = 'DRAFT' THEN 'PENDING' ELSE 'APPROVED' END) AS moderation_status
         FROM products p
         LEFT JOIN product_moderation pm ON pm.product_id = p.id
         WHERE p.id = ?`,
        [productId]
    );
    return rows[0];
};

const updateProductStatus = async (productId, status) => {
    const [result] = await pool.query('UPDATE products SET status = ? WHERE id = ?', [status, productId]);
    return result.affectedRows > 0;
};

const createNotification = async (userId, type, title, message) => {
    await pool.query(
        `INSERT INTO notifications (user_id, type, title, message)
         VALUES (?, ?, ?, ?)`,
        [userId, type, title, message]
    );
};

const addAdminActionLog = async ({ adminUserId, targetType, targetId, actionType, metadata }) => {
    await pool.query(
        `INSERT INTO admin_action_logs (admin_user_id, target_type, target_id, action_type, metadata_json)
         VALUES (?, ?, ?, ?, ?)`,
        [adminUserId, targetType, targetId || null, actionType, metadata ? JSON.stringify(metadata) : null]
    );
};

const getAdminActionLogs = async ({ targetType, targetId, limit }) => {
    let sql = `SELECT l.id, l.admin_user_id, u.name AS admin_name, l.target_type, l.target_id, l.action_type, l.metadata_json, l.created_at
               FROM admin_action_logs l
               JOIN users u ON u.id = l.admin_user_id
               WHERE 1 = 1`;
    const params = [];

    if (targetType) {
        sql += ' AND l.target_type = ?';
        params.push(targetType);
    }

    if (targetId) {
        sql += ' AND l.target_id = ?';
        params.push(targetId);
    }

    sql += ' ORDER BY l.created_at DESC LIMIT ?';
    params.push(limit);

    const [rows] = await pool.query(sql, params);
    return rows;
};

const getSystemSettings = async () => {
    const [rows] = await pool.query(
        `SELECT setting_key, setting_value, description, updated_by, updated_at
         FROM system_settings
         ORDER BY setting_key ASC`
    );
    return rows;
};

const updateSystemSetting = async ({ key, value, description, adminId }) => {
    await pool.query(
        `INSERT INTO system_settings (setting_key, setting_value, description, updated_by)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            setting_value = VALUES(setting_value),
            description = VALUES(description),
            updated_by = VALUES(updated_by),
            updated_at = CURRENT_TIMESTAMP`,
        [key, value, description || null, adminId]
    );
};

module.exports = {
    initAdminTables,
    getUsers,
    findUserForAdmin,
    lockOrUnlockUser,
    deleteUser,
    getUserActivity,
    createProductModeration,
    getModerationProducts,
    findProductForModeration,
    updateProductStatus,
    createNotification,
    addAdminActionLog,
    getAdminActionLogs,
    getSystemSettings,
    updateSystemSetting
};
