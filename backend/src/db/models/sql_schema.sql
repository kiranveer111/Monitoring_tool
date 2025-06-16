-- backend/src/db/models/sql_schema.sql
-- This file contains the SQL DDL (Data Definition Language) statements
-- to create the necessary tables for the monitoring tool.
-- These commands should be run directly in your MySQL client.

-- Create the database if it does not exist
CREATE DATABASE IF NOT EXISTS `monitoring_tool`;

-- Use the newly created database
USE `monitoring_tool`;

-- IMPORTANT: For a clean slate during development/initial setup,
-- drop tables if they already exist. This implicitly drops associated indexes.
-- In production, you would typically use a more sophisticated migration tool.
DROP TABLE IF EXISTS `AlertConfigs`;
DROP TABLE IF EXISTS `MonitoringLogs`;
DROP TABLE IF EXISTS `Urls`;
DROP TABLE IF EXISTS `ProxyConfigs`;
DROP TABLE IF EXISTS `Users`;


-- Table for Users
-- Stores user authentication details
CREATE TABLE IF NOT EXISTS `Users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(255) UNIQUE NOT NULL,
    `email` VARCHAR(255) UNIQUE NOT NULL,
    `password` VARCHAR(255) NOT NULL, -- Hashed password
    `role` ENUM('user', 'admin') DEFAULT 'user' NOT NULL, -- Added role column
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table for Proxy Configurations
-- Stores details about proxy servers that can be used for monitoring
CREATE TABLE IF NOT EXISTS `ProxyConfigs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL, -- Link proxy config to a specific user
    `name` VARCHAR(255) NOT NULL,
    `host` VARCHAR(255) NOT NULL,
    `port` INT NOT NULL,
    `protocol` ENUM('http', 'https', 'socks4', 'socks5') DEFAULT 'http',
    `username` VARCHAR(255) NULL, -- Optional proxy authentication
    `password` VARCHAR(255) NULL, -- Optional proxy authentication
    `enabled` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE,
    UNIQUE (`user_id`, `name`) -- Prevent duplicate proxy names per user
);

-- Table for Monitored URLs
-- Stores the URLs that are to be monitored (API endpoints or domains for certificates)
CREATE TABLE IF NOT EXISTS `Urls` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `name` VARCHAR(255) NOT NULL, -- User-friendly name for the URL
    `url` VARCHAR(2048) NOT NULL, -- The actual URL/endpoint to monitor
    `type` ENUM('API', 'DOMAIN') NOT NULL, -- Type of monitoring
    `monitoring_interval_minutes` INT DEFAULT 5, -- How often to monitor this URL
    `proxy_config_id` INT NULL, -- Optional foreign key to ProxyConfigs
    `is_active` BOOLEAN DEFAULT TRUE, -- Whether monitoring is currently active for this URL
    `last_status` ENUM('up', 'down') NULL, -- Last recorded status (added)
    `last_latency` INT NULL, -- Last recorded latency in ms (added)
    `last_checked_at` TIMESTAMP NULL, -- Timestamp of last check (added)
    `certificate_status` ENUM('valid', 'warning', 'expired', 'unavailable', 'error', 'not_applicable', 'not_reachable') NULL, -- Cert status (added)
    `days_remaining` INT NULL, -- Days until cert expiry (added)
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`proxy_config_id`) REFERENCES `ProxyConfigs`(`id`) ON DELETE SET NULL,
    -- FIX: Use a prefix for the 'url' column in the unique index to avoid 'Specified key was too long' error
    UNIQUE KEY `idx_user_url` (`user_id`, `url`(255))
);

-- Table for Monitoring Logs
-- Stores historical uptime/response data for API monitoring
CREATE TABLE IF NOT EXISTS `MonitoringLogs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `url_id` INT NOT NULL,
    `status` ENUM('up', 'down') NOT NULL,
    `latency` INT NULL, -- Response time in milliseconds
    `status_code` INT NULL, -- HTTP status code
    `error` TEXT NULL, -- Error message if status is 'down'
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`url_id`) REFERENCES `Urls`(`id`) ON DELETE CASCADE
);


-- Table for Alert Configurations
-- Stores user-specific alert settings (email, SNMP details)
CREATE TABLE IF NOT EXISTS `AlertConfigs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL UNIQUE, -- One-to-one relationship with Users table
    `email_recipient` VARCHAR(255) NULL, -- Email address to send alerts
    `snmp_receiver_host` VARCHAR(255) NULL,
    `snmp_community` VARCHAR(255) NULL,
    `snmp_api_down_oid` VARCHAR(255) NULL,
    `snmp_cert_expiry_oid` VARCHAR(255) NULL,
    `cert_warning_days` INT DEFAULT 30, -- Days before expiry to trigger certificate warning
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE
);

-- Optional: Add indexes for frequently queried columns to improve performance
CREATE INDEX idx_monitoringlogs_url_id ON `MonitoringLogs` (`url_id`);
CREATE INDEX idx_urls_user_id ON `Urls` (`user_id`);
CREATE INDEX idx_proxyconfigs_user_id ON `ProxyConfigs` (`user_id`);
