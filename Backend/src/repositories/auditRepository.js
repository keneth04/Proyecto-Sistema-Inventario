const { prisma } = require('../prisma/client');

const includeRelations = {
  performedByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
  employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
  asset: { select: { id: true, assetCode: true, name: true } }
};

const auditRepository = {
  createTx: (tx, data) => tx.auditLog.create({ data }),
  create: (data) => prisma.auditLog.create({ data }),
  list: ({ skip, take }) => prisma.auditLog.findMany({ skip, take, orderBy: { id: 'desc' }, include: includeRelations }),
  byAsset: (assetId, { skip, take }) => prisma.auditLog.findMany({ where: { assetId }, skip, take, orderBy: { id: 'desc' }, include: includeRelations }),
  byEmployee: (employeeId, { skip, take }) => prisma.auditLog.findMany({ where: { employeeId }, skip, take, orderBy: { id: 'desc' }, include: includeRelations }),
  count: (where = {}) => prisma.auditLog.count({ where })
};

module.exports = { auditRepository };