const { prisma } = require('../prisma/client');

const inventoryRepository = {
  stockSummary: async () => {
    const [operational, availableActive, loaned, maintenance, inactive, retired, totalAssets] = await Promise.all([
      prisma.asset.aggregate({
        where: { status: { in: ['ACTIVE', 'MAINTENANCE'] } },
        _sum: { totalQuantity: true }
      }),
      prisma.asset.aggregate({
        where: { status: 'ACTIVE' },
        _sum: { availableQuantity: true }
      }),
      prisma.loanItem.aggregate({
        where: {
          loan: {
            status: { in: ['OPEN', 'PARTIALLY_RETURNED'] }
          }
        },
        _sum: { quantity: true, returnedQuantity: true }
      }),
      prisma.asset.aggregate({ where: { status: 'MAINTENANCE' }, _sum: { totalQuantity: true } }),
      prisma.asset.aggregate({ where: { status: 'INACTIVE' }, _sum: { totalQuantity: true } }),
      prisma.asset.aggregate({ where: { status: 'RETIRED' }, _sum: { totalQuantity: true } }),
      prisma.asset.count()
    ]);

    const activeLoansQuantity = Math.max((loaned._sum.quantity || 0) - (loaned._sum.returnedQuantity || 0), 0);

    return {
      totalAssets,
      totalAssetsQuantity: operational._sum.totalQuantity || 0,
      availableAssetsQuantity: availableActive._sum.availableQuantity || 0,
      loanedAssetsQuantity: activeLoansQuantity,
      maintenanceQuantity: maintenance._sum.totalQuantity || 0,
      inactiveQuantity: inactive._sum.totalQuantity || 0,
      retiredQuantity: retired._sum.totalQuantity || 0
    };
  },
  availableAssets: () => prisma.asset.findMany({ where: { availableQuantity: { gt: 0 }, status: 'ACTIVE' }, orderBy: { name: 'asc' }, include: { category: true } }),
  allAssets: () => prisma.asset.findMany({ orderBy: { name: 'asc' }, include: { category: true } }),
  currentHoldersByAsset: (assetId) => prisma.loanItem.findMany({ where: { assetId, loan: { status: { in: ['OPEN', 'PARTIALLY_RETURNED'] } } }, include: { loan: { include: { employee: true } } } }),
  assetsByStatus: async () => {
    const [maintenanceAssets, inactiveAssets, retiredAssets, maintenanceQuantity, inactiveQuantity, retiredQuantity] = await Promise.all([
      prisma.asset.count({ where: { status: 'MAINTENANCE' } }),
      prisma.asset.count({ where: { status: 'INACTIVE' } }),
      prisma.asset.count({ where: { status: 'RETIRED' } }),
      prisma.asset.aggregate({ where: { status: 'MAINTENANCE' }, _sum: { totalQuantity: true } }),
      prisma.asset.aggregate({ where: { status: 'INACTIVE' }, _sum: { totalQuantity: true } }),
      prisma.asset.aggregate({ where: { status: 'RETIRED' }, _sum: { totalQuantity: true } })
    ]);
    return {
      maintenanceAssets,
      inactiveAssets,
      retiredAssets,
      maintenanceQuantity: maintenanceQuantity._sum.totalQuantity || 0,
      inactiveQuantity: inactiveQuantity._sum.totalQuantity || 0,
      retiredQuantity: retiredQuantity._sum.totalQuantity || 0
    };
  },
  activeLoansCount: () => prisma.loan.count({ where: { status: { in: ['OPEN', 'PARTIALLY_RETURNED'] } } }),
  employeesWithActiveLoansCount: () =>
    prisma.employee.count({
      where: {
        loans: {
          some: {
            status: { in: ['OPEN', 'PARTIALLY_RETURNED'] }
          }
        }
      }
    }),
  recentMovements: (take = 8) =>
    prisma.inventoryMovement.findMany({
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        asset: { select: { id: true, name: true, assetCode: true } },
        employee: { select: { id: true, firstName: true, lastName: true } },
        performedByUser: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    })
};

module.exports = { inventoryRepository };