const productRepo = require('../repositories/productRepository');
const contentModerationService = require('./contentModerationService');
const { getBidIncrement, maskUsername, getNowVN, toMySQLDatetime } = require('../utils/timeHelper');
const dayjs = require('dayjs');
const pool = require('../config/db');

const listProducts = async (queryArgs, userId) => {
    const page = parseInt(queryArgs.page) || 1;
    const limit = parseInt(queryArgs.limit) || 10;
    const offset = (page - 1) * limit;

    const nowSql = toMySQLDatetime(getNowVN());

    const queryParams = {
        category_id: queryArgs.category_id,
        condition: queryArgs.condition,
        min_price: queryArgs.min_price,
        max_price: queryArgs.max_price,
        keyword: queryArgs.keyword,
        sort: queryArgs.sort,
        status: queryArgs.status,
        upcoming: queryArgs.upcoming,
        offset,
        limit,
        nowSql,
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

    try {
        if (product.attributes != null && typeof product.attributes === 'string') {
            product.attributes = JSON.parse(product.attributes);
        }
    } catch (e) {
        product.attributes = null;
    }

    const current = Number(product.current_price);
    const customInc =
        product.bid_increment != null && Number(product.bid_increment) > 0
            ? Number(product.bid_increment)
            : null;
    product.bid_step = customInc ?? getBidIncrement(current);
    product.min_valid_bid = current + product.bid_step;

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
    const {
        category_id,
        title,
        description,
        condition_status,
        starting_price,
        images,
        duration_minutes,
        start_time,
        buy_now_price,
        bid_increment,
        deposit_required,
        location,
        video_url,
        attributes,
    } = productData;

    // Validation
    if (!category_id || !title || !starting_price || !duration_minutes) {
        throw new Error('Missing required fields');
    }

    const [catRows] = await pool.query('SELECT id FROM categories WHERE id = ? LIMIT 1', [
        Number(category_id),
    ]);
    if (!catRows.length) {
        throw new Error('Danh mục không tồn tại');
    }

    if (starting_price < 0) {
        throw new Error('Starting price must be positive');
    }

    if (duration_minutes < 1 || duration_minutes > 10080) {
        throw new Error('Thời gian đấu giá tối thiểu 1 phút và tối đa 7 ngày');
    }

    const startNum = Number(starting_price);
    let buyNow = buy_now_price != null && buy_now_price !== '' ? Number(buy_now_price) : null;
    if (buyNow != null && (!Number.isFinite(buyNow) || buyNow < 0)) {
        throw new Error('Giá mua ngay không được âm');
    }
    if (buyNow != null && buyNow < startNum) {
        throw new Error('Giá mua ngay phải lớn hơn hoặc bằng giá khởi điểm');
    }

    let bidInc =
        bid_increment != null && bid_increment !== '' ? Number(bid_increment) : null;
    if (bidInc != null && (!Number.isFinite(bidInc) || bidInc < 1)) {
        throw new Error('Bước giá tùy chỉnh không hợp lệ');
    }

    const deposit = deposit_required != null && deposit_required !== '' ? Number(deposit_required) : 0;
    if (!Number.isFinite(deposit) || deposit < 0) {
        throw new Error('Tiền cọc không hợp lệ');
    }

    let startDayjs = getNowVN();
    if (start_time) {
        const reqStart = dayjs(start_time);
        if (reqStart.isValid() && reqStart.isAfter(startDayjs)) {
            startDayjs = reqStart;
        }
    }

    const endDayjs = startDayjs.add(duration_minutes, 'minute');

    const dbStartTime = toMySQLDatetime(startDayjs);
    const dbEndTime = toMySQLDatetime(endDayjs);

    const filterResult = contentModerationService.evaluateProductContent({
        title,
        description: description || '',
        images: images || [],
    });
    const needs_review = filterResult.flagged ? 1 : 0;
    const auto_flag_reason = filterResult.flagged
        ? JSON.stringify({ reasons: filterResult.reasons })
        : null;

    const productId = await productRepo.createProduct({
        seller_id: userId,
        category_id,
        title,
        description: description || '',
        condition_status: condition_status || 'USED',
        starting_price,
        images: images || [],
        status: 'PENDING',
        start_time: dbStartTime,
        end_time: dbEndTime,
        buy_now_price: buyNow,
        bid_increment: bidInc,
        deposit_required: deposit,
        location: location ? String(location).trim() || null : null,
        video_url: video_url ? String(video_url).trim() || null : null,
        attributes: attributes || null,
        needs_review,
        auto_flag_reason,
        report_count: 0,
    });

    return {
        productId,
        flagged: filterResult.flagged,
        flagReasons: filterResult.reasons,
    };
};

const reportProduct = async (reporterId, productId, reason) => {
    const text = String(reason || '').trim();
    if (!text) {
        throw new Error('Vui lòng nhập lý do báo cáo');
    }
    const product = await productRepo.getProductById(productId);
    if (!product) {
        throw new Error('Product not found');
    }
    if (Number(product.seller_id) === Number(reporterId)) {
        throw new Error('Không thể báo cáo chính tin đăng của bạn');
    }
    if (['CANCELLED', 'DRAFT'].includes(product.status)) {
        throw new Error('Tin này không thể báo cáo');
    }

    try {
        await productRepo.insertProductReport(Number(productId), reporterId, text);
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') {
            throw new Error('Bạn đã báo cáo tin này trước đó');
        }
        throw e;
    }
    await productRepo.incrementReportAndFlagReview(Number(productId));
    return true;
};

const getMyProducts = async (sellerId) => {
    const products = await productRepo.getProductsBySellerId(sellerId);

    return products.map((product) => {
        let next = { ...product };
        if (typeof next.images === 'string') {
            try {
                next.images = JSON.parse(next.images);
            } catch (e) {
                next.images = [];
            }
        }
        if (next.attributes != null && typeof next.attributes === 'string') {
            try {
                next.attributes = JSON.parse(next.attributes);
            } catch (e) {
                next.attributes = null;
            }
        }
        return next;
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
    const allowedFields = [
        'category_id',
        'title',
        'description',
        'condition_status',
        'starting_price',
        'buy_now_price',
        'bid_increment',
        'deposit_required',
        'location',
        'video_url',
    ];
    allowedFields.forEach((field) => {
        if (payload[field] !== undefined) {
            updateData[field] = payload[field];
        }
    });

    if (payload.attributes !== undefined) {
        const a = payload.attributes;
        updateData.attributes =
            a === null || a === ''
                ? null
                : typeof a === 'string'
                  ? a
                  : JSON.stringify(a);
    }

    if (payload.images !== undefined) {
        const images = Array.isArray(payload.images) ? payload.images : [];
        if (images.length > 12) {
            throw new Error('Maximum 12 images allowed');
        }
        updateData.images = JSON.stringify(images);
    }

    if (payload.start_time !== undefined) {
        const reqStart = dayjs(payload.start_time);
        if (reqStart.isValid()) {
            updateData.start_time = toMySQLDatetime(reqStart);
        }
    }

    let durationMinutes = null;
    if (payload.duration_minutes !== undefined || updateData.start_time !== undefined) {
        if (payload.duration_minutes !== undefined) {
            durationMinutes = Number(payload.duration_minutes);
            if (isNaN(durationMinutes) || durationMinutes < 1 || durationMinutes > 10080) {
                throw new Error('Thời gian đấu giá tối thiểu 1 phút và tối đa 7 ngày');
            }
        } else {
            const currentStart = dayjs(product.start_time);
            const currentEnd = dayjs(product.end_time);
            durationMinutes = currentEnd.diff(currentStart, 'minute');
        }
        
        if (durationMinutes !== null) {
            const finalStartDayjs = updateData.start_time ? dayjs(updateData.start_time) : dayjs(product.start_time);
            const finalEndDayjs = finalStartDayjs.add(durationMinutes, 'minute');
            updateData.end_time = toMySQLDatetime(finalEndDayjs);
        }
    }

    if (updateData.starting_price !== undefined) {
        const newPrice = Number(updateData.starting_price);
        if (!Number.isFinite(newPrice) || newPrice < 0) {
            throw new Error('Giá khởi điểm không được âm');
        }
        updateData.current_price = newPrice;
    }

    if (updateData.buy_now_price !== undefined) {
        const v = updateData.buy_now_price;
        updateData.buy_now_price =
            v === '' || v === null ? null : Number(v);
    }
    if (updateData.bid_increment !== undefined) {
        const v = updateData.bid_increment;
        updateData.bid_increment =
            v === '' || v === null ? null : Number(v);
    }
    if (updateData.deposit_required !== undefined) {
        updateData.deposit_required = Number(updateData.deposit_required) || 0;
    }
    if (updateData.location !== undefined) {
        updateData.location =
            updateData.location === '' || updateData.location == null
                ? null
                : String(updateData.location).trim();
    }
    if (updateData.video_url !== undefined) {
        updateData.video_url =
            updateData.video_url === '' || updateData.video_url == null
                ? null
                : String(updateData.video_url).trim();
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
    reportProduct,
    getMyProducts,
    updateMyProduct,
    deleteMyProduct,
    checkoutProduct
};
