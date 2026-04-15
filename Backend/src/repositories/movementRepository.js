const { prisma } = require('../prisma/client');

const movementRepository = {
  createTx: (tx, data) => tx.inventoryMovement.create({ data })
};

module.exports = { movementRepository };