const express = require('express');
const { categoryController } = require('../controllers');
const { validateRequest } = require('../middlewares/validateMiddleware');
const { categorySchemas } = require('../validation/schemas');
const { RoleMiddleware } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/', RoleMiddleware(['ADMIN', 'INVENTORY_MANAGER', 'VIEWER']), validateRequest({ query: categorySchemas.list }), categoryController.list);
router.get('/:id', RoleMiddleware(['ADMIN', 'INVENTORY_MANAGER', 'VIEWER']), validateRequest({ params: categorySchemas.idParam }), categoryController.findById);
router.post('/', RoleMiddleware(['ADMIN', 'INVENTORY_MANAGER']), validateRequest({ body: categorySchemas.create }), categoryController.create);
router.put('/:id', RoleMiddleware(['ADMIN', 'INVENTORY_MANAGER']), validateRequest({ params: categorySchemas.idParam, body: categorySchemas.update }), categoryController.update);
router.delete('/:id', RoleMiddleware(['ADMIN']), validateRequest({ params: categorySchemas.idParam }), categoryController.remove);

module.exports = { categoryRoutes: router };