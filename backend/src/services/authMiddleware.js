// backend/src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');
const AppError = require('../utils/appError'); // Custom error class

/**
 * Middleware to protect routes by verifying JWTs.
 * Attaches the decoded user payload to `req.user`.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
module.exports = (req, res, next) => {
    // 1. Get the token from the header
    const authHeader = req.header('Authorization');

    // Check if Authorization header exists and starts with 'Bearer '
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.warn('Access denied: No token or invalid token format.');
        // Use AppError for consistent error handling throughout the application
        return next(new AppError('No token, authorization denied', 401)); // 401 Unauthorized
    }

    // Extract the token (remove 'Bearer ' prefix)
    const token = authHeader.replace('Bearer ', '');

    try {
        // 2. Verify the token
        // jwt.verify throws an error if the token is invalid or expired
        const decoded = jwt.verify(token, config.jwt.secret);

        // 3. Attach the decoded user payload to the request object
        // This makes user information available in subsequent route handlers.
        req.user = decoded; // decoded will contain { id, username, email, iat, exp }
        logger.debug(`Token verified for user ID: ${req.user.id}`);
        next(); // Proceed to the next middleware/route handler
    } catch (error) {
        // Handle specific JWT errors
        if (error.name === 'TokenExpiredError') {
            logger.warn('Access denied: Token expired.');
            return next(new AppError('Token expired', 401));
        }
        if (error.name === 'JsonWebTokenError') {
            logger.warn('Access denied: Invalid token.');
            return next(new AppError('Token is not valid', 401));
        }
        // Catch any other unexpected errors during token verification
        logger.error(`Unexpected error verifying token: ${error.message}`);
        next(new AppError('Authentication failed', 500));
    }
};
