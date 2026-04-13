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
      acc[key] = decodeURIComponent(value);
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

const getAuthTokenFromCookies = (req) => {
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader) {
    return null;
  }

  const parsed = parseCookies(cookieHeader);
  return parsed[Config.session.cookieName] || null;
};

module.exports = {
  getAuthCookieOptions,
  getAuthTokenFromCookies
};