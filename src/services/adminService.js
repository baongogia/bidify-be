const adminRepo = require('../repositories/adminRepository');

const initAdminFeatures = async () => {
    await adminRepo.initAdminTables();
};

const listUsers = async (queryArgs) => {
    const page = Math.max(parseInt(queryArgs.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(queryArgs.limit, 10) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const result = await adminRepo.getUsers({
        query: (queryArgs.q || '').trim(),
        role: queryArgs.role || null,
        lock_status: queryArgs.lock_status || null,
        offset,
        limit
    });

    return {
        users: result.users,
        pagination: {
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit)
        }
    };
};

const lockUser = async (adminUserId, userId, reason) => {
    const user = await adminRepo.findUserForAdmin(userId);
    if (!user) {
        throw new Error('User not found');
    }

    if (user.role === 'ADMIN') {
        throw new Error('Cannot lock an admin account');
    }

    await adminRepo.lockOrUnlockUser(userId, true, reason || 'Violated platform policy');

    await adminRepo.addAdminActionLog({
        adminUserId,
        targetType: 'USER',
        targetId: userId,
        actionType: 'LOCK_USER',
        metadata: { reason: reason || 'Violated platform policy' }
    });

    return true;
};

const unlockUser = async (adminUserId, userId) => {
    const user = await adminRepo.findUserForAdmin(userId);
    if (!user) {
        throw new Error('User not found');
    }

    await adminRepo.lockOrUnlockUser(userId, false, null);

    await adminRepo.addAdminActionLog({
        adminUserId,
        targetType: 'USER',
        targetId: userId,
        actionType: 'UNLOCK_USER',
        metadata: null
    });

    return true;
};

const removeUser = async (adminUserId, userId) => {
    if (Number(adminUserId) === Number(userId)) {
        throw new Error('Cannot delete your own account');
    }

    const user = await adminRepo.findUserForAdmin(userId);
    if (!user) {
        throw new Error('User not found');
    }

    if (user.role === 'ADMIN') {
        throw new Error('Cannot delete an admin account');
    }

    await adminRepo.deleteUser(userId);

    await adminRepo.addAdminActionLog({
        adminUserId,
        targetType: 'USER',
        targetId: userId,
        actionType: 'DELETE_USER',
        metadata: { email: user.email }
    });

    return true;
};

const getUserActivity = async (userId, queryArgs) => {
    const user = await adminRepo.findUserForAdmin(userId);
    if (!user) {
        throw new Error('User not found');
    }

    const limit = Math.min(Math.max(parseInt(queryArgs.limit, 10) || 50, 1), 200);
    return adminRepo.getUserActivity(userId, limit);
};

const listModerationProducts = async (queryArgs) => {
    const page = Math.max(parseInt(queryArgs.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(queryArgs.limit, 10) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const result = await adminRepo.getModerationProducts({
        status: queryArgs.status || 'PENDING',
        query: (queryArgs.q || '').trim(),
        offset,
        limit
    });

    return {
        products: result.products,
        pagination: {
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit)
        }
    };
};

const moderateProduct = async (adminUserId, productId, action, reason) => {
    const product = await adminRepo.findProductForModeration(productId);
    if (!product) {
        throw new Error('Product not found');
    }

    let moderationStatus;
    let productStatus;
    let actionType;

    if (action === 'approve') {
        moderationStatus = 'APPROVED';
        productStatus = 'ACTIVE';
        actionType = 'APPROVE_PRODUCT';
    } else if (action === 'reject') {
        moderationStatus = 'REJECTED';
        productStatus = 'CANCELLED';
        actionType = 'REJECT_PRODUCT';
    } else if (action === 'request-edit') {
        moderationStatus = 'NEEDS_EDIT';
        productStatus = 'DRAFT';
        actionType = 'REQUEST_EDIT_PRODUCT';
    } else if (action === 'delete') {
        moderationStatus = 'DELETED';
        productStatus = 'CANCELLED';
        actionType = 'DELETE_PRODUCT';
    } else {
        throw new Error('Invalid moderation action');
    }

    if ((action === 'reject' || action === 'request-edit') && !reason) {
        throw new Error('Reason is required for this action');
    }

    await adminRepo.updateProductStatus(productId, productStatus);
    await adminRepo.createProductModeration(productId, moderationStatus, adminUserId, reason || null);

    await adminRepo.addAdminActionLog({
        adminUserId,
        targetType: 'PRODUCT',
        targetId: productId,
        actionType,
        metadata: { reason: reason || null }
    });

    if (action !== 'delete') {
        await adminRepo.createNotification(
            product.seller_id,
            'PRODUCT_MODERATED',
            'Cap nhat kiem duyet tin dang',
            `Tin dang "${product.title}" da duoc xu ly: ${moderationStatus}${reason ? `. Ly do: ${reason}` : ''}`
        );
    }

    return true;
};

const listLogs = async (queryArgs) => {
    const limit = Math.min(Math.max(parseInt(queryArgs.limit, 10) || 100, 1), 500);
    return adminRepo.getAdminActionLogs({
        targetType: queryArgs.target_type || null,
        targetId: queryArgs.target_id ? Number(queryArgs.target_id) : null,
        limit
    });
};

const getSettings = async () => {
    return adminRepo.getSystemSettings();
};

const saveSetting = async (adminUserId, key, value, description) => {
    if (!key || typeof value === 'undefined') {
        throw new Error('Setting key and value are required');
    }

    await adminRepo.updateSystemSetting({
        key,
        value: String(value),
        description: description || null,
        adminId: adminUserId
    });

    await adminRepo.addAdminActionLog({
        adminUserId,
        targetType: 'SETTING',
        targetId: null,
        actionType: 'UPDATE_SETTING',
        metadata: { key, value: String(value) }
    });

    return true;
};

module.exports = {
    initAdminFeatures,
    listUsers,
    lockUser,
    unlockUser,
    removeUser,
    getUserActivity,
    listModerationProducts,
    moderateProduct,
    listLogs,
    getSettings,
    saveSetting
};
