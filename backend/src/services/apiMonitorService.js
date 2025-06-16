// backend/src/services/apiMonitorService.js
const axios = require('axios');
const { getDB } = require('../db/connection');
const logger = require('../utils/logger');
const config = require('../config'); // For timeout config

/**
 * Checks the uptime and latency for an API endpoint.
 * Logs the result and updates the Urls and MonitoringLogs tables.
 * @param {number} urlId - The ID of the URL being monitored.
 * @param {string} url - The URL endpoint to check.
 * @param {object} [proxyConfig=null] - Optional proxy configuration.
 * @returns {Promise<object>} An object containing status, latency, statusCode, and error.
 */
const checkApiUptime = async (urlId, url, proxyConfig = null) => {
    const db = getDB();
    let status = 'down'; // Default status
    let latency = null;
    let statusCode = null;
    let error = null;

    try {
        const start = Date.now();
        const axiosConfig = {
            timeout: config.app.apiTimeout, // Use timeout from config (e.g., 10000ms)
            // Validate all status codes that indicate a response was received (even 4xx, 5xx)
            // This marks the API as 'up' but captures the specific status code.
            validateStatus: (status) => true, // Do not throw for any HTTP status code
        };

        if (proxyConfig && proxyConfig.enabled) {
            axiosConfig.proxy = {
                host: proxyConfig.host,
                port: proxyConfig.port,
                protocol: proxyConfig.protocol || 'http', // Default to http if not specified
                ...(proxyConfig.username && { auth: { username: proxyConfig.username, password: proxyConfig.password } })
            };
            logger.debug(`Using proxy for API check: ${proxyConfig.host}:${proxyConfig.port}`);
        }

        const response = await axios.get(url, axiosConfig);
        latency = Date.now() - start;
        statusCode = response.status;
        status = 'up'; // API responded, so it's 'up'
        logger.info(`API ${url} is UP. Status: ${statusCode}, Latency: ${latency}ms`);

    } catch (err) {
        latency = Date.now() - (start || Date.now()); // Calculate latency even if start wasn't set (unlikely)
        status = 'down';
        statusCode = err.response ? err.response.status : (err.code === 'ECONNABORTED' ? 408 : null); // 408 for timeout
        error = err.message || 'Unknown error during API check.';
        logger.error(`API ${url} is DOWN. Error: ${error}, Status Code: ${statusCode}, Latency: ${latency}ms`);
        console.error(`API ${url} check failed:`, err); // Log full error object for debugging
    } finally {
        // Update the Urls table with the latest status
        try {
            await db.execute(
                `UPDATE Urls SET
                    last_status = ?,
                    last_latency = ?,
                    last_checked_at = NOW(),
                    last_error = ?
                 WHERE id = ?`,
                [status, latency, error, urlId]
            );
        } catch (dbUpdateError) {
            logger.error(`DB error updating Urls table for API ID ${urlId}: ${dbUpdateError.message}`);
        }

        // Insert into MonitoringLogs table
        try {
            await db.execute(
                `INSERT INTO MonitoringLogs (url_id, status, latency, status_code, error, created_at) VALUES (?, ?, ?, ?, ?, NOW())`,
                [urlId, status, latency, statusCode, error]
            );
        } catch (dbLogError) {
            logger.error(`DB error inserting log for API ID ${urlId}: ${dbLogError.message}`);
        }
        return { status, latency, statusCode, error };
    }
};

module.exports = { checkApiUptime };
