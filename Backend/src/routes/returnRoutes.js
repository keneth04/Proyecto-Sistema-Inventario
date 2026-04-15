const express = require('express');
const { returnController } = require('../controllers');
const { validateRequest } = require('../middlewares/validateMiddleware');
const { returnSchemas } = require('../validation/schemas');
const { RoleMiddleware } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/', RoleMiddleware(['ADMIN', 'INVENTORY_MANAGER', 'VIEWER']), validateRequest({ query: returnSchemas.list }), returnController.list);
router.get('/:id', RoleMiddleware(['ADMIN', 'INVENTORY_MANAGER', 'VIEWER']), validateRequest({ params: returnSchemas.idParam }), returnController.findById);
router.post('/', RoleMiddleware(['ADMIN', 'INVENTORY_MANAGER']), validateRequest({ body: returnSchemas.create }), returnController.register);

module.exports = { returnRoutes: router };