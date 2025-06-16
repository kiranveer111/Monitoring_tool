// backend/src/config/index.js
require('dotenv').config(); // Load environment variables from .env file

module.exports = {
    app: {
        env: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 3000,
        timezone: process.env.APP_TIMEZONE || 'UTC', // Default timezone
        apiTimeout: parseInt(process.env.API_TIMEOUT_MS || '10000', 10), // Default 10 seconds for API/TLS calls
    },
    db: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'monitoring_tool',
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'supersecretjwtkeythatshouldbeverylongandrandom',
        expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    },
    email: {
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587', 10),
        secure: process.env.EMAIL_SECURE === 'true', // Convert string 'true' to boolean true
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
        from: process.env.EMAIL_FROM || 'no-reply@monitorpro.com',
    },
    alerting: {
        emailRecipient: process.env.ALERTING_EMAIL_RECIPIENT || 'admin@example.com',
        certWarningDays: parseInt(process.env.ALERTING_CERT_WARNING_DAYS || '30', 10),
        snmpApiDownOid: process.env.SNMP_API_DOWN_OID,
        snmpCertExpiryOid: process.env.SNMP_CERT_EXPIRY_OID,
    },
    snmp: {
        receiverHost: process.env.SNMP_RECEIVER_HOST,
        community: process.env.SNMP_COMMUNITY,
    },
    logger: {
        level: process.env.LOG_LEVEL || 'info', // e.g., 'debug', 'info', 'warn', 'error'
    }
};
