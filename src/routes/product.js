const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken, requireSeller } = require('../middlewares/auth');

// Bids will be nested using app.use('/api/products/:id/bids', bidRoutes)
router.get('/seller/my', authenticateToken, requireSeller, productController.getMyProducts);
router.post(
    '/:id/report',
    authenticateToken,
    productController.reportProduct,
);
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductDetail);
router.post('/', authenticateToken, requireSeller, productController.createProduct);
router.put('/:id', authenticateToken, requireSeller, productController.updateMyProduct);
router.delete('/:id', authenticateToken, requireSeller, productController.deleteMyProduct);
router.post('/:id/checkout', authenticateToken, productController.checkoutPayment);

module.exports = router;
