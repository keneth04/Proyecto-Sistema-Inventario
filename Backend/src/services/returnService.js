const createError = require('http-errors');
const { prisma } = require('../prisma/client');
const { returnRepository } = require('../repositories/returnRepository');
const { loanRepository } = require('../repositories/loanRepository');
const { movementRepository } = require('../repositories/movementRepository');
const { assetRepository } = require('../repositories/assetRepository');
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

const paginate = ({ page, pageSize }) => ({ skip: (page - 1) * pageSize, take: pageSize });

const normalizePagination = ({ page, pageSize }) => ({
  page: toPositiveInt(page, DEFAULT_PAGE),
  pageSize: Math.min(toPositiveInt(pageSize, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE)
});

const calculateLoanStatusFromItems = (items) => {
  const allReturned = items.every((item) => item.returnedQuantity >= item.quantity);
  if (allReturned) return 'CLOSED';
  const partial = items.some((item) => item.returnedQuantity > 0);
  return partial ? 'PARTIALLY_RETURNED' : 'OPEN';
};

const returnService = {
  register: async (payload, actorUserId) => {
    const employee = await employeeRepository.findById(payload.employeeId);
    if (!employee) throw new createError.BadRequest('Empleado inválido');

    return prisma.$transaction(async (tx) => {
      const loan = await loanRepository.findByIdTx(tx, payload.loanId);
      if (!loan) throw new createError.BadRequest('El préstamo seleccionado no existe');
      if (loan.employeeId !== payload.employeeId) throw new createError.BadRequest('El empleado no corresponde al préstamo');

      for (const item of payload.items) {
        const loanItem = loan.items.find((loanLine) => loanLine.id === item.loanItemId && loanLine.assetId === item.assetId);
       if (!loanItem) throw new createError.BadRequest('Uno de los ítems de devolución no corresponde al préstamo');

        const remaining = loanItem.quantity - loanItem.returnedQuantity;
        if (item.quantity > remaining) {
          throw new createError.BadRequest('La cantidad a devolver supera lo pendiente del préstamo');
        }
      }

      const createdReturn = await returnRepository.createTx(tx, {
        loanId: payload.loanId,
        employeeId: payload.employeeId,
        receivedByUserId: actorUserId,
        returnDate: payload.returnDate,
        observations: payload.observations,
        items: { create: payload.items }
      });

      for (const item of payload.items) {
        await tx.loanItem.update({ where: { id: item.loanItemId }, data: { returnedQuantity: { increment: item.quantity } } });
        const asset = await tx.asset.findUnique({ where: { id: item.assetId } });
        const nextAvailable = asset.availableQuantity + item.quantity;
        await tx.asset.update({ where: { id: item.assetId }, data: { availableQuantity: nextAvailable } });

        await movementRepository.createTx(tx, {
          assetId: item.assetId,
          performedByUserId: actorUserId,
          employeeId: payload.employeeId,
          loanId: payload.loanId,
          returnId: createdReturn.id,
          movementType: 'RETURN_IN',
          quantityDelta: item.quantity,
          resultingStock: nextAvailable,
          reason: `Devolución #${createdReturn.id}`
        });
      }

      const updatedLoan = await loanRepository.findByIdTx(tx, payload.loanId);
      const status = calculateLoanStatusFromItems(updatedLoan.items);
      await loanRepository.updateStatusTx(tx, payload.loanId, status);

      await auditRepository.createTx(tx, {
        performedByUserId: actorUserId,
        employeeId: payload.employeeId,
        entityType: 'RETURN',
        entityId: createdReturn.id,
        loanId: payload.loanId,
        returnId: createdReturn.id,
        action: 'RETURN_REGISTERED',
        summary: `Devolución #${createdReturn.id} registrada`,
        metadata: {
          loanId: payload.loanId,
          employeeId: payload.employeeId,
          assets: payload.items.map((item) => ({ assetId: item.assetId, quantity: item.quantity })),
          totalItems: payload.items.length,
          totalQuantity: payload.items.reduce((acc, item) => acc + item.quantity, 0)
        }
      });

      return createdReturn;
    });
  },
  list: async ({ page, pageSize }) => {
    const pagination = normalizePagination({ page, pageSize });
    const [items, total] = await Promise.all([returnRepository.list(paginate(pagination)), returnRepository.count()]);
    return { items, pagination: { ...pagination, total } };
  },
  findById: async (id) => {
    const found = await returnRepository.findById(id);
    if (!found) throw new createError.NotFound('Devolución no encontrada');
    return found;
  }
};

module.exports = { returnService };