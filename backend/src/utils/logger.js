const winston = require('winston');
const config = require('../config'); // Ensure this has logger.level defined

// Define log levels and colors
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

// Apply colors to winston (for console only)
winston.addColors(colors);

// Shared plain format (no color)
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} : ${info.level}: ${info.message}`
  )
);

// Colorized format for console only
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} : ${info.level}: ${info.message}`
  )
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logger?.level || 'info',
  levels,
  format: logFormat, // Default (used in file or other transport)
  transports: [
    // Console output (colorized)
    new winston.transports.Console({
      format: consoleFormat
    }),

    // Uncomment if needed:
    // new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
  exitOnError: false,
});

module.exports = logger;
