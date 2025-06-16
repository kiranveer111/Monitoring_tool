// backend/src/controllers/monitorController.js
const { getDB } = require('../db/connection');
const logger = require('../utils/logger');
const { validateUrl, validateProxyConfig } = require('../utils/validation'); // Assuming validation functions
const monitoringScheduler = require('../jobs/monitoringScheduler'); // Import the scheduler
const AppError = require('../utils/appError'); // Import AppError

/**
 * Adds a new URL for monitoring.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
exports.addUrl = async (req, res, next) => {
    const db = getDB();
    const userId = req.user.id; // User ID from authenticated JWT

    try {
        const { error } = validateUrl(req.body);
        if (error) {
            logger.warn(`Validation error adding URL for user ${userId}: ${error.details[0].message}`);
            return next(new AppError(error.details[0].message, 400));
        }

        const { name, url, type, monitoring_interval_minutes, proxy_config_id, is_active } = req.body;

        const [result] = await db.execute(
            `INSERT INTO Urls (user_id, name, url, type, monitoring_interval_minutes, proxy_config_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, name, url, type, monitoring_interval_minutes, proxy_config_id || null, is_active]
        );

        const newUrlId = result.insertId;

        // Fetch the newly added URL with complete details for scheduling
        const [newUrlEntry] = await db.execute(
            `SELECT u.id, u.user_id, u.name, u.url, u.type, u.monitoring_interval_minutes, u.is_active,
                    pc.host AS proxy_host, pc.port AS proxy_port, pc.protocol AS proxy_protocol,
                    pc.username AS proxy_username, pc.password AS proxy_password, pc.enabled AS proxy_enabled
             FROM Urls u
             LEFT JOIN ProxyConfigs pc ON u.proxy_config_id = pc.id
             WHERE u.id = ?`,
            [newUrlId]
        );

        if (newUrlEntry.length > 0 && newUrlEntry[0].is_active) {
            // Schedule an immediate check for the new URL
            monitoringScheduler.scheduleMonitor(newUrlEntry[0]);
        }

        res.status(201).json({
            status: 'success',
            message: 'URL added successfully',
            data: { url: newUrlEntry[0] } // Return the full URL object
        });
        logger.info(`URL added by user ${userId}: ${name} (${url})`);
    } catch (error) {
        logger.error(`Error adding URL for user ${userId}: ${error.message}. SQL Error: ${error.sqlMessage || 'N/A'}. Error Code: ${error.code || 'N/A'}`);
        if (error.code === 'ER_DUP_ENTRY') {
            // More specific message for duplicate entry
            return next(new AppError('A URL with this name or URL already exists for this user.', 409)); // 409 Conflict
        }
        next(new AppError('Failed to add URL. Please check input or try again.', 500));
    }
};

/**
 * Retrieves all URLs for the authenticated user.
 * Includes latest monitoring log and certificate info if available.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
exports.getUrls = async (req, res, next) => {
    const db = getDB();
    const userId = req.user.id; // User ID from authenticated JWT

    try {
        // Fetch URLs along with associated proxy details, and latest monitoring/certificate status from Urls table
        const [urls] = await db.execute(
            `SELECT
                u.id,
                u.name,
                u.url,
                u.type,
                u.monitoring_interval_minutes,
                u.is_active,
                u.last_status,        -- Fetched directly from Urls table
                u.last_latency,       -- Fetched directly from Urls table
                u.last_checked_at,    -- Fetched directly from Urls table
                u.certificate_status, -- Fetched directly from Urls table
                u.days_remaining,     -- Fetched directly from Urls table
                pc.name AS proxy_name,
                pc.host AS proxy_host,
                pc.port AS proxy_port,
                pc.protocol AS proxy_protocol,
                u.user_id             -- Include user_id for client-side filtering if needed
            FROM Urls u
            LEFT JOIN ProxyConfigs pc ON u.proxy_config_id = pc.id
            WHERE u.user_id = ?
            ORDER BY u.name ASC`,
            [userId]
        );

        res.status(200).json({
            status: 'success',
            results: urls.length,
            data: urls, // Return as 'data' array for frontend consistency
        });
        logger.info(`User ${userId} fetched ${urls.length} URLs.`);
    } catch (error) {
        logger.error(`Error fetching URLs for user ${userId}: ${error.message}. SQL Error: ${error.sqlMessage || 'N/A'}. Error Code: ${error.code || 'N/A'}`);
        next(new AppError('Failed to retrieve URLs.', 500));
    }
};

/**
 * Updates an existing URL.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
exports.updateUrl = async (req, res, next) => {
    const db = getDB();
    const { urlId } = req.params;
    const userId = req.user.id;

    try {
        const { name, url, type, monitoring_interval_minutes, proxy_config_id, is_active } = req.body;

        const { error } = validateUrl(req.body, true); // Pass true for update validation (partial schema)
        if (error) {
            logger.warn(`Validation error updating URL ${urlId} for user ${userId}: ${error.details[0].message}`);
            return next(new AppError(error.details[0].message, 400));
        }

        const [result] = await db.execute(
            `UPDATE Urls SET name = ?, url = ?, type = ?, monitoring_interval_minutes = ?, proxy_config_id = ?, is_active = ?, updated_at = NOW() WHERE id = ? AND user_id = ?`,
            [name, url, type, monitoring_interval_minutes, proxy_config_id || null, is_active, urlId, userId]
        );

        if (result.affectedRows === 0) {
            return next(new AppError('URL not found or not authorized to update.', 404));
        }

        // Fetch the updated URL with complete details for re-scheduling
        const [updatedUrlEntry] = await db.execute(
            `SELECT u.id, u.user_id, u.name, u.url, u.type, u.monitoring_interval_minutes, u.is_active,
                    pc.host AS proxy_host, pc.port AS proxy_port, pc.protocol AS proxy_protocol,
                    pc.username AS proxy_username, pc.password AS proxy_password, pc.enabled AS proxy_enabled
             FROM Urls u
             LEFT JOIN ProxyConfigs pc ON u.proxy_config_id = pc.id
             WHERE u.id = ?`,
            [urlId]
        );

        if (updatedUrlEntry.length > 0) {
            monitoringScheduler.restartMonitor(updatedUrlEntry[0]); // Restart the monitor with updated config
        }

        res.status(200).json({
            status: 'success',
            message: 'URL updated successfully',
            data: { url: updatedUrlEntry[0] }
        });
        logger.info(`URL ${urlId} updated by user ${userId}.`);
    } catch (error) {
        logger.error(`Error updating URL ID ${urlId} for user ${userId}: ${error.message}. SQL Error: ${error.sqlMessage || 'N/A'}. Error Code: ${error.code || 'N/A'}`);
        if (error.code === 'ER_DUP_ENTRY') {
            // More specific message for duplicate entry
            return next(new AppError('A URL with this name or URL already exists for this user.', 409));
        }
        next(new AppError('Failed to update URL.', 500));
    }
};

/**
 * Deletes a URL.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
exports.deleteUrl = async (req, res, next) => {
    const db = getDB();
    const { urlId } = req.params;
    const userId = req.user.id;

    try {
        const [result] = await db.execute(
            `DELETE FROM Urls WHERE id = ? AND user_id = ?`,
            [urlId, userId]
        );

        if (result.affectedRows === 0) {
            return next(new AppError('URL not found or not authorized to delete.', 404));
        }

        // Stop monitoring for the deleted URL
        monitoringScheduler.stopMonitor(urlId);

        res.status(204).json({
            status: 'success',
            data: null,
            message: 'URL deleted successfully'
        }); // 204 No Content
        logger.info(`URL ${urlId} deleted by user ${userId}.`);
    } catch (error) {
        logger.error(`Error deleting URL ID ${urlId} for user ${userId}: ${error.message}. SQL Error: ${error.sqlMessage || 'N/A'}. Error Code: ${error.code || 'N/A'}`);
        next(new AppError('Failed to delete URL.', 500));
    }
};

/**
 * Gets monitoring logs for a specific URL.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
exports.getMonitoringLogs = async (req, res, next) => {
    const db = getDB();
    const { urlId } = req.params;
    const userId = req.user.id;

    try {
        // Ensure limit is always an integer for the SQL query
        const limit = parseInt(req.query.limit || '50', 10); // Default to 50 logs

        // Ensure the URL belongs to the user
        const [urlCheck] = await db.execute('SELECT id FROM Urls WHERE id = ? AND user_id = ?', [urlId, userId]);
        if (urlCheck.length === 0) {
            return next(new AppError('URL not found or not authorized.', 404));
        }

        const [logs] = await db.execute(
            `SELECT status, latency, status_code, error, created_at
            FROM MonitoringLogs
            WHERE url_id = ?
            ORDER BY created_at DESC
            LIMIT ?`,
            [urlId, limit] // Pass limit as a number
        );

        res.status(200).json({
            status: 'success',
            results: logs.length,
            data: { logs } // Wrap logs in a 'data' object for frontend consistency
        });
        logger.info(`User ${userId} fetched ${logs.length} logs for URL ${urlId}.`);
    } catch (error) {
        logger.error(`Error fetching logs for URL ID ${urlId} for user ${userId}: ${error.message}. SQL Error: ${error.sqlMessage || 'N/A'}. Error Code: ${error.code || 'N/A'}`);
        next(new AppError('Failed to retrieve monitoring logs.', 500));
    }
};

/**
 * Gets certificate information for a specific URL.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
exports.getCertificateInfo = async (req, res, next) => {
    const db = getDB();
    const { urlId } = req.params;
    const userId = req.user.id;

    try {
        // Ensure the URL belongs to the user and is of type 'DOMAIN'
        const [urlEntry] = await db.execute('SELECT id, type, certificate_status, days_remaining, last_checked_at FROM Urls WHERE id = ? AND user_id = ? AND type = "DOMAIN"', [urlId, userId]);
        if (urlEntry.length === 0) { // Check if not found OR not a domain
            return next(new AppError('Domain URL not found or not authorized, or not a DOMAIN type URL.', 404));
        }

        const certInfo = {
            status: urlEntry[0].certificate_status,
            days_remaining: urlEntry[0].days_remaining,
            last_checked_at: urlEntry[0].last_checked_at,
            // issuer, subject, expiry_date are not directly in Urls table currently,
            // would need to be added to the Urls table if desired for this API.
            // For now, these fields will be null/undefined from this API if not in Urls table.
        };

        res.status(200).json({
            status: 'success',
            data: { certificate: certInfo }
        });
        logger.info(`User ${userId} fetched certificate info for URL ${urlId}.`);
    } catch (error) {
        logger.error(`Error fetching certificate info for URL ID ${urlId} for user ${userId}: ${error.message}. SQL Error: ${error.sqlMessage || 'N/A'}. Error Code: ${error.code || 'N/A'}`);
        next(new AppError('Failed to retrieve certificate information.', 500));
    }
};


/**
 * Adds a new proxy configuration.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
exports.addProxyConfig = async (req, res, next) => {
    const db = getDB();
    const userId = req.user.id;

    try {
        const { error } = validateProxyConfig(req.body);
        if (error) {
            logger.warn(`Validation error adding proxy config for user ${userId}: ${error.details[0].message}`);
            return next(new AppError(error.details[0].message, 400));
        }

        const { name, host, port, protocol, username, password, enabled } = req.body;

        const [result] = await db.execute(
            `INSERT INTO ProxyConfigs (user_id, name, host, port, protocol, username, password, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, name, host, port, protocol, username || null, password || null, enabled]
        );

        const newProxyId = result.insertId;
        const [newProxyEntry] = await db.execute(`SELECT * FROM ProxyConfigs WHERE id = ?`, [newProxyId]);

        res.status(201).json({
            status: 'success',
            message: 'Proxy configuration added successfully',
            data: { proxyConfig: newProxyEntry[0] }
        });
        logger.info(`Proxy config added by user ${userId}: ${name}`);
    } catch (error) {
        logger.error(`Error adding proxy config for user ${userId}: ${error.message}. SQL Error: ${error.sqlMessage || 'N/A'}. Error Code: ${error.code || 'N/A'}`);
        if (error.code === 'ER_DUP_ENTRY') {
            return next(new AppError('A proxy configuration with this name or host/port combination already exists for this user.', 409));
        }
        next(new AppError('Failed to add proxy configuration.', 500));
    }
};

/**
 * Retrieves all proxy configurations for the authenticated user.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
exports.getProxyConfigs = async (req, res, next) => {
    const db = getDB();
    const userId = req.user.id;

    try {
        const [proxyConfigs] = await db.execute(
            `SELECT id, name, host, port, protocol, username, enabled
            FROM ProxyConfigs WHERE user_id = ? ORDER BY created_at DESC`,
            [userId]
        );
        res.status(200).json({
            status: 'success',
            results: proxyConfigs.length,
            data: { proxyConfigs }
        });
        logger.info(`User ${userId} fetched ${proxyConfigs.length} proxy configs.`);
    } catch (error) {
        logger.error(`Error fetching proxy configs for user ${userId}: ${error.message}. SQL Error: ${error.sqlMessage || 'N/A'}. Error Code: ${error.code || 'N/A'}`);
        next(new AppError('Failed to retrieve proxy configurations.', 500));
    }
};

/**
 * Updates an existing proxy configuration.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
exports.updateProxyConfig = async (req, res, next) => {
    const db = getDB();
    const { proxyId } = req.params;
    const userId = req.user.id;

    try {
        const { name, host, port, protocol, username, password, enabled } = req.body;

        const { error } = validateProxyConfig(req.body, true); // Pass true for update validation
        if (error) {
            logger.warn(`Validation error updating proxy config ${proxyId} for user ${userId}: ${error.details[0].message}`);
            return next(new AppError(error.details[0].message, 400));
        }

        const [result] = await db.execute(
            `UPDATE ProxyConfigs SET name = ?, host = ?, port = ?, protocol = ?, username = ?, password = ?, enabled = ?, updated_at = NOW() WHERE id = ? AND user_id = ?`,
            [name, host, port, protocol, username || null, password || null, enabled, proxyId, userId]
        );

        if (result.affectedRows === 0) {
            return next(new AppError('Proxy configuration not found or not authorized to update.', 404));
        }

        const [updatedProxyEntry] = await db.execute(`SELECT * FROM ProxyConfigs WHERE id = ?`, [proxyId]);

        res.status(200).json({
            status: 'success',
            message: 'Proxy configuration updated successfully',
            data: { proxyConfig: updatedProxyEntry[0] }
        });
        logger.info(`Proxy config ${proxyId} updated by user ${userId}.`);
    } catch (error) {
        logger.error(`Error updating proxy config ID ${proxyId} for user ${userId}: ${error.message}. SQL Error: ${error.sqlMessage || 'N/A'}. Error Code: ${error.code || 'N/A'}`);
        if (error.code === 'ER_DUP_ENTRY') {
            return next(new AppError('A proxy configuration with this name or host/port combination already exists for this user.', 409));
        }
        next(new AppError('Failed to update proxy configuration.', 500));
    }
};

/**
 * Deletes a proxy configuration.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
exports.deleteProxyConfig = async (req, res, next) => {
    const db = getDB();
    const { proxyId } = req.params;
    const userId = req.user.id;

    try {
        // Before deleting, check if any URLs are using this proxy config
        const [urlsUsingProxy] = await db.execute(
            `SELECT id FROM Urls WHERE proxy_config_id = ? AND user_id = ?`,
            [proxyId, userId]
        );

        if (urlsUsingProxy.length > 0) {
            return next(new AppError(`Cannot delete proxy config. It is currently used by ${urlsUsingProxy.length} monitored URL(s).`, 409));
        }

        const [result] = await db.execute(
            `DELETE FROM ProxyConfigs WHERE id = ? AND user_id = ?`,
            [proxyId, userId]
        );

        if (result.affectedRows === 0) {
            return next(new AppError('Proxy configuration not found or not authorized to delete.', 404));
        }

        res.status(204).json({
            status: 'success',
            data: null,
            message: 'Proxy configuration deleted successfully'
        }); // 204 No Content
        logger.info(`Proxy config ${proxyId} deleted by user ${userId}.`);
    } catch (error) {
        logger.error(`Error deleting proxy config ID ${proxyId} for user ${userId}: ${error.message}. SQL Error: ${error.sqlMessage || 'N/A'}. Error Code: ${error.code || 'N/A'}`);
        next(new AppError('Failed to delete proxy configuration.', 500));
    }
};
