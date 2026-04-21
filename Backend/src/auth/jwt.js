const jwt = require('jsonwebtoken');
const createError = require('http-errors');
const { Config } = require('../config');

const signAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role.code,
      email: user.email
    },
    Config.jwtSecret,
    {
      expiresIn: Config.jwtExpiresIn,
      issuer: 'inventory-system',
      audience: 'inventory-web'
    }
  );
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, Config.jwtSecret, {
      algorithms: ['HS256'],
      issuer: 'inventory-system',
      audience: 'inventory-web'
    });
  } catch (_error) {
    throw new createError.Unauthorized('Token inválido o expirado');
  }
};

module.exports = {
  signAccessToken,
  verifyAccessToken
};