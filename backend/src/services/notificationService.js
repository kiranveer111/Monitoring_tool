// backend/src/services/notificationService.js
const nodemailer = require('nodemailer');
const snmp = require('net-snmp');
const config = require('../config');
const logger = require('../utils/logger');
const { getDB } = require('../db/connection'); // To fetch user-specific alert configs

// Nodemailer Transporter Setup
const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure, // Use TLS (true for 465, false for other ports like 587)
    auth: {
        user: config.email.user,
        pass: config.email.pass,
    },
});

/**
 * Sends an email notification.
 * @param {string} to - The recipient's email address.
 * @param {string} subject - The subject of the email.
 * @param {string} text - The plain-text body of the email.
 * @param {string} html - The HTML body of the email.
 * @returns {Promise<void>}
 */
const sendEmail = async (to, subject, text, html) => {
    if (!to || !config.email.user || !config.email.pass || !config.email.host) { // Added host check
        logger.warn('Email sending skipped: recipient, sender email, password, or host not configured.');
        return;
    }
    try {
        const info = await transporter.sendMail({
            from: config.email.from, // Sender address from config
            to,
            subject,
            text,
            html,
        });
        logger.info(`Email sent to ${to} with subject: "${subject}". Message ID: ${info.messageId}`);
    } catch (error) {
        logger.error(`Failed to send email to ${to} for subject "${subject}": ${error.message}`);
        // Log sensitive error details only in development
        if (config.app.env === 'development') { // Use config.app.env as per config structure
            logger.error(`Nodemailer error details: ${JSON.stringify(error)}`);
        }
    }
};

/**
 * Sends an SNMP trap.
 * @param {string} receiverHost - The IP address of the SNMP trap receiver.
 * @param {string} community - The SNMP community string.
 * @param {string} oid - The OID (Object Identifier) of the trap.
 * @param {string} value - The value associated with the OID.
 * @param {number} [type=snmp.ObjectType.OctetString] - The SNMP object type.
 * @returns {void} (Not a Promise, as it's a fire-and-forget for traps)
 */
const sendSnmpTrap = (receiverHost, community, oid, value, type = snmp.ObjectType.OctetString) => {
    // Validate OID format
    if (!oid || typeof oid !== 'string' || !/^(\.\d+)+$/.test(oid)) {
        logger.warn(`SNMP trap sending skipped: Invalid OID string provided: '${oid}'. Must be dot-separated numbers (e.g., .1.3.6.1.4.1.9999.1.1).`);
        return;
    }
    if (!receiverHost || !community) {
        logger.warn('SNMP trap sending skipped: receiver host or community not configured.');
        return;
    }

    const varbinds = [{
        oid: oid,
        type: type,
        value: value
    }];

    // Create a new SNMP session for each trap to ensure proper closing
    const snmpSession = snmp.createSession(
        receiverHost,
        community,
        { timeout: 5000 } // Add a timeout for SNMP sessions
    );

    snmpSession.trap(snmp.TrapType.LinkUp, varbinds, (error) => {
        if (error) {
            logger.error(`Failed to send SNMP trap to ${receiverHost} with OID ${oid}: ${error.message}`);
            // Log sensitive error details only in development
            if (config.app.env === 'development') {
                logger.error(`SNMP error details: ${JSON.stringify(error)}`);
            }
        } else {
            logger.info(`SNMP trap sent to ${receiverHost} for OID: ${oid}`);
        }
        snmpSession.close(); // Important: Close the session after sending the trap
    });
};

/**
 * Fetches user-specific alert configurations from the database.
 * If no specific config is found, returns an object with default values from central config.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<object>} The user's alert configuration.
 */
const getUserAlertConfig = async (userId) => {
    const db = getDB();
    try {
        const [userConfigs] = await db.execute(
            `SELECT email_recipient, snmp_receiver_host, snmp_community, snmp_api_down_oid, snmp_cert_expiry_oid, cert_warning_days
             FROM AlertConfigs WHERE user_id = ?`,
            [userId]
        );
        // If user has a specific config, return it. Otherwise, use global defaults.
        if (userConfigs.length > 0) {
            return userConfigs[0];
        }
        // Fallback to global config values if no user-specific config exists
        return {
            email_recipient: config.alerting.emailRecipient,
            snmp_receiver_host: config.snmp.receiverHost,
            snmp_community: config.snmp.community,
            snmp_api_down_oid: config.alerting.snmpApiDownOid,
            snmp_cert_expiry_oid: config.alerting.snmpCertExpiryOid,
            cert_warning_days: config.alerting.certWarningDays
        };
    } catch (error) {
        logger.error(`Failed to fetch alert config for user ${userId}: ${error.message}`);
        // Fallback to global config if DB fetch fails
        return {
            email_recipient: config.alerting.emailRecipient,
            snmp_receiver_host: config.snmp.receiverHost,
            snmp_community: config.snmp.community,
            snmp_api_down_oid: config.alerting.snmpApiDownOid,
            snmp_cert_expiry_oid: config.alerting.snmpCertExpiryOid,
            cert_warning_days: config.alerting.certWarningDays
        };
    }
};

