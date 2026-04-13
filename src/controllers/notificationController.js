const notifRepo = require('../repositories/notificationRepository');

const getMyNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const result = await notifRepo.getUserNotifications(userId, limit, offset);

        res.status(200).json({ 
            success: true, 
            data: result.data,
            pagination: {
                page,
                limit,
                total: result.total,
                totalPages: Math.ceil(result.total / limit)
            }
        });
    } catch (error) {
        console.error('getMyNotifications error:', error);
        res.status(500).json({ success: false, message: 'Server error retrieving notifications' });
    }
};

const markRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const success = await notifRepo.markAsRead(id, userId);
        if (!success) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        res.status(200).json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        console.error('markRead error:', error);
        res.status(500).json({ success: false, message: 'Server error marking notification' });
    }
};

module.exports = {
    getMyNotifications,
    markRead
};
