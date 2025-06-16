// backend/src/utils/logger.js
const winston = require('winston');
const config = require('../config'); // Load logging configuration

// Define log levels and colors (optional)
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6,
};

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    verbose: 'cyan',
    debug: 'blue',
    silly: 'grey',
};

// Add colors to Winston
winston.addColors(colors);

// Define the format for log messages
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: true }), // Apply colors to the whole message
    winston.format.printf(
        (info) => `${info.timestamp} : ${info.level}: ${info.message}`
    )
);

// Create the logger instance
const logger = winston.createLogger({
    level: config.logger.level || 'info', // Use log level from config
    levels: levels,
    format: logFormat,
    transports: [
        // Console transport for development
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize({ all: true }),
                logFormat
            ),
        }),
        // File transports for production/long-term logging
        // new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        // new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
    // Exit on error to prevent resource leaks (true by default)
    exitOnError: false,
});

module.exports = logger;
