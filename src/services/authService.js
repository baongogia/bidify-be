const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRepo = require('../repositories/authRepository');

const registerUser = async (name, email, password) => {
    // Check if email exists
    const existingUser = await authRepo.findUserByEmail(email);
    if (existingUser) {
        throw new Error('Email already in use');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user with default role BUYER
    const userId = await authRepo.createUser(name, email, passwordHash);
    return { id: userId, name, email, role: 'BUYER', seller_status: 'NONE' };
};

const loginUser = async (email, password) => {
    // Find user by email
    const user = await authRepo.findUserByEmail(email);
    if (!user) {
        throw new Error('Invalid email or password');
    }

    if (user.is_locked) {
        throw new Error('Account is locked');
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
        throw new Error('Invalid email or password');
    }

    // Generate JWT with role and seller_status
    const payload = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'BUYER',
        seller_status: user.seller_status || 'NONE'
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    return {
        token,
        user: payload
    };
};

module.exports = {
    registerUser,
    loginUser
};
