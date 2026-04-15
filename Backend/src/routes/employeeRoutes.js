const express = require('express');
const { employeeController } = require('../controllers');
const { validateRequest } = require('../middlewares/validateMiddleware');
const { employeeSchemas } = require('../validation/schemas');
const { RoleMiddleware } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/', RoleMiddleware(['ADMIN', 'INVENTORY_MANAGER', 'VIEWER']), validateRequest({ query: employeeSchemas.list }), employeeController.list);
router.get('/:id', RoleMiddleware(['ADMIN', 'INVENTORY_MANAGER', 'VIEWER']), validateRequest({ params: employeeSchemas.idParam }), employeeController.findById);
router.post('/', RoleMiddleware(['ADMIN', 'INVENTORY_MANAGER']), validateRequest({ body: employeeSchemas.create }), employeeController.create);
router.put('/:id', RoleMiddleware(['ADMIN', 'INVENTORY_MANAGER']), validateRequest({ params: employeeSchemas.idParam, body: employeeSchemas.update }), employeeController.update);
router.delete('/:id', RoleMiddleware(['ADMIN']), validateRequest({ params: employeeSchemas.idParam }), employeeController.remove);

module.exports = { employeeRoutes: router };