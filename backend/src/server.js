    // backend/src/server.js
    const app = require('./app');
    const { connectDB } = require('./db/connection');
    const config = require('./config');
    const logger = require('./utils/logger');
    const monitoringScheduler = require('./jobs/monitoringScheduler'); // Corrected import to monitoringScheduler.js

    const PORT = config.app.port;

    async function startServer() {
        try {
            // Connect to the database first
            await connectDB();
            logger.info('Database connected successfully.');

            // Start the monitoring jobs after database connection
            monitoringScheduler.start(); // Call start from the correct scheduler
            logger.info('Periodic monitoring started.');

            // Start the Express server
            app.listen(PORT, () => {
                logger.info(`Server running on port ${PORT} in ${config.app.env} mode.`);
            });
        } catch (error) {
            logger.error(`Failed to start server: ${error.message}`);
            // Exit process with failure code
            process.exit(1);
        }
    }

    startServer();

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err, promise) => {
        logger.error(`Unhandled Rejection: ${err.message}`, err);
        // Optionally: close server and exit process
        // server.close(() => process.exit(1));
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
        logger.fatal(`Uncaught Exception: ${err.message}`, err);
        // Optionally: close server and exit process
        // server.close(() => process.exit(1));
    });
    