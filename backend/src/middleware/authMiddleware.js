    // backend/src/middleware/authMiddleware.js
    const jwt = require('jsonwebtoken');
    const { promisify } = require('util'); // For async JWT verification
    const { getDB } = require('../db/connection');
    const AppError = require('../utils/appError');
    const logger = require('../utils/logger');
    const config = require('../config');

    /**
     * Middleware to protect routes, ensuring user is authenticated.
     * Attaches the authenticated user's details to `req.user`.
     */
    exports.protect = async (req, res, next) => {
        try {
            // 1) Get token and check if it exists
            let token;
            if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
                token = req.headers.authorization.split(' ')[1];
            }

            if (!token) {
                return next(new AppError('You are not logged in! Please log in to get access.', 401));
            }

            // 2) Verify token
            // Promisify jwt.verify for async/await usage
            const decoded = await promisify(jwt.verify)(token, config.jwt.secret);

            // 3) Check if user still exists
            const db = getDB();
            // Select 'role' as well
            const [users] = await db.execute(`SELECT id, username, email, role FROM Users WHERE id = ?`, [decoded.id]);

            if (!users || users.length === 0) {
                return next(new AppError('The user belonging to this token no longer exists.', 401));
            }

            // 4) Grant access to protected route
            req.user = users[0]; // Attach user data (including role) to the request object
            next();
        } catch (error) {
            logger.error(`Authentication error: ${error.message}`);
            if (error.name === 'JsonWebTokenError') {
                return next(new AppError('Invalid token. Please log in again!', 401));
            }
            if (error.name === 'TokenExpiredError') {
                return next(new AppError('Your token has expired! Please log in again.', 401));
            }
            next(new AppError('Authentication failed.', 500));
        }
    };

    /**
     * Middleware to restrict access to specific roles.
     * @param {...string} roles - A list of roles that are allowed to access the route.
     */
    exports.restrictTo = (...roles) => {
        return (req, res, next) => {
            // roles is an array like ['admin', 'manager']
            // Check if user object and role exist, and if user's role is in the allowed roles
            if (!req.user || !req.user.role || !roles.includes(req.user.role)) {
                return next(new AppError('You do not have permission to perform this action.', 403)); // 403 Forbidden
            }
            next();
        };
    };
    