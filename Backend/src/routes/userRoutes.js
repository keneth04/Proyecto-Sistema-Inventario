const express = require('express');
const { userController } = require('../controllers');
const { validateRequest } = require('../middlewares/validateMiddleware');
const { userSchemas } = require('../validation/schemas');
const { RoleMiddleware } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(RoleMiddleware(['ADMIN']));
router.post('/', validateRequest({ body: userSchemas.create }), userController.create);
router.get('/', validateRequest({ query: userSchemas.list }), userController.list);
router.get('/:id', validateRequest({ params: userSchemas.idParam }), userController.findById);
router.put('/:id', validateRequest({ params: userSchemas.idParam, body: userSchemas.update }), userController.update);
router.delete('/:id', validateRequest({ params: userSchemas.idParam }), userController.remove);

module.exports = { userRoutes: router };