const { Response } = require('../common/response');

const buildCrudController = (service) => ({
  create: async (req, res, next) => {
    try {
      const data = await service.create(req.body, req.user.id);
      return Response.success(res, 201, 'Creado correctamente', data);
    } catch (error) {
      return next(error);
    }
  },
  list: async (req, res, next) => {
    try {
      const data = await service.list(req.query);
      return Response.success(res, 200, 'Listado obtenido', data);
    } catch (error) {
      return next(error);
    }
  },
  findById: async (req, res, next) => {
    try {
      const data = await service.findById(Number(req.params.id));
      return Response.success(res, 200, 'Detalle obtenido', data);
    } catch (error) {
      return next(error);
    }
  },
  update: async (req, res, next) => {
    try {
      const data = await service.update(Number(req.params.id), req.body, req.user.id);
      return Response.success(res, 200, 'Actualizado correctamente', data);
    } catch (error) {
      return next(error);
    }
  },
  remove: async (req, res, next) => {
    try {
      await service.remove(Number(req.params.id), req.user.id);
      return Response.success(res, 200, 'Eliminado correctamente', {});
    } catch (error) {
      return next(error);
    }
  }
});

module.exports = { buildCrudController };