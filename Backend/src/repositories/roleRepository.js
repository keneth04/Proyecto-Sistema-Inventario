const { prisma } = require('../prisma/client');

const roleRepository = {
  findByCode: (code) => prisma.role.findUnique({ where: { code } }),
  listActive: () => prisma.role.findMany({ where: { isActive: true } })
};

module.exports = {
  roleRepository
};