const { prisma } = require('../prisma/client');

const toSafeInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const categoryRepository = {
  create: (data) => prisma.category.create({ data }),
  findByNameInsensitive: (name) => prisma.category.findFirst({ where: { name } }),
  list: ({ skip, take }) => prisma.category.findMany({ skip: toSafeInt(skip, 0), take: toSafeInt(take, 20), orderBy: { id: 'desc' } }),
  count: () => prisma.category.count(),
  findById: (id) => prisma.category.findUnique({ where: { id } }),
  update: (id, data) => prisma.category.update({ where: { id }, data }),
  delete: (id) => prisma.category.delete({ where: { id } })
};

module.exports = {
  categoryRepository
};