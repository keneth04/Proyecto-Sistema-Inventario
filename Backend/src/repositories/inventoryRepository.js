const { prisma } = require('../prisma/client');

const inventoryRepository = {
  stockSummary: async () => {
    const aggregates = await prisma.asset.aggregate({ _sum: { totalQuantity: true, availableQuantity: true } });
    return {
      totalAssetsQuantity: aggregates._sum.totalQuantity || 0,
      availableAssetsQuantity: aggregates._sum.availableQuantity || 0,
      loanedAssetsQuantity: (aggregates._sum.totalQuantity || 0) - (aggregates._sum.availableQuantity || 0)
    };
  },
  availableAssets: () => prisma.asset.findMany({ where: { availableQuantity: { gt: 0 }, status: 'ACTIVE' }, orderBy: { name: 'asc' }, include: { category: true } }),
  allAssets: () => prisma.asset.findMany({ orderBy: { name: 'asc' }, include: { category: true } }),
  currentHoldersByAsset: (assetId) => prisma.loanItem.findMany({ where: { assetId, loan: { status: { in: ['OPEN', 'PARTIALLY_RETURNED'] } } }, include: { loan: { include: { employee: true } } } })
};

module.exports = { inventoryRepository };