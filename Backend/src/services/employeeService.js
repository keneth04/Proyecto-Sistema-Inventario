const createError = require('http-errors');
const { employeeRepository } = require('../repositories/employeeRepository');
const { auditRepository } = require('../repositories/auditRepository');

const paginate = ({ page, pageSize }) => ({ skip: (page - 1) * pageSize, take: pageSize });

const employeeService = {
  create: async (payload, actorUserId) => {
    const created = await employeeRepository.create(payload);
    await auditRepository.create({ performedByUserId: actorUserId, employeeId: created.id, entityType: 'EMPLOYEE', entityId: created.id, action: 'CREATE', summary: `Empleado ${created.employeeCode} creado` });
    return created;
  },
  list: async ({ page, pageSize }) => {
    const [items, total] = await Promise.all([employeeRepository.list(paginate({ page, pageSize })), employeeRepository.count()]);
    return { items, pagination: { page, pageSize, total } };
  },
  findById: async (id) => {
    const found = await employeeRepository.findById(id);
    if (!found) throw new createError.NotFound('Empleado no encontrado');
    return found;
  },
  update: async (id, payload, actorUserId) => {
    await employeeService.findById(id);
    const updated = await employeeRepository.update(id, payload);
    await auditRepository.create({ performedByUserId: actorUserId, employeeId: updated.id, entityType: 'EMPLOYEE', entityId: updated.id, action: 'UPDATE', summary: `Empleado ${updated.employeeCode} actualizado` });
    return updated;
  },
  remove: async (id, actorUserId) => {
    await employeeService.findById(id);
    await employeeRepository.delete(id);
    await auditRepository.create({ performedByUserId: actorUserId, employeeId: id, entityType: 'EMPLOYEE', entityId: id, action: 'DELETE', summary: `Empleado ${id} eliminado` });
  }
};

module.exports = { employeeService };