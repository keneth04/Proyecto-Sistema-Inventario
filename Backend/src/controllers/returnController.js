const { Response } = require('../common/response');
const { returnService } = require('../services/returnService');

const returnController = {
  register: async (req, res, next) => {
    try {
      const data = await returnService.register(req.body, req.user.id);
      return Response.success(res, 201, 'Devolución registrada', data);
    } catch (error) {
      return next(error);
    }
  },
  list: async (req, res, next) => {
    try {
      const data = await returnService.list(req.query);
      return Response.success(res, 200, 'Listado de devoluciones', data);
    } catch (error) {
      return next(error);
    }
  },
  findById: async (req, res, next) => {
    try {
      const data = await returnService.findById(Number(req.params.id));
      return Response.success(res, 200, 'Detalle de devolución', data);
    } catch (error) {
      return next(error);
    }
  }
};

module.exports = { returnController };