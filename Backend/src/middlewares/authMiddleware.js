const createError = require('http-errors');
const { verifyAccessToken } = require('../auth/jwt');
const { userRepository } = require('../repositories/userRepository');
const { getAuthTokenFromCookies } = require('../common/cookies');


const getTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return getAuthTokenFromCookies(req);
};

const getCsrfTokenFromRequest = (req) => {
  const token = req.headers['x-csrf-token'];
  return typeof token === 'string' ? token.trim() : '';
};

const AuthMiddleware = async (req, _res, next) => {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      throw new createError.Unauthorized('Token requerido');
    }

    const payload = verifyAccessToken(token);
    const user = await userRepository.findById(Number(payload.sub));

    if (!user || user.status !== 'ACTIVE' || !user.role?.isActive) {
      throw new createError.Unauthorized('Sesión inválida');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role.code
    };

    next();

  } catch (error) {
    next(error);
  }
};

module.exports = {
  AuthMiddleware,
  AuthMiddlewareInternals: {
    getTokenFromRequest,
    getCsrfTokenFromRequest
  }
};
