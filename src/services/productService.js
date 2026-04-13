const productRepo = require('../repositories/productRepository');
const adminRepo = require('../repositories/adminRepository');
const { getBidIncrement, maskUsername } = require('../utils/timeHelper');
const pool = require('../config/db');

const listProducts = async (queryArgs, userId) => {
    const page = parseInt(queryArgs.page) || 1;
    const limit = parseInt(queryArgs.limit) || 10;
    const offset = (page - 1) * limit;

    const queryParams = {
        category_id: queryArgs.category_id,
        condition: queryArgs.condition,
        min_price: queryArgs.min_price,
        max_price: queryArgs.max_price,
        keyword: queryArgs.keyword,
        sort: queryArgs.sort,
        offset,
        limit
    };

    const { data, total } = await productRepo.getProducts(queryParams);

    let normalizedProducts = data.map((product) => {
        if (typeof product.images === 'string') {
            try {
                return { ...product, images: JSON.parse(product.images) };
            } catch (e) {
                return { ...product, images: [] };
            }
        }
        return product;
    });

    if (userId && normalizedProducts.length > 0) {
        const productIds = normalizedProducts.map((p) => p.id);
        const placeholders = productIds.map(() => '?').join(',');
        const [watchRows] = await pool.query(
            `SELECT product_id FROM watchlist WHERE user_id = ? AND product_id IN (${placeholders})`,
            [userId, ...productIds]
        );

        const watchSet = new Set(watchRows.map((row) => row.product_id));
        normalizedProducts = normalizedProducts.map((p) => ({
            ...p,
            is_watchlisted: watchSet.has(p.id)
        }));
    }

    return {
        products: normalizedProducts,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
};

const getProductDetail = async (id, userId) => {
    const product = await productRepo.getProductById(id);
    if (!product) {
        throw new Error('Product not found');
    }

    // Parse images
    try {
        if (typeof product.images === 'string') {
            product.images = JSON.parse(product.images);
        }
    } catch(e) {}

    // Calculate min_valid_bid
    product.min_valid_bid = Number(product.current_price) + getBidIncrement(product.current_price);

    // Check watchlist
    product.is_watchlisted = false;
    if (userId) {
        const [wl] = await pool.query('SELECT 1 FROM watchlist WHERE user_id = ? AND product_id = ?', [userId, id]);
        if (wl.length > 0) {
            product.is_watchlisted = true;
        }
    }

    // Mask highest bidder name
    if (product.highest_bidder_name) {
        product.highest_bidder_name = maskUsername(product.highest_bidder_name);
    }

    return product;
};

const createProduct = async (userId, productData) => {
    const { category_id, title, description, condition_status, starting_price, images, duration_hours } = productData;

    // Validation
    if (!category_id || !title || !starting_price || !duration_hours) {
        throw new Error('Missing required fields');
    }

    if (starting_price < 0) {
        throw new Error('Starting price must be positive');
    }

    if (duration_hours < 1 || duration_hours > 168) {
        throw new Error('Duration must be between 1 and 168 hours (7 days)');
    }

    const now = new Date();
    const start_time = now.toISOString().slice(0, 19).replace('T', ' ');
    const end_time = new Date(now.getTime() + duration_hours * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    const productId = await productRepo.createProduct({
        seller_id: userId,
        category_id,
        title,
        description: description || '',
        condition_status: condition_status || 'USED',
        starting_price,
        images: images || [],
        status: 'DRAFT',
        start_time,
        end_time
    });

    await adminRepo.createProductModeration(productId, 'PENDING');

    return productId;
};

const getMyProducts = async (sellerId) => {
    const products = await productRepo.getProductsBySellerId(sellerId);

    return products.map((product) => {
        if (typeof product.images === 'string') {
            try {
                return { ...product, images: JSON.parse(product.images) };
            } catch (e) {
                return { ...product, images: [] };
            }
        }
        return product;
    });
};

const updateMyProduct = async (sellerId, productId, payload) => {
    const product = await productRepo.getProductByIdAndSeller(productId, sellerId);
    if (!product) {
        throw new Error('Product not found');
    }

    if (!['DRAFT', 'ACTIVE'].includes(product.status)) {
        throw new Error('Only draft or active products can be edited');
    }

    if (Number(product.total_bids) > 0) {
        throw new Error('Cannot edit product because it already has bids');
    }

    const updateData = {};
    const allowedFields = ['category_id', 'title', 'description', 'condition_status', 'starting_price'];
    allowedFields.forEach((field) => {
        if (payload[field] !== undefined) {
            updateData[field] = payload[field];
        }
    });

    if (payload.images !== undefined) {
        const images = Array.isArray(payload.images) ? payload.images : [];
        if (images.length > 12) {
            throw new Error('Maximum 12 images allowed');
        }
        updateData.images = JSON.stringify(images);
    }

    if (payload.duration_hours !== undefined) {
        const durationHours = Number(payload.duration_hours);
        if (!Number.isFinite(durationHours) || durationHours < 1 || durationHours > 240) {
            throw new Error('Duration must be between 1 and 240 hours (10 days)');
        }
        const now = new Date();
        const endTime = new Date(now.getTime() + durationHours * 60 * 60 * 1000);
        updateData.end_time = endTime.toISOString().slice(0, 19).replace('T', ' ');
    }

    if (updateData.starting_price !== undefined) {
        const newPrice = Number(updateData.starting_price);
        if (!Number.isFinite(newPrice) || newPrice <= 0) {
            throw new Error('Starting price must be positive');
        }
        updateData.current_price = newPrice;
    }

    if (Object.keys(updateData).length === 0) {
        throw new Error('No valid fields to update');
    }

    await productRepo.updateProductById(productId, updateData);
    return true;
};

const deleteMyProduct = async (sellerId, productId) => {
    const product = await productRepo.getProductByIdAndSeller(productId, sellerId);
    if (!product) {
        throw new Error('Product not found');
    }

    if (!['DRAFT', 'ACTIVE'].includes(product.status)) {
        throw new Error('Only draft or active products can be deleted');
    }

    if (Number(product.total_bids) > 0) {
        throw new Error('Cannot delete product because it already has bids');
    }

    await productRepo.updateProductStatusById(productId, 'CANCELLED');
    return true;
};

const checkoutProduct = async (userId, productId, paymentData) => {
    const product = await productRepo.getProductById(productId);
    if (!product) {
        throw new Error('Product not found');
    }

    if (product.status !== 'ENDED_WAITING_PAYMENT') {
        throw new Error('Product is not waiting for payment');
    }

    if (product.highest_bidder_id !== userId) {
        throw new Error('You are not the winner of this product');
    }

    // Process payment data (Mock for now)
    
    // Update product status
    await productRepo.updateProductStatusById(productId, 'COMPLETED');

    // Notify the seller
    const notificationRepo = require('../repositories/notificationRepository');
    await notificationRepo.createNotification(
        product.seller_id,
        'PAYMENT_COMPLETED',
        'Đã nhận thanh toán',
        `Người mua đã thanh toán cho sản phẩm "${product.title}". Vui lòng chuẩn bị hàng theo thông tin giao hàng họ đã cung cấp.`
    );

    return true;
};

module.exports = {
    listProducts,
    getProductDetail,
    createProduct,
    getMyProducts,
    updateMyProduct,
    deleteMyProduct,
    checkoutProduct
};
