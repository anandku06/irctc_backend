const { config } = require("../config");
const redis = require("../config/redis");
const { TooManyRequestsError } = require("./error");
const otpGenerator = require("otp-generator");
const crypto = require("crypto");

const RATE_MAX = parseInt(config.OTP_RATE_MAX_PER_HOUR);
const OTP_TTL = parseInt(config.OTP_TTL || '300', 10); // Default to 5 minutes if not set
const HMAC_SECRET = config.OTP_HMAC_SECRET;
const ATTEMPT_MAX = parseInt(config.OTP_ATTEMPT_MAX, 10); // Default to 5 attempts if not set

function hmacFor(email, otp) {
    return crypto.createHmac('sha256', HMAC_SECRET).update(email + ":" + otp).digest('hex');
}

async function generateAndStoreOTP(meta) {
    const rateKey = `otp_rate:${meta.email}`;
    const sentCnt = parseInt(await redis.get(rateKey) || '0', 10);

    if (sentCnt >= RATE_MAX) {
        throw new TooManyRequestsError("Too many OTP requests. Please try again later.", "OTP_RATE_LIMIT_EXCEEDED");
    }

    const otp = otpGenerator.generate(6, {
        alphabets: false,
        upperCase: false,
        specialChars: false,
    })

    const otpSessionId = crypto.randomUUID();

    const hashedOTP = hmacFor(meta.email, otp);

    await redis.set(`otp:session:${otpSessionId}`, JSON.stringify({
        hashedOTP,
        meta,
    }), 'EX', OTP_TTL);

    // Increment the rate counter and set its expiration to 1 hour
    await redis.multi()
        .incr(rateKey)
        .expire(rateKey, 3600) // 1 hour
        .exec();

    return { otp, otpSessionId };
}

async function checkOTP(otpSessionId, otp) {
    const sessionData = await redis.get(`otp:session:${otpSessionId}`);
    if (!sessionData) {
        throw new TooManyRequestsError("OTP session expired or invalid.", "OTP_SESSION_EXPIRED");
    }

    const { hashedOTP: storedOTP, meta } = JSON.parse(sessionData);

    const attemptKey = `otp_attempts:${meta.email}`;
    const attemptCount = parseInt(await redis.get(attemptKey) || '0', 10);

    if (attemptCount >= ATTEMPT_MAX) {
        throw new TooManyRequestsError("Too many OTP verification attempts. Please try again later.", "OTP_ATTEMPT_LIMIT_EXCEEDED");
    }

    const hashedInputOTP = hmacFor(meta.email, otp);
    if (crypto.timingSafeEqual(Buffer.from(storedOTP, 'hex'), Buffer.from(hashedInputOTP, 'hex'))) {
        // OTP is valid, delete the session and reset attempts
        await redis.del(`otp:session:${otpSessionId}`);
        await redis.del(`otp_rate:${meta.email}`);
        await redis.del(attemptKey);
        return meta;
    }
    else {
        // Increment the attempt counter and set its expiration to 1 hour
        await redis.multi()
            .incr(attemptKey)
            .expire(attemptKey, OTP_TTL) // 1 hour
            .exec();
        return null; // Invalid OTP
    }
}

module.exports = {
    generateAndStoreOTP,
    checkOTP,
};