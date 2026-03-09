const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const modelRoutes = require('./routes/models');

const path = require('path');

const app = express();

// Static Files - Local CDN
app.use('/public', express.static(path.join(__dirname, '../public')));

// Security Middleware
app.use(helmet()); // Sets various HTTP headers for security
app.use(cors({
    origin: '*', // In production, restrict this to your mobile app's domain or use a dynamic check
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
}));

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (req, res) => res.json({ status: 'healthy', timestamp: new Date() }));

// Routes
app.use('/api/models', modelRoutes);

// Error Handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
    });
});

app.listen(config.port, '0.0.0.0', () => {
    console.log(`
🚀 3D Asset Delivery Backend Running
📡 Port: ${config.port}
🔒 Auth: API Key Protected
📦 Storage: Cloudflare R2 / S3 Compatible
    `);
});
