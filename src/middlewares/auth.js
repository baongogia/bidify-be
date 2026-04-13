const jwt = require('jsonwebtoken');
const authRepo = require('../repositories/authRepository');

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await authRepo.findUserById(decoded.id);
        if (!user) {
            return res.status(401).json({ success: false, message: 'User no longer exists.' });
        }

        if (user.is_locked) {
            return res.status(403).json({ success: false, message: 'Your account is locked by admin.' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
    }
};

const requireSeller = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (req.user.role !== 'SELLER') {
        return res.status(403).json({ 
            success: false, 
            message: 'Only sellers can perform this action. Please apply to become a seller first.' 
        });
    }

    if (req.user.seller_status !== 'APPROVED') {
        return res.status(403).json({ 
            success: false, 
            message: 'Your seller account is not approved yet.' 
        });
    }

    next();
};

const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ 
            success: false, 
            message: 'Admin access required.' 
        });
    }

    next();
};

module.exports = {
    authenticateToken,
    requireSeller,
    requireAdmin
};
