const express = require('express');
const { authRoutes } = require('./authRoutes');
const { userRoutes } = require('./userRoutes');
const { employeeRoutes } = require('./employeeRoutes');
const { categoryRoutes } = require('./categoryRoutes');
const { assetRoutes } = require('./assetRoutes');
const { loanRoutes } = require('./loanRoutes');
const { returnRoutes } = require('./returnRoutes');
const { inventoryRoutes } = require('./inventoryRoutes');
const { auditRoutes } = require('./auditRoutes');
const { reportRoutes } = require('./reportRoutes');
const { AuthMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use('/auth', authRoutes);
router.use(AuthMiddleware);
router.use('/users', userRoutes);
router.use('/employees', employeeRoutes);
router.use('/categories', categoryRoutes);
router.use('/assets', assetRoutes);
router.use('/loans', loanRoutes);
router.use('/returns', returnRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/audit', auditRoutes);
router.use('/reports', reportRoutes);

module.exports = { apiRoutes: router };