const { authService } = require('../services/authService');
const { Response } = require('../common/response');

const authController = {
  login: async (req, res, next) => {
    try {
      const data = await authService.login(req.body);
      return Response.success(res, 200, 'Login exitoso', data);
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
  }
};

module.exports = { authController };