        // backend/src/middleware/errorHandler.js
        const AppError = require('../utils/appError');
        const logger = require('../utils/logger');

        /**
         * Global error handling middleware.
         * This catches all errors passed via `next(err)` in Express routes.
         * It distinguishes between operational errors (AppError) and programming errors.
         * @param {Error} err - The error object.
         * @param {object} req - Express request object.
         * @param {object} res - Express response object.
         * @param {function} next - Express next middleware function (not typically used here).
         */
        const errorHandler = (err, req, res, next) => {
            // Log the error for debugging purposes
            logger.error(err);

            // Default error properties
            err.statusCode = err.statusCode || 500;
            err.status = err.status || 'error';

            if (err.isOperational) {
                // Operational errors (e.g., bad user input, resource not found)
                res.status(err.statusCode).json({
                    status: err.status,
                    message: err.message,
                });
            } else {
                // Programming or unknown errors (e.g., bugs, third-party library errors)
                // Don't leak too much info to the client in production
                if (process.env.NODE_ENV === 'production') {
                    res.status(500).json({
                        status: 'error',
                        message: 'Something went very wrong!',
                    });
                } else {
                    // In development, send full error details
                    res.status(err.statusCode).json({
                        status: err.status,
                        message: err.message,
                        error: err,
                        stack: err.stack,
                    });
                }
            }
        };


        module.exports = { errorHandler }; // Export as an object to be destructured
        