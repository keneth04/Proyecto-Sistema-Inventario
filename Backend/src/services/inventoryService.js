const { inventoryRepository } = require('../repositories/inventoryRepository');

const inventoryService = {
  summary: () => inventoryRepository.stockSummary(),
  availableAssets: () => inventoryRepository.availableAssets(),
  loanedAssets: async () => {
    const assets = await inventoryRepository.allAssets();
    return assets.filter((asset) => asset.availableQuantity < asset.totalQuantity);
    },
  executiveDashboard: async () => {
    const [summary, byStatus, pendingReturns, employeesWithActiveLoans, latestMovements] = await Promise.all([
      inventoryRepository.stockSummary(),
      inventoryRepository.assetsByStatus(),
      inventoryRepository.activeLoansCount(),
      inventoryRepository.employeesWithActiveLoansCount(),
      inventoryRepository.recentMovements(8)
    ]);

    return {
      kpis: {
        totalAssets: summary.totalAssets,
        available: summary.availableAssetsQuantity,
        loaned: summary.loanedAssetsQuantity,
        maintenance: byStatus.maintenanceAssets,
        pendingReturns,
        employeesWithActiveLoans
      },
      latestMovements
    };
  }
};

module.exports = { inventoryService };