    // backend/src/utils/logger.js
    const winston = require('winston');
    const path = require('path');

    // Define log file paths
    const logDir = path.join(__dirname, '../../'); // Root of the backend directory
    const combinedLogPath = path.join(logDir, 'combined.log');
    const errorLogPath = path.join(logDir, 'error.log');

    // Define log formats
    const logFormat = winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(info => `${info.timestamp} ${info.level.toUpperCase()}: ${info.message}`)
    );

    const logger = winston.createLogger({
        level: 'info', // Default logging level
        format: logFormat,
        transports: [
            // Console transport for development
            new winston.transports.Console({
                level: 'debug', // Show debug logs in console
                format: winston.format.combine(
                    winston.format.colorize(),
                    logFormat
                ),
                handleExceptions: true, // Handle uncaught exceptions
            }),
            // File transport for all logs (info and above)
            new winston.transports.File({
                filename: combinedLogPath,
                level: 'info',
                maxsize: 5 * 1024 * 1024, // 5MB
                maxFiles: 5,
                tailable: true, // Start writing from the end of the file
            }),
            // File transport for error logs only
            new winston.transports.File({
                filename: errorLogPath,
                level: 'error',
                maxsize: 5 * 1024 * 1024, // 5MB
                maxFiles: 5,
                tailable: true,
            }),
        ],
        exceptionHandlers: [ // Handle exceptions and log them
            new winston.transports.File({ filename: path.join(logDir, 'exceptions.log') })
        ],
        rejectionHandlers: [ // Handle unhandled promise rejections
            new winston.transports.File({ filename: path.join(logDir, 'rejections.log') })
        ]
    });

    // If not in production, set log level to debug for more verbose output
    if (process.env.NODE_ENV !== 'production') {
        logger.level = 'debug';
    }

    module.exports = logger;
    