const { ConflictError, BadRequestError, ForbiddenError, UnauthorizedError } = require('../utils/error');
const bcrypt = require('bcrypt');
const { generateAndStoreOTP, checkOTP } = require('../utils/otp');
const prisma = require('../config/prisma');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/auth');
const { redis } = require('../config/redis');
const jwt = require('jsonwebtoken');
const { config } = require('../config');
const { OAuth2Client } = require("google-auth-library");
const notificationProducer = require('../kafka/producer/notification.producer');
const logger = require('../config/logger');

const client = new OAuth2Client(config.GOOGLE_CLIENT_ID)


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

    await notificationProducer.sendOtpEmail(email, otp, (config.OTP_TTL / 60)); // Convert TTL from seconds to minutes for the email content

    logger.info(`OTP sent to ${email}: ${otp} (valid for ${config.OTP_TTL / 60} minutes)`);

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

    await notificationProducer.sendWelcomeEmail(meta.email, meta.firstName);
    logger.info(`Welcome email sent to ${meta.email}`);

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

const verifyGoogleIdToken = async (idToken, devId) => {
    const ticket = await client.verifyIdToken({
        idToken,
        audience: config.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload();
    if (!payload.sub || !payload.email) {
        throw new UnauthorizedError('Invalid Google ID Token', 'GOOGLE_ID_TOKEN_INVALID');
    }

    const googleUser = {
        provider: payload.iss,
        providerId: payload.sub,
        email: payload.email,
        firstName: payload.given_name || '',
        lastName: payload.family_name || '',
        emailVerified: payload.email_verified || false,
    };

    const user = await prisma.$transaction(async (tx) => {
        // Check if the user already exists with this Google provider ID
        let existingProvider = await tx.authProvider.findUnique({
            where: {
                provider_providerId: {
                    provider: googleUser.provider,
                    providerId: googleUser.providerId,
                }
            },
            include: {
                user: true,
            }
        })

        // If the user exists, return the associated user
        if (existingProvider) {
            return existingProvider.user;
        }

        // If the user doesn't exist, check if a user with the same email exists
        let existingUser = await tx.user.findUnique({
            where: {
                email: googleUser.email,
            }
        })

        // If a user with the same email exists, link the Google provider to this user
        if (existingUser) {
            await tx.authProvider.create({
                data: {
                    provider: googleUser.provider,
                    providerId: googleUser.providerId,
                    userId: existingUser.id,
                }
            })

            return existingUser; // Return the existing user after linking the provider
        }

        // If no user exists, create a new user and link the Google provider
        return await tx.user.create({
            data: {
                firstName: googleUser.firstName,
                lastName: googleUser.lastName,
                email: googleUser.email,
                emailVerified: googleUser.emailVerified,
                // nested write to create the authProvider record in the same transaction
                AuthProviders: {
                    create: {
                        provider: googleUser.provider,
                        providerId: googleUser.providerId,
                    }
                }
            }
        })
    })

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    const { jti } = jwt.decode(refreshToken);
    await redis.set(`refresh:${user.id}:${devId}`, jti, 'EX', config.REFRESH_TOKEN_EXPIRY_SECONDS);


    const { password: _password, ...userWithoutPassword } = user;
    await redis.set(`user:${user.id}`, JSON.stringify(userWithoutPassword), 'EX', config.REDIS_USER_TTL);

    return {
        access_token: accessToken,
        refresh_token: refreshToken,
        logged_in_user: userWithoutPassword,
    }
}

module.exports = {
    sendOTP,
    verifyOTP,
    login,
    rotateRefreshToken,
    verifyGoogleIdToken,
};
