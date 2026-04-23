require('dotenv').config();

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const toOrigins = (value, fallback) => {
  if (!value || !value.trim()) {
    return fallback;
  }

  return value.split(',').map((origin) => origin.trim()).filter(Boolean);
};

const normalizeOrigin = (origin) => {
  if (typeof origin !== 'string' || !origin.trim()) return null;

  try {
    return new URL(origin.trim()).origin;
  } catch (_error) {
    return null;
  }
};

const toNormalizedOrigins = (origins = []) => [...new Set(origins.map(normalizeOrigin).filter(Boolean))];

const Config = {
  port: process.env.PORT || '3000',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  databaseUrl: process.env.DATABASE_URL,
  bcryptRounds: toPositiveInt(process.env.BCRYPT_ROUNDS, 10),
  http: {
    jsonLimit: process.env.HTTP_JSON_LIMIT || '100kb',
    corsAllowedOrigins: toNormalizedOrigins(
      toOrigins(process.env.CORS_ALLOWED_ORIGINS, ['http://localhost:5173'])
    ),
    cspConnectSrc: toNormalizedOrigins(toOrigins(process.env.CSP_CONNECT_SRC, []).concat("'self'"))
  },

  session: {
    cookieName: process.env.AUTH_COOKIE_NAME || 'auth_token',
    sameSite: process.env.AUTH_COOKIE_SAMESITE ||'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAgeMs: toPositiveInt(process.env.AUTH_COOKIE_MAX_AGE_MS, 8 * 60 * 60 * 1000)
  },
  rateLimit: {
    auth: {
      windowMs: toPositiveInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 15 * 60 * 1000),
      max: toPositiveInt(process.env.RATE_LIMIT_AUTH_MAX, 10),
      resetPasswordWindowMs: toPositiveInt(process.env.RATE_LIMIT_RESET_PASSWORD_WINDOW_MS, 15 * 60 * 1000),
      resetPasswordMax: toPositiveInt(process.env.RATE_LIMIT_RESET_PASSWORD_MAX, 10)
    }
  }
};

const validateCriticalConfig = () => {
  const missing = [];

  if (!Config.jwtSecret) missing.push('JWT_SECRET');
  if (!Config.databaseUrl) missing.push('DATABASE_URL');
  if (Config.http.corsAllowedOrigins.length === 0) missing.push('CORS_ALLOWED_ORIGINS');

  if (missing.length) {
    throw new Error(`Configuración inválida. Faltan variables críticas: ${missing.join(', ')}`);
  }
};

module.exports = {
  Config,
  validateCriticalConfig
};