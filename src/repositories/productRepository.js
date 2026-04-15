const pool = require("../config/db");

const getProducts = async ({ category_id, condition, min_price, max_price, keyword, sort, offset, limit, status, upcoming }) => {
    let query = `SELECT id, seller_id, category_id, title, condition_status, current_price, images, status, start_time, end_time 
                 FROM products WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) as total FROM products WHERE 1=1`;
    const queryParams = [];

    if (upcoming === 'true') {
        query += ` AND start_time > NOW()`;
        countQuery += ` AND start_time > NOW()`;
    }

    if (status && status !== 'all') {
        query += ` AND status = ?`;
        countQuery += ` AND status = ?`;
        queryParams.push(status);
    }

  if (category_id) {
    query += ` AND category_id = ?`;
    countQuery += ` AND category_id = ?`;
    queryParams.push(category_id);
  }

  if (condition) {
    query += ` AND condition_status = ?`;
    countQuery += ` AND condition_status = ?`;
    queryParams.push(condition);
  }

  if (min_price) {
    query += ` AND current_price >= ?`;
    countQuery += ` AND current_price >= ?`;
    queryParams.push(min_price);
  }

  if (max_price) {
    query += ` AND current_price <= ?`;
    countQuery += ` AND current_price <= ?`;
    queryParams.push(max_price);
  }

  if (keyword && keyword.trim()) {
    query += ` AND (title LIKE ? OR description LIKE ?)`;
    countQuery += ` AND (title LIKE ? OR description LIKE ?)`;
    const likeKeyword = `%${keyword.trim()}%`;
    queryParams.push(likeKeyword, likeKeyword);
  }

  // Sort
  switch (sort) {
    case "ending_soon":
      // Ưu tiên phiên chưa kết thúc (end_time > NOW), trong nhóm đó sắp kết thúc trước.
      // Phiên đã kết thúc (end_time trong quá khứ) xếp sau để không chiếm hết trang đầu khi phân trang.
      query += ` ORDER BY (end_time <= NOW()) ASC, end_time ASC`;
      break;
    case "newly_listed":
      query += ` ORDER BY created_at DESC`;
      break;
    case "price_asc":
      query += ` ORDER BY current_price ASC`;
      break;
    case "price_desc":
      query += ` ORDER BY current_price DESC`;
      break;
    default:
      query += ` ORDER BY created_at DESC`; // Default
  }

  query += ` LIMIT ? OFFSET ?`;

  const [rows] = await pool.query(query, [...queryParams, limit, offset]);
  const [countRows] = await pool.query(countQuery, queryParams);

  return { data: rows, total: countRows[0].total };
};

const getProductById = async (id) => {
  const [rows] = await pool.query(
    `SELECT p.*, u.name as seller_name, u.id as seller_user_id,
         c.name as category_name,
         (SELECT COUNT(*) FROM bids WHERE product_id = p.id) as total_bids,
         (SELECT bidder_id FROM bids WHERE product_id = p.id ORDER BY amount DESC, created_at ASC LIMIT 1) as highest_bidder_id,
         (SELECT u2.name FROM bids b2 JOIN users u2 ON b2.bidder_id = u2.id WHERE b2.product_id = p.id ORDER BY b2.amount DESC, b2.created_at ASC LIMIT 1) as highest_bidder_name,
         (SELECT COUNT(*) FROM products p2 WHERE p2.seller_id = p.seller_id AND p2.status = 'COMPLETED') as seller_completed_sales
         FROM products p 
         JOIN users u ON p.seller_id = u.id 
         JOIN categories c ON c.id = p.category_id
         WHERE p.id = ?`,
    [id],
  );
  return rows[0];
};

const getProductByIdAndSeller = async (id, sellerId) => {
  const [rows] = await pool.query(
    `SELECT p.*, 
         (SELECT COUNT(*) FROM bids WHERE product_id = p.id) as total_bids
         FROM products p
         WHERE p.id = ? AND p.seller_id = ?`,
    [id, sellerId],
  );
  return rows[0];
};

const getProductsBySellerId = async (sellerId) => {
  const [rows] = await pool.query(
    `SELECT p.id, p.category_id, p.title, p.description, p.condition_status, p.starting_price, p.current_price, p.images,
                p.status, p.start_time, p.end_time, p.created_at,
                p.buy_now_price, p.bid_increment, p.deposit_required, p.location, p.video_url, p.attributes,
                c.name as category_name,
                (SELECT COUNT(*) FROM bids WHERE product_id = p.id) as total_bids
         FROM products p
         JOIN categories c ON c.id = p.category_id
         WHERE p.seller_id = ?
         ORDER BY p.created_at DESC`,
    [sellerId],
  );
  return rows;
};

const createProduct = async (productData) => {
  const {
    seller_id,
    category_id,
    title,
    description,
    condition_status,
    starting_price,
    images,
    status,
    start_time,
    end_time,
    buy_now_price,
    bid_increment,
    deposit_required,
    location,
    video_url,
    attributes,
  } = productData;

  const attrsJson =
    attributes === undefined || attributes === null
      ? null
      : typeof attributes === "string"
        ? attributes
        : JSON.stringify(attributes);

  const [result] = await pool.query(
    `INSERT INTO products 
        (seller_id, category_id, title, description, condition_status, starting_price, current_price, images, status, start_time, end_time,
         buy_now_price, bid_increment, deposit_required, location, video_url, attributes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      seller_id,
      category_id,
      title,
      description,
      condition_status,
      starting_price,
      starting_price,
      JSON.stringify(images),
      status || "ACTIVE",
      start_time,
      end_time,
      buy_now_price ?? null,
      bid_increment ?? null,
      deposit_required ?? 0,
      location ?? null,
      video_url ?? null,
      attrsJson,
    ],
  );

  return result.insertId;
};

const updateProductById = async (id, productData) => {
  const updateFields = [];
  const updateValues = [];

  Object.entries(productData).forEach(([key, value]) => {
    updateFields.push(`${key} = ?`);
    updateValues.push(value);
  });

  if (updateFields.length === 0) {
    return false;
  }

  const [result] = await pool.query(
    `UPDATE products SET ${updateFields.join(", ")} WHERE id = ?`,
    [...updateValues, id],
  );

  return result.affectedRows > 0;
};

const updateProductStatusById = async (id, status) => {
  const [result] = await pool.query(
    `UPDATE products SET status = ? WHERE id = ?`,
    [status, id],
  );
  return result.affectedRows > 0;
};

module.exports = {
  getProducts,
  getProductById,
  getProductByIdAndSeller,
  getProductsBySellerId,
  createProduct,
  updateProductById,
  updateProductStatusById,
};
