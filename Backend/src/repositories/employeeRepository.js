const { prisma } = require('../prisma/client');

const employeeRepository = {
  create: (data) => prisma.employee.create({ data }),
  list: ({ skip, take, where = {} }) => prisma.employee.findMany({
    where,
    skip: Number(skip) || 0,
    take: Number(take) || 20,
    orderBy: { id: 'desc' }
  }),
  count: (where = {}) => prisma.employee.count({ where }),
  findById: (id) => prisma.employee.findUnique({ where: { id } }),
  update: (id, data) => prisma.employee.update({ where: { id }, data }),
  delete: (id) => prisma.employee.delete({ where: { id } })
};

module.exports = {
  employeeRepository
};