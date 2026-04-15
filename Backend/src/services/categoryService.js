const createError = require('http-errors');
const { categoryRepository } = require('../repositories/categoryRepository');
const { auditRepository } = require('../repositories/auditRepository');

const paginate = ({ page, pageSize }) => ({ skip: (page - 1) * pageSize, take: pageSize });

const categoryService = {
  create: async (payload, actorUserId) => {
    const created = await categoryRepository.create(payload);
    await auditRepository.create({ performedByUserId: actorUserId, entityType: 'CATEGORY', entityId: created.id, action: 'CREATE', summary: `Categoría ${created.name} creada` });
    return created;
  },
  list: async ({ page, pageSize }) => {
    const [items, total] = await Promise.all([categoryRepository.list(paginate({ page, pageSize })), categoryRepository.count()]);
    return { items, pagination: { page, pageSize, total } };
  },
  findById: async (id) => {
    const found = await categoryRepository.findById(id);
    if (!found) throw new createError.NotFound('Categoría no encontrada');
    return found;
  },
  update: async (id, payload, actorUserId) => {
    await categoryService.findById(id);
    const updated = await categoryRepository.update(id, payload);
    await auditRepository.create({ performedByUserId: actorUserId, entityType: 'CATEGORY', entityId: updated.id, action: 'UPDATE', summary: `Categoría ${updated.name} actualizada` });
    return updated;
  },
  remove: async (id, actorUserId) => {
    await categoryService.findById(id);
    await categoryRepository.delete(id);
    await auditRepository.create({ performedByUserId: actorUserId, entityType: 'CATEGORY', entityId: id, action: 'DELETE', summary: `Categoría ${id} eliminada` });
  }
};

module.exports = { categoryService };