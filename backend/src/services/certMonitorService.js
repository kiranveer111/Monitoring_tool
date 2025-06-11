// backend/src/services/certMonitorService.js
const tls = require('tls');
const forge = require('node-forge');
const { getDB } = require('../db/connection');
const logger = require('../utils/logger');
const config = require('../config');
const notificationService = require('./notificationService'); // For sending alerts
const AppError = require('../utils/appError'); // Explicitly import AppError

/**
 * Checks the SSL/TLS certificate status for a given domain URL.
 * @param {object} urlObject - The URL object from the database, specifically for type 'DOMAIN'.
 */
async function checkCertStatus(urlObject) {
    const { id: urlId, url, name, user_id } = urlObject;
    let certificateStatus = null; // 'valid', 'warning', 'expired', 'unavailable', 'error', 'not_applicable', 'not_reachable'
    let daysRemaining = null;
    let expiryDate = null;
    let issuer = null;
    let subject = null;
    let error = null;
    let overallStatus = 'down'; // Default for Urls.last_status, assumes unreachable initially

    // Only proceed if the URL is HTTPS
    if (!url.startsWith('https://')) {
        certificateStatus = 'not_applicable';
        daysRemaining = null;
        overallStatus = 'up'; // Non-HTTPS domains are considered 'up' in terms of service availability for the main status
        logger.info(`URL ID ${urlId} (${name}) is not HTTPS, skipping certificate check. Setting overall status to 'up'.`);
        // Update DB for this case
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
            console.error(`DB error updating cert info for non-HTTPS URL ID ${urlId}:`, dbError);
        }
        return { status: certificateStatus, expiryDate, daysRemaining, issuer, subject, error };
    }

    try {
        const hostname = new URL(url).hostname;

        await new Promise((resolve, reject) => {
            const socket = tls.connect({
                host: hostname,
                port: 443,
                rejectUnauthorized: false, // Allow self-signed certs for inspection, don't fail connection
                timeout: 10000 // 10 seconds TLS handshake timeout
            }, () => {
                // If connection is established, the site is considered 'up' for overall status
                overallStatus = 'up';
                try {
                    const cert = socket.getPeerCertificate(); // Get the certificate object from the socket

                    if (cert && cert.valid_to) {
                        const certificate = forge.pki.certificateFromPem(forge.pki.certificateToPem(cert));
                        expiryDate = new Date(certificate.validity.notAfter);
                        const now = new Date();
                        const diffTime = expiryDate.getTime() - now.getTime();
                        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert to days

                        issuer = certificate.issuer.attributes.map(attr => `${attr.shortName}=${attr.value}`).join(', ');
                        subject = certificate.subject.attributes.map(attr => `${attr.shortName}=${attr.value}`).join(', ');

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
                        error = 'No valid certificate found or could not be parsed.';
                        logger.warn(`Cert for ${name} (${url}) is UNAVAILABLE or could not be parsed.`);
                    }
                    resolve();
                } catch (err) {
                    certificateStatus = 'error';
                    error = `Error processing certificate: ${err.message}`;
                    logger.error(`Error processing certificate for ${url}: ${err.message}`);
                    console.error(`Error processing certificate for ${url}:`, err);
                    reject(err);
                } finally {
                    socket.destroy(); // Always destroy the socket
                }
            });

            socket.on('error', (err) => {
                certificateStatus = 'not_reachable'; // Network error during TLS handshake
                overallStatus = 'down'; // Connection itself failed
                error = `TLS connection error: ${err.message}`;
                daysRemaining = null;
                logger.error(`TLS connection error for ${url}: ${err.message}`);
                console.error(`TLS connection error for ${url}:`, err);
                socket.destroy();
                reject(err);
            });

            socket.on('timeout', () => {
                certificateStatus = 'not_reachable';
                overallStatus = 'down'; // Connection timed out
                error = 'TLS connection timed out.';
                daysRemaining = null;
                logger.error(`TLS connection to ${url} timed out.`);
                console.error(`TLS connection to ${url} timed out.`);
                socket.destroy();
                reject(new Error('TLS connection timed out.'));
            });
        });

    } catch (err) {
        // This catches errors from URL parsing or unexpected promise rejections
        certificateStatus = error ? certificateStatus : 'error';
        overallStatus = 'down'; // If it reaches here, usually the site is truly unreachable
        error = error || `General certificate check error: ${err.message}`;
        daysRemaining = null;
        logger.error(`Overall certificate check failure for ${url}: ${err.message}`);
        console.error(`Overall certificate check failure for ${url}:`, err);
    }

    // Update the Urls table with the certificate information and overall status
    const db = getDB();
    try {
        await db.execute(
            `UPDATE Urls SET
                certificate_status = ?,
                days_remaining = ?,
                last_status = ?,        -- Update overall status based on reachability
                last_checked_at = NOW() -- Also update last_checked_at
             WHERE id = ?`,
            [certificateStatus, daysRemaining, overallStatus, urlId]
        );
        logger.info(`URL ID ${urlId} (${name}) certificate status updated to: ${certificateStatus || 'N/A'}, Days Remaining: ${daysRemaining || 'N/A'}. Overall status: ${overallStatus}`);
    } catch (dbError) {
        logger.error(`Error updating certificate info in Urls table for URL ID ${urlId}: ${dbError.message}`);
        console.error(`Error updating certificate info in Urls table for URL ID ${urlId}:`, dbError);
    }

    return { status: certificateStatus, expiryDate, daysRemaining, issuer, subject, error };
}

module.exports = {
    checkCertStatus
};
