const { prisma } = require('../prisma/client');

const employeeRepository = {
  create: (data) => prisma.employee.create({ data }),
  list: ({ skip, take }) => prisma.employee.findMany({
    skip: Number(skip) || 0,
    take: Number(take) || 20,
    orderBy: { id: 'desc' }
  }),
  count: () => prisma.employee.count(),
  findById: (id) => prisma.employee.findUnique({ where: { id } }),
  update: (id, data) => prisma.employee.update({ where: { id }, data }),
  delete: (id) => prisma.employee.delete({ where: { id } })
};

module.exports = {
  employeeRepository
};