const { BadRequestError } = require('../utils/error');
const asyncHandler = require('../utils/asyncHandler');
const { config } = require('../config');
const authService = require('../services/auth.service');

const isProd = process.env.NODE_ENV === 'production';

const cookieOptions = (maxAge) => ({
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: maxAge,
})

exports.sendOTP = asyncHandler(async (req, res) => {
    const { firstName, lastName, email, password, confirmPassword } = req.body;
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
        throw new BadRequestError('All fields are required');
    }

    if (password !== confirmPassword) {
        throw new BadRequestError('Password and Confirm Password do not match');
    }

    const { otpSessionId } = await authService.sendOTP(firstName, lastName, email, password);

    res.cookie("otp_session", otpSessionId, cookieOptions(config.OTP_TTL * 1000)).status(200).json({
        success: true,
        message: 'OTP sent successfully!',
    });
})

exports.verifyOTP = asyncHandler(async (req, res) => {
    const { otp } = req.body;
    const optSessionId = req.cookies.otp_session;

    if (!otp || !optSessionId) {
        throw new BadRequestError('OTP and OTP session ID are required');
    }

    const user = await authService.verifyOTP(optSessionId, otp);
    if (!user) {
        throw new BadRequestError('Invalid OTP', 'OTP_INVALID');
    }

    res.status(200).json({
        success: true,
        message: 'OTP verified successfully!',
        user,
    });
})