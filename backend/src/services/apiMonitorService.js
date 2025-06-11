    // backend/src/services/apiMonitorService.js
    const axios = require('axios');
    const { getDB } = require('../db/connection');
    const logger = require('../utils/logger');
    const notificationService = require('./notificationService'); // For sending alerts
    const https = require('https'); // For custom HTTPS agent if needed

    /**
     * Checks the status of an API URL.
     * Determines 'up' or 'down' based on HTTP status codes (2xx, 3xx, 4xx are up).
     * @param {object} urlObject - The URL object from the database, including id, url, type, etc.
     */
    async function checkApiUrlStatus(urlObject) {
        const { id: urlId, url, name, user_id, proxy_config_id } = urlObject;
        let status = 'down'; // Default status
        let latency = null;
        let statusCode = null;
        let error = null;
        const startTime = process.hrtime.bigint(); // High-resolution time for latency calculation

        try {
            const axiosConfig = {
                validateStatus: () => true, // Accept all status codes so we can custom handle them
                timeout: 15000, // 15-second timeout for API checks
                headers: {
                    'User-Agent': 'MonitoringTool/1.0 (API-Monitor)'
                }
            };

            // If a proxy is configured, fetch its details and apply to axios config
            if (proxy_config_id) {
                const db = getDB();
                const [proxyConfigs] = await db.execute(
                    `SELECT host, port, protocol, username, password, enabled FROM ProxyConfigs WHERE id = ?`,
                    [proxy_config_id]
                );

                if (proxyConfigs.length > 0 && proxyConfigs[0].enabled) {
                    const proxy = proxyConfigs[0];
                    axiosConfig.proxy = {
                        host: proxy.host,
                        port: proxy.port,
                        protocol: proxy.protocol,
                        auth: (proxy.username && proxy.password) ? { username: proxy.username, password: proxy.password } : undefined
                    };
                    logger.debug(`Using proxy ${proxy.host}:${proxy.port} for URL ID ${urlId}`);
                } else {
                    logger.warn(`Proxy ID ${proxy_config_id} for URL ID ${urlId} is not found or disabled. Proceeding without proxy.`);
                }
            }

            const response = await axios.get(url, axiosConfig);
            const endTime = process.hrtime.bigint();
            latency = Number(endTime - startTime) / 1_000_000; // Convert nanoseconds to milliseconds
            statusCode = response.status;

            // Determine status based on HTTP response code: 2xx, 3xx, 4xx are considered 'up'
            if (response.status >= 200 && response.status < 500) {
                status = 'up';
            } else {
                status = 'down'; // 5xx or other unexpected HTTP statuses
                logger.warn(`API ${name} (${url}) returned status ${response.status}. Marking as DOWN.`);
                error = `HTTP Status: ${response.status}`;
                notificationService.sendApiDownAlert(user_id, url, `HTTP Status ${response.status}`);
            }

        } catch (err) {
            // This catch block handles network errors (e.g., DNS resolution failure, connection refused, timeout)
            const endTime = process.hrtime.bigint();
            latency = Number(endTime - startTime) / 1_000_000; // Calculate latency even on error
            status = 'down';
            statusCode = err.response ? err.response.status : 0; // Use 0 for network/no response errors
            error = err.message;
            logger.error(`Network or unexpected error checking API URL ${url}: ${error.message}`);
            notificationService.sendApiDownAlert(user_id, url, error); // Send alert for network errors
        }

        // Update the database with the new status and latency
        const db = getDB();
        try {
            await db.execute(
                `UPDATE Urls SET
                    last_status = ?,
                    last_checked_at = NOW(),
                    last_latency = ?
                 WHERE id = ?`,
                [status, latency, urlId]
            );
            // Also log to MonitoringLogs table for historical data
            await db.execute(
                `INSERT INTO MonitoringLogs (url_id, status, latency, status_code, error)
                 VALUES (?, ?, ?, ?, ?)`,
                [urlId, status, latency, statusCode, error]
            );
            logger.info(`API URL ID ${urlId} (${name}) status updated to: ${status}, Latency: ${latency ? latency.toFixed(2) + 'ms' : 'N/A'}, Status Code: ${statusCode || 'N/A'}`);
        } catch (dbError) {
            logger.error(`Error updating database for API URL ID ${urlId}: ${dbError.message}`);
        }
    }

    module.exports = {
        checkApiUrlStatus
    };
    