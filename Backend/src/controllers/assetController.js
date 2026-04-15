const { Response } = require('../common/response');
const { assetService } = require('../services/assetService');
const { buildCrudController } = require('./crudControllerFactory');

const base = buildCrudController(assetService);

const assetController = {
  ...base,
  changeStatus: async (req, res, next) => {
    try {
      const data = await assetService.changeStatus(Number(req.params.id), req.body.status, req.user.id);
      return Response.success(res, 200, 'Estado actualizado', data);
    } catch (error) {
      return next(error);
    }
  }
};

module.exports = { assetController };