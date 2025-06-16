// backend/src/routes/monitorRoutes.js
const express = require('express');
const monitoringController = require('../controllers/monitoringController');
const { protect } = require('../middleware/authMiddleware'); // ✅ Destructure protect

const router = express.Router();

// Apply protection to all routes
router.use(protect); // ✅ Correct usage

// --- URL Monitoring Routes ---
router.post('/urls', monitoringController.addUrl);
router.get('/urls', monitoringController.getUrls);
router.put('/urls/:urlId', monitoringController.updateUrl);
router.delete('/urls/:urlId', monitoringController.deleteUrl);
router.get('/urls/:urlId/logs', monitoringController.getMonitoringLogs);
router.get('/urls/:urlId/certificate', monitoringController.getCertificateInfo);

// --- Proxy Configuration Routes ---
router.post('/proxy-configs', monitoringController.addProxyConfig);
router.get('/proxy-configs', monitoringController.getProxyConfigs);
router.put('/proxy-configs/:proxyId', monitoringController.updateProxyConfig);
router.delete('/proxy-configs/:proxyId', monitoringController.deleteProxyConfig);

module.exports = router;
