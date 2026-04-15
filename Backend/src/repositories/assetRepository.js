const { prisma } = require('../prisma/client');

const includeCategory = { category: true };

const assetRepository = {
  create: (data) => prisma.asset.create({ data, include: includeCategory }),
  list: ({ skip, take, where = {} }) => prisma.asset.findMany({ where, skip, take, orderBy: { id: 'desc' }, include: includeCategory }),
  count: (where = {}) => prisma.asset.count({ where }),
  findById: (id) => prisma.asset.findUnique({ where: { id }, include: includeCategory }),
  findByIdForUpdate: (tx, id) => tx.asset.findUnique({ where: { id } }),
  update: (id, data) => prisma.asset.update({ where: { id }, data, include: includeCategory }),
  updateTx: (tx, id, data) => tx.asset.update({ where: { id }, data })
};

module.exports = {
  assetRepository
};