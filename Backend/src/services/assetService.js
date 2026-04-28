const createError = require('http-errors');
const { prisma } = require('../prisma/client');
const { assetRepository } = require('../repositories/assetRepository');
const { categoryRepository } = require('../repositories/categoryRepository');
const { auditRepository } = require('../repositories/auditRepository');
const { movementRepository } = require('../repositories/movementRepository');

const RETIREMENT_REASON_LABELS = {
  DAMAGED: 'Dañado',
  LOST: 'Perdido',
  DECOMMISSIONED: 'Dado de baja',
  NOT_FOUND: 'Ya no existe',
  OTHER: 'Otro'
};

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
    const current = await assetService.findById(id);
    if (payload.categoryId) {
      const category = await categoryRepository.findById(payload.categoryId);
      if (!category) throw new createError.BadRequest('Categoría inválida');
    }
    const hasTotalQuantityUpdate = Number.isInteger(payload.totalQuantity);
    const currentlyLoaned = Math.max((current.totalQuantity || 0) - (current.availableQuantity || 0), 0);

    if (hasTotalQuantityUpdate && payload.totalQuantity < currentlyLoaned) {
      throw new createError.BadRequest(
        `La cantidad total no puede ser menor que las unidades prestadas (${currentlyLoaned}).`
      );
    }

    const updateData = { ...payload };
    if (hasTotalQuantityUpdate) {
      updateData.availableQuantity = payload.totalQuantity - currentlyLoaned;
    }

    const updated = await assetRepository.update(id, updateData);
    await auditRepository.create({ performedByUserId: actorUserId, entityType: 'ASSET', entityId: updated.id, assetId: updated.id, action: 'UPDATE', summary: `Activo ${updated.assetCode} actualizado` });
    if (hasTotalQuantityUpdate && payload.totalQuantity !== current.totalQuantity) {
      await auditRepository.create({
        performedByUserId: actorUserId,
        entityType: 'ASSET',
        entityId: updated.id,
        assetId: updated.id,
        action: 'STOCK_ADJUSTED',
        summary: `Cantidad del activo ${updated.name} ajustada de ${current.totalQuantity} a ${payload.totalQuantity} unidades.`,
        metadata: {
          previousTotalQuantity: current.totalQuantity,
          newTotalQuantity: payload.totalQuantity,
          loanedQuantity: currentlyLoaned,
          previousAvailableQuantity: current.availableQuantity,
          newAvailableQuantity: updated.availableQuantity
        }
      });
    }
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
  },
  retireUnits: async (id, payload, actorUserId) => {
    prisma.$transaction(async (tx) => {
      const asset = await assetRepository.findByIdForUpdate(tx, id);
      if (!asset) throw new createError.NotFound('Activo no encontrado');

      if (payload.quantity > asset.availableQuantity) {
        throw new createError.BadRequest('No puedes retirar más unidades de las disponibles.');
      }

      const nextTotalQuantity = asset.totalQuantity - payload.quantity;
      const nextAvailableQuantity = asset.availableQuantity - payload.quantity;
      const reasonLabel = RETIREMENT_REASON_LABELS[payload.reason] || RETIREMENT_REASON_LABELS.OTHER;

      const updated = await assetRepository.updateTx(tx, id, {
        totalQuantity: nextTotalQuantity,
        availableQuantity: nextAvailableQuantity
      });

      await movementRepository.createTx(tx, {
        assetId: id,
        performedByUserId: actorUserId,
        movementType: 'WRITE_OFF',
        quantityDelta: -payload.quantity,
        resultingStock: nextAvailableQuantity,
        reason: `${reasonLabel}${payload.observations ? ` · ${payload.observations}` : ''}`
      });

      await auditRepository.createTx(tx, {
        performedByUserId: actorUserId,
        entityType: 'ASSET',
        entityId: id,
        assetId: id,
        action: 'STOCK_ADJUSTED',
        summary: `Retiro parcial de ${payload.quantity} unidad(es) del activo ${asset.name}. Motivo: ${reasonLabel}.`,
        metadata: {
          previousTotalQuantity: asset.totalQuantity,
          newTotalQuantity: nextTotalQuantity,
          previousAvailableQuantity: asset.availableQuantity,
          newAvailableQuantity: nextAvailableQuantity,
          retiredQuantity: payload.quantity,
          reason: payload.reason,
          observations: payload.observations || null
        }
      });

      return assetRepository.findById(id);
    }) 
  }
};

module.exports = { assetService };