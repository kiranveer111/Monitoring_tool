    // backend/src/services/proxyService.js
    // This service could be expanded if proxy management required more complex logic,
    // such as testing proxy reachability or health.
    // For now, it provides basic database retrieval for proxy configurations.
    const logger = require('../utils/logger');
    const { getDB } = require('../db/connection');
    const AppError = require('../utils/appError'); // Assuming AppError for consistent error handling

    /**
     * Retrieves a single proxy configuration by its ID for a specific user.
     * @param {number} proxyId - The ID of the proxy configuration.
     * @param {number} userId - The ID of the user who owns the proxy configuration.
     * @returns {Promise<object|null>} The proxy configuration object, or null if not found/not authorized.
     * @throws {AppError} If a database error occurs.
     */
    exports.getProxyConfigById = async (proxyId, userId) => {
        const db = getDB();
        try {
            const [configs] = await db.execute(
                `SELECT id, name, host, port, protocol, username, password, enabled
                 FROM ProxyConfigs WHERE id = ? AND user_id = ?`,
                [proxyId, userId]
            );
            return configs[0] || null;
        } catch (error) {
            logger.error(`Error retrieving proxy config ${proxyId} for user ${userId}: ${error.message}`);
            throw new AppError('Failed to retrieve proxy configuration.', 500);
        }
    };

    /**
     * Retrieves all proxy configurations for a specific user.
     * @param {number} userId - The ID of the user.
     * @returns {Promise<Array<object>>} An array of proxy configuration objects.
     * @throws {AppError} If a database error occurs.
     */
    exports.getAllProxyConfigsForUser = async (userId) => {
        const db = getDB();
        try {
            const [configs] = await db.execute(
                `SELECT id, name, host, port, protocol, username, enabled FROM ProxyConfigs WHERE user_id = ?`,
                [userId]
            );
            return configs;
        } catch (error) {
            logger.error(`Error retrieving all proxy configs for user ${userId}: ${error.message}`);
            throw new AppError('Failed to retrieve proxy configurations.', 500);
        }
    };
    