const productService = require('../services/productService');

const getProducts = async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        let userId = null;
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            try {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                userId = decoded.id;
            } catch(e) {}
        }

        const result = await productService.listProducts(req.query, userId);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('getProducts error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching products' });
    }
};

const getProductDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const authHeader = req.headers['authorization'];
        let userId = null;
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            try {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                userId = decoded.id;
            } catch(e) {}
        }

        const product = await productService.getProductDetail(id, userId);
        res.status(200).json({ success: true, data: product });
    } catch (error) {
        if (error.message === 'Product not found') {
            return res.status(404).json({ success: false, message: error.message });
        }
        console.error('getProductDetail error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching product detail' });
    }
};

const createProduct = async (req, res) => {
    try {
        const userId = req.user.id;
        const productData = req.body;

        const productId = await productService.createProduct(userId, productData);
        
        res.status(201).json({ 
            success: true, 
            message: 'Product submitted for moderation',
            data: { id: productId }
        });
    } catch (error) {
        console.error(
            'createProduct error:',
            error.code || '',
            error.sqlMessage || error.message,
            error.stack,
        );

        if (
            error.message.includes('required fields') ||
            error.message.includes('must be') ||
            error.message.includes('Giá') ||
            error.message.includes('Bước giá') ||
            error.message.includes('cọc') ||
            error.message.includes('Thời gian đấu giá') ||
            error.message.includes('Danh mục')
        ) {
            return res.status(400).json({ success: false, message: error.message });
        }
        
        res.status(500).json({ success: false, message: 'Server error creating product' });
    }
};

const getMyProducts = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const products = await productService.getMyProducts(sellerId);
        res.status(200).json({ success: true, data: products });
    } catch (error) {
        console.error('getMyProducts error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching seller products' });
    }
};

const updateMyProduct = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const productId = Number(req.params.id);
        await productService.updateMyProduct(sellerId, productId, req.body);

        res.status(200).json({ success: true, message: 'Product updated successfully' });
    } catch (error) {
        console.error('updateMyProduct error:', error);

        if (
            error.message.includes('not found') ||
            error.message.includes('Only') ||
            error.message.includes('Cannot') ||
            error.message.includes('Maximum') ||
            error.message.includes('No valid') ||
            error.message.includes('Duration') ||
            error.message.includes('Starting price')
        ) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.status(500).json({ success: false, message: 'Server error updating product' });
    }
};

const deleteMyProduct = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const productId = Number(req.params.id);
        await productService.deleteMyProduct(sellerId, productId);

        res.status(200).json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        console.error('deleteMyProduct error:', error);

        if (error.message.includes('not found') || error.message.includes('Only') || error.message.includes('Cannot')) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.status(500).json({ success: false, message: 'Server error deleting product' });
    }
};

const checkoutPayment = async (req, res) => {
    try {
        const userId = req.user.id;
        const productId = Number(req.params.id);
        const paymentData = req.body;

        await productService.checkoutProduct(userId, productId, paymentData);

        res.status(200).json({ success: true, message: 'Checkout successful' });
    } catch (error) {
        console.error('checkoutPayment error:', error);
        if (error.message.includes('not found') || error.message.includes('winner') || error.message.includes('already')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Server error during checkout' });
    }
};

module.exports = {
    getProducts,
    getProductDetail,
    createProduct,
    getMyProducts,
    updateMyProduct,
    deleteMyProduct,
    checkoutPayment
};
