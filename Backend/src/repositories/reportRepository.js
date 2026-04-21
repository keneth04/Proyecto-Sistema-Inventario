const { prisma } = require('../prisma/client');

const ACTIVE_LOAN_STATUSES = ['OPEN', 'PARTIALLY_RETURNED'];

const reportRepository = {
  assetsByStatus: () =>
    prisma.asset.findMany({
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
      include: { category: true }
    }),

  activeLoans: () =>
    prisma.loan.findMany({
      where: { status: { in: ACTIVE_LOAN_STATUSES } },
      orderBy: { loanDate: 'desc' },
      include: {
        employee: true,
        deliveredByUser: { select: { firstName: true, lastName: true, email: true } },
        items: { include: { asset: true } }
      }
    }),

  loanHistory: ({ from, to }) =>
    prisma.loan.findMany({
      where: {
        loanDate: {
          gte: from,
          lte: to
        }
      },
      orderBy: { loanDate: 'desc' },
      include: {
        employee: true,
        deliveredByUser: { select: { firstName: true, lastName: true, email: true } },
        items: { include: { asset: true, returnItems: true } }
      }
    }),

  retiredAssets: () =>
    prisma.asset.findMany({
      where: { status: 'RETIRED' },
      orderBy: { updatedAt: 'desc' },
      include: { category: true }
    }),

  inventoryGeneral: () =>
    prisma.asset.findMany({
      orderBy: { name: 'asc' },
      include: { category: true }
    })
};

module.exports = { reportRepository };