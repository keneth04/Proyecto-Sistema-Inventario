const { auditRepository } = require('../repositories/auditRepository');

const paginate = ({ page, pageSize }) => ({ skip: (page - 1) * pageSize, take: pageSize });
const MAX_PAGE_SIZE = 100;

const normalizePagination = ({ page, pageSize }) => {
  const parsedPage = Number.parseInt(String(page), 10);
  const parsedPageSize = Number.parseInt(String(pageSize), 10);
  const safePage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const safePageSize = Number.isNaN(parsedPageSize) || parsedPageSize < 1 ? 20 : Math.min(parsedPageSize, MAX_PAGE_SIZE);
  return { page: safePage, pageSize: safePageSize };
};

const auditService = {
  generalHistory: async ({ page, pageSize }) => {
    const pagination = normalizePagination({ page, pageSize });
    const [items, total] = await Promise.all([auditRepository.list(paginate(pagination)), auditRepository.count()]);
    return { items, pagination: { ...pagination, total } };
  },
  historyByAsset: async (assetId, { page, pageSize }) => {
    const pagination = normalizePagination({ page, pageSize });
    const where = { assetId };
    const [items, total] = await Promise.all([auditRepository.byAsset(assetId, paginate(pagination)), auditRepository.count(where)]);
    return { items, pagination: { ...pagination, total } };
  },
  historyByEmployee: async (employeeId, { page, pageSize }) => {
    const pagination = normalizePagination({ page, pageSize });
    const where = { employeeId };
    const [items, total] = await Promise.all([auditRepository.byEmployee(employeeId, paginate(pagination)), auditRepository.count(where)]);
    return { items, pagination: { ...pagination, total } };
  }
};

module.exports = { auditService };