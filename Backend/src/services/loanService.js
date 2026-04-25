const createError = require('http-errors');
const { prisma } = require('../prisma/client');
const { loanRepository } = require('../repositories/loanRepository');
const { assetRepository } = require('../repositories/assetRepository');
const { movementRepository } = require('../repositories/movementRepository');
const { auditRepository } = require('../repositories/auditRepository');
const { employeeRepository } = require('../repositories/employeeRepository');

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return parsed;
};

const paginate = ({ page, pageSize }) => {
  const safePage = toPositiveInt(page, DEFAULT_PAGE);
  const safePageSize = Math.min(toPositiveInt(pageSize, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  return {
    skip: (safePage - 1) * safePageSize,
    take: safePageSize,
    page: safePage,
    pageSize: safePageSize
  };
};

const computeLoanStatus = (loan) => {
  const allReturned = loan.items.every((item) => item.returnedQuantity >= item.quantity);
  if (allReturned) return 'CLOSED';
  const someReturned = loan.items.some((item) => item.returnedQuantity > 0);
  return someReturned ? 'PARTIALLY_RETURNED' : 'OPEN';
};

const loanService = {
  register: async (payload, actorUserId) => {
    const employee = await employeeRepository.findById(payload.employeeId);
    if (!employee) throw new createError.BadRequest('Empleado inválido');
    const requestedByAsset = new Map();

    for (const item of payload.items) {
      requestedByAsset.set(item.assetId, (requestedByAsset.get(item.assetId) || 0) + item.quantity);
    }

    return prisma.$transaction(async (tx) => {
      for (const [assetId, requestedQuantity] of requestedByAsset.entries()) {
        const asset = await assetRepository.findByIdForUpdate(tx, assetId);
        if (!asset) throw new createError.BadRequest('El activo seleccionado no está disponible');
        if (asset.availableQuantity < requestedQuantity) {
          throw new createError.BadRequest(`No hay unidades disponibles suficientes para ${asset.name}`);
        }
      }

      const loan = await loanRepository.createTx(tx, {
        employeeId: payload.employeeId,
        deliveredByUserId: actorUserId,
        loanDate: payload.loanDate,
        expectedReturnDate: payload.expectedReturnDate,
        observations: payload.observations,
        status: 'OPEN',
        items: { create: payload.items.map((item) => ({ assetId: item.assetId, quantity: item.quantity, notes: item.notes })) }
      });

      for (const [assetId, requestedQuantity] of requestedByAsset.entries()) {
        const updateResult = await assetRepository.decrementAvailableTx(tx, assetId, requestedQuantity);
        if (updateResult.count === 0) {
          const conflictedAsset = await assetRepository.findByIdForUpdate(tx, assetId);
          const assetName = conflictedAsset?.name || 'el activo seleccionado';
          throw new createError.BadRequest(`No hay unidades disponibles suficientes para ${assetName}`);
        }
        const asset = await assetRepository.findByIdForUpdate(tx, assetId);
        const nextAvailable = asset.availableQuantity;

        await movementRepository.createTx(tx, {
          assetId,
          performedByUserId: actorUserId,
          employeeId: payload.employeeId,
          loanId: loan.id,
          movementType: 'LOAN_OUT',
          quantityDelta: -requestedQuantity,
          resultingStock: nextAvailable,
          reason: `Préstamo #${loan.id}`
        });
      }

      await auditRepository.createTx(tx, {
        performedByUserId: actorUserId,
        employeeId: payload.employeeId,
        entityType: 'LOAN',
        entityId: loan.id,
        loanId: loan.id,
        action: 'LOAN_REGISTERED',
        summary: `Préstamo #${loan.id} registrado`,
        metadata: {
          employeeId: payload.employeeId,
          assets: payload.items.map((item) => ({ assetId: item.assetId, quantity: item.quantity })),
          totalItems: payload.items.length,
          totalQuantity: payload.items.reduce((acc, item) => acc + item.quantity, 0)
        }
      });

      return loan;
    });
  },
  list: async ({ page, pageSize }) => {
    const pagination = paginate({ page, pageSize });
    const [items, total] = await Promise.all([loanRepository.list(pagination), loanRepository.count()]);
    return { items, pagination: { page: pagination.page, pageSize: pagination.pageSize, total } };
  },
  findById: async (id) => {
    const loan = await loanRepository.findById(id);
    if (!loan) throw new createError.NotFound('Préstamo no encontrado');
    const status = computeLoanStatus(loan);
    if (status !== loan.status) {
      await prisma.loan.update({ where: { id }, data: { status } });
      loan.status = status;
    }
    return loan;
  }
};

module.exports = { loanService };