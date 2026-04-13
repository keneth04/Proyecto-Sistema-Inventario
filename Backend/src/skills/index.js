const express = require('express');
const { SkillsController } = require('./controller');
const { AuthMiddleware } = require('../middlewares/authMiddleware');
const { RoleMiddleware } = require('../middlewares/roleMiddleware');
const { validateRequest } = require('../middlewares/validateMiddleware');
const { skillsSchemas } = require('../validation/schemas');

const router = express.Router();

module.exports.SkillsAPI = (app) => {
  /**
   * 🔐 Protección global del módulo
   * Todo requiere autenticación + rol admin
   */
  router.use(AuthMiddleware);
  router.use(RoleMiddleware(['admin']));

  router.post('/', validateRequest({ body: skillsSchemas.create }), SkillsController.createSkill);
  router.get('/', validateRequest({ query: skillsSchemas.query }), SkillsController.getSkills);
  router.get('/:id', validateRequest({ params: skillsSchemas.idParam }), SkillsController.getSkill);
  router.patch('/:id', validateRequest({ params: skillsSchemas.idParam, body: skillsSchemas.update }), SkillsController.updateSkill);
  router.patch('/:id/status', validateRequest({ params: skillsSchemas.idParam, body: skillsSchemas.changeStatus }), SkillsController.changeStatus);

  app.use('/api/skills', router);
};