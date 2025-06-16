const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');
const AppError = require('../utils/appError');

const protect = (req, res, next) => {
  const authHeader = req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Access denied: No token or invalid token format.');
    return next(new AppError('No token, authorization denied', 401));
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    logger.debug(`Token verified for user ID: ${req.user.id}`);
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.warn('Access denied: Token expired.');
      return next(new AppError('Token expired', 401));
    }
    if (error.name === 'JsonWebTokenError') {
      logger.warn('Access denied: Invalid token.');
      return next(new AppError('Token is not valid', 401));
    }
    logger.error(`Unexpected error verifying token: ${error.message}`);
    next(new AppError('Authentication failed', 500));
  }
};

// ✅ Fix: Add and export restrictTo
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

module.exports = { protect, restrictTo };
