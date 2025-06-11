    // backend/src/routes/authRoutes.js
    const express = require('express');
    const router = express.Router(); // Ensure router is initialized
    const authController = require('../controllers/authController');
    const authMiddleware = require('../middleware/authMiddleware');

    // Public routes
    router.post('/register', authController.register);
    router.post('/login', authController.login);

    // Protected routes (requires authentication)
    router.use(authMiddleware.protect); // Apply protection to all routes below this line

    router.get('/me', authController.getMe); // Get current authenticated user's details

    // Admin-only route for creating other users (optional, if you want an admin to create users)
    // router.post('/create-user', authMiddleware.restrictTo('admin'), authController.createUser);

    module.exports = router; // Ensure router is exported
    