const { Response } = require('../common/response');
const { auditService } = require('../services/auditService');

const auditController = {
  generalHistory: async (req, res, next) => {
    try {
      const data = await auditService.generalHistory(req.query);
      return Response.success(res, 200, 'Historial general', data);
    } catch (error) {
      return next(error);
    }
  },
  historyByAsset: async (req, res, next) => {
    try {
      const data = await auditService.historyByAsset(Number(req.params.assetId), req.query);
      return Response.success(res, 200, 'Historial por activo', data);
    } catch (error) {
      return next(error);
    }
  },
  historyByEmployee: async (req, res, next) => {
    try {
      const data = await auditService.historyByEmployee(Number(req.params.employeeId), req.query);
      return Response.success(res, 200, 'Historial por empleado', data);
    } catch (error) {
      return next(error);
    }
  }
};

module.exports = { auditController };