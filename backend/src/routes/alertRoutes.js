// backend/src/routes/alertRoutes.js
const express = require('express');
const alertController = require('../controllers/alertController');
const authMiddleware = require('../middleware/authMiddleware'); // Protect all routes

// Initialize an Express Router instance
const router = express.Router();

// All routes in this file will be protected by authentication middleware
// FIX: Apply authMiddleware.protect middleware as a function
router.use(authMiddleware.protect);

// Get the alert configuration for the authenticated user
// GET /api/alerts/config
// FIX: Restrict access to admin users for fetching config
router.get('/config', authMiddleware.restrictTo('admin'), alertController.getAlertConfig);

// Create or update the alert configuration for the authenticated user
// PUT /api/alerts/config
// FIX: Restrict access to admin users for saving config
router.put('/config', authMiddleware.restrictTo('admin'), alertController.saveAlertConfig);

// Export the configured router
module.exports = router;
