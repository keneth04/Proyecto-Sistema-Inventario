const { Response } = require('../common/response');
const { reportService } = require('../services/reportService');

const reportController = {
  assetsByStatus: async (_req, res, next) => {
    try {
      const data = await reportService.assetsByStatus();
      return Response.success(res, 200, 'Reporte de activos por estado', data);
    } catch (error) {
      return next(error);
    }
  },

  activeLoans: async (_req, res, next) => {
    try {
      const data = await reportService.activeLoans();
      return Response.success(res, 200, 'Reporte de préstamos activos', data);
    } catch (error) {
      return next(error);
    }
  },

  loanHistory: async (req, res, next) => {
    try {
      const data = await reportService.loanHistory(req.query);
      return Response.success(res, 200, 'Reporte de historial de préstamos', data);
    } catch (error) {
      return next(error);
    }
  },

  retiredAssets: async (_req, res, next) => {
    try {
      const data = await reportService.retiredAssets();
      return Response.success(res, 200, 'Reporte de activos retirados', data);
    } catch (error) {
      return next(error);
    }
  },

  inventoryGeneral: async (_req, res, next) => {
    try {
      const data = await reportService.inventoryGeneral();
      return Response.success(res, 200, 'Reporte de inventario general', data);
    } catch (error) {
      return next(error);
    }
  }
};

module.exports = { reportController };