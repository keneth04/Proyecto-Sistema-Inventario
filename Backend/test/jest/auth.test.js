const test = require('node:test');
const assert = require('node:assert/strict');

const { AuthMiddlewareInternals } = require('../../src/middlewares/authMiddleware');

test('auth: getTokenFromRequest prioriza Bearer token', () => {
  const token = AuthMiddlewareInternals.getTokenFromRequest({
    headers: { authorization: 'Bearer token-123', cookie: 'auth_token=cookie-token' }
  });

  assert.equal(token, 'token-123');
});

test('auth: getTokenFromRequest usa cookie si no hay Authorization', () => {
  const token = AuthMiddlewareInternals.getTokenFromRequest({
    headers: { cookie: 'auth_token=cookie-token' }
  });

  assert.equal(token, 'cookie-token');
});

test('auth: getCsrfTokenFromRequest normaliza string', () => {
  const token = AuthMiddlewareInternals.getCsrfTokenFromRequest({
    headers: { 'x-csrf-token': '  csrf-safe-token  ' }
  });

  assert.equal(token, 'csrf-safe-token');
});