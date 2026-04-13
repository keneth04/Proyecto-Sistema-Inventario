const { UsersService } = require('./services');
const { Response } = require('../common/response');

module.exports.UsersController = {
  getUsers: async (req, res, next) => {
    try {
      const result = await UsersService.getPaginated(req.query);
      Response.success(res, 200, 'Lista de usuarios', result);
    } catch (error) {
      next(error);
    }
  },

  getUser: async (req, res, next) => {
    try {
      const { id } = req.params;
      const user = await UsersService.getById(id);
      Response.success(res, 200, 'Usuario encontrado', user);
    } catch (error) {
      next(error);
    }
  },

  getAgentsCatalog: async (req, res, next) => {
    try {
      const items = await UsersService.getAgentsCatalog(req.query);
      Response.success(res, 200, 'Catálogo de agentes', { items });
    } catch (error) {
      next(error);
    }
  },

  getCampaignsCatalog: async (req, res, next) => {
    try {
      const items = await UsersService.getCampaignsCatalog(req.query);
      Response.success(res, 200, 'Catálogo de campañas', { items });
    } catch (error) {
      next(error);
    }
  },

  createUser: async (req, res, next) => {
    try {
      const insertedId = await UsersService.create(req.body);
      Response.success(res, 201, 'Usuario creado correctamente', { id: insertedId });
    } catch (error) {
      next(error);
    }
  },

  updateUser: async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await UsersService.updateUser(id, req.body);
      Response.success(res, 200, 'Usuario actualizado correctamente', result);
    } catch (error) {
      next(error);
    }
  },

  changeStatus: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const result = await UsersService.changeStatus(id, status);
      Response.success(res, 200, 'Estado actualizado correctamente', result);
    } catch (error) {
      next(error);
    }
  }
};