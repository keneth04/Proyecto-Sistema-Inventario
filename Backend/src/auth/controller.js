/**
 * AUTH CONTROLLER
 * ----------------
 * Recibe requests HTTP
 * Llama al service
 * Devuelve respuestas HTTP
 */

const { AuthService } = require('./services');
const { Response } = require('../common/response');
const { Config } = require('../config');
const { getAuthCookieOptions } = require('../common/cookies');

module.exports.AuthController = {

  login: async (req, res, next) => {
    try {
      const result = await AuthService.login(req.body);
      res.cookie(Config.session.cookieName, result.token, getAuthCookieOptions());
      Response.success(res, 200, 'Login exitoso', {
        user: result.user,
        csrfToken: result.csrfToken
      });
    } catch (error) {
      next(error);
    }
  },

  getSession: async (req, res, next) => {
    try {
      const user = await AuthService.getSessionUser(req.user.id);
      Response.success(res, 200, 'Sesión activa', {
        user,
        csrfToken: req.user.csrfToken
      });
    } catch (error) {
      next(error);
    }
  },

  logout: async (req, res, next) => {
    try {
      await AuthService.logout(req.user.id);
      
      res.clearCookie(Config.session.cookieName, {
        ...getAuthCookieOptions(),
        expires: new Date(0),
        maxAge: 0
      });

      Response.success(res, 200, 'Sesión cerrada', {});
    } catch (error) {
      next(error);
    }
  },

  forgotPassword: async (req, res, next) => {
    try {
      await AuthService.forgotPassword(req.body);
      Response.success(
        res,
        200,
        'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña',
        {}
      );
    } catch (error) {
      next(error);
    }
  },

  resetPassword: async (req, res, next) => {
    try {
      await AuthService.resetPassword(req.body);
      Response.success(res, 200, 'Contraseña restablecida correctamente', {});
    } catch (error) {
      next(error);
    }
  }
};