/**
 * Sends an alert when an API is detected as down.
 * @param {number} userId - The ID of the user who owns the monitored URL.
 * @param {string} url - The URL of the API that is down.
 * @param {string} errorMessage - The error message indicating why it's down.
 * @returns {Promise<void>}
 */
const sendApiDownAlert = async (userId, url, errorMessage) => {
    const userAlertConfig = await getUserAlertConfig(userId);

    const subject = `CRITICAL: API ${url} is DOWN!`;
    const text = `The API ${url} is currently unreachable or returning an error.\nError: ${errorMessage}\n\nPlease investigate immediately.`;
    const html = `
        <p>The API <strong>${url}</strong> is currently unreachable or returning an error.</p>
        <p><strong>Error:</strong> ${errorMessage}</p>
        <p>Please investigate immediately.</p>
        <p>This alert was generated by your Monitoring Tool.</p>
    `;

    if (userAlertConfig.email_recipient) {
        await sendEmail(userAlertConfig.email_recipient, subject, text, html);
    }
    if (userAlertConfig.snmp_receiver_host && userAlertConfig.snmp_api_down_oid) {
        sendSnmpTrap(
            userAlertConfig.snmp_receiver_host,
            userAlertConfig.snmp_community,
            userAlertConfig.snmp_api_down_oid,
            `API Down: ${url} - ${errorMessage}`
        );
    }
};

/**
 * Sends an alert when a domain certificate is expiring soon or has expired.
 * @param {number} userId - The ID of the user who owns the monitored URL.
 * @param {string} url - The URL of the domain with the expiring certificate.
 * @param {Date} expiryDate - The actual expiry date of the certificate.
 * @param {number} daysRemaining - The number of days remaining until expiry.
 * @returns {Promise<void>}
 */
const sendCertificateExpiryAlert = async (userId, url, expiryDate, daysRemaining) => {
    const userAlertConfig = await getUserAlertConfig(userId);

    let subject, text, html;
    if (daysRemaining <= 0) {
        subject = `CRITICAL: Certificate for ${url} has EXPIRED!`;
        text = `The SSL certificate for ${url} expired on ${expiryDate.toDateString()}.\n\nPlease renew the certificate immediately to avoid service disruption.`;
        html = `
            <p>The SSL certificate for <strong>${url}</strong> has <strong>EXPIRED</strong> on <strong>${expiryDate.toDateString()}</strong>.</p>
            <p>Please renew the certificate immediately to avoid service disruption.</p>
            <p>This alert was generated by your Monitoring Tool.</p>
        `;
    } else {
        subject = `WARNING: Certificate for ${url} expires in ${daysRemaining} days!`;
        text = `The SSL certificate for ${url} expires on ${expiryDate.toDateString()} (${daysRemaining} days remaining).\n\nPlease renew the certificate.`;
        html = `
            <p>The SSL certificate for <strong>${url}</strong> expires on <strong>${expiryDate.toDateString()}</strong> (<strong>${daysRemaining} days remaining</strong>).</p>
            <p>Please renew the certificate to avoid service disruption.</p>
            <p>This alert was generated by your Monitoring Tool.</p>
        `;
    }

    if (userAlertConfig.email_recipient) {
        await sendEmail(userAlertConfig.email_recipient, subject, text, html);
    }
    if (userAlertConfig.snmp_receiver_host && userAlertConfig.snmp_cert_expiry_oid) {
        sendSnmpTrap(
            userAlertConfig.snmp_receiver_host,
            userAlertConfig.snmp_community,
            userAlertConfig.snmp_cert_expiry_oid,
            `Cert Expiry: ${url} expires in ${daysRemaining} days`
        );
    }
};

module.exports = {
    sendEmail,
    sendSnmpTrap, // Though typically not called directly by other services
    sendApiDownAlert,
    sendCertificateExpiryAlert,
    getUserAlertConfig // Exposed for potential use in UI if needed
};
