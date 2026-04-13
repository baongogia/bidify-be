const cron = require('node-cron');
const pool = require('../config/db');
const { getNowVN, toMySQLDatetime } = require('../utils/timeHelper');
const { createNotification } = require('../repositories/notificationRepository');

module.exports = (io) => {
    cron.schedule('* * * * *', async () => {
        try {
            const now = getNowVN();
            const nowStr = toMySQLDatetime(now);

            // Tìm các sản phẩm đã hết hạn nhưng vẫn ACTIVE
            const [expiredProducts] = await pool.query(
                `SELECT id, seller_id, title FROM products WHERE status = 'ACTIVE' AND end_time <= ?`,
                [nowStr]
            );

            if (expiredProducts.length === 0) return;

            // Xử lý từng sản phẩm trong transaction
            for (const product of expiredProducts) {
                const conn = await pool.getConnection();
                try {
                    await conn.beginTransaction();

                    // SELECT FOR UPDATE
                    const [rows] = await conn.query('SELECT status, title, seller_id FROM products WHERE id = ? FOR UPDATE', [product.id]);
                    const p = rows[0];

                    if (p.status !== 'ACTIVE') {
                        await conn.rollback();
                        conn.release();
                        continue;
                    }

                    // Lấy highest bid
                    const [bids] = await conn.query(
                        'SELECT b.bidder_id, b.amount, u.name as bidder_name FROM bids b JOIN users u ON b.bidder_id = u.id WHERE b.product_id = ? ORDER BY b.amount DESC, b.created_at ASC LIMIT 1',
                        [product.id]
                    );

                    const highestBid = bids[0];

                    if (highestBid) {
                        // Cập nhật trạng thái
                        const paymentDeadlineStr = toMySQLDatetime(now.add(3, 'day'));
                        await conn.query(
                            `UPDATE products SET status = 'ENDED_WAITING_PAYMENT', payment_deadline = ? WHERE id = ?`,
                            [paymentDeadlineStr, product.id]
                        );

                        // Notifications
                        await createNotification(
                            p.seller_id, 'AUCTION_SOLD', 'Đấu giá kết thúc thành công',
                            `Sản phẩm "${p.title}" đã được bán với giá ${highestBid.amount}.`, conn
                        );
                        await createNotification(
                            highestBid.bidder_id, 'AUCTION_WON', 'Bạn đã thắng buổi đấu giá',
                            `Bạn đã thắng thầu sản phẩm "${p.title}" với giá ${highestBid.amount}. Vui lòng thanh toán trước ${paymentDeadlineStr}.`, conn
                        );

                        if (io) io.to(`product_${product.id}`).emit('auction_ended', { 
                            status: 'ENDED_WAITING_PAYMENT', 
                            winner_id: highestBid.bidder_id,
                            winner_name: require('../utils/timeHelper').maskUsername(highestBid.bidder_name)
                        });
                    } else {
                        // Không có người mua
                        await conn.query(`UPDATE products SET status = 'UNSOLD' WHERE id = ?`, [product.id]);
                        
                        await createNotification(
                            p.seller_id, 'AUCTION_UNSOLD', 'Đấu giá kết thúc không thành công',
                            `Sản phẩm "${p.title}" không có người mua.`, conn
                        );

                        if (io) io.to(`product_${product.id}`).emit('auction_ended', { status: 'UNSOLD', winner_id: null });
                    }

                    await conn.commit();
                } catch (err) {
                    await conn.rollback();
                    console.error('Cron job error processing product', product.id, err);
                } finally {
                    conn.release();
                }
            }
        } catch (error) {
            console.error('Error in cron job interval:', error);
        }
    });
};
