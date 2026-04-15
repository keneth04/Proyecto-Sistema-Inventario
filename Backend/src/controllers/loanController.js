const { Response } = require('../common/response');
const { loanService } = require('../services/loanService');

const loanController = {
  register: async (req, res, next) => {
    try {
      const data = await loanService.register(req.body, req.user.id);
      return Response.success(res, 201, 'Préstamo registrado', data);
    } catch (error) {
      return next(error);
    }
  },
  list: async (req, res, next) => {
    try {
      const data = await loanService.list(req.query);
      return Response.success(res, 200, 'Listado de préstamos', data);
    } catch (error) {
      return next(error);
    }
  },
  findById: async (req, res, next) => {
    try {
      const data = await loanService.findById(Number(req.params.id));
      return Response.success(res, 200, 'Detalle de préstamo', data);
    } catch (error) {
      return next(error);
    }
  }
};

module.exports = { loanController };