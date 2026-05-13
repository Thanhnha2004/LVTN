const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Route đến từng service
app.use('/api/auth',     createProxyMiddleware({ target: 'http://auth-service:3001',     changeOrigin: true }));
app.use('/api/property', createProxyMiddleware({ target: 'http://property-service:3002', changeOrigin: true }));
app.use('/api/listing',  createProxyMiddleware({ target: 'http://listing-service:3003',  changeOrigin: true }));
app.use('/api/contact',  createProxyMiddleware({ target: 'http://contact-service:3004',  changeOrigin: true }));

app.listen(3000, () => console.log('Gateway running on port 3000'));