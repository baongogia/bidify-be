const sellerApplicationRepo = require('../repositories/sellerApplicationRepository');
const authRepo = require('../repositories/authRepository');
const notificationRepo = require('../repositories/notificationRepository');

const submitApplication = async (userId, applicationData) => {
    const { shop_name, phone, address, business_description } = applicationData;

    // Validation
    if (!shop_name || !phone) {
        throw new Error('Shop name and phone are required');
    }

    // Check if user already has a pending application
    const hasPending = await sellerApplicationRepo.hasActivePendingApplication(userId);
    if (hasPending) {
        throw new Error('You already have a pending application');
    }

    // Check user current role
    const user = await authRepo.findUserById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    if (user.role === 'SELLER') {
        throw new Error('You are already a seller');
    }

    if (user.role === 'ADMIN') {
        throw new Error('Admin cannot apply to be seller');
    }

    // Create application
    const appId = await sellerApplicationRepo.createApplication({
        user_id: userId,
        shop_name,
        phone,
        address: address || '',
        business_description: business_description || '',
        category_id: applicationData.category_id || null
    });

    // Update user seller_status to PENDING
    await authRepo.updateUserSellerStatus(userId, 'PENDING');

    return appId;
};

const getMyApplication = async (userId) => {
    const application = await sellerApplicationRepo.findByUserId(userId);
    return application;
};

const getAllApplications = async () => {
    const applications = await sellerApplicationRepo.findAll();
    return applications;
};

const getApplicationsByStatus = async (status) => {
    const applications = await sellerApplicationRepo.findByStatus(status);
    return applications;
};

const approveApplication = async (applicationId, adminId) => {
    const application = await sellerApplicationRepo.findById(applicationId);
    
    if (!application) {
        throw new Error('Application not found');
    }

    if (application.status !== 'PENDING') {
        throw new Error('Application is not pending');
    }

    // Update application status
    await sellerApplicationRepo.updateStatus(applicationId, 'APPROVED', adminId, null);

    // Update user role and status
    await authRepo.updateUserRole(application.user_id, 'SELLER', 'APPROVED');

    // Create notification
    await notificationRepo.createNotification(
        application.user_id,
        'SELLER_APPROVED',
        'Đơn đăng ký người bán đã được duyệt',
        `Chúc mừng! Đơn đăng ký "${application.shop_name}" của bạn đã được phê duyệt. Bạn có thể bắt đầu đăng bán sản phẩm ngay bây giờ.`
    );

    return true;
};

const rejectApplication = async (applicationId, adminId, adminNote) => {
    const application = await sellerApplicationRepo.findById(applicationId);
    
    if (!application) {
        throw new Error('Application not found');
    }

    if (application.status !== 'PENDING') {
        throw new Error('Application is not pending');
    }

    // Update application status
    await sellerApplicationRepo.updateStatus(applicationId, 'REJECTED', adminId, adminNote);

    // Update user seller_status back to NONE (allow reapply)
    await authRepo.updateUserSellerStatus(application.user_id, 'REJECTED');

    // Create notification
    await notificationRepo.createNotification(
        application.user_id,
        'SELLER_REJECTED',
        'Đơn đăng ký người bán bị từ chối',
        `Đơn đăng ký "${application.shop_name}" của bạn đã bị từ chối. ${adminNote ? 'Lý do: ' + adminNote : 'Vui lòng liên hệ admin để biết thêm chi tiết.'}`
    );

    return true;
};

module.exports = {
    submitApplication,
    getMyApplication,
    getAllApplications,
    getApplicationsByStatus,
    approveApplication,
    rejectApplication
};
