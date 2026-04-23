const { Config } = require('../config');

const parseCookies = (cookieHeader = '') => {
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const separatorIndex = pair.indexOf('=');
      if (separatorIndex <= 0) {
        return acc;
      }

      const key = pair.slice(0, separatorIndex).trim();
      const value = pair.slice(separatorIndex + 1).trim();
      try {
        acc[key] = decodeURIComponent(value);
      } catch (_error) {
        acc[key] = value;
      }
      return acc;
    }, {});
};

const getAuthCookieOptions = () => ({
  httpOnly: true,
  secure: Config.session.secure,
  sameSite: Config.session.sameSite,
  maxAge: Config.session.maxAgeMs,
  path: '/'
});

const getCsrfCookieOptions = () => ({
  httpOnly: false,
  secure: Config.session.secure,
  sameSite: Config.session.sameSite,
  maxAge: Config.session.maxAgeMs,
  path: '/'
});

const getCookieValue = (req, cookieName) => {
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader) {
    return null;
  }

  const parsed = parseCookies(cookieHeader);
    return parsed[cookieName] || null;
};

const getAuthTokenFromCookies = (req) => {
  return getCookieValue(req, Config.session.cookieName);
};

const getCsrfTokenFromCookies = (req) => {
  return getCookieValue(req, Config.session.csrfCookieName);
};

module.exports = {
  getAuthCookieOptions,
  getCsrfCookieOptions,
  getAuthTokenFromCookies,
  getCsrfTokenFromCookies
};