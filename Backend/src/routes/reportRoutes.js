const express = require('express');
const { reportController } = require('../controllers');
const { RoleMiddleware } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(RoleMiddleware(['ADMIN', 'INVENTORY_MANAGER', 'VIEWER']));
router.get('/assets-by-status', reportController.assetsByStatus);
router.get('/active-loans', reportController.activeLoans);
router.get('/loan-history', reportController.loanHistory);
router.get('/retired-assets', reportController.retiredAssets);
router.get('/inventory-general', reportController.inventoryGeneral);

module.exports = { reportRoutes: router };