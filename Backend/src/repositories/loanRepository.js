const { prisma } = require('../prisma/client');

const includeLoanDetail = {
  employee: true,
  deliveredByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
  items: { include: { asset: true, returnItems: true } }
};

const loanRepository = {
  createTx: (tx, data) => tx.loan.create({ data, include: includeLoanDetail }),
  list: ({ skip, take }) => prisma.loan.findMany({ skip, take, orderBy: { id: 'desc' }, include: includeLoanDetail }),
  count: () => prisma.loan.count(),
  findById: (id) => prisma.loan.findUnique({ where: { id }, include: includeLoanDetail }),
  findByIdTx: (tx, id) => tx.loan.findUnique({ where: { id }, include: includeLoanDetail }),
  updateStatusTx: (tx, id, status) => tx.loan.update({ where: { id }, data: { status } })
};

module.exports = { loanRepository };