const { BadRequestError, UnauthorizedError } = require('../utils/error');
const asyncHandler = require('../utils/asyncHandler');
const { config } = require('../config/index');
const authService = require('../services/auth.service');
const { getDeviceFingerprint } = require('../utils/deviceFingerprint');

const isProd = process.env.NODE_ENV === 'production';

const ACCESS_TOKEN_EXPIRY_SECONDS = config.ACCESS_TOKEN_EXPIRY_SECONDS;
const REFRESH_TOKEN_EXPIRY_SECONDS = config.REFRESH_TOKEN_EXPIRY_SECONDS;

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

exports.login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new BadRequestError('Email and Password are required');
    }

    const devId = getDeviceFingerprint(req);

    const { access_token, refresh_token, logged_in_user } = await authService.login(email, password, devId);

    res.cookie("access_token", access_token, cookieOptions(ACCESS_TOKEN_EXPIRY_SECONDS * 1000));

    res.cookie("refresh_token", refresh_token, cookieOptions(REFRESH_TOKEN_EXPIRY_SECONDS * 1000))
        .status(200).json({
            success: true,
            message: 'Login successful!',
            user: logged_in_user,
        })
})

exports.rotateRefreshToken = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) {
        throw new UnauthorizedError('Refresh token is required!', "REFRESH_TOKEN_MISSING");
    }

    const devId = getDeviceFingerprint(req);

    const { newAccessToken, newRefreshToken } = await authService.rotateRefreshToken(refreshToken, devId);

    res.cookie("access_token", newAccessToken, cookieOptions(ACCESS_TOKEN_EXPIRY_SECONDS * 1000));
    res.cookie("refresh_token", newRefreshToken, cookieOptions(REFRESH_TOKEN_EXPIRY_SECONDS * 1000))
        .status(200).json({
            success: true,
            message: 'Refresh token rotated successfully!',
        })
})

exports.verifyGoogleIdToken = asyncHandler(async (req, res) => {
    const { idToken } = req.body;
    if (!idToken) {
        throw new BadRequestError('Google ID Token is required');
    }

    const devId = getDeviceFingerprint(req);

    const { access_token, refresh_token, logged_in_user } = await authService.verifyGoogleIdToken(idToken, devId);

    res.cookie("access_token", access_token, cookieOptions(ACCESS_TOKEN_EXPIRY_SECONDS * 1000));
    res.cookie("refresh_token", refresh_token, cookieOptions(REFRESH_TOKEN_EXPIRY_SECONDS * 1000))
        .status(200).json({
            success: true,
            message: 'Google ID Token verified successfully!',
            user: logged_in_user,
        })
})