const crypto = require('crypto');
const { config } = require('../config');
const jwt = require('jsonwebtoken');


const JWT_SECRET = config.JWT_ACCESS_SECRET;
const REFRESH_SECRET = config.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRY = config.JWT_ACCESS_EXPIRY;
const REFRESH_TOKEN_EXPIRY = config.JWT_REFRESH_EXPIRY;

exports.generateAccessToken = (userId) => {
    const payload = { userId };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

exports.generateRefreshToken = (userId) => {
    const payload = {
        id: userId,
        jti: crypto.randomUUID(),
    }

    return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

exports.verifyAccessToken = (accessToken) => {
    return jwt.verify(accessToken, JWT_SECRET);
}

exports.verifyRefreshToken = (refreshToken) => {
    return jwt.verify(refreshToken, REFRESH_SECRET);
}
