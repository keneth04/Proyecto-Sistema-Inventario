const test = require('node:test');
const assert = require('node:assert/strict');

const { RoleMiddleware } = require('../../src/middlewares/roleMiddleware');

test('roles: admin permitido en middleware de admin', () => {
  const middleware = RoleMiddleware(['admin']);

  middleware({ user: { role: 'admin' } }, {}, (error) => {
    assert.equal(error, undefined);
  });
});

test('roles: agente permitido en middleware de agente', () => {
  const middleware = RoleMiddleware(['agente']);

  middleware({ user: { role: 'agente' } }, {}, (error) => {
    assert.equal(error, undefined);
  });
});