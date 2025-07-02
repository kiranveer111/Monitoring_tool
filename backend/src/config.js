require('dotenv').config();
console.log('✅ process.env.LDAP_URL:', process.env.LDAP_URL);

module.exports = {
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
  },

 ldap: {
  url: process.env.LDAP_URL,
  bindDN: process.env.LDAP_BIND_DN,
  bindPassword: process.env.LDAP_BIND_PASSWORD,
  baseDN: process.env.LDAP_BASE_DN,
  usernameField: process.env.LDAP_USER_FIELD || 'sAMAccountName',
  useSSL: process.env.LDAP_USE_SSL === 'true',
  version: parseInt(process.env.LDAP_VERSION || '3')
},  

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  },
  
  database: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
  },

    app: {
    port: parseInt(process.env.APP_PORT || '3000'),
    timezone: process.env.TIMEZONE || 'Asia/Kolkata'
  },
   alerting: {
  defaultEmailRecipient: process.env.ALERTING_EMAIL_RECIPIENT,
  certWarningDays: parseInt(process.env.CERT_WARNING_DAYS || '30'),
  snmp: {
    receiverHost: process.env.SNMP_RECEIVER_HOST,
    community: process.env.SNMP_COMMUNITY,
    apiDownOID: process.env.SNMP_API_DOWN_OID,
    certExpiryOID: process.env.SNMP_CERT_EXPIRY_OID
  }
},
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'combined.log',
    errorFile: process.env.LOG_ERROR_FILE || 'error.log'
  }
};