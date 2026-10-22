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
}

module.exports = { config };