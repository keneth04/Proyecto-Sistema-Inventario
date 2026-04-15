const express = require('express');
const { auditController } = require('../controllers');
const { validateRequest } = require('../middlewares/validateMiddleware');
const { RoleMiddleware } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(RoleMiddleware(['ADMIN', 'INVENTORY_MANAGER', 'VIEWER']));
router.get('/general', validateRequest({ query: (q) => ({ page: Number.parseInt(q.page || '1', 10), pageSize: Number.parseInt(q.pageSize || '20', 10) }) }), auditController.generalHistory);
router.get('/asset/:assetId', validateRequest({ params: (p) => ({ assetId: Number.parseInt(p.assetId, 10) }), query: (q) => ({ page: Number.parseInt(q.page || '1', 10), pageSize: Number.parseInt(q.pageSize || '20', 10) }) }), auditController.historyByAsset);
router.get('/employee/:employeeId', validateRequest({ params: (p) => ({ employeeId: Number.parseInt(p.employeeId, 10) }), query: (q) => ({ page: Number.parseInt(q.page || '1', 10), pageSize: Number.parseInt(q.pageSize || '20', 10) }) }), auditController.historyByEmployee);

module.exports = { auditRoutes: router };