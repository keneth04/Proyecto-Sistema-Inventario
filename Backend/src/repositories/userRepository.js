const { prisma } = require('../prisma/client');

const userWithRoleSelect = {
  id: true,
  roleId: true,
  firstName: true,
  lastName: true,
  email: true,
  passwordHash: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  role: {
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      isActive: true
    }
  }
};

const userRepository = {
  create: (data) => prisma.user.create({ data, select: userWithRoleSelect }),
  findByEmail: (email) => prisma.user.findUnique({ where: { email }, select: userWithRoleSelect }),
  findById: (id) => prisma.user.findUnique({ where: { id }, select: userWithRoleSelect }),
  findByResetTokenHash: (resetPasswordTokenHash) => prisma.user.findFirst({
    where: {
      resetPasswordTokenHash,
      resetPasswordExpiresAt: {
        gt: new Date()
      },
      status: 'ACTIVE'
    },
    select: userWithRoleSelect
  }),
  list: ({ skip, take }) => prisma.user.findMany({
    skip,
    take,
    orderBy: { id: 'desc' },
    select: userWithRoleSelect
  }),
  count: () => prisma.user.count(),
  update: (id, data) => prisma.user.update({ where: { id }, data, select: userWithRoleSelect }),
  delete: (id) => prisma.user.delete({ where: { id } })
};

module.exports = {
  userRepository
};