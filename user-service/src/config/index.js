require('dotenv').config();

const config = {
    SERVICE_NAME: process.env.SERVICE_NAME || 'user-service',
    PORT: Number(process.env.PORT),
    NODE_ENV: process.env.NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL,
    REDIS_URL: process.env.REDIS_URL,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    KAFKA_BROKER: process.env.KAFKA_BROKER,
    DATABASE_URL: process.env.DATABASE_URL,

    OTP_TTL: process.env.OTP_TTL || 300,
    OTP_RATE_MAX_PER_HOUR: process.env.OTP_RATE_MAX_PER_HOUR || 5,
    OTP_HMAC_SECRET: process.env.OTP_HMAC_SECRET || 'default_hmac_secret',
    OTP_ATTEMPT_MAX: process.env.OTP_ATTEMPT_MAX || 5,

    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'default_access_secret',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
    JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
    JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',

    ACCESS_TOKEN_EXPIRY_SECONDS: Number(process.env.JWT_ACCESS_EXPIRY_SECONDS || 900), // 15 minutes
    REFRESH_TOKEN_EXPIRY_SECONDS: Number(process.env.JWT_REFRESH_EXPIRY_SECONDS || 604800), // 7 days

    REDIS_USER_TTL: Number(process.env.REDIS_USER_TTL || 86400), // 1 day in seconds
}

module.exports = { config };