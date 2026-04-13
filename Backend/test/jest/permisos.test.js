const test = require('node:test');
const assert = require('node:assert/strict');

const { RoleMiddleware } = require('../../src/middlewares/roleMiddleware');

test('permisos: rechaza cuando no hay usuario autenticado', () => {
  const middleware = RoleMiddleware(['admin']);

  middleware({}, {}, (error) => {
    assert.equal(error.status, 401);
  });
});

test('permisos: rechaza cuando el rol no está permitido', () => {
  const middleware = RoleMiddleware(['admin']);

  middleware({ user: { role: 'agente' } }, {}, (error) => {
    assert.equal(error.status, 403);
  });
});