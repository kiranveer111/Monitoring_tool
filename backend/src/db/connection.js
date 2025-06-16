// backend/src/db/connection.js
const mysql = require('mysql2/promise');
const config = require('../config');
const logger = require('../utils/logger'); // Ensure logger is imported

let pool;

const connectDB = async () => {
    try {
        pool = mysql.createPool({
            host: config.db.host,
            user: config.db.user,
            password: config.db.password,
            database: config.db.database,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        // Test the connection by getting and releasing a connection
        const connection = await pool.getConnection();
        connection.release();
        logger.info('MySQL Pool created and connected successfully.');
    } catch (error) {
        logger.error(`Error connecting to MySQL: ${error.message}`);
        console.error(`Error connecting to MySQL:`, error); // Log full error for debugging
        throw error; // Re-throw to indicate connection failure
    }
};

const getDB = () => {
    if (!pool) {
        // This should ideally not happen if connectDB is called at startup
        logger.error('Database pool not initialized. Call connectDB first.');
        throw new Error('Database pool not initialized. Call connectDB first.');
    }
    return pool;
};

module.exports = { connectDB, getDB };
