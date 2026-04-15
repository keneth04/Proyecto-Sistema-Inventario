const express = require('express');
const { loanController } = require('../controllers');
const { validateRequest } = require('../middlewares/validateMiddleware');
const { loanSchemas } = require('../validation/schemas');
const { RoleMiddleware } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/', RoleMiddleware(['ADMIN', 'INVENTORY_MANAGER', 'VIEWER']), validateRequest({ query: loanSchemas.list }), loanController.list);
router.get('/:id', RoleMiddleware(['ADMIN', 'INVENTORY_MANAGER', 'VIEWER']), validateRequest({ params: loanSchemas.idParam }), loanController.findById);
router.post('/', RoleMiddleware(['ADMIN', 'INVENTORY_MANAGER']), validateRequest({ body: loanSchemas.create }), loanController.register);

module.exports = { loanRoutes: router };