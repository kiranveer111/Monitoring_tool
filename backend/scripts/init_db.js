// backend/scripts/init_db.js
// This script is used to initialize your MySQL database schema.
// Run this script manually once after setting up your database connection.
// Example: node scripts/init_db.js

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const config = require('../src/config'); // Load DB configuration
const logger = require('../src/utils/logger'); // Use your logger

async function initializeDatabase() {
    const dbConfig = config.db;
    let connection;

    try {
        // Connect without specifying a database to create it if it doesn't exist
        // Use connection.query() for DDL operations like CREATE DATABASE
        connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password
        });

        // Drop the database if it exists (for a clean slate during re-initialization)
        await connection.query(`DROP DATABASE IF EXISTS ${dbConfig.database}`);
        logger.info(`Existing database '${dbConfig.database}' dropped.`);

        // Create the database if it doesn't exist
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
        logger.info(`Database '${dbConfig.database}' ensured to exist.`);

        // Close and reconnect with the specified database
        await connection.end();
        connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password,
            database: dbConfig.database
        });
        logger.info(`Connected to database '${dbConfig.database}'.`);

        // Read the SQL schema file
        const schemaPath = path.join(__dirname, '../src/db/models/sql_schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Split the SQL into individual statements and execute them
        // This is a simple split; for complex schemas, consider a dedicated SQL parser
        const statements = schemaSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            if (statement) { // Ensure statement is not empty after trim/filter
                // Use connection.query() for DDL statements (CREATE TABLE, etc.)
                await connection.query(statement);
            }
        }

        logger.info('Database schema initialized successfully!');

    } catch (error) {
        logger.error(`Error initializing database: ${error.message}`);
        console.error(`Please ensure your MySQL server is running and credentials in .env are correct.`);
        process.exit(1); // Exit with an error code
    } finally {
        if (connection) {
            await connection.end();
            logger.info('Database connection closed.');
        }
    }
}

initializeDatabase();
