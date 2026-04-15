const { Response } = require('../common/response');
const { inventoryService } = require('../services/inventoryService');

const inventoryController = {
  summary: async (_req, res, next) => {
    try {
      const data = await inventoryService.summary();
      return Response.success(res, 200, 'Resumen de inventario', data);
    } catch (error) {
      return next(error);
    }
  },
  availableAssets: async (_req, res, next) => {
    try {
      const data = await inventoryService.availableAssets();
      return Response.success(res, 200, 'Activos disponibles', data);
    } catch (error) {
      return next(error);
    }
  },
  loanedAssets: async (_req, res, next) => {
    try {
      const data = await inventoryService.loanedAssets();
      return Response.success(res, 200, 'Activos prestados', data);
    } catch (error) {
      return next(error);
    }
  }
};

module.exports = { inventoryController };