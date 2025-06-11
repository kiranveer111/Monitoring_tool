    // backend/src/jobs/monitoringScheduler.js
    const cron = require('node-cron');
    const { getDB } = require('../db/connection');
    const apiMonitorService = require('../services/apiMonitorService');
    const certMonitorService = require('../services/certMonitorService');
    const notificationService = require('../services/notificationService');
    const logger = require('../utils/logger');
    const config = require('../config');

    // Store active cron tasks to manage them
    let apiMonitorTask = null;
    let certMonitorTask = null;

    /**
     * Starts the scheduled monitoring tasks.
     * This function should be called once during application startup.
     */
    const start = () => {
        const db = getDB();

        // Schedule API monitoring for all active 'API' type URLs
        // Runs every 1 minute for all active APIs.
        apiMonitorTask = cron.schedule('*/1 * * * *', async () => {
            logger.info('Running scheduled API monitoring check...');
            try {
                // Fetch all active URLs that are of type 'API' and their associated proxy configs
                const [urls] = await db.execute(
                    `SELECT
                        u.id,
                        u.user_id,
                        u.name,
                        u.url,
                        u.type,
                        u.monitoring_interval_minutes,
                        pc.host AS proxy_host,
                        pc.port AS proxy_port,
                        pc.protocol AS proxy_protocol,
                        pc.username AS proxy_username,
                        pc.password AS proxy_password,
                        pc.enabled AS proxy_enabled
                    FROM Urls u
                    LEFT JOIN ProxyConfigs pc ON u.proxy_config_id = pc.id
                    WHERE u.is_active = TRUE AND u.type = 'API'`
                );

                // Iterate over each API URL and perform the check
                for (const urlEntry of urls) {
                    // Only check if enough time has passed since last check (to respect monitoring_interval_minutes)
                    // This cron job acts as a general trigger; precise timing is handled here.
                    // For now, we'll run all active APIs on this fixed schedule.
                    // For per-URL intervals, you would store and manage individual cron.schedule tasks for each URL.
                    const now = new Date();
                    const lastCheckedAt = urlEntry.last_checked_at ? new Date(urlEntry.last_checked_at) : new Date(0);
                    const intervalMinutes = urlEntry.monitoring_interval_minutes;

                    const minutesSinceLastCheck = (now.getTime() - lastCheckedAt.getTime()) / (1000 * 60);

                    if (minutesSinceLastCheck >= intervalMinutes) {
                        logger.debug(`Checking API: ${urlEntry.name} (${urlEntry.url}) (URL ID: ${urlEntry.id})`);
                        await apiMonitorService.checkApiUrlStatus(urlEntry);
                    } else {
                        logger.debug(`Skipping API ${urlEntry.name} (ID: ${urlEntry.id}). Next check in ${intervalMinutes - minutesSinceLastCheck.toFixed(0)} mins.`);
                    }
                }
                logger.info('API monitoring check completed.');
            } catch (error) {
                logger.error(`Error during API monitoring job: ${error.message}`);
            }
        }, {
            scheduled: true,
            timezone: "Asia/Kolkata" // Set your desired timezone
        });

        // Schedule Certificate monitoring for all active 'DOMAIN' type URLs
        // Runs once a day at 2 AM (or the time configured in config.js if applicable)
        certMonitorTask = cron.schedule('0 2 * * *', async () => { // 2 AM every day
            logger.info('Running scheduled Certificate monitoring check...');
            try {
                // Fetch all active URLs that are of type 'DOMAIN'
                const [urls] = await db.execute(`SELECT id, user_id, name, url, type FROM Urls WHERE is_active = TRUE AND type = 'DOMAIN'`);

                // Iterate over each domain URL and check its certificate
                for (const urlEntry of urls) {
                    logger.debug(`Checking certificate for: ${urlEntry.name} (${urlEntry.url}) (URL ID: ${urlEntry.id})`);
                    const result = await certMonitorService.checkCertStatus(urlEntry); // Pass urlEntry object

                    // If certificate is expired or in warning state, trigger an alert
                    // The `result` object from `checkCertStatus` now contains expiryDate and daysRemaining
                    if (result.status === 'expired' || (result.status === 'warning' && result.daysRemaining <= config.alerting.certWarningDays)) {
                        await notificationService.sendCertificateExpiryAlert(urlEntry.user_id, urlEntry.url, result.expiryDate, result.daysRemaining, result.status);
                    }
                }
                logger.info('Certificate monitoring check completed.');
            } catch (error) {
                logger.error(`Error during Certificate monitoring job: ${error.message}`);
            }
        }, {
            scheduled: true,
            timezone: "Asia/Kolkata" // Set your desired timezone
        });
    };

    /**
     * Stops all scheduled monitoring tasks.
     * This is useful for graceful shutdown or testing.
     */
    const stop = () => {
        if (apiMonitorTask) {
            apiMonitorTask.stop();
            logger.info('API monitoring scheduler stopped.');
        }
        if (certMonitorTask) {
            certMonitorTask.stop();
            logger.info('Certificate monitoring scheduler stopped.');
        }
        // Clear any dynamically created intervals if they were implemented differently
        // for (const urlId in global.monitoringIntervals) {
        //     clearInterval(global.monitoringIntervals[urlId]);
        // }
        // global.monitoringIntervals = {};
    };


    /**
     * Schedules a single URL for immediate check and ensures it's picked up by main cron jobs.
     * This function is typically called when a URL is added or updated.
     * It does NOT create new individual cron tasks for each URL.
     * @param {object} urlObject - The URL object from the database.
     */
    async function scheduleMonitor(urlObject) {
        const { id: urlId, url, type, is_active } = urlObject;

        if (!is_active) {
            stopMonitor(urlId); // Ensure it's marked for stop if inactive
            return;
        }

        // Trigger an immediate check for the URL
        logger.info(`Triggering immediate check for URL: ${urlObject.name} (ID: ${urlId}, Type: ${type}).`);
        if (type === 'API') {
            await apiMonitorService.checkApiUrlStatus(urlObject);
        } else if (type === 'DOMAIN') {
            await certMonitorService.checkCertStatus(urlObject);
        }
    }

    /**
     * Marks a URL as stopped for monitoring.
     * In this setup, individual URLs aren't managed by separate cron tasks.
     * This function primarily updates the `is_active` status in the DB which the cron jobs respect.
     * If true per-URL cron tasks were used, this would clear them.
     * @param {number} urlId - The ID of the URL to stop monitoring.
     */
    function stopMonitor(urlId) {
        logger.info(`Monitoring for URL ID: ${urlId} marked for stop (scheduler will skip if inactive).`);
        // If you had per-URL cron tasks or intervals:
        // if (global.monitoringIntervals[urlId]) {
        //     global.monitoringIntervals[urlId].stop(); // For node-cron tasks
        //     delete global.monitoringIntervals[urlId];
        // }
    }

    /**
     * Restarts monitoring for a specific URL (useful after update).
     * @param {object} urlObject - The updated URL object.
     */
    async function restartMonitor(urlObject) {
        // A restart is essentially just rescheduling it if it's active
        if (urlObject.is_active) {
            await scheduleMonitor(urlObject); // Trigger immediate check
            logger.info(`Monitoring restarted/scheduled for URL ID: ${urlObject.id} if active.`);
        } else {
            stopMonitor(urlObject.id); // Ensure it's stopped if it became inactive
        }
    }

    module.exports = {
        start,
        stop,
        scheduleMonitor,
        restartMonitor
    };
    