const createError = require('http-errors');
const { Config } = require('../config');

const stores = new Map();

const normalizeIp = (ip = '') => ip.replace('::ffff:', '') || 'unknown';

const toEmail = (req) => {
  const email = req?.body?.email;
  return typeof email === 'string' ? email.trim().toLowerCase() : 'unknown';
};

const createRateLimiter = ({ name, windowMs, max, message, keyGenerator }) => {
  const store = new Map();
  stores.set(name, store);

  return (req, res, next) => {
    const now = Date.now();
    const key = keyGenerator(req);
    const current = store.get(key);

    if (!current || now >= current.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(max - 1, 0)));
      return next();
    }

    current.count += 1;
    store.set(key, current);

    const remaining = Math.max(max - current.count, 0);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    if (current.count > max) {
      const retryAfterSec = Math.max(Math.ceil((current.resetAt - now) / 1000), 1);
      res.setHeader('Retry-After', String(retryAfterSec));
      return next(createError.TooManyRequests(message));
    }

    next();
  };
};

setInterval(() => {
  const now = Date.now();

  for (const store of stores.values()) {
    for (const [key, value] of store.entries()) {
      if (now >= value.resetAt) {
        store.delete(key);
      }
    }
  }
}, 60 * 1000).unref();

const authWindowMs = Number.isInteger(Config?.rateLimit?.auth?.windowMs) && Config.rateLimit.auth.windowMs > 0
  ? Config.rateLimit.auth.windowMs
  : 15 * 60 * 1000;
const authMax = Number.isInteger(Config?.rateLimit?.auth?.max) && Config.rateLimit.auth.max > 0
  ? Config.rateLimit.auth.max
  : 10;
const resetPasswordWindowMs = Number.isInteger(Config?.rateLimit?.auth?.resetPasswordWindowMs)
  && Config.rateLimit.auth.resetPasswordWindowMs > 0
  ? Config.rateLimit.auth.resetPasswordWindowMs
  : 15 * 60 * 1000;
const resetPasswordMax = Number.isInteger(Config?.rateLimit?.auth?.resetPasswordMax)
  && Config.rateLimit.auth.resetPasswordMax > 0
  ? Config.rateLimit.auth.resetPasswordMax
  : 10;

module.exports.AuthRateLimiters = {
  login: createRateLimiter({
    name: 'auth-login',
    windowMs: authWindowMs,
    max: authMax,
    message: 'Demasiados intentos de login. Intenta nuevamente en unos minutos.',
    keyGenerator: (req) => `${normalizeIp(req.ip)}:${toEmail(req)}`
  }),
  forgotPassword: createRateLimiter({
    name: 'auth-forgot-password',
    windowMs: authWindowMs,
    max: authMax,
    message: 'Demasiadas solicitudes de recuperación. Intenta nuevamente en unos minutos.',
    keyGenerator: (req) => `${normalizeIp(req.ip)}:${toEmail(req)}`
      }),
  resetPassword: createRateLimiter({
    name: 'auth-reset-password',
    windowMs: resetPasswordWindowMs,
    max: resetPasswordMax,
    message: 'Demasiados intentos de restablecimiento. Intenta nuevamente en unos minutos.',
    keyGenerator: (req) => normalizeIp(req.ip)
  })
};