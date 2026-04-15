const { auditRepository } = require('../repositories/auditRepository');

const paginate = ({ page, pageSize }) => ({ skip: (page - 1) * pageSize, take: pageSize });

const auditService = {
  generalHistory: ({ page, pageSize }) => auditRepository.list(paginate({ page, pageSize })),
  historyByAsset: (assetId, { page, pageSize }) => auditRepository.byAsset(assetId, paginate({ page, pageSize })),
  historyByEmployee: (employeeId, { page, pageSize }) => auditRepository.byEmployee(employeeId, paginate({ page, pageSize }))
};

module.exports = { auditService };