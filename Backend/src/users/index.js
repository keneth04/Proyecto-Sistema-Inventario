const express = require('express');
const { UsersController } = require('./controller');
const { UsersService } = require('./services');

const { AuthMiddleware } = require('../middlewares/authMiddleware');
const { RoleMiddleware } = require('../middlewares/roleMiddleware'); // (mantengo el nombre actual para no romper nada)
const { validateRequest } = require('../middlewares/validateMiddleware');
const { usersSchemas } = require('../validation/schemas');

const router = express.Router();

/**
 * Middleware:
 * - Si NO existen usuarios, permite crear el primero sin auth (se fuerza admin en el service)
 * - Si YA existen, exige token + rol admin
 */
const RequireAdminIfUsersExist = async (req, res, next) => {
  try {
    const totalUsers = await UsersService.countUsers();
    if (totalUsers === 0) {
      return next();
    }

    // Si ya hay usuarios => Auth + Role admin
    AuthMiddleware(req, res, (err) => {
      if (err) return next(err);
      RoleMiddleware(['admin'])(req, res, next);
    });
  } catch (error) {
    next(error);
  }
};

module.exports.UsersAPI = (app) => {
  /**
   * 🔥 CREAR USUARIO
   * - Primer usuario: permitido sin token (service lo fuerza admin)
   * - Después: solo admin
   */
  router.post('/', RequireAdminIfUsersExist, validateRequest({ body: usersSchemas.create }), UsersController.createUser);

  /**
   * 🔐 Rutas protegidas (solo admin)
   */
  router.get('/', AuthMiddleware, RoleMiddleware(['admin']), validateRequest({ query: usersSchemas.query }), UsersController.getUsers);

  router.get('/agents', AuthMiddleware, RoleMiddleware(['admin']), validateRequest({ query: usersSchemas.agentsCatalogQuery }), UsersController.getAgentsCatalog);
  
  router.get('/campaigns', AuthMiddleware, RoleMiddleware(['admin']), validateRequest({ query: usersSchemas.campaignsCatalogQuery }), UsersController.getCampaignsCatalog);

  router.get('/:id', AuthMiddleware, RoleMiddleware(['admin']), validateRequest({ params: usersSchemas.idParam }), UsersController.getUser);

  router.patch('/:id', AuthMiddleware, RoleMiddleware(['admin']), validateRequest({ params: usersSchemas.idParam, body: usersSchemas.update }), UsersController.updateUser);

  router.patch('/:id/status', AuthMiddleware, RoleMiddleware(['admin']), validateRequest({ params: usersSchemas.idParam, body: usersSchemas.changeStatus }), UsersController.changeStatus);

  app.use('/api/users', router);
};