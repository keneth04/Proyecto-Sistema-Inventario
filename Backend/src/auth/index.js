/**
 * AUTH ROUTES
 * ------------
 * Define las rutas del módulo auth
 */
const express = require('express');
const { AuthController } = require('./controller');
const { AuthRateLimiters } = require('../middlewares/rateLimitMiddleware');
const { validateRequest } = require('../middlewares/validateMiddleware');
const { authSchemas } = require('../validation/schemas');
const { AuthMiddleware, LogoutCsrfMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

module.exports.AuthAPI = (app) => {
  router
    .post('/login', AuthRateLimiters.login, validateRequest({ body: authSchemas.login }), AuthController.login)
    .post('/logout', AuthMiddleware, LogoutCsrfMiddleware, AuthController.logout)
    .get('/session', AuthMiddleware, AuthController.getSession)
    .post('/forgot-password', AuthRateLimiters.forgotPassword, validateRequest({ body: authSchemas.forgotPassword }), AuthController.forgotPassword)
    .post('/reset-password', validateRequest({ body: authSchemas.resetPassword }), AuthController.resetPassword);

  app.use('/api/auth', router);
};