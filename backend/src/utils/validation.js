// backend/src/utils/validation.js
const Joi = require('joi');

// --- User Validation Schemas ---
const registerSchema = Joi.object({
    username: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required(),
});

// --- URL Monitoring Validation Schema ---
const urlSchema = Joi.object({
    name: Joi.string().min(3).max(255).required(),
    url: Joi.string().uri().max(2048).required(),
    type: Joi.string().valid('API', 'DOMAIN').required(),
    monitoring_interval_minutes: Joi.number().integer().min(1).max(1440).required(),
    proxy_config_id: Joi.number().integer().allow(null).optional(),
    is_active: Joi.boolean().truthy(1, '1', 'true').falsy(0, '0', 'false').required(),
});

// --- Proxy Configuration Validation Schema ---
const proxyConfigSchema = Joi.object({
    name: Joi.string().min(3).max(255).required(),
    host: Joi.string().required(),
    port: Joi.number().integer().min(1).max(65535).required(),
    protocol: Joi.string().valid('http', 'https', 'socks4', 'socks5').required(),
    username: Joi.string().allow('').optional(),
    password: Joi.string().allow('').optional(),
    enabled: Joi.boolean().truthy(1, '1', 'true').falsy(0, '0', 'false').required(),
});

// --- Alert Configuration Validation Schema ---
const alertConfigSchema = Joi.object({
    email_recipient: Joi.string().email().allow('').optional(),
    snmp_receiver_host: Joi.string().allow('').optional(),
    snmp_community: Joi.string().allow('').optional(),
    snmp_api_down_oid: Joi.string().pattern(/^(\.\d+)+$/).allow('').optional(),
    snmp_cert_expiry_oid: Joi.string().pattern(/^(\.\d+)+$/).allow('').optional(),
    cert_warning_days: Joi.number().integer().min(1).max(365).required(),
});

// --- Validation Functions ---

exports.validateRegister = (data) => {
    return registerSchema.validate(data);
};

exports.validateLogin = (data) => {
    return loginSchema.validate(data);
};

exports.validateUrl = (data, isUpdate = false) => {
    const schemaToUse = isUpdate
        ? urlSchema.keys({
            name: Joi.string().min(3).max(255).optional(),
            url: Joi.string().uri().max(2048).optional(),
            type: Joi.string().valid('API', 'DOMAIN').optional(),
            monitoring_interval_minutes: Joi.number().integer().min(1).max(1440).optional(),
            proxy_config_id: Joi.number().integer().allow(null).optional(),
            is_active: Joi.boolean().truthy(1, '1', 'true').falsy(0, '0', 'false').optional(),
        }).min(1)
        : urlSchema;

    return schemaToUse.validate(data);
};

exports.validateProxyConfig = (data, isUpdate = false) => {
    const schemaToUse = isUpdate
        ? proxyConfigSchema.keys({
            name: Joi.string().min(3).max(255).optional(),
            host: Joi.string().optional(),
            port: Joi.number().integer().min(1).max(65535).optional(),
            protocol: Joi.string().valid('http', 'https', 'socks4', 'socks5').optional(),
            username: Joi.string().allow('').optional(),
            password: Joi.string().allow('').optional(),
            enabled: Joi.boolean().truthy(1, '1', 'true').falsy(0, '0', 'false').optional(),
        }).min(1)
        : proxyConfigSchema;

    return schemaToUse.validate(data);
};

exports.validateAlertConfig = (data) => {
    return alertConfigSchema.validate(data);
};
