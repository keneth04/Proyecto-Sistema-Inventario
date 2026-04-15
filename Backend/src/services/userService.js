const bcrypt = require('bcrypt');
const createError = require('http-errors');
const { Config } = require('../config');
const { userRepository } = require('../repositories/userRepository');
const { roleRepository } = require('../repositories/roleRepository');
const { auditRepository } = require('../repositories/auditRepository');

const toPageData = ({ page, pageSize }) => ({ skip: (page - 1) * pageSize, take: pageSize });

const sanitize = (user) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  status: user.status,
  role: user.role?.code
});

const userService = {
  create: async (payload, actorUserId) => {
    const existing = await userRepository.findByEmail(payload.email);
    if (existing) throw new createError.Conflict('Ya existe un usuario con ese correo');

    const role = await roleRepository.findByCode(payload.roleCode);
    if (!role || !role.isActive) throw new createError.BadRequest('Rol inválido o inactivo');

    const passwordHash = await bcrypt.hash(payload.password, Config.bcryptRounds);

    const created = await userRepository.create({
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      passwordHash,
      roleId: role.id,
      status: payload.status
    });

    await auditRepository.create({
      performedByUserId: actorUserId,
      entityType: 'USER',
      entityId: created.id,
      action: 'CREATE',
      summary: `Usuario ${created.email} creado`
    });

    return sanitize(created);
  },

  list: async ({ page, pageSize }) => {
    const pagination = toPageData({ page, pageSize });
    const [rows, total] = await Promise.all([userRepository.list(pagination), userRepository.count()]);

    return {
      items: rows.map(sanitize),
      pagination: { page, pageSize, total }
    };
  },

  findById: async (id) => {
    const user = await userRepository.findById(id);
    if (!user) throw new createError.NotFound('Usuario no encontrado');
    return sanitize(user);
  },

  update: async (id, payload, actorUserId) => {
    await userService.findById(id);
    const data = {};

    if (payload.firstName !== undefined) data.firstName = payload.firstName;
    if (payload.lastName !== undefined) data.lastName = payload.lastName;
    if (payload.email !== undefined) data.email = payload.email;
    if (payload.status !== undefined) data.status = payload.status;

    if (payload.password) {
      data.passwordHash = await bcrypt.hash(payload.password, Config.bcryptRounds);
    }

    if (payload.roleCode) {
      const role = await roleRepository.findByCode(payload.roleCode);
      if (!role || !role.isActive) throw new createError.BadRequest('Rol inválido o inactivo');
      data.roleId = role.id;
    }

    const updated = await userRepository.update(id, data);

    await auditRepository.create({
      performedByUserId: actorUserId,
      entityType: 'USER',
      entityId: updated.id,
      action: 'UPDATE',
      summary: `Usuario ${updated.email} actualizado`
    });

    return sanitize(updated);
  },

  remove: async (id, actorUserId) => {
    await userService.findById(id);
    await userRepository.delete(id);

    await auditRepository.create({
      performedByUserId: actorUserId,
      entityType: 'USER',
      entityId: id,
      action: 'DELETE',
      summary: `Usuario ${id} eliminado`
    });
  }
};

module.exports = { userService };