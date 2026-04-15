const { prisma } = require('../prisma/client');

const categoryRepository = {
  create: (data) => prisma.category.create({ data }),
  list: ({ skip, take }) => prisma.category.findMany({ skip, take, orderBy: { id: 'desc' } }),
  count: () => prisma.category.count(),
  findById: (id) => prisma.category.findUnique({ where: { id } }),
  update: (id, data) => prisma.category.update({ where: { id }, data }),
  delete: (id) => prisma.category.delete({ where: { id } })
};

module.exports = {
  categoryRepository
};