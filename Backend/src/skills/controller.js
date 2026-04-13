const { SkillsService } = require('./services');
const { Response } = require('../common/response');

module.exports.SkillsController = {
  getSkills: async (req, res, next) => {
    try {
      const result = await SkillsService.getPaginated(req.query);
      Response.success(res, 200, 'Lista de skills', result);
    } catch (error) {
      next(error);
    }
  },

  getSkill: async (req, res, next) => {
    try {
      const { id } = req.params;
      const skill = await SkillsService.getById(id);
      Response.success(res, 200, 'Skill encontrada', skill);
    } catch (error) {
      next(error);
    }
  },

  createSkill: async (req, res, next) => {
    try {
      const insertedId = await SkillsService.create(req.body);
      Response.success(res, 201, 'Skill creada correctamente', { id: insertedId });
    } catch (error) {
      next(error);
    }
  },

  updateSkill: async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await SkillsService.updateSkill(id, req.body);
      Response.success(res, 200, 'Skill actualizada correctamente', result);
    } catch (error) {
      next(error);
    }
  },

  changeStatus: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const result = await SkillsService.changeStatus(id, status);
      Response.success(res, 200, 'Estado actualizado correctamente', result);
    } catch (error) {
      next(error);
    }
  }
};