const express = require('express');
const { inventoryController } = require('../controllers');
const { RoleMiddleware } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(RoleMiddleware(['ADMIN', 'INVENTORY_MANAGER', 'VIEWER']));
router.get('/summary', inventoryController.summary);
router.get('/available-assets', inventoryController.availableAssets);
router.get('/loaned-assets', inventoryController.loanedAssets);

module.exports = { inventoryRoutes: router };