const createError = require('http-errors');
const { UsersService } = require('../users/services');

module.exports.ActiveUserMiddleware = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      throw new createError.Unauthorized('No autenticado');
    }

    const user = await UsersService.getById(req.user.id);

    if (!user) {
      throw new createError.Unauthorized('Usuario no encontrado');
    }

    if (user.status === 'inactive') {
      throw new createError.Forbidden('Usuario inactivo');
    }

    next();
  } catch (error) {
    next(error);
  }
};