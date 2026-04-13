const adminService = require('../services/adminService');

const getUsers = async (req, res) => {
    try {
        const data = await adminService.listUsers(req.query);
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('getUsers error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
};

const lockUser = async (req, res) => {
    try {
        await adminService.lockUser(req.user.id, Number(req.params.id), req.body.reason);
        res.status(200).json({ success: true, message: 'User locked successfully' });
    } catch (error) {
        if (error.message.includes('not found') || error.message.includes('Cannot')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        console.error('lockUser error:', error);
        res.status(500).json({ success: false, message: 'Failed to lock user' });
    }
};

const unlockUser = async (req, res) => {
    try {
        await adminService.unlockUser(req.user.id, Number(req.params.id));
        res.status(200).json({ success: true, message: 'User unlocked successfully' });
    } catch (error) {
        if (error.message.includes('not found')) {
            return res.status(404).json({ success: false, message: error.message });
        }
        console.error('unlockUser error:', error);
        res.status(500).json({ success: false, message: 'Failed to unlock user' });
    }
};

const deleteUser = async (req, res) => {
    try {
        await adminService.removeUser(req.user.id, Number(req.params.id));
        res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        if (error.message.includes('not found') || error.message.includes('Cannot')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        console.error('deleteUser error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete user' });
    }
};

const getUserActivity = async (req, res) => {
    try {
        const data = await adminService.getUserActivity(Number(req.params.id), req.query);
        res.status(200).json({ success: true, data });
    } catch (error) {
        if (error.message.includes('not found')) {
            return res.status(404).json({ success: false, message: error.message });
        }
        console.error('getUserActivity error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch user activity' });
    }
};

const getModerationProducts = async (req, res) => {
    try {
        const data = await adminService.listModerationProducts(req.query);
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('getModerationProducts error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch moderation queue' });
    }
};

const approveProduct = async (req, res) => {
    try {
        await adminService.moderateProduct(req.user.id, Number(req.params.id), 'approve');
        res.status(200).json({ success: true, message: 'Product approved successfully' });
    } catch (error) {
        if (error.message.includes('not found') || error.message.includes('Invalid')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        console.error('approveProduct error:', error);
        res.status(500).json({ success: false, message: 'Failed to approve product' });
    }
};

const rejectProduct = async (req, res) => {
    try {
        await adminService.moderateProduct(req.user.id, Number(req.params.id), 'reject', req.body.reason);
        res.status(200).json({ success: true, message: 'Product rejected successfully' });
    } catch (error) {
        if (error.message.includes('not found') || error.message.includes('Reason') || error.message.includes('Invalid')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        console.error('rejectProduct error:', error);
        res.status(500).json({ success: false, message: 'Failed to reject product' });
    }
};

const requestEditProduct = async (req, res) => {
    try {
        await adminService.moderateProduct(req.user.id, Number(req.params.id), 'request-edit', req.body.reason);
        res.status(200).json({ success: true, message: 'Edit request sent to seller' });
    } catch (error) {
        if (error.message.includes('not found') || error.message.includes('Reason') || error.message.includes('Invalid')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        console.error('requestEditProduct error:', error);
        res.status(500).json({ success: false, message: 'Failed to request product edits' });
    }
};

const deleteProduct = async (req, res) => {
    try {
        await adminService.moderateProduct(req.user.id, Number(req.params.id), 'delete');
        res.status(200).json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        if (error.message.includes('not found') || error.message.includes('Invalid')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        console.error('deleteProduct moderation error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete product' });
    }
};

const getActionLogs = async (req, res) => {
    try {
        const data = await adminService.listLogs(req.query);
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('getActionLogs error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch logs' });
    }
};

const getSettings = async (req, res) => {
    try {
        const data = await adminService.getSettings();
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('getSettings error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch settings' });
    }
};

const updateSetting = async (req, res) => {
    try {
        const key = req.params.key;
        const { value, description } = req.body;
        await adminService.saveSetting(req.user.id, key, value, description);
        res.status(200).json({ success: true, message: 'Setting updated successfully' });
    } catch (error) {
        if (error.message.includes('required')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        console.error('updateSetting error:', error);
        res.status(500).json({ success: false, message: 'Failed to update setting' });
    }
};

module.exports = {
    getUsers,
    lockUser,
    unlockUser,
    deleteUser,
    getUserActivity,
    getModerationProducts,
    approveProduct,
    rejectProduct,
    requestEditProduct,
    deleteProduct,
    getActionLogs,
    getSettings,
    updateSetting
};
