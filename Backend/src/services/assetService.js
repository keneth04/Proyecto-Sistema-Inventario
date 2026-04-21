const createError = require('http-errors');
const { assetRepository } = require('../repositories/assetRepository');
const { categoryRepository } = require('../repositories/categoryRepository');
const { auditRepository } = require('../repositories/auditRepository');

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeListParams = (params = {}) => {
  const page = toPositiveInt(params.page, 1);
  const pageSize = Math.min(toPositiveInt(params.pageSize, 20), 100);
  return {
    page,
    pageSize,
    q: String(params.q ?? '').trim(),
    status: String(params.status ?? 'ALL').trim().toUpperCase(),
    categoryId: toPositiveInt(params.categoryId, null)
  };
};

const paginate = ({ page, pageSize }) => ({ skip: (page - 1) * pageSize, take: pageSize });

const buildWhereClause = ({ q, status, categoryId }) => {
  const and = [];

  if (q) {
    and.push({
      OR: [
        { name: { contains: q } },
        { brand: { contains: q } },
        { serialNumber: { contains: q } },
        { description: { contains: q } },
        { assetCode: { contains: q } },
        { category: { name: { contains: q } } }
      ]
    });
  }

  if (categoryId) and.push({ categoryId });

  if (status === 'ACTIVE' || status === 'MAINTENANCE' || status === 'INACTIVE' || status === 'RETIRED') {
    and.push({ status });
  }

  if (and.length === 0) return {};
  return { AND: and };
};


const assetService = {
  create: async (payload, actorUserId) => {
    const category = await categoryRepository.findById(payload.categoryId);
    if (!category) throw new createError.BadRequest('Categoría inválida');

    const created = await assetRepository.create({ ...payload, availableQuantity: payload.totalQuantity });
    await auditRepository.create({ performedByUserId: actorUserId, entityType: 'ASSET', entityId: created.id, assetId: created.id, action: 'CREATE', summary: `Activo ${created.assetCode} creado` });
    return created;
  },
  list: async (params) => {
    const { page, pageSize, q, status, categoryId } = normalizeListParams(params);
    const where = buildWhereClause({ q, status, categoryId });
    const [items, total] = await Promise.all([
      assetRepository.list({ ...paginate({ page, pageSize }), where }),
      assetRepository.count(where)
    ]);
    return { items, pagination: { page, pageSize, total } };
  },
  findById: async (id) => {
    const found = await assetRepository.findById(id);
    if (!found) throw new createError.NotFound('Activo no encontrado');
    return found;
  },
  update: async (id, payload, actorUserId) => {
    await assetService.findById(id);
    if (payload.categoryId) {
      const category = await categoryRepository.findById(payload.categoryId);
      if (!category) throw new createError.BadRequest('Categoría inválida');
    }
    const updated = await assetRepository.update(id, payload);
    await auditRepository.create({ performedByUserId: actorUserId, entityType: 'ASSET', entityId: updated.id, assetId: updated.id, action: 'UPDATE', summary: `Activo ${updated.assetCode} actualizado` });
    return updated;
  },
  changeStatus: async (id, status, actorUserId) => {
    const current = await assetService.findById(id);
    const updated = await assetRepository.update(id, { status });
    await auditRepository.create({
      performedByUserId: actorUserId,
      entityType: 'ASSET',
      entityId: updated.id,
      assetId: updated.id,
      action: 'STATUS_CHANGED',
      summary: `Estado de activo ${updated.assetCode} cambiado de ${current.status} a ${status}`,
      metadata: { previousStatus: current.status, newStatus: status }
    });
    if (status === 'RETIRED' && current.status !== 'RETIRED') {
      await auditRepository.create({
        performedByUserId: actorUserId,
        entityType: 'ASSET',
        entityId: updated.id,
        assetId: updated.id,
        action: 'DELETE',
        summary: `Activo ${updated.assetCode} retirado (eliminación lógica)`,
        metadata: { logicalDeletion: true, status: updated.status }
      });
    }
    return updated;
  }
};

module.exports = { assetService };