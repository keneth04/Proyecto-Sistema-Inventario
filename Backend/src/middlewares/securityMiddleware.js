const createError = require('http-errors');
const helmet = require('helmet');
const cors = require('cors');

const isValidOrigin = (origin, allowedOrigins) => {
  if (!origin) return true;

  try {
    return allowedOrigins.includes(new URL(origin).origin);
  } catch (_error) {
    return false;
  }
};

const toConnectSrcDirectives = (connectSrc = []) => {
  const directives = new Set(["'self'"]);

  connectSrc.forEach((value) => {
    if (!value) {
      return;
    }

    if (value === 'self' || value === "'self'") {
      directives.add("'self'");
      return;
    }

    directives.add(value);
  });

  return [...directives];
};

module.exports.SecurityMiddlewares = ({ allowedOrigins, jsonLimit, cspConnectSrc }) => {
  const corsMiddleware = cors({
    origin: (origin, callback) => {
      if (isValidOrigin(origin, allowedOrigins)) {
        return callback(null, true);
      }

      return callback(createError.Forbidden('Origen no permitido por CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-CSRF-Token'],
    maxAge: 86400,
    credentials: true
  });

  return {
    helmet: helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
          connectSrc: toConnectSrcDirectives(cspConnectSrc)
        }
      },
      crossOriginEmbedderPolicy: { policy: 'require-corp' },
      crossOriginResourcePolicy: { policy: 'cross-origin' }
    }),
    cors: corsMiddleware,
    jsonParser: require('express').json({ limit: jsonLimit })
  };
};