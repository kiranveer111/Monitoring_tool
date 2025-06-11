// backend/src/utils/appError.js
/**
 * Custom Error class for operational errors.
 * These are errors that are expected and handled programmatically,
 * such as invalid user input, network issues, or database constraints.
 * They carry a `statusCode` and an `isOperational` flag.
 */
class AppError extends Error {
    constructor(message, statusCode) {
        super(message); // Call the parent (Error) constructor

        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true; // Mark this as an operational error

        // Capture stack trace for better debugging, excluding this constructor call
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError; // Export the class directly
