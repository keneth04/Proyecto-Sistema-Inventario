const express = require('express');
const { authController } = require('../controllers');
const { validateRequest } = require('../middlewares/validateMiddleware');
const { authSchemas } = require('../validation/schemas');
const { AuthMiddleware } = require('../middlewares/authMiddleware');
const { AuthRateLimiters } = require('../middlewares/rateLimitMiddleware');

const router = express.Router();

router.post('/login', AuthRateLimiters.login, validateRequest({ body: authSchemas.login }), authController.login);
router.get('/me', AuthMiddleware, authController.me);

module.exports = { authRoutes: router };