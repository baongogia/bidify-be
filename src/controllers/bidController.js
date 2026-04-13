const bidService = require('../services/bidService');

const mapBidErrorMessage = (message) => {
    if (message.includes('Bid must be at least')) {
        const min = message.replace('Bid must be at least', '').trim();
        return `Giá đặt tối thiểu là ${min}`;
    }
    if (message.includes('Product is not active')) return 'Sản phẩm hiện không ở trạng thái đấu giá';
    if (message.includes('Auction has ended')) return 'Phiên đấu giá đã kết thúc';
    if (message.includes('Seller cannot')) return 'Bạn không thể đấu giá sản phẩm của chính mình';
    if (message.includes('already the highest')) return 'Bạn đang là người trả giá cao nhất';
    if (message.includes('Product not found')) return 'Không tìm thấy sản phẩm';
    return message;
};

const placeBid = async (req, res) => {
    try {
        const { id } = req.params; // product_id
        const { amount } = req.body;
        const bidderId = req.user.id;

        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập số tiền đặt giá hợp lệ' });
        }

        const result = await bidService.placeBid(id, bidderId, amount);

        // Emit Socket.io
        const io = req.app.get('io');
        if (io) {
            io.to(`product_${id}`).emit('new_bid', {
                amount: result.amount,
                bidder_name: require('../utils/timeHelper').maskUsername(req.user.name),
                timestamp: new Date()
            });

            if (result.extended) {
                io.to(`product_${id}`).emit('auction_extended', {
                    newEndTime: result.newEndTime
                });
            }
        }

        res.status(200).json({ success: true, message: 'Bid placed successfully', data: result });
    } catch (error) {
        if (error.message.includes('Bid must be at least') || 
            error.message.includes('not active') || 
            error.message.includes('ended') ||
            error.message.includes('Seller cannot') ||
            error.message.includes('already the highest')) {
            return res.status(400).json({ success: false, message: mapBidErrorMessage(error.message) });
        }
        console.error('placeBid error:', error);
        res.status(500).json({ success: false, message: 'Server error while placing bid' });
    }
};

const getBidHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const history = await bidService.getBidHistory(id, page, limit);

        res.status(200).json({ success: true, data: history });
    } catch (error) {
        console.error('getBidHistory error:', error);
        res.status(500).json({ success: false, message: 'Server error retrieving bid history' });
    }
};

module.exports = {
    placeBid,
    getBidHistory
};
