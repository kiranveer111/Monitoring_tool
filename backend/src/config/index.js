    // backend/src/config/index.js
    require('dotenv').config(); // Load environment variables from .env file

    module.exports = {
        app: {
            port: process.env.PORT || 3000,
            env: process.env.NODE_ENV || 'development',
        },
        db: {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'monitoring_tool', // Corrected DB name to match sql_schema.sql
        },
        jwt: {
            secret: process.env.JWT_SECRET || 'supersecretjwtkeythatshouldbeverylongandrandom',
            expiresIn: process.env.JWT_EXPIRES_IN || '1h', // e.g., '1h', '7d'
        },
        email: { // Added email configuration for nodemailer
            host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
            port: parseInt(process.env.EMAIL_PORT || '587', 10),
            secure: process.env.EMAIL_SECURE === 'true', // Use TLS, true for 465, false for 587
            user: process.env.EMAIL_USER || '',
            pass: process.env.EMAIL_PASS || '',
            from: process.env.EMAIL_FROM || '"Monitoring Tool" <no-reply@example.com>',
        },
        snmp: { // Added SNMP configuration
            receiverHost: process.env.SNMP_RECEIVER_HOST || '127.0.0.1',
            community: process.env.SNMP_COMMUNITY || 'public',
        },
        alerting: { // Refined alert-specific configurations
            emailRecipient: process.env.ALERTING_EMAIL_RECIPIENT || '',
            snmpApiDownOid: process.env.SNMP_API_DOWN_OID || '',
            snmpCertExpiryOid: process.env.SNMP_CERT_EXPIRY_OID || '',
            certWarningDays: parseInt(process.env.CERT_WARNING_DAYS || '30', 10), // Default 30 days for certificate warning
        },
    };
    