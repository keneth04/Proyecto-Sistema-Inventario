const createError = require('http-errors');
const { prisma } = require('../prisma/client');
const { loanRepository } = require('../repositories/loanRepository');
const { assetRepository } = require('../repositories/assetRepository');
const { movementRepository } = require('../repositories/movementRepository');
const { auditRepository } = require('../repositories/auditRepository');
const { employeeRepository } = require('../repositories/employeeRepository');

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return parsed;
};

const paginate = ({ page, pageSize }) => {
  const safePage = toPositiveInt(page, 1);
  const safePageSize = Math.min(toPositiveInt(pageSize, 20), 100);
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

    return prisma.$transaction(async (tx) => {
      for (const item of payload.items) {
        const asset = await assetRepository.findByIdForUpdate(tx, item.assetId);
        if (!asset) throw new createError.BadRequest(`Activo ${item.assetId} inexistente`);
        if (asset.availableQuantity < item.quantity) {
          throw new createError.BadRequest(`Stock insuficiente para ${asset.name}`);
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

      for (const item of payload.items) {
        const asset = await assetRepository.findByIdForUpdate(tx, item.assetId);
        const nextAvailable = asset.availableQuantity - item.quantity;

        await assetRepository.updateTx(tx, item.assetId, { availableQuantity: nextAvailable });

        await movementRepository.createTx(tx, {
          assetId: item.assetId,
          performedByUserId: actorUserId,
          employeeId: payload.employeeId,
          loanId: loan.id,
          movementType: 'LOAN_OUT',
          quantityDelta: -item.quantity,
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
        summary: `Préstamo #${loan.id} registrado`
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