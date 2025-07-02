// backend/src/db/connection.js
const mysql = require('mysql2/promise');
const config = require('../config');
const logger = require('../utils/logger');

console.log('✅ config.database:', config.database);

let pool;

const connectDB = async () => {
  try {
    pool = mysql.createPool({
      host: config.database.host,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Test the connection
    const connection = await pool.getConnection();
    connection.release();

    logger.info('✅ MySQL pool created and connected successfully.');
  } catch (error) {
    logger.error(`❌ Error connecting to MySQL: ${error.message}`);
    console.error('❌ Error connecting to MySQL:', error);
    throw error;
  }
};

const getDB = () => {
  if (!pool) {
    logger.error('❌ Database pool not initialized. Call connectDB first.');
    throw new Error('Database pool not initialized. Call connectDB first.');
  }
  return pool;
};

module.exports = {
  connectDB,
  getDB
};
