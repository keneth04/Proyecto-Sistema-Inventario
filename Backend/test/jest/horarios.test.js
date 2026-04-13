const test = require('node:test');
const assert = require('node:assert/strict');

const { HorariosServiceInternals } = require('../../src/Horarios/services');

test('horarios: validateBlocksStructure acepta bloques válidos sin solape', () => {
  const skillId = '507f1f77bcf86cd799439011';

  const blocks = HorariosServiceInternals.validateBlocksStructure([
    { start: '08:00', end: '10:00', skillId },
    { start: '10:00', end: '12:30', skillId }
  ]);

  assert.equal(blocks.length, 2);
  assert.deepEqual(blocks[0], { start: '08:00', end: '10:00', skillId });
});

test('horarios: validateBlocksStructure rechaza solapamientos', () => {
  const skillId = '507f1f77bcf86cd799439011';

  assert.throws(
    () => HorariosServiceInternals.validateBlocksStructure([
      { start: '08:00', end: '10:00', skillId },
      { start: '09:30', end: '11:00', skillId }
    ]),
    /Solapamiento/
  );
});