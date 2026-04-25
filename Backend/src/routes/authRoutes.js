const express = require('express');
const { authController } = require('../controllers');
const { validateRequest } = require('../middlewares/validateMiddleware');
const { authSchemas } = require('../validation/schemas');
const { AuthMiddleware } = require('../middlewares/authMiddleware');
const { AuthRateLimiters } = require('../middlewares/rateLimitMiddleware');

const router = express.Router();

router.post('/login', AuthRateLimiters.login, validateRequest({ body: authSchemas.login }), authController.login);
router.post(
  '/forgot-password',
  AuthRateLimiters.forgotPassword,
  validateRequest({ body: authSchemas.forgotPassword }),
  authController.forgotPassword
);
router.post(
  '/reset-password',
  AuthRateLimiters.resetPassword,
  validateRequest({ body: authSchemas.resetPassword }),
  authController.resetPassword
);
router.get('/me', AuthMiddleware, authController.me);
router.post('/logout', AuthMiddleware, authController.logout);

module.exports = { authRoutes: router };