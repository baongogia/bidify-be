const bidRepo = require('../repositories/bidRepository');
const pool = require('../config/db');
const { getNowVN, toMySQLDatetime, getBidIncrement, maskUsername } = require('../utils/timeHelper');

const placeBid = async (productId, bidderId, amount) => {
    const conn = await pool.getConnection();
    let extended = false;
    let newEndTime = null;
    let finalAmount = Number(amount);

    try {
        await conn.beginTransaction();

        // 1. SELECT FOR UPDATE
        const product = await bidRepo.getProductForUpdate(productId, conn);
        if (!product) throw new Error('Product not found');

        // 2. Check Valid state
        if (product.status !== 'ACTIVE') throw new Error('Product is not active');
        
        const now = getNowVN();
        const startDayjsVal = require('dayjs')(product.start_time);
        const endDayjsVal = require('dayjs')(product.end_time);
        
        if (now.isBefore(startDayjsVal)) {
            throw new Error('Auction has not started yet');
        }

        if (endDayjsVal.isBefore(now)) {
            throw new Error('Auction has ended');
        }

        // 3. Check bidder !== seller
        if (product.seller_id === bidderId) {
            throw new Error('Seller cannot bid on own product');
        }

        // 4. Check not highest bidder
        const highestBidderId = await bidRepo.getHighestBidder(productId, conn);
        if (highestBidderId === bidderId) {
            throw new Error('You are already the highest bidder');
        }

        // 5. Min valid bid (tùy bước giá sản phẩm hoặc mặc định hệ thống)
        const currentPrice = Number(product.current_price);
        const customInc =
            product.bid_increment != null && Number(product.bid_increment) > 0
                ? Number(product.bid_increment)
                : null;
        const increment = customInc ?? getBidIncrement(currentPrice);
        const minValidBid = currentPrice + increment;

        if (finalAmount < minValidBid) {
            throw new Error(`Bid must be at least ${minValidBid}`);
        }

        // 6. Anti-sniping
        newEndTime = endDayjsVal;
        const diffMinutes = endDayjsVal.diff(now, 'minute', true);
        if (diffMinutes < 3 && diffMinutes > 0) {
            newEndTime = endDayjsVal.add(3, 'minute');
            extended = true;
        }

        // 7. Insert bid & Update Product
        await bidRepo.createBid(productId, bidderId, finalAmount, conn);
        await bidRepo.updateProductAfterBid(productId, finalAmount, toMySQLDatetime(newEndTime), conn);

        await conn.commit();
        
        return {
            amount: finalAmount,
            extended,
            newEndTime: toMySQLDatetime(newEndTime)
        };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

const getBidHistory = async (productId, page, limit) => {
    const offset = (page - 1) * limit;
    const result = await bidRepo.getBidHistory(productId, limit, offset);

    // Mask usernames
    const maskedData = result.data.map(bid => ({
        ...bid,
        bidder_name: maskUsername(bid.bidder_name)
    }));

    return {
        data: maskedData,
        pagination: {
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit)
        }
    };
};

module.exports = {
    placeBid,
    getBidHistory
};
