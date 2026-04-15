const { prisma } = require('../prisma/client');

const includeRole = { role: true };

const userRepository = {
  create: (data) => prisma.user.create({ data, include: includeRole }),
  findByEmail: (email) => prisma.user.findUnique({ where: { email }, include: includeRole }),
  findById: (id) => prisma.user.findUnique({ where: { id }, include: includeRole }),
  list: ({ skip, take }) => prisma.user.findMany({ skip, take, orderBy: { id: 'desc' }, include: includeRole }),
  count: () => prisma.user.count(),
  update: (id, data) => prisma.user.update({ where: { id }, data, include: includeRole }),
  delete: (id) => prisma.user.delete({ where: { id } })
};

module.exports = {
  userRepository
};