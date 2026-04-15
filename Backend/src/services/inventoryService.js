const { inventoryRepository } = require('../repositories/inventoryRepository');

const inventoryService = {
  summary: () => inventoryRepository.stockSummary(),
  availableAssets: () => inventoryRepository.availableAssets(),
  loanedAssets: async () => {
    const assets = await inventoryRepository.allAssets();
    return assets.filter((asset) => asset.availableQuantity < asset.totalQuantity);
  }
};

module.exports = { inventoryService };