// backend/src/services/certMonitorService.js
const tls = require('tls');
// IMPORTANT: 'node-forge' has been completely removed from this file.
// We will rely on Node.js native TLS certificate object properties directly.
const { getDB } = require('../db/connection');
const logger = require('../utils/logger');
const config = require('../config');
const notificationService = require('./notificationService'); // For sending alerts
const AppError = require('../utils/appError'); // Explicitly import AppError

/**
 * Checks the SSL/TLS certificate status for a given domain URL.
 * This function handles both network reachability and certificate validity.
 * @param {object} urlObject - The URL object from the database, specifically for type 'DOMAIN'.
 * Must contain id, url, name, user_id.
 */
async function checkCertStatus(urlObject) {
    console.log('*** Executing checkCertStatus: Using native Node.js TLS certificate parsing. ***'); // Added for debugging
    const { id: urlId, url, name, user_id } = urlObject;
    let certificateStatus = null; // 'valid', 'warning', 'expired', 'unavailable', 'error', 'not_applicable', 'not_reachable'
    let daysRemaining = null;
    let expiryDate = null;
    let issuer = null; // Will store issuer string
    let subject = null; // Will store subject string
    let certErrorDetails = null; // Specific error for certificate parsing
    let overallStatus = 'down'; // Default for Urls.last_status, assumes unreachable initially

    // Only proceed if the URL is HTTPS
    if (!url.startsWith('https://')) {
        certificateStatus = 'not_applicable';
        daysRemaining = null;
        overallStatus = 'up'; // Non-HTTPS domains are considered 'up' for overall reachability
        logger.info(`URL ID ${urlId} (${name}) is not HTTPS, skipping certificate check. Setting overall status to 'up'.`);
        const db = getDB();
        try {
            await db.execute(
                `UPDATE Urls SET
                    certificate_status = ?,
                    days_remaining = ?,
                    last_status = ?,
                    last_checked_at = NOW()
                 WHERE id = ?`,
                [certificateStatus, daysRemaining, overallStatus, urlId]
            );
        } catch (dbError) {
            logger.error(`DB error updating cert info for non-HTTPS URL ID ${urlId}: ${dbError.message}`);
        }
        return { status: certificateStatus, expiryDate, daysRemaining, issuer, subject, error: certErrorDetails, overallStatus };
    }

    const hostname = new URL(url).hostname;

    // Use a single Promise to manage the async TLS connection and certificate processing
    const checkResult = await new Promise((resolve) => {
        const socket = tls.connect({
            host: hostname,
            port: 443,
            rejectUnauthorized: false, // Allow self-signed certs for inspection, don't fail connection on invalid cert
            timeout: config.app.apiTimeout // Use API timeout from config
        }, () => {
            // Connection successfully established: Site is considered 'up'
            overallStatus = 'up';
            logger.info(`TLS handshake successful for ${url}. Attempting to get certificate.`);

            try {
                const cert = socket.getPeerCertificate(); // Get the certificate object

                // Ensure a valid certificate object is returned and has necessary properties
                if (cert && typeof cert === 'object' && cert.valid_to && cert.valid_from) {
                    expiryDate = new Date(cert.valid_to); // Use valid_to directly
                    const now = new Date();
                    const diffTime = expiryDate.getTime() - now.getTime();
                    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert to days

                    // Robustly extract issuer and subject details directly from the cert object
                    // cert.issuer and cert.subject are objects with properties like CN, O, OU, L, ST, C
                    // Use a fallback to Object.entries if CN is not present or for more comprehensive details
                    issuer = cert.issuer.CN || Object.entries(cert.issuer).map(([key, value]) => `${key}=${value}`).join(', ') || 'N/A';
                    subject = cert.subject.CN || Object.entries(cert.subject).map(([key, value]) => `${key}=${value}`).join(', ') || 'N/A';

                    if (expiryDate < now) {
                        certificateStatus = 'expired';
                        logger.warn(`Cert for ${name} (${url}) is EXPIRED. Days remaining: ${daysRemaining}.`);
                    } else if (daysRemaining <= config.alerting.certWarningDays) {
                        certificateStatus = 'warning';
                        logger.warn(`Cert for ${name} (${url}) is WARNING. Days remaining: ${daysRemaining}.`);
                    } else {
                        certificateStatus = 'valid';
                        logger.info(`Cert for ${name} (${url}) is VALID. Days remaining: ${daysRemaining}.`);
                    }
                } else {
                    certificateStatus = 'unavailable'; // No valid certificate found or parsable
                    certErrorDetails = 'No complete certificate object found or could not be parsed from peer.';
                    logger.warn(`Cert for ${name} (${url}) is UNAVAILABLE or incomplete.`);
                }
            } catch (err) {
                certificateStatus = 'error'; // Error processing/parsing the certificate
                certErrorDetails = `Error processing certificate: ${err.message}`;
                logger.error(`Error processing certificate for ${url}: ${err.message}`);
                console.error(`Error processing certificate for ${url}:`, err); // Log the actual error
            } finally {
                socket.destroy(); // Always destroy the socket
                // Resolve with all collected data
                resolve({ status: certificateStatus, expiryDate, daysRemaining, issuer, subject, error: certErrorDetails, overallStatus });
            }
        });

        socket.on('error', (err) => {
            // Network-level error: site not reachable or connection refused
            certificateStatus = 'not_reachable';
            overallStatus = 'down'; // Connection itself failed
            certErrorDetails = `TLS connection error: ${err.message}`;
            daysRemaining = null;
            logger.error(`TLS connection error for ${url}: ${err.message}`);
            console.error(`TLS connection error for ${url}:`, err); // Log the actual error
            socket.destroy();
            resolve({ status: certificateStatus, expiryDate, daysRemaining, issuer, subject, error: certErrorDetails, overallStatus });
        });

        socket.on('timeout', () => {
            // Connection timed out
            certificateStatus = 'not_reachable';
            overallStatus = 'down'; // Connection timed out
            certErrorDetails = 'TLS connection timed out.';
            daysRemaining = null;
            logger.error(`TLS connection to ${url} timed out.`);
            console.error(`TLS connection to ${url} timed out.`); // Log the actual error
            socket.destroy();
            resolve({ status: certificateStatus, expiryDate, daysRemaining, issuer, subject, error: certErrorDetails, overallStatus });
        });
    });

    // Update the Urls table with the collected information
    const db = getDB();
    try {
        // Only include last_error if overallStatus is 'down' and an error occurred
        let updateQuery = `UPDATE Urls SET
                                certificate_status = ?,
                                days_remaining = ?,
                                last_status = ?,
                                last_checked_at = NOW()`;
        let updateValues = [checkResult.status, checkResult.daysRemaining, checkResult.overallStatus];

        if (checkResult.error) { // Always log error if it occurred, regardless of overall status
            updateQuery += `, last_error = ?`;
            updateValues.push(checkResult.error);
        } else {
            updateQuery += `, last_error = NULL`; // Clear previous error if successful
        }
        updateQuery += ` WHERE id = ?`;
        updateValues.push(urlId);

        await db.execute(updateQuery, updateValues);

        logger.info(`URL ID ${urlId} (${name}) certificate status updated to: ${checkResult.status || 'N/A'}, Days Remaining: ${checkResult.daysRemaining || 'N/A'}. Overall status: ${checkResult.overallStatus}.`);
    } catch (dbError) {
        logger.error(`DB error updating certificate info in Urls table for URL ID ${urlId}: ${dbError.message}`);
    }

    return checkResult; // Return the full result object including expiryDate, issuer, subject
}

module.exports = {
    checkCertStatus
};
