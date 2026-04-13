const jwt = require('jsonwebtoken');
const createError = require('http-errors');
const { ObjectId } = require('mongodb');
const { Config } = require('../config');
const { getAuthTokenFromCookies } = require('../common/cookies');
const { Database } = require('../database');

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

const AuthMiddleware = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      throw new createError.Unauthorized('Token requerido');
    }

    const decoded = jwt.verify(token, Config.jwt_secret);

    if (!ObjectId.isValid(decoded.id)) {
      throw new createError.Unauthorized('Sesión inválida');
    }

    const usersCollection = await Database('users');
    const user = await usersCollection.findOne(
      { _id: new ObjectId(decoded.id) },
      { projection: { _id: 1, sessionVersion: 1, role: 1, email: 1 } }
    );

    if (!user) {
      throw new createError.Unauthorized('Sesión inválida');
    }

    const tokenSessionVersion = Number.isInteger(decoded.sessionVersion) ? decoded.sessionVersion : 0;
    const currentSessionVersion = Number.isInteger(user.sessionVersion) ? user.sessionVersion : 0;

    if (tokenSessionVersion !== currentSessionVersion) {
      throw new createError.Unauthorized('Token revocado');
    }

    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      sessionVersion: currentSessionVersion,
      csrfToken: typeof decoded.csrfToken === 'string' ? decoded.csrfToken : ''
    };

    next();

  } catch (error) {
    next(error);
  }
};

const LogoutCsrfMiddleware = (req, _res, next) => {
  try {
    const csrfHeaderToken = getCsrfTokenFromRequest(req);
    const csrfSessionToken = req.user?.csrfToken;

    if (!csrfHeaderToken || !csrfSessionToken || csrfHeaderToken !== csrfSessionToken) {
      throw new createError.Forbidden('Token CSRF inválido');
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports.AuthMiddleware = AuthMiddleware;
module.exports.LogoutCsrfMiddleware = LogoutCsrfMiddleware;
module.exports.AuthMiddlewareInternals = {
  getTokenFromRequest,
  getCsrfTokenFromRequest
};