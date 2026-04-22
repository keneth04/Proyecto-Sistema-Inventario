const { prisma } = require('../prisma/client');

const includeReturnDetail = {
  employee: true,
  receivedByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
  loan: {
    include: {
      deliveredByUser: { select: { id: true, firstName: true, lastName: true, email: true } }
    }
  },
  items: { include: { asset: true, loanItem: true } }
};

const returnRepository = {
  createTx: (tx, data) => tx.return.create({ data, include: includeReturnDetail }),
  list: ({ skip, take }) => prisma.return.findMany({ skip, take, orderBy: { id: 'desc' }, include: includeReturnDetail }),
  count: () => prisma.return.count(),
  findById: (id) => prisma.return.findUnique({ where: { id }, include: includeReturnDetail })
};

module.exports = { returnRepository };