    // backend/src/db/connection.js
    const mysql = require('mysql2/promise');
    const config = require('../config');
    const logger = require('../utils/logger');

    let pool;

    /**
     * Establishes and initializes the MySQL connection pool.
     * This should be called once when the application starts.
     */
    const connectDB = async () => {
        try {
            pool = mysql.createPool({
                host: config.db.host,
                user: config.db.user,
                password: config.db.password,
                database: config.db.database,
                waitForConnections: true,
                connectionLimit: 10, // Maximum number of connections in the pool
                queueLimit: 0      // Unlimited queueing for connections
            });
            // Test the connection by trying to get one from the pool
            await pool.getConnection();
            logger.info('MySQL Pool created and connected successfully.');
        } catch (error) {
            logger.error(`Error connecting to MySQL: ${error.message}`);
            // Re-throw to indicate a critical startup failure
            throw error;
        }
    };

    /**
     * Returns the MySQL connection pool.
     * @returns {mysql.Pool} The MySQL connection pool.
     * @throws {Error} If the database pool has not been initialized.
     */
    const getDB = () => {
        if (!pool) {
            throw new Error('Database pool not initialized. Call connectDB first.');
        }
        return pool;
    };

    module.exports = { connectDB, getDB };
    