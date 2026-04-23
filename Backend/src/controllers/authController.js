const { authService } = require('../services/authService');
const { Response } = require('../common/response');
const { Config } = require('../config');
const { getAuthCookieOptions, getCsrfCookieOptions } = require('../common/cookies');
const crypto = require('crypto');

const authController = {
  login: async (req, res, next) => {
    try {
      const data = await authService.login(req.body);
      const csrfToken = crypto.randomBytes(32).toString('hex');

      res.cookie(Config.session.cookieName, data.token, getAuthCookieOptions());
      res.cookie(Config.session.csrfCookieName, csrfToken, getCsrfCookieOptions());

      return Response.success(res, 200, 'Login exitoso', {
        user: data.user
      });
    } catch (error) {
      return next(error);
    }
  },
  me: async (req, res, next) => {
    try {
      const profile = await authService.getCurrentProfile(req.user.id);
      return Response.success(res, 200, 'Perfil actual', profile);
    } catch (error) {
      return next(error);
    }
    },
  forgotPassword: async (req, res, next) => {
    try {
      await authService.forgotPassword(req.body);
      return Response.success(
        res,
        200,
        'Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña.'
      );
    } catch (error) {
      return next(error);
    }
  },
  resetPassword: async (req, res, next) => {
    try {
      await authService.resetPassword(req.body);
      return Response.success(res, 200, 'Contraseña actualizada correctamente');
    } catch (error) {
      return next(error);
    }
  }
};

module.exports = { authController };