    // backend/src/routes/monitorRoutes.js
    const express = require('express');
    const router = express.Router(); // Ensure router is initialized
    const monitorController = require('../controllers/monitorController');
    const authMiddleware = require('../middleware/authMiddleware');

    // Apply authentication middleware to all monitor routes
    router.use(authMiddleware.protect);

    // Routes for URL management
    router.get('/urls', monitorController.getUrls);
    router.post('/urls', authMiddleware.restrictTo('admin'), monitorController.addUrl); // Only admin can add URLs
    router.put('/urls/:id', authMiddleware.restrictTo('admin'), monitorController.updateUrl); // Only admin can update URLs
    router.delete('/urls/:id', authMiddleware.restrictTo('admin'), monitorController.deleteUrl); // Only admin can delete URLs

    // Routes for fetching monitoring logs and certificate info (can be accessible to non-admins)
    router.get('/urls/:id/logs', monitorController.getMonitoringLogs);
    router.get('/urls/:id/certificate', monitorController.getCertificateInfo);

    // Proxy configuration routes (typically admin only)
    router.get('/proxy-configs', monitorController.getProxyConfigs);
    router.post('/proxy-configs', authMiddleware.restrictTo('admin'), monitorController.addProxyConfig);
    router.put('/proxy-configs/:id', authMiddleware.restrictTo('admin'), monitorController.updateProxyConfig);
    router.delete('/proxy-configs/:id', authMiddleware.restrictTo('admin'), monitorController.deleteProxyConfig);

    module.exports = router; // Ensure router is exported
    