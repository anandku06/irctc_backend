const { ConflictError, BadRequestError, ForbiddenError } = require('../utils/error');
const bcrypt = require('bcrypt');
const { generateAndStoreOTP, checkOTP } = require('../utils/otp');
const prisma = require('../config/prisma');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/auth');
const { redis } = require('../config/redis');
const { config } = require('../config');

const sendOTP = async (firstName, lastName, email, password) => {
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        throw new ConflictError('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const meta = {
        firstName,
        lastName,
        email,
        hashedPassword
    };

    const { otp, otpSessionId } = await generateAndStoreOTP(meta);

    await sendOTPEmail(email, otp);

    return { otpSessionId };
}

const verifyOTP = async (otpSessionId, otp) => {
    const meta = await checkOTP(otpSessionId, otp);
    if (meta === null) {
        throw new BadRequestError('Invalid OTP', 'OTP_INVALID');
    }

    const user = await prisma.user.create({
        data: {
            firstName: meta.firstName,
            lastName: meta.lastName,
            email: meta.email,
            password: meta.hashedPassword,
            emailVerified: true,
        }
    })

    // TODO: Send a welcome email or any other post-verification actions here, using Kafka

    return user;
}

const login = async (email, password, deviceId) => {
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });
    if (!existingUser) {
        throw new BadRequestError('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, existingUser.password);
    if (!isPasswordValid) {
        throw new BadRequestError('Invalid email or password');
    }

    const accessToken = generateAccessToken(existingUser.id);
    const refreshToken = generateRefreshToken(existingUser.id);

    const { jti } = jwt.decode(refreshToken);
    await redis.set(`refresh:${existingUser.id}:${deviceId}`, jti, 'EX', config.REFRESH_TOKEN_EXPIRY_SECONDS);

    const { password: _password, ...userWithoutPassword } = existingUser;
    await redis.set(`user:${existingUser.id}`, JSON.stringify(userWithoutPassword), 'EX', config.REDIS_USER_TTL);

    return {
        access_token: accessToken,
        refresh_token: refreshToken,
        logged_in_user: userWithoutPassword,
    };
}

const rotateRefreshToken = async (refreshToken, deviceId) => {
    const payload = verifyRefreshToken(refreshToken, config.JWT_REFRESH_SECRET);
    const { id: userId, jti } = payload;

    const storedJti = await redis.get(`refresh:${userId}:${deviceId}`);
    if (!storedJti) {
        throw new ForbiddenError('Invalid refresh token', "REFRESH_TOKEN_INVALID");
    }

    if (storedJti !== jti) {
        await redis.del(`refresh:${userId}:${deviceId}`);
        throw new ForbiddenError('Refresh token has been used or is invalid', "REFRESH_TOKEN_INVALID");
    }

    const newAccessToken = generateAccessToken(userId);
    const newRefreshToken = generateRefreshToken(userId);

    const { jti: newJti } = jwt.decode(newRefreshToken);

    await redis.set(`refresh:${userId}:${deviceId}`, newJti, 'EX', config.REFRESH_TOKEN_EXPIRY_SECONDS);

    return {
        newAccessToken,
        newRefreshToken,
    };
}

module.exports = {
    sendOTP,
    verifyOTP,
    login,
    rotateRefreshToken,
};
