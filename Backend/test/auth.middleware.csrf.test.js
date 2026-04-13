const test = require('node:test');
const assert = require('node:assert/strict');

const { AuthMiddlewareInternals } = require('../src/middlewares/authMiddleware');

test('getCsrfTokenFromRequest retorna string limpio', () => {
  const token = AuthMiddlewareInternals.getCsrfTokenFromRequest({
    headers: {
      'x-csrf-token': '  abc123  '
    }
  });

  assert.equal(token, 'abc123');
});

test('getCsrfTokenFromRequest retorna vacío si no existe header', () => {
  const token = AuthMiddlewareInternals.getCsrfTokenFromRequest({ headers: {} });
  assert.equal(token, '');
});