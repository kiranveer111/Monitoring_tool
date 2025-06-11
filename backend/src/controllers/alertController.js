    // backend/src/controllers/alertController.js
    const { getDB } = require('../db/connection');
    const logger = require('../utils/logger');
    const { validateAlertConfig } = require('../utils/validation'); // Assuming validation

    /**
     * Retrieves the alert configuration for the authenticated user.
     * @param {object} req - Express request object.
     * @param {object} res - Express response object.
     * @param {function} next - Express next middleware function.
     */
    exports.getAlertConfig = async (req, res, next) => {
        const db = getDB();
        try {
            const userId = req.user.id;

            const [config] = await db.execute(
                `SELECT email_recipient, snmp_receiver_host, snmp_community, snmp_api_down_oid, snmp_cert_expiry_oid, cert_warning_days
                 FROM AlertConfigs WHERE user_id = ?`,
                [userId]
            );

            if (config.length === 0) {
                // If no config exists, return default or empty values
                return res.status(200).json({
                    email_recipient: '',
                    snmp_receiver_host: '',
                    snmp_community: '',
                    snmp_api_down_oid: '',
                    snmp_cert_expiry_oid: '',
                    cert_warning_days: 30 // Default value
                });
            }

            res.status(200).json(config[0]);
            logger.info(`User ${userId} fetched alert config.`);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Creates or updates the alert configuration for the authenticated user.
     * @param {object} req - Express request object.
     * @param {object} res - Express response object.
     * @param {function} next - Express next middleware function.
     */
    exports.saveAlertConfig = async (req, res, next) => {
        const db = getDB();
        try {
            const { error } = validateAlertConfig(req.body);
            if (error) {
                logger.warn(`Validation error saving alert config: ${error.details[0].message}`);
                return res.status(400).json({ message: error.details[0].message });
            }

            const userId = req.user.id;
            const {
                email_recipient,
                snmp_receiver_host,
                snmp_community,
                snmp_api_down_oid,
                snmp_cert_expiry_oid,
                cert_warning_days
             } = req.body;

            // Use ON DUPLICATE KEY UPDATE to insert if not exists, or update if exists
            const [result] = await db.execute(
                `INSERT INTO AlertConfigs (user_id, email_recipient, snmp_receiver_host, snmp_community, snmp_api_down_oid, snmp_cert_expiry_oid, cert_warning_days)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    email_recipient = VALUES(email_recipient),
                    snmp_receiver_host = VALUES(snmp_receiver_host),
                    snmp_community = VALUES(snmp_community),
                    snmp_api_down_oid = VALUES(snmp_api_down_oid),
                    snmp_cert_expiry_oid = VALUES(snmp_cert_expiry_oid),
                    cert_warning_days = VALUES(cert_warning_days)`,
                [
                    userId,
                    email_recipient || null,
                    snmp_receiver_host || null,
                    snmp_community || null,
                    snmp_api_down_oid || null,
                    snmp_cert_expiry_oid || null,
                    cert_warning_days
                ]
            );

            res.status(200).json({ message: 'Alert configuration saved successfully.' });
            logger.info(`User ${userId} saved alert config.`);
        } catch (error) {
            next(error);
        }
    };
    