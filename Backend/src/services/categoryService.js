const createError = require('http-errors');
const { categoryRepository } = require('../repositories/categoryRepository');
const { auditRepository } = require('../repositories/auditRepository');

const paginate = ({ page, pageSize }) => ({ skip: (page - 1) * pageSize, take: pageSize });

const UNIQUE_CONSTRAINT_CODE = 'P2002';
const MAX_PAGE_SIZE = 100;

const toPagination = ({ page, pageSize }) => {
  const parsedPage = Number.parseInt(String(page), 10);
  const parsedPageSize = Number.parseInt(String(pageSize), 10);
  const safePage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const safePageSize = Number.isNaN(parsedPageSize) || parsedPageSize < 1 ? 20 : Math.min(parsedPageSize, MAX_PAGE_SIZE);
  return { page: safePage, pageSize: safePageSize };
};

const ensureUniqueCategoryName = async ({ name, excludedId }) => {
  if (!name) return;
  const existing = await categoryRepository.findByNameInsensitive(name);
  if (!existing) return;
  if (excludedId && existing.id === excludedId) return;
  throw new createError.Conflict('Ya existe una categoría con ese nombre');
};

const mapCategoryError = (error) => {
  if (error?.code === UNIQUE_CONSTRAINT_CODE) {
    throw new createError.Conflict('Ya existe una categoría con ese nombre');
  }
  throw error;
};


const categoryService = {
  create: async (payload, actorUserId) => {
    await ensureUniqueCategoryName({ name: payload.name });
    let created;
    try {
      created = await categoryRepository.create(payload);
    } catch (error) {
      mapCategoryError(error);
    }
    await auditRepository.create({ performedByUserId: actorUserId, entityType: 'CATEGORY', entityId: created.id, action: 'CREATE', summary: `Categoría ${created.name} creada` });
    return created;
  },
  list: async ({ page, pageSize }) => {
    const pagination = toPagination({ page, pageSize });
    const [items, total] = await Promise.all([categoryRepository.list(paginate(pagination)), categoryRepository.count()]);
    return { items, pagination: { ...pagination, total } };
  },
  findById: async (id) => {
    const found = await categoryRepository.findById(id);
    if (!found) throw new createError.NotFound('Categoría no encontrada');
    return found;
  },
  update: async (id, payload, actorUserId) => {
    const current = await categoryService.findById(id);
    await ensureUniqueCategoryName({ name: payload.name, excludedId: id });
    let updated;
    try {
      updated = await categoryRepository.update(id, payload);
    } catch (error) {
      mapCategoryError(error);
    }
    const changedStatus = payload.isActive !== undefined && payload.isActive !== current.isActive;
    if (changedStatus) {
      await auditRepository.create({
        performedByUserId: actorUserId,
        entityType: 'CATEGORY',
        entityId: updated.id,
        action: 'STATUS_CHANGED',
        summary: `Categoría ${updated.name} ${updated.isActive ? 'activada' : 'desactivada'}`,
        metadata: { previousStatus: current.isActive ? 'ACTIVE' : 'INACTIVE', newStatus: updated.isActive ? 'ACTIVE' : 'INACTIVE' }
      });
    } else {
      await auditRepository.create({ performedByUserId: actorUserId, entityType: 'CATEGORY', entityId: updated.id, action: 'UPDATE', summary: `Categoría ${updated.name} actualizada` });
    }
    return updated;
  },
  remove: async (id, actorUserId) => {
    await categoryService.findById(id);
    await categoryRepository.delete(id);
    await auditRepository.create({ performedByUserId: actorUserId, entityType: 'CATEGORY', entityId: id, action: 'DELETE', summary: `Categoría ${id} eliminada` });
  }
};

module.exports = { categoryService };