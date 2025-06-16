// backend/src/routes/alertRoutes.js
const express = require('express');
const alertController = require('../controllers/alertController');
const { protect, restrictTo } = require('../middleware/authMiddleware'); // ✅ Destructure functions

const router = express.Router();

// Apply protection to all routes
router.use(protect);

// Admin-only access routes
router.get('/config', restrictTo('admin'), alertController.getAlertConfig);
router.put('/config', restrictTo('admin'), alertController.saveAlertConfig);

module.exports = router;