const pool = require('../config/db');

const getAllCategories = async () => {
    const [rows] = await pool.query(
        `SELECT c.id, c.name, c.slug, c.parent_id, p.name AS parent_name
         FROM categories c
         LEFT JOIN categories p ON p.id = c.parent_id
         ORDER BY COALESCE(c.parent_id, c.id), c.parent_id IS NOT NULL, c.name ASC`
    );
    return rows;
};

const getRootCategories = async () => {
    const [rows] = await pool.query('SELECT id, name, slug FROM categories WHERE parent_id IS NULL ORDER BY name ASC');
    return rows;
};

const findById = async (id) => {
    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
    return rows[0];
};

const findBySlug = async (slug) => {
    const [rows] = await pool.query('SELECT * FROM categories WHERE slug = ?', [slug]);
    return rows[0];
};

const createCategory = async ({ name, slug, parent_id }) => {
    const [result] = await pool.query('INSERT INTO categories (name, slug, parent_id) VALUES (?, ?, ?)', [name, slug, parent_id || null]);
    return result.insertId;
};

const updateCategory = async (id, { name, slug, parent_id }) => {
    const [result] = await pool.query('UPDATE categories SET name = ?, slug = ?, parent_id = ? WHERE id = ?', [name, slug, parent_id || null, id]);
    return result.affectedRows > 0;
};

const hasChildren = async (id) => {
    const [rows] = await pool.query('SELECT COUNT(*) AS total FROM categories WHERE parent_id = ?', [id]);
    return rows[0].total > 0;
};

const deleteCategory = async (id) => {
    const [result] = await pool.query('DELETE FROM categories WHERE id = ?', [id]);
    return result.affectedRows > 0;
};

module.exports = {
    getAllCategories,
    getRootCategories,
    findById,
    findBySlug,
    createCategory,
    updateCategory,
    hasChildren,
    deleteCategory
};
