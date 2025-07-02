const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const ldap = require('ldapjs');
const { getDB } = require('../db/connection');
const { validateRegister, validateLogin } = require('../utils/validation');
const AppError = require('../utils/appError');
const config = require('../config');
const logger = require('../utils/logger');

console.log('🛠 LDAP CONFIG:', config.ldap);

/**
 * Register a local user
 */
exports.register = async (req, res, next) => {
  try {
    const { error } = validateRegister(req.body);
    if (error) return next(new AppError(error.details[0].message, 400));

    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 12);
    const db = getDB();

    await db.execute(
      `INSERT INTO Users (username, email, password, role, user_type) VALUES (?, ?, ?, ?, ?)`,
      [username, email, hashedPassword, 'user', 'local']
    );

    logger.info(`New user registered: ${username}`);
    res.status(201).json({ message: 'User registered successfully.' });
  } catch (err) {
    logger.error('Registration error:', err);
    next(new AppError('User registration failed', 500));
  }
};

/**
 * Login with local or LDAP based on user_type from DB
 */
exports.login = async (req, res, next) => {
  try {
    const { error } = validateLogin(req.body);
    if (error) return next(new AppError(error.details[0].message, 400));

    const { username, password } = req.body;

    if (typeof username !== 'string' || typeof password !== 'string') {
      return next(new AppError('Invalid username or password format', 400));
    }

    const db = getDB();
    const [rows] = await db.execute('SELECT * FROM Users WHERE username = ?', [username]);
    const user = rows[0];

    if (!user) {
      logger.warn(`Login attempt for unknown user: ${username}`);
      return next(new AppError('User not registered. Contact Admin.', 404));
    }

    // Local User Auth
    if (user.user_type === 'local') {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return next(new AppError('Invalid credentials', 401));

      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn || '1d'
      });

      logger.info(`✅ Local login success for ${username}`);
      return res.status(200).json({ message: 'Logged in successfully (local)', token });
    }

    // LDAP User Auth
    if (user.user_type === 'ldap') {
      const client = ldap.createClient({
        url: config.ldap.url,
        tlsOptions: {
          rejectUnauthorized: false
        }
      });

      const searchOptions = {
        scope: 'sub',
        filter: `(${config.ldap.usernameField}=${username})`
      };

      client.bind(config.ldap.bindDN, config.ldap.bindPassword, (bindErr) => {
        if (bindErr) {
          logger.warn(`LDAP bind failed: ${bindErr.message}`);
          return next(new AppError('LDAP bind failed', 401));
        }

        client.search(config.ldap.baseDN, searchOptions, (err, resSearch) => {
          if (err) {
            logger.error(`LDAP search failed for ${username}: ${err.message}`);
            return next(new AppError('LDAP search error', 500));
          }

          let userEntry = null;

          resSearch.on('searchEntry', (entry) => {
            console.log('✅ LDAP entry found:', entry.objectName);
            userEntry = entry.objectName.toString();
          });

          resSearch.on('error', (searchErr) => {
            logger.error(`LDAP search error: ${searchErr.message}`);
            return next(new AppError('LDAP search error', 500));
          });

          resSearch.on('end', () => {
            if (!userEntry) {
              logger.warn(`LDAP user not found or invalid credentials for: ${username}`);
              return next(new AppError('User not found in AD', 401));
            }

            client.bind(userEntry, password, async (authErr) => {
              if (authErr) {
                logger.warn(`LDAP password check failed for ${username}: ${authErr.message}`);
                return next(new AppError('Invalid LDAP credentials', 401));
              }

              logger.info(`✅ LDAP login success for ${username}`);

              const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role },
                config.jwt.secret,
                { expiresIn: config.jwt.expiresIn || '1d' }
              );

              client.unbind();
              return res.status(200).json({ message: 'Logged in successfully (LDAP)', token });
            });
          });
        });
      });

    } else {
      return next(new AppError('Unsupported user type. Contact Admin.', 400));
    }

  } catch (err) {
    logger.error('Login error:', err);
    next(new AppError('Login failed', 500));
  }
};

/**
 * Get authenticated user's profile
 */
exports.getMe = async (req, res, next) => {
  try {
    const db = getDB();
    const [rows] = await db.execute('SELECT id, username, email, role FROM Users WHERE id = ?', [req.user.id]);

    if (rows.length === 0) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({ user: rows[0] });
  } catch (err) {
    logger.error('GetMe error:', err);
    next(new AppError('Failed to get user info', 500));
  }
};
