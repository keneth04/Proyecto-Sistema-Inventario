const { authController } = require('./authController');
const { buildCrudController } = require('./crudControllerFactory');
const { userService } = require('../services/userService');
const { employeeService } = require('../services/employeeService');
const { categoryService } = require('../services/categoryService');
const { assetController } = require('./assetController');
const { loanController } = require('./loanController');
const { returnController } = require('./returnController');
const { inventoryController } = require('./inventoryController');
const { auditController } = require('./auditController');

module.exports = {
  authController,
  userController: buildCrudController(userService),
  employeeController: buildCrudController(employeeService),
  categoryController: buildCrudController(categoryService),
  assetController,
  loanController,
  returnController,
  inventoryController,
  auditController
};