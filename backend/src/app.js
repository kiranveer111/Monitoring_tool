// backend/src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const authRoutes = require('./routes/authRoutes');
const monitorRoutes = require('./routes/monitorRoutes'); // Changed from monitoringRoutes to monitorRoutes
const alertRoutes = require('./routes/alertRoutes');
const { errorHandler } = require('./middleware/errorHandler'); // Corrected import: Destructure errorHandler
const AppError = require('./utils/appError'); // Make sure AppError is available for routes/controllers if they use next(new AppError)

const app = express();

// Middleware
app.use(express.json()); // Body parser for JSON requests
app.use(express.urlencoded({ extended: true })); // Body parser for URL-encoded requests
app.use(cors()); // Enable CORS for frontend communication
app.use(helmet()); // Secure Express apps by setting various HTTP headers
app.use(morgan('dev')); // HTTP request logger

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/monitor', monitorRoutes); // Changed from monitoringRoutes to monitorRoutes
app.use('/api/alerts', alertRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).send('API is healthy');
});

// Handle 404 Not Found errors for any unhandled routes
app.all('*', (req, res, next) => {
    // This will catch any requests that didn't match an existing route
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Centralized error handling middleware.
// This MUST be the last middleware added.
app.use(errorHandler); // Now correctly references the function

module.exports = app;
