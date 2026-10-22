const { ConflictError, BadRequestError } = require('../utils/error');
const bcrypt = require('bcrypt');
const { generateAndStoreOTP, checkOTP } = require('../utils/otp');
const prisma = require('../config/prisma');

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

module.exports = {
    sendOTP,
    verifyOTP,
};
