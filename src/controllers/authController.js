const authService = require('../services/authService');

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const normalizedEmail = (email || '').trim();
        
        // Basic Validation
        if (!name || !normalizedEmail || !password) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({ success: false, message: 'Invalid email format' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        }

        const user = await authService.registerUser(name, normalizedEmail, password);
        res.status(201).json({ success: true, message: 'User registered successfully', data: user });
    } catch (error) {
        if (error.message === 'Email already in use') {
            return res.status(409).json({ success: false, message: error.message });
        }
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Server error during registration' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = (email || '').trim();

        if (!normalizedEmail || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const result = await authService.loginUser(normalizedEmail, password);
        res.status(200).json({ success: true, message: 'Login successful', data: result });
    } catch (error) {
        if (error.message === 'Invalid email or password') {
            return res.status(401).json({ success: false, message: error.message });
        }
        if (error.message === 'Account is locked') {
            return res.status(403).json({ success: false, message: 'Tai khoan cua ban da bi khoa boi quan tri vien' });
        }
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
};

module.exports = {
    register,
    login
};
