const cors = require('cors');
const { config } = require('../config');

const allowedOrigins = config.CORS_ALLOWED_ORIGINS.split(',').map(origin => origin.trim());

const corsMiddleware = cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
});

module.exports = corsMiddleware;