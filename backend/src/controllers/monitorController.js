// backend/src/controllers/monitorController.js
const { getDB } = require('../db/connection');
const AppError = require('../utils/appError'); // Ensure AppError is correctly imported
const logger = require('../utils/logger');
const monitoringScheduler = require('../jobs/monitoringScheduler');
const { validateUrl, validateProxyConfig } = require('../utils/validation');

/**
 * Get all monitored URLs for the authenticated user.
 * Accessible by any authenticated user.
 */
exports.getUrls = async (req, res, next) => {
    const db = getDB();
    const userId = req.user.id; // Get user ID from authenticated request

    try {
        // Fetch URLs along with associated proxy details (if any), and latest monitoring/certificate status
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
                pc.protocol AS proxy_protocol
            FROM Urls u
            LEFT JOIN ProxyConfigs pc ON u.proxy_config_id = pc.id
            WHERE u.user_id = ?
            ORDER BY u.name ASC`, // Order for consistent display
            [userId]
        );
        res.status(200).json({
            status: 'success',
            results: urls.length,
            data: urls, // Directly return the 'urls' array
        });
    } catch (error) {
        logger.error(`Error fetching URLs for user ${userId}: ${error.message}`);
        next(new AppError('Failed to retrieve URLs.', 500)); // Use AppError
    }
};

/**
 * Add a new URL to be monitored.
 * Restricted to 'admin' role.
 */
exports.addUrl = async (req, res, next) => {
    const db = getDB();
    const userId = req.user.id; // Get user ID from authenticated request
    const { name, url, type, monitoring_interval_minutes, proxy_config_id, is_active } = req.body;

    const { error } = validateUrl(req.body);
    if (error) {
        logger.warn(`Validation error adding URL: ${error.details[0].message}`);
        return next(new AppError(error.details[0].message, 400));
    }

    try {
        const [result] = await db.execute(
            `INSERT INTO Urls
             (user_id, name, url, type, monitoring_interval_minutes, proxy_config_id, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, name, url, type, monitoring_interval_minutes, proxy_config_id || null, is_active]
        );

        const newUrlId = result.insertId;

        // Fetch the full URL object with proxy details for scheduling
        const [urls] = await db.execute(
            `SELECT u.*, pc.name as proxy_name, pc.host as proxy_host, pc.port as proxy_port, pc.protocol as proxy_protocol,
                    pc.username AS proxy_username, pc.password AS proxy_password, pc.enabled AS proxy_enabled
             FROM Urls u
             LEFT JOIN ProxyConfigs pc ON u.proxy_config_id = pc.id
             WHERE u.id = ?`,
            [newUrlId]
        );

        if (urls.length > 0 && urls[0].is_active) {
            // Schedule immediate check for the new URL if active
            monitoringScheduler.scheduleMonitor(urls[0]);
        }

        res.status(201).json({
            status: 'success',
            message: 'URL added successfully.',
            data: {
                url: { ...urls[0] }, // Return the full URL object for frontend state update
            },
        });
    } catch (error) {
        logger.error(`Error adding URL for user ${userId}: ${error.message}`);
        next(new AppError('Failed to add URL. Check if URL already exists or input is valid.', 500));
    }
};

/**
 * Update an existing monitored URL.
 * Restricted to 'admin' role.
 */
exports.updateUrl = async (req, res, next) => {
    const db = getDB();
    const userId = req.user.id;
    const urlId = req.params.id; // URL ID from parameters
    const { name, url, type, monitoring_interval_minutes, proxy_config_id, is_active } = req.body;

    // Validate the incoming data, allowing partial updates but enforcing types
    const { error } = validateUrl(req.body, true); // Pass true for update validation (partial schema)
    if (error) {
        logger.warn(`Validation error updating URL ${urlId}: ${error.details[0].message}`);
        return next(new AppError(error.details[0].message, 400));
    }

    try {
        // Construct the update query dynamically based on provided fields
        const updateFields = [];
        const updateValues = [];

        if (name !== undefined) { updateFields.push('name = ?'); updateValues.push(name); }
        if (url !== undefined) { updateFields.push('url = ?'); updateValues.push(url); }
        if (type !== undefined) { updateFields.push('type = ?'); updateValues.push(type); }
        if (monitoring_interval_minutes !== undefined) { updateFields.push('monitoring_interval_minutes = ?'); updateValues.push(monitoring_interval_minutes); }
        // Handle proxy_config_id explicitly as it can be null
        if (proxy_config_id !== undefined) { updateFields.push('proxy_config_id = ?'); updateValues.push(proxy_config_id || null); }
        if (is_active !== undefined) { updateFields.push('is_active = ?'); updateValues.push(is_active); }

        if (updateFields.length === 0) {
            return next(new AppError('No valid fields provided for update.', 400));
        }

        updateFields.push('updated_at = NOW()'); // Always update timestamp
        updateValues.push(urlId, userId); // Add WHERE clause parameters

        const [result] = await db.execute(
            `UPDATE Urls SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`,
            updateValues
        );

        if (result.affectedRows === 0) {
            return next(new AppError('URL not found or not authorized to update.', 404));
        }

        // Fetch the updated full URL object with proxy details for re-scheduling
        const [urls] = await db.execute(
            `SELECT u.*, pc.name as proxy_name, pc.host as proxy_host, pc.port as proxy_port, pc.protocol as proxy_protocol,
                    pc.username AS proxy_username, pc.password AS proxy_password, pc.enabled AS proxy_enabled
             FROM Urls u
             LEFT JOIN ProxyConfigs pc ON u.proxy_config_id = pc.id
             WHERE u.id = ?`,
            [urlId]
        );

        if (urls.length > 0) {
            monitoringScheduler.restartMonitor(urls[0]); // Pass the updated URL object
        }

        res.status(200).json({
            status: 'success',
            message: 'URL updated successfully.',
            data: {
                url: urls[0], // Return the updated URL object
            },
        });
    } catch (error) {
        logger.error(`Error updating URL ID ${urlId} for user ${userId}: ${error.message}`);
        next(new AppError('Failed to update URL.', 500));
    }
};

/**
 * Delete a monitored URL.
 * Restricted to 'admin' role.
 */
exports.deleteUrl = async (req, res, next) => {
    const db = getDB();
    const userId = req.user.id;
    const urlId = req.params.id;

    try {
        // Fetch the URL to check its active status before deleting, so we can stop monitoring
        const [urlToDelete] = await db.execute(
            `SELECT id, is_active FROM Urls WHERE id = ? AND user_id = ?`,
            [urlId, userId]
        );

        if (urlToDelete.length === 0) {
            return next(new AppError('URL not found or not authorized to delete.', 404));
        }

        const [result] = await db.execute(
            `DELETE FROM Urls WHERE id = ? AND user_id = ?`,
            [urlId, userId]
        );

        if (result.affectedRows === 0) {
            // This case should ideally not be hit if urlToDelete.length > 0
            return next(new AppError('URL not found or not authorized to delete.', 404));
        }

        // Stop monitoring for the deleted URL
        monitoringScheduler.stopMonitor(urlId);

        res.status(204).json({ // 204 No Content for successful deletion
            status: 'success',
            data: null,
            message: 'URL deleted successfully.',
        });
    } catch (error) {
        logger.error(`Error deleting URL ID ${urlId} for user ${userId}: ${error.message}`);
        next(new AppError('Failed to delete URL.', 500));
    }
};

/**
 * Get monitoring logs for a specific URL.
 * Accessible by any authenticated user.
 */
exports.getMonitoringLogs = async (req, res, next) => {
    const db = getDB();
    const userId = req.user.id;
    const urlId = req.params.id;
    const limit = parseInt(req.query.limit || '100', 10); // Default limit to 100 logs

    try {
        // First, verify the URL belongs to the user
        const [urls] = await db.execute(
            `SELECT id FROM Urls WHERE id = ? AND user_id = ?`,
            [urlId, userId]
        );

        if (urls.length === 0) {
            return next(new AppError('URL not found or not authorized.', 404));
        }

        // Fetch logs for the specified URL
        const [logs] = await db.execute(
            `SELECT status, latency, status_code, error, created_at
            FROM MonitoringLogs
            WHERE url_id = ?
            ORDER BY created_at DESC
            LIMIT ?`,
            [urlId, limit]
        );

        res.status(200).json({
            status: 'success',
            results: logs.length,
            data: {
                logs,
            },
        });
    } catch (error) {
        logger.error(`Error fetching logs for URL ID ${urlId} for user ${userId}: ${error.message}`);
        next(new AppError('Failed to retrieve monitoring logs.', 500));
    }
};

/**
 * Get certificate information for a specific URL.
 * Accessible by any authenticated user.
 */
exports.getCertificateInfo = async (req, res, next) => {
    const db = getDB();
    const userId = req.user.id;
    const urlId = req.params.id;

    try {
        // First, verify the URL belongs to the user and is a 'DOMAIN' type
        const [urls] = await db.execute(
            `SELECT id, type, certificate_status, days_remaining, last_checked_at FROM Urls WHERE id = ? AND user_id = ? AND type = 'DOMAIN'`,
            [urlId, userId]
        );

        if (urls.length === 0) {
            return next(new AppError('Certificate info not found or not authorized for this URL type.', 404));
        }
        // The Urls table now directly stores `certificate_status` and `days_remaining`
        const certInfo = {
            status: urls[0].certificate_status,
            days_remaining: urls[0].days_remaining,
            last_checked_at: urls[0].last_checked_at // Can be useful for frontend
            // You can add more certificate details here if needed (e.g., issuer, subject, expiry_date)
            // if you store them directly in the Urls table or join with CertificateInfo
        };

        res.status(200).json({
            status: 'success',
            data: {
                certificate: certInfo,
            },
        });
    } catch (error) {
        logger.error(`Error fetching certificate info for URL ID ${urlId} for user ${userId}: ${error.message}`);
        next(new AppError('Failed to retrieve certificate information.', 500));
    }
};


/**
 * Get all proxy configurations for the authenticated user.
 * Accessible by any authenticated user.
 */
exports.getProxyConfigs = async (req, res, next) => {
    const db = getDB();
    const userId = req.user.id;

    try {
        const [proxies] = await db.execute(
            `SELECT * FROM ProxyConfigs WHERE user_id = ? ORDER BY name ASC`,
            [userId]
        );
        res.status(200).json({
            status: 'success',
            results: proxies.length,
            data: {
                proxyConfigs: proxies,
            },
        });
    } catch (error) {
        logger.error(`Error fetching proxy configs for user ${userId}: ${error.message}`);
        next(new AppError('Failed to retrieve proxy configurations.', 500));
    }
};

/**
 * Add a new proxy configuration.
 * Restricted to 'admin' role.
 */
exports.addProxyConfig = async (req, res, next) => {
    const db = getDB();
    const userId = req.user.id;
    const { name, host, port, protocol, username, password, enabled } = req.body;

    const { error } = validateProxyConfig(req.body);
    if (error) {
        logger.warn(`Validation error adding proxy config: ${error.details[0].message}`);
        return next(new AppError(error.details[0].message, 400));
    }

    try {
        const [result] = await db.execute(
            `INSERT INTO ProxyConfigs
             (user_id, name, host, port, protocol, username, password, enabled)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, name, host, port, protocol, username || null, password || null, enabled]
        );

        const newProxyId = result.insertId;
        const [newProxy] = await db.execute(`SELECT * FROM ProxyConfigs WHERE id = ?`, [newProxyId]);


        res.status(201).json({
            status: 'success',
            message: 'Proxy configuration added successfully.',
            data: {
                proxyConfig: newProxy[0], // Return the full new proxy object
            },
        });
    } catch (error) {
        logger.error(`Error adding proxy config for user ${userId}: ${error.message}`);
        next(new AppError('Failed to add proxy configuration.', 500));
    }
};

/**
 * Update an existing proxy configuration.
 * Restricted to 'admin' role.
 */
exports.updateProxyConfig = async (req, res, next) => {
    const db = getDB();
    const userId = req.user.id;
    const proxyId = req.params.id;
    const { name, host, port, protocol, username, password, enabled } = req.body;

    const { error } = validateProxyConfig(req.body, true); // Pass true for update validation
    if (error) {
        logger.warn(`Validation error updating proxy config ${proxyId}: ${error.details[0].message}`);
        return next(new AppError(error.details[0].message, 400));
    }

    try {
        const [result] = await db.execute(
            `UPDATE ProxyConfigs SET
                name = ?,
                host = ?,
                port = ?,
                protocol = ?,
                username = ?,
                password = ?,
                enabled = ?,
                updated_at = NOW()
             WHERE id = ? AND user_id = ?`,
            [name, host, port, protocol, username || null, password || null, enabled, proxyId, userId]
        );

        if (result.affectedRows === 0) {
            return next(new AppError('Proxy configuration not found or not authorized to update.', 404));
        }

        const [updatedProxy] = await db.execute(`SELECT * FROM ProxyConfigs WHERE id = ?`, [proxyId]);

        res.status(200).json({
            status: 'success',
            message: 'Proxy configuration updated successfully.',
            data: {
                proxyConfig: updatedProxy[0], // Return the full updated proxy object
            },
        });
    } catch (error) {
        logger.error(`Error updating proxy config ID ${proxyId} for user ${userId}: ${error.message}`);
        next(new AppError('Failed to update proxy configuration.', 500));
    }
};

/**
 * Delete a proxy configuration.
 * Restricted to 'admin' role.
 */
exports.deleteProxyConfig = async (req, res, next) => {
    const db = getDB();
    const userId = req.user.id;
    const proxyId = req.params.id;

    try {
        // Before deleting proxy config, ensure no URLs are using it
        const [urlsUsingProxy] = await db.execute(
            `SELECT id FROM Urls WHERE proxy_config_id = ? AND user_id = ?`,
            [proxyId, userId]
        );

        if (urlsUsingProxy.length > 0) {
            return next(new AppError('Cannot delete proxy configuration: it is currently in use by one or more monitored URLs.', 409)); // 409 Conflict
        }

        const [result] = await db.execute(
            `DELETE FROM ProxyConfigs WHERE id = ? AND user_id = ?`,
            [proxyId, userId]
        );

        if (result.affectedRows === 0) {
            return next(new AppError('Proxy configuration not found or not authorized to delete.', 404));
        }

        res.status(204).json({ // 204 No Content
            status: 'success',
            data: null,
            message: 'Proxy configuration deleted successfully.',
        });
    } catch (error) {
        logger.error(`Error deleting proxy config ID ${proxyId} for user ${userId}: ${error.message}`);
        next(new AppError('Failed to delete proxy configuration.', 500));
    }
};
