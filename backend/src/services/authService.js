    // backend/src/services/authService.js
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    const { getDB } = require('../db/connection');
    const config = require('../config');
    const logger = require('../utils/logger');
    const AppError = require('../utils/appError');

    /**
     * Registers a new user in the database.
     * Sets the default role to 'user'. The very first user registered could be hardcoded as 'admin'
     * or handled via a separate admin-creation mechanism. For simplicity, we'll keep default as 'user'.
     * @param {string} username - The username for the new user.
     * @param {string} email - The email for the new user.
     * @param {string} password - The plain-text password for the new user.
     * @returns {Promise<object>} The newly created user object (without password).
     * @throws {AppError} If username or email already exists.
     */
    exports.registerUser = async (username, email, password) => {
        const db = getDB();
        try {
            // Check if username or email already exists
            const [existingUsers] = await db.execute(
                `SELECT id, username, email FROM Users WHERE username = ? OR email = ?`,
                [username, email]
            );

            if (existingUsers.length > 0) {
                if (existingUsers.some(user => user.username === username)) {
                    throw new AppError('Username already taken.', 409); // 409 Conflict
                }
                if (existingUsers.some(user => user.email === email)) {
                    throw new AppError('Email already registered.', 409);
                }
            }

            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10); // 10 rounds of salt

            // Determine role: For the first user, set as 'admin', otherwise 'user'.
            const [userCountResult] = await db.execute(`SELECT COUNT(*) as count FROM Users`);
            const userCount = userCountResult[0].count;
            const role = userCount === 0 ? 'admin' : 'user'; // Assign 'admin' to the very first registered user

            // Insert new user into the database, including the role
            const [result] = await db.execute(
                `INSERT INTO Users (username, email, password, role) VALUES (?, ?, ?, ?)`,
                [username, email, hashedPassword, role]
            );

            // Return the newly created user object, including the role
            return {
                id: result.insertId,
                username,
                email,
                role // Ensure role is returned
            };
        } catch (error) {
            // If it's already an AppError, re-throw it. Otherwise, wrap it.
            if (error instanceof AppError) {
                throw error;
            }
            logger.error(`Error registering user ${username}: ${error.message}`);
            throw new AppError('Failed to register user due to a server error.', 500);
        }
    };

    /**
     * Authenticates a user and generates a JWT.
     * @param {string} username - The username provided by the user.
     * @param {string} password - The plain-text password provided by the user.
     * @returns {Promise<{token: string, user: object}>} An object containing the JWT and user details.
     * @throws {AppError} If authentication fails.
     */
    exports.loginUser = async (username, password) => {
        const db = getDB();
        try {
            // Find user by username, now selecting the 'role' column
            const [users] = await db.execute(
                `SELECT id, username, email, password, role FROM Users WHERE username = ?`,
                [username]
            );

            const user = users[0];

            if (!user) {
                throw new AppError('Invalid username or password.', 401);
            }

            // Compare provided password with hashed password from DB
            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                throw new AppError('Invalid username or password.', 401);
            }

            // Generate JWT, explicitly including the 'role' in the payload
            const token = jwt.sign(
                { id: user.id, username: user.username, email: user.email, role: user.role },
                config.jwt.secret,
                { expiresIn: config.jwt.expiresIn }
            );

            // Return token and basic user info, ensuring 'role' is included in the user object
            return {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role // Ensure role is returned here in the 'user' object
                }
            };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error(`Error logging in user ${username}: ${error.message}`);
            throw new AppError('Login failed due to a server error.', 500);
        }
    };

    /**
     * Finds a user by their ID.
     * Includes fetching the 'role' column.
     * @param {number} userId - The ID of the user.
     * @returns {Promise<object|null>} The user object (without password), or null if not found.
     */
    exports.findUserById = async (userId) => {
        const db = getDB();
        try {
            // Select 'role' when finding user by ID
            const [users] = await db.execute(
                `SELECT id, username, email, role FROM Users WHERE id = ?`, // Do not select password
                [userId]
            );
            return users[0] || null;
        } catch (error) {
            logger.error(`Error finding user by ID ${userId}: ${error.message}`);
            throw new AppError('Could not retrieve user information.', 500);
        }
    };
    