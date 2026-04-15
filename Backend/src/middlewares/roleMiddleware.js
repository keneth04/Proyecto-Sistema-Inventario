const createError = require('http-errors');

const RoleMiddleware = (allowedRoles = []) => (req, _res, next) => {
  if (!req.user) {
    return next(new createError.Unauthorized('No autenticado'));
  }

    if (!allowedRoles.includes(req.user.role)) {
    return next(new createError.Forbidden('No tienes permisos para realizar esta acción'));
  }

    return next();
};

    module.exports = {
  RoleMiddleware
};
