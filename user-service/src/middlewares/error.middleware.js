const { AppError } = require('../utils/error');
const logger = require('../config/logger');

module.exports = (err, req, res, next) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            error: err.code,
            message: err.message
        })
    }

    logger.error("Unexpected error: ", err); // Log the error for debugging

    if (config.NODE_ENV !== 'production') {
        logger.error({
            message: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method,
            body: req.body,
            query: req.query,
        })
    }

    return res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred. Please try again later.'
    })
}