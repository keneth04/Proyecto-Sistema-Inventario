const { auditRepository } = require('../repositories/auditRepository');

const paginate = ({ page, pageSize }) => ({ skip: (page - 1) * pageSize, take: pageSize });
const MAX_PAGE_SIZE = 100;
const ALLOWED_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'LOAN_REGISTERED', 'RETURN_REGISTERED', 'STOCK_ADJUSTED', 'STATUS_CHANGED'];
const ALLOWED_MODULES = ['USER', 'EMPLOYEE', 'CATEGORY', 'ASSET', 'LOAN', 'RETURN', 'INVENTORY_MOVEMENT'];

const normalizePagination = ({ page, pageSize }) => {
  const parsedPage = Number.parseInt(String(page), 10);
  const parsedPageSize = Number.parseInt(String(pageSize), 10);
  const safePage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const safePageSize = Number.isNaN(parsedPageSize) || parsedPageSize < 1 ? 20 : Math.min(parsedPageSize, MAX_PAGE_SIZE);
  return { page: safePage, pageSize: safePageSize };
};

const cleanText = (value) => (typeof value === 'string' ? value.trim() : '');

const normalizeFilters = ({ assetName, employeeName, performedBy, action, module, date }) => {
  const safeAssetName = cleanText(assetName);
  const safeEmployeeName = cleanText(employeeName);
  const safePerformedBy = cleanText(performedBy);
  const normalizedAction = typeof action === 'string' && ALLOWED_ACTIONS.includes(action) ? action : undefined;
  const normalizedModule = typeof module === 'string' && ALLOWED_MODULES.includes(module) ? module : undefined;
  const parsedDate = typeof date === 'string' && date ? new Date(`${date}T00:00:00.000Z`) : null;
  const hasValidDate = parsedDate instanceof Date && !Number.isNaN(parsedDate.getTime());
  const nextDate = hasValidDate ? new Date(parsedDate.getTime() + (24 * 60 * 60 * 1000)) : null;

  const andFilters = [
    safeAssetName ? { asset: { name: { contains: safeAssetName } } } : null,
    safeEmployeeName ? {
      employee: {
        OR: [
          { firstName: { contains: safeEmployeeName } },
          { lastName: { contains: safeEmployeeName } },
          { employeeCode: { contains: safeEmployeeName } }
        ]
      }
    } : null,
    safePerformedBy ? {
      performedByUser: {
        OR: [
          { firstName: { contains: safePerformedBy } },
          { lastName: { contains: safePerformedBy } },
          { email: { contains: safePerformedBy } }
        ]
      }
    } : null,
    normalizedAction ? { action: normalizedAction } : null,
    normalizedModule ? { entityType: normalizedModule } : null,
    hasValidDate ? { createdAt: { gte: parsedDate, lt: nextDate } } : null
  ].filter(Boolean);

  return andFilters.length ? { AND: andFilters } : {};
};

const auditService = {
  generalHistory: async ({ page, pageSize, assetName, employeeName, performedBy, action, module, date }) => {
    const pagination = normalizePagination({ page, pageSize });
    const where = normalizeFilters({ assetName, employeeName, performedBy, action, module, date });
    const [items, total] = await Promise.all([auditRepository.list({ ...paginate(pagination), where }), auditRepository.count(where)]);
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