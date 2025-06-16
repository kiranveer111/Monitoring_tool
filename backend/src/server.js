// backend/src/server.js
const app = require('./app');
const monitoringScheduler = require('./jobs/monitoringScheduler'); // Corrected variable name
const { connectDB } = require('./db/connection');
const config = require('./config');
const logger = require('./utils/logger'); // Ensure logger is imported

const PORT = config.app.port; // Use config.app.port as per config structure

const startServer = async () => {
    try {
        await connectDB(); // Establish database connection
        logger.info('MySQL Pool created and connected successfully.');
        logger.info('Database connected successfully.');

        monitoringScheduler.start(); // Start scheduled monitoring jobs
        logger.info('Periodic monitoring started.');

        app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT} in ${config.app.env} mode.`);
        });
    } catch (error) {
        logger.error(`Failed to start server: ${error.message}`);
        console.error(`Failed to start server:`, error); // Log full error for debugging
        process.exit(1);
    }

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        logger.error(`Unhandled Rejection: ${reason.message || reason}`);
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        // Optionally, exit the process after a grace period or if it's a critical error
        // For development, just log and keep running to allow inspection.
        // For production, consider process.exit(1) after a short delay.
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
        logger.error(`uncaughtException: ${err.message}`);
        console.error('Uncaught Exception:', err);
        // On uncaught exception, exit the process.
        process.exit(1);
    });
};

startServer();
