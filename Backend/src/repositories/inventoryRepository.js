const { prisma } = require('../prisma/client');

const inventoryRepository = {
  stockSummary: async () => {
    const [aggregates, totalAssets] = await Promise.all([
      prisma.asset.aggregate({ _sum: { totalQuantity: true, availableQuantity: true } }),
      prisma.asset.count()
    ]);
    return {
      totalAssets,
      totalAssetsQuantity: aggregates._sum.totalQuantity || 0,
      availableAssetsQuantity: aggregates._sum.availableQuantity || 0,
      loanedAssetsQuantity: (aggregates._sum.totalQuantity || 0) - (aggregates._sum.availableQuantity || 0)
    };
  },
  availableAssets: () => prisma.asset.findMany({ where: { availableQuantity: { gt: 0 }, status: 'ACTIVE' }, orderBy: { name: 'asc' }, include: { category: true } }),
  allAssets: () => prisma.asset.findMany({ orderBy: { name: 'asc' }, include: { category: true } }),
  currentHoldersByAsset: (assetId) => prisma.loanItem.findMany({ where: { assetId, loan: { status: { in: ['OPEN', 'PARTIALLY_RETURNED'] } } }, include: { loan: { include: { employee: true } } } }),
  assetsByStatus: async () => {
    const [maintenanceAssets, inactiveAssets, retiredAssets] = await Promise.all([
      prisma.asset.count({ where: { status: 'MAINTENANCE' } }),
      prisma.asset.count({ where: { status: 'INACTIVE' } }),
      prisma.asset.count({ where: { status: 'RETIRED' } })
    ]);
    return { maintenanceAssets, inactiveAssets, retiredAssets };
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
        employee: { select: { id: true, firstName: true, lastName: true } }
      }
    })
};

module.exports = { inventoryRepository };