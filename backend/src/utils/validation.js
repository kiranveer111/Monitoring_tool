// backend/src/utils/validation.js
const Joi = require('joi');

// Joi schema for user registration validation
const registerSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required().messages({
        'string.alphanum': 'Username must contain only alphanumeric characters.',
        'string.min': 'Username must be at least {#limit} characters long.',
        'string.max': 'Username cannot be more than {#limit} characters long.',
        'string.empty': 'Username is required.',
        'any.required': 'Username is required.'
    }),
    email: Joi.string().email({ minDomainSegments: 2, tlds: { allow: ['com', 'net', 'org', 'in', 'io'] } }).required().messages({
        'string.email': 'Please enter a valid email address.',
        'string.empty': 'Email is required.',
        'any.required': 'Email is required.'
    }),
    password: Joi.string().min(8).required().messages({
        'string.min': 'Password must be at least {#limit} characters long.',
        'string.empty': 'Password is required.',
        'any.required': 'Password is required.'
    }),
    role: Joi.string().valid('user', 'admin').default('user') // Allow role during registration, with default
});

// Joi schema for user login validation
const loginSchema = Joi.object({
    username: Joi.string().required().messages({
        'string.empty': 'Username is required.',
        'any.required': 'Username is required.'
    }),
    password: Joi.string().required().messages({
        'string.empty': 'Password is required.',
        'any.required': 'Password is required.'
    }),
});

// Joi schema for URL validation (used for adding and updating)
const urlSchema = Joi.object({
    name: Joi.string().min(3).max(255).required().messages({
        'string.min': 'URL name must be at least {#limit} characters long.',
        'string.max': 'URL name cannot be more than {#limit} characters long.',
        'string.empty': 'URL name is required.',
        'any.required': 'URL name is required.'
    }),
    url: Joi.string().uri().required().messages({ // Validate as a URI
        'string.uri': 'Please enter a valid URL.',
        'string.empty': 'URL is required.',
        'any.required': 'URL is required.'
    }),
    type: Joi.string().valid('API', 'DOMAIN').required().messages({
        'any.only': 'URL type must be either API or DOMAIN.',
        'string.empty': 'URL type is required.',
        'any.required': 'URL type is required.'
    }),
    monitoring_interval_minutes: Joi.number().integer().min(1).required().messages({
        'number.base': 'Monitoring interval must be a number.',
        'number.integer': 'Monitoring interval must be an integer.',
        'number.min': 'Monitoring interval must be at least {#limit} minute.',
        'any.required': 'Monitoring interval is required.'
    }),
    proxy_config_id: Joi.number().integer().allow(null).messages({ // Allow null for no proxy
        'number.base': 'Proxy ID must be a number.',
        'number.integer': 'Proxy ID must be an integer.'
    }),
    is_active: Joi.boolean().required().messages({ // Changed to boolean and made required
        'boolean.base': 'Is active must be a boolean (true/false).',
        'any.required': 'Is active status is required.'
    }),
});

// Joi schema for Proxy Configuration validation
const proxyConfigSchema = Joi.object({
    name: Joi.string().min(3).max(255).required().messages({
        'string.min': 'Proxy name must be at least {#limit} characters long.',
        'string.max': 'Proxy name cannot be more than {#limit} characters long.',
        'string.empty': 'Proxy name is required.',
        'any.required': 'Proxy name is required.'
    }),
    host: Joi.string().required().messages({
        'string.empty': 'Proxy host is required.',
        'any.required': 'Proxy host is required.'
    }),
    port: Joi.number().integer().min(1).max(65535).required().messages({
        'number.base': 'Proxy port must be a number.',
        'number.integer': 'Proxy port must be an integer.',
        'number.min': 'Proxy port must be between 1 and 65535.',
        'number.max': 'Proxy port must be between 1 and 65535.',
        'any.required': 'Proxy port is required.'
    }),
    protocol: Joi.string().valid('http', 'https', 'socks4', 'socks5').default('http').messages({
        'any.only': 'Proxy protocol must be one of http, https, socks4, or socks5.',
        'string.empty': 'Proxy protocol is required.',
        'any.required': 'Proxy protocol is required.'
    }),
    username: Joi.string().allow('').default(null).messages({ // Allow empty string, convert to null
        'string.base': 'Username must be a string.'
    }),
    password: Joi.string().allow('').default(null).messages({ // Allow empty string, convert to null
        'string.base': 'Password must be a string.'
    }),
    enabled: Joi.boolean().required().messages({ // Ensure this is a boolean
        'boolean.base': 'Enabled status must be a boolean (true/false).',
        'any.required': 'Enabled status is required.'
    }),
});

// Joi schema for Alert Configuration validation
const alertConfigSchema = Joi.object({
    email_recipient: Joi.string().email().allow('').default(null).messages({ // Optional email, default to null
        'string.email': 'Please enter a valid email address for recipient.'
    }),
    snmp_receiver_host: Joi.string().allow('').default(null), // Optional
    snmp_community: Joi.string().allow('').default(null),     // Optional
    snmp_api_down_oid: Joi.string().allow('').default(null),  // Optional
    snmp_cert_expiry_oid: Joi.string().allow('').default(null), // Optional
    cert_warning_days: Joi.number().integer().min(1).max(365).default(30).messages({
        'number.base': 'Certificate warning days must be a number.',
        'number.integer': 'Certificate warning days must be an integer.',
        'number.min': 'Certificate warning days must be at least {#limit}.',
        'number.max': 'Certificate warning days cannot exceed {#limit}.'
    })
});

// Validation functions
exports.validateRegister = (data) => registerSchema.validate(data);
exports.validateLogin = (data) => loginSchema.validate(data);
exports.validateUrl = (data, isUpdate = false) => {
    // For updates, allow partial schema (optional fields)
    if (isUpdate) {
        return urlSchema.partial().validate(data);
    }
    return urlSchema.validate(data);
};
exports.validateProxyConfig = (data, isUpdate = false) => {
    if (isUpdate) {
        return proxyConfigSchema.partial().validate(data);
    }
    return proxyConfigSchema.validate(data);
};
exports.validateAlertConfig = (data) => alertConfigSchema.validate(data);
