const createError = require('http-errors');

module.exports.RoleMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {

    if (!req.user) {
      return next(new createError.Unauthorized('No autenticado'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new createError.Forbidden('No tienes permisos para realizar esta acción')
      );
    }

    next();
  };
};
