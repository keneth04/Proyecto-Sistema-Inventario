const { prisma } = require('../prisma/client');

const auditRepository = {
  createTx: (tx, data) => tx.auditLog.create({ data }),
  create: (data) => prisma.auditLog.create({ data }),
  list: ({ skip, take }) => prisma.auditLog.findMany({ skip, take, orderBy: { id: 'desc' }, include: { performedByUser: true, employee: true } }),
  byAsset: (assetId, { skip, take }) => prisma.auditLog.findMany({ where: { assetId }, skip, take, orderBy: { id: 'desc' }, include: { performedByUser: true, employee: true } }),
  byEmployee: (employeeId, { skip, take }) => prisma.auditLog.findMany({ where: { employeeId }, skip, take, orderBy: { id: 'desc' }, include: { performedByUser: true, employee: true } }),
  count: (where = {}) => prisma.auditLog.count({ where })
};

module.exports = { auditRepository };