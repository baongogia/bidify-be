const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/category'));
app.use('/api/products', require('./routes/product'));
// Bidding is a sub-route of products but can also be registered at product level
app.use('/api/products/:id/bids', require('./routes/bid'));
app.use('/api/watchlist', require('./routes/watchlist'));
app.use('/api/notifications', require('./routes/notification'));
app.use('/api/seller-applications', require('./routes/sellerApplication'));
app.use('/api/admin', require('./routes/admin'));

app.get('/', (req, res) => {
  res.send('Auction API is running');
});

// Default error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

module.exports = app;
