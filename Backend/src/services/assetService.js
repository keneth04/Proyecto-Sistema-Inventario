const createError = require('http-errors');
const { assetRepository } = require('../repositories/assetRepository');
const { categoryRepository } = require('../repositories/categoryRepository');
const { auditRepository } = require('../repositories/auditRepository');

const paginate = ({ page, pageSize }) => ({ skip: (page - 1) * pageSize, take: pageSize });

const assetService = {
  create: async (payload, actorUserId) => {
    const category = await categoryRepository.findById(payload.categoryId);
    if (!category) throw new createError.BadRequest('Categoría inválida');

    const created = await assetRepository.create({ ...payload, availableQuantity: payload.totalQuantity });
    await auditRepository.create({ performedByUserId: actorUserId, entityType: 'ASSET', entityId: created.id, assetId: created.id, action: 'CREATE', summary: `Activo ${created.assetCode} creado` });
    return created;
  },
  list: async ({ page, pageSize }) => {
    const [items, total] = await Promise.all([assetRepository.list(paginate({ page, pageSize })), assetRepository.count()]);
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
    const updated = await assetRepository.update(id, { status });
    await auditRepository.create({ performedByUserId: actorUserId, entityType: 'ASSET', entityId: updated.id, assetId: updated.id, action: 'STATUS_CHANGED', summary: `Estado de activo ${updated.assetCode} cambiado a ${status}` });
    return updated;
  }
};

module.exports = { assetService };