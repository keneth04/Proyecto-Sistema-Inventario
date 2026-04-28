const express = require('express');
const { assetController } = require('../controllers');
const { validateRequest } = require('../middlewares/validateMiddleware');
const { assetSchemas } = require('../validation/schemas');
const { RoleMiddleware } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/', RoleMiddleware(['ADMIN', 'INVENTORY_MANAGER', 'VIEWER']), validateRequest({ query: assetSchemas.list }), assetController.list);
router.get('/:id', RoleMiddleware(['ADMIN', 'INVENTORY_MANAGER', 'VIEWER']), validateRequest({ params: assetSchemas.idParam }), assetController.findById);
router.post('/', RoleMiddleware(['ADMIN', 'INVENTORY_MANAGER']), validateRequest({ body: assetSchemas.create }), assetController.create);
router.put('/:id', RoleMiddleware(['ADMIN', 'INVENTORY_MANAGER']), validateRequest({ params: assetSchemas.idParam, body: assetSchemas.update }), assetController.update);
router.patch('/:id/status', RoleMiddleware(['ADMIN', 'INVENTORY_MANAGER']), validateRequest({ params: assetSchemas.idParam, body: (body) => ({ status: body.status }) }), assetController.changeStatus);
router.patch('/:id/retire-units', RoleMiddleware(['ADMIN', 'INVENTORY_MANAGER']), validateRequest({ params: assetSchemas.idParam, body: assetSchemas.retireUnits }), assetController.retireUnits);

module.exports = { assetRoutes: router };