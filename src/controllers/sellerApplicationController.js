const sellerApplicationService = require('../services/sellerApplicationService');

const submitApplication = async (req, res) => {
    try {
        const userId = req.user.id;
        const applicationData = req.body;

        const appId = await sellerApplicationService.submitApplication(userId, applicationData);
        
        res.status(201).json({ 
            success: true, 
            message: 'Application submitted successfully. Please wait for admin approval.',
            data: { id: appId }
        });
    } catch (error) {
        console.error('submitApplication error:', error);
        
        if (error.message.includes('required') || 
            error.message.includes('already') || 
            error.message.includes('cannot apply')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        
        res.status(500).json({ success: false, message: 'Server error submitting application' });
    }
};

const getMyApplication = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const application = await sellerApplicationService.getMyApplication(userId);
        
        res.status(200).json({ 
            success: true, 
            data: application || null
        });
    } catch (error) {
        console.error('getMyApplication error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching application' });
    }
};

const getAllApplications = async (req, res) => {
    try {
        const { status } = req.query;
        
        let applications;
        if (status) {
            applications = await sellerApplicationService.getApplicationsByStatus(status);
        } else {
            applications = await sellerApplicationService.getAllApplications();
        }
        
        res.status(200).json({ 
            success: true, 
            data: applications
        });
    } catch (error) {
        console.error('getAllApplications error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching applications' });
    }
};

const approveApplication = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user.id;

        await sellerApplicationService.approveApplication(parseInt(id), adminId);
        
        res.status(200).json({ 
            success: true, 
            message: 'Application approved successfully'
        });
    } catch (error) {
        console.error('approveApplication error:', error);
        
        if (error.message.includes('not found') || error.message.includes('not pending')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        
        res.status(500).json({ success: false, message: 'Server error approving application' });
    }
};

const rejectApplication = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user.id;
        const { admin_note } = req.body;

        await sellerApplicationService.rejectApplication(parseInt(id), adminId, admin_note);
        
        res.status(200).json({ 
            success: true, 
            message: 'Application rejected'
        });
    } catch (error) {
        console.error('rejectApplication error:', error);
        
        if (error.message.includes('not found') || error.message.includes('not pending')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        
        res.status(500).json({ success: false, message: 'Server error rejecting application' });
    }
};

module.exports = {
    submitApplication,
    getMyApplication,
    getAllApplications,
    approveApplication,
    rejectApplication
};
