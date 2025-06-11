// backend/src/controllers/authController.js
const authService = require('../services/authService');
const logger = require('../utils/logger');
const { validateRegister, validateLogin } = require('../utils/validation');
const AppError = require('../utils/appError'); // Explicitly import AppError

/**
 * Handles user registration.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
exports.register = async (req, res, next) => {
    try {
        const { error } = validateRegister(req.body);
        if (error) {
            logger.warn(`Validation error during registration: ${error.details[0].message}`);
            return next(new AppError(error.details[0].message, 400)); // Use AppError
        }

        const { username, email, password } = req.body;
        const newUser = await authService.registerUser(username, email, password);

        // Do not send password hash back to the client
        const { password: _, ...userWithoutPassword } = newUser;
        res.status(201).json({
            message: 'User registered successfully. Please log in.',
            user: userWithoutPassword
        });
        logger.info(`User registered: ${username} (${email})`);
    } catch (error) {
        next(error); // Pass the error to the centralized error handler
    }
};

/**
 * Handles user login.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
exports.login = async (req, res, next) => {
    try {
        const { error } = validateLogin(req.body);
        if (error) {
            logger.warn(`Validation error during login: ${error.details[0].message}`);
            return next(new AppError(error.details[0].message, 400)); // Use AppError
        }

        const { username, password } = req.body;
        const { token, user } = await authService.loginUser(username, password);

        res.status(200).json({
            message: 'Logged in successfully',
            token,
            user: { id: user.id, username: user.username, email: user.email, role: user.role } // Send limited user info including role
        });
        logger.info(`User logged in: ${username}`);
    } catch (error) {
        next(error);
    }
};

/**
 * Gets the current authenticated user's profile.
 * This route requires authentication middleware.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
exports.getMe = async (req, res, next) => { // Renamed from getProfile to getMe
    try {
        // req.user is populated by the authMiddleware
        if (!req.user) {
            return next(new AppError('User not authenticated.', 401));
        }

        // Fetch the user again to ensure we have the latest data from DB
        const user = await authService.findUserById(req.user.id);
        if (!user) {
            return next(new AppError('Authenticated user not found in database.', 404));
        }
        // Do not send password hash
        const { password: _, ...userWithoutPassword } = user;
        res.status(200).json({ user: userWithoutPassword });
        logger.info(`Profile accessed for user ID: ${req.user.id}`);
    } catch (error) {
        next(error);
    }
};
