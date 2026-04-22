const { inventoryRepository } = require('../repositories/inventoryRepository');

const inventoryService = {
  summary: () => inventoryRepository.stockSummary(),
  availableAssets: () => inventoryRepository.availableAssets(),
  loanedAssets: async () => {
    const assets = await inventoryRepository.allAssets();
    return assets.filter((asset) => asset.availableQuantity < asset.totalQuantity);
  },
  executiveDashboard: async () => {
    const [summary, byStatus, latestMovements] = await Promise.all([
      inventoryRepository.stockSummary(),
      inventoryRepository.assetsByStatus(),
      inventoryRepository.recentMovements(8)
    ]);

    return {
      kpis: {
        totalAssets: summary.totalAssets,
        totalStock: summary.totalAssetsQuantity,
        available: summary.availableAssetsQuantity,
        loaned: summary.loanedAssetsQuantity,
        maintenance: byStatus.maintenanceAssets
      },
      latestMovements
    };
  }
};

module.exports = { inventoryService };