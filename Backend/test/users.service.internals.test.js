const test = require('node:test');
const assert = require('node:assert/strict');

const { UsersServiceInternals } = require('../src/users/services');

test('normalizeEmailInput aplica trim + lowercase', () => {
  const email = UsersServiceInternals.normalizeEmailInput('  ADMIN@Example.COM  ');
  assert.equal(email, 'admin@example.com');
});

test('normalizeEmailInput rechaza email inválido', () => {
  assert.throws(
    () => UsersServiceInternals.normalizeEmailInput('  invalid-email  '),
    /Email inválido/
  );
});

test('isMongoDuplicateKeyError detecta error 11000', () => {
  assert.equal(UsersServiceInternals.isMongoDuplicateKeyError({ code: 11000 }), true);
  assert.equal(UsersServiceInternals.isMongoDuplicateKeyError({ code: 50 }), false);
});

test('mapDuplicateEmailError mapea duplicate key a Conflict', () => {
  assert.throws(
    () => UsersServiceInternals.mapDuplicateEmailError({ code: 11000 }, 'El usuario ya existe'),
    /El usuario ya existe/
  );
});

test('normalizeFieldsCsv agrega _id y respeta catálogo permitido', () => {
  const fields = UsersServiceInternals.normalizeFieldsCsv('name,email,campaign');
  assert.deepEqual(fields, ['_id', 'name', 'email', 'campaign']);
});

test('buildProjectionFromFields arma proyección de inclusión pura', () => {
  const projection = UsersServiceInternals.buildProjectionFromFields(['_id', 'name', 'email']);
  assert.deepEqual(projection, { _id: 1, name: 1, email: 1 });
  assert.equal(Object.prototype.hasOwnProperty.call(projection, 'password'), false);
});