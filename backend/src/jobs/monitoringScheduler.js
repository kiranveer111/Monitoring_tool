// backend/src/jobs/monitoringScheduler.js
const cron = require('node-cron');
const { getDB } = require('../db/connection');
const apiMonitorService = require('../services/apiMonitorService');
const certMonitorService = require('../services/certMonitorService');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');
const config = require('../config');

// Store scheduled tasks to stop them later
const scheduledTasks = new Map(); // Map to store cron tasks by URL ID

/**
 * Starts the main scheduled monitoring tasks for all active URLs.
 * This should be called once during application startup.
 */
const start = async () => {
    const db = getDB();

    // Clear any existing tasks in case of restart without full process termination
    scheduledTasks.forEach(task => task.stop());
    scheduledTasks.clear();
    logger.info('Cleared existing scheduled tasks upon scheduler start.');

    // Load all active URLs from the database at startup and schedule them
    try {
        const [urls] = await db.execute(
            `SELECT
                u.id, u.user_id, u.name, u.url, u.type, u.monitoring_interval_minutes, u.is_active,
                pc.host AS proxy_host, pc.port AS proxy_port, pc.protocol AS proxy_protocol,
                pc.username AS proxy_username, pc.password AS proxy_password, pc.enabled AS proxy_enabled
            FROM Urls u
            LEFT JOIN ProxyConfigs pc ON u.proxy_config_id = pc.id
            WHERE u.is_active = TRUE`
        );

        urls.forEach(urlEntry => {
            scheduleMonitor(urlEntry); // Schedule each active URL
        });
        logger.info(`Scheduled ${urls.length} initial active URLs.`);
    } catch (error) {
        logger.error(`Error loading initial URLs for scheduling: ${error.message}`);
        console.error(`Error loading initial URLs for scheduling:`, error);
    }

    // It's generally better to rely on individual scheduling for precision.
    // General API and Certificate checks are good for initial run or fallback,
    // but the per-URL cron should be the primary mechanism.
    // If you explicitly want a general API check, keep it. Otherwise, rely on per-URL.

    // Example of a general recurring task (e.g., re-sync or health checks)
    // Removed general API and Cert checks that could interfere with specific per-URL scheduling
    // and rely on `scheduleMonitor` for initial and updated scheduling.
    // If you need a general check, define it here, but ensure it doesn't conflict
    // with the precise per-URL monitoring.
    logger.info('Monitoring scheduler started. Individual URL monitoring will be managed by their respective cron jobs.');
};

/**
 * Schedules a monitoring task for a single URL.
 * Each URL gets its own cron job based on its monitoring interval.
 * @param {object} urlEntry - The URL object from the database with all details including proxy.
 */
const scheduleMonitor = (urlEntry) => {
    const { id, user_id, url, name, type, monitoring_interval_minutes, is_active } = urlEntry;
    const intervalCron = `*/${monitoring_interval_minutes} * * * *`; // e.g., "*/5 * * * *" for every 5 minutes

    // Stop any existing task for this URL before re-scheduling
    stopMonitor(id); // Ensure we stop existing tasks for this URL ID

    if (!is_active) {
        logger.info(`Monitoring for URL ID ${id} (${name}) is inactive. Not scheduling.`);
        return;
    }

    // Determine the task key based on URL type
    const taskKey = `url-${id}`; // Use a single key for a URL, as it might switch types

    // Define the async function to execute for the cron job
    const monitorJob = async () => {
        logger.info(`Running scheduled ${type} check for: ${name} (URL ID: ${id})`);
        try {
            if (type === 'API') {
                const proxyConfig = urlEntry.proxy_host ? {
                    host: urlEntry.proxy_host,
                    port: urlEntry.proxy_port,
                    protocol: urlEntry.proxy_protocol,
                    username: urlEntry.proxy_username,
                    password: urlEntry.proxy_password,
                    enabled: urlEntry.proxy_enabled
                } : null;
                const result = await apiMonitorService.checkApiUptime(id, url, proxyConfig);
                if (result.status === 'down') {
                    await notificationService.sendApiDownAlert(user_id, url, result.error);
                }
            } else if (type === 'DOMAIN') {
                // Pass the full urlEntry object to certMonitorService.checkCertStatus
                const result = await certMonitorService.checkCertStatus(urlEntry);
                if (result.status === 'expired' || (result.status === 'warning' && result.daysRemaining <= config.alerting.certWarningDays)) {
                    await notificationService.sendCertificateExpiryAlert(user_id, url, result.expiryDate, result.daysRemaining);
                }
            }
        } catch (error) {
            logger.error(`Error during scheduled monitoring for URL ID ${id} (${name}): ${error.message}`);
            console.error(`Error during scheduled monitoring for URL ID ${id} (${name}):`, error);
            // Optionally, update URL status to 'down' if the monitoring job itself fails unexpectedly
            const db = getDB();
            try {
                await db.execute(
                    `UPDATE Urls SET last_status = 'down', last_checked_at = NOW(), last_error = ? WHERE id = ?`,
                    [`Internal monitoring error: ${error.message}`, id]
                );
            } catch (dbUpdateError) {
                logger.error(`Failed to update URL status after internal monitoring error for ID ${id}: ${dbUpdateError.message}`);
            }
        }
    };

    // Schedule the task
    const task = cron.schedule(intervalCron, monitorJob, {
        scheduled: true,
        timezone: config.app.timezone // Use timezone from config
    });
    scheduledTasks.set(taskKey, task);
    logger.info(`Scheduled ${type} monitoring for URL ID ${id} (${name}) every ${monitoring_interval_minutes} minutes.`);

    // Trigger an immediate check when scheduling a new or updated active URL
    // This ensures the dashboard gets immediate status updates.
    monitorJob(); // Call the job function directly once
    logger.info(`Triggered immediate check for URL: ${name} (ID: ${id}, Type: ${type}).`);
};

/**
 * Stops a monitoring task for a single URL.
 * @param {number} urlId - The ID of the URL whose task needs to be stopped.
 */
const stopMonitor = (urlId) => {
    // Check both possible task keys (API or DOMAIN) as type might have changed or be unknown
    const taskKey = `url-${urlId}`; // Consistent key for a URL ID

    if (scheduledTasks.has(taskKey)) {
        const task = scheduledTasks.get(taskKey);
        task.stop();
        scheduledTasks.delete(taskKey);
        logger.info(`Stopped monitoring for URL ID ${urlId}.`);
    } else {
        logger.debug(`No active task found for URL ID ${urlId} to stop.`);
    }
};

/**
 * Restarts a monitoring task for a URL, useful after updates.
 * @param {object} urlEntry - The updated URL object.
 */
const restartMonitor = (urlEntry) => {
    logger.info(`Restarting monitoring for URL ID ${urlEntry.id} (${urlEntry.name}).`);
    stopMonitor(urlEntry.id); // Stop existing task
    if (urlEntry.is_active) {
        scheduleMonitor(urlEntry); // Schedule new task with updated details if active
    } else {
        logger.info(`Monitoring for URL ID ${urlEntry.id} (${urlEntry.name}) is inactive, not restarting.`);
    }
};

/**
 * Stops all scheduled monitoring tasks.
 */
const stopAll = () => {
    scheduledTasks.forEach(task => task.stop());
    scheduledTasks.clear();
    logger.info('All monitoring tasks stopped.');
};


module.exports = {
  start,
  scheduleMonitor,  // <-- Add this line
  stopMonitor,
  restartMonitor,
  stopAll
};
