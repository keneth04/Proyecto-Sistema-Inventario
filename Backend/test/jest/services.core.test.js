const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'unit-test-secret';

const bcrypt = require('bcrypt');
const { prisma } = require('../../src/prisma/client');
const { loanService } = require('../../src/services/loanService');
const { returnService } = require('../../src/services/returnService');
const { authService } = require('../../src/services/authService');
const { loanRepository } = require('../../src/repositories/loanRepository');
const { returnRepository } = require('../../src/repositories/returnRepository');
const { userRepository } = require('../../src/repositories/userRepository');
const { auditRepository } = require('../../src/repositories/auditRepository');

const originals = {
  loanList: loanRepository.list,
  loanCount: loanRepository.count,
  loanFindById: loanRepository.findById,
  returnList: returnRepository.list,
  returnCount: returnRepository.count,
  returnFindById: returnRepository.findById,
  userFindByEmail: userRepository.findByEmail,
  auditCreate: auditRepository.create,
  bcryptCompare: bcrypt.compare,
  prismaLoanUpdate: prisma.loan.update
};

const restoreAll = () => {
  loanRepository.list = originals.loanList;
  loanRepository.count = originals.loanCount;
  loanRepository.findById = originals.loanFindById;
  returnRepository.list = originals.returnList;
  returnRepository.count = originals.returnCount;
  returnRepository.findById = originals.returnFindById;
  userRepository.findByEmail = originals.userFindByEmail;
  auditRepository.create = originals.auditCreate;
  bcrypt.compare = originals.bcryptCompare;
  prisma.loan.update = originals.prismaLoanUpdate;
};

test.afterEach(() => {
  restoreAll();
});

test('loanService.list normaliza paginación y aplica límite máximo de pageSize', async () => {
  let capturedPagination;
  loanRepository.list = async (pagination) => {
    capturedPagination = pagination;
    return [{ id: 1 }];
  };
  loanRepository.count = async () => 37;

  const response = await loanService.list({ page: '0', pageSize: '999' });

  assert.deepEqual(capturedPagination, {
    skip: 0,
    take: 100,
    page: 1,
    pageSize: 100
  });
  assert.deepEqual(response.pagination, {
    page: 1,
    pageSize: 100,
    total: 37
  });
});

test('loanService.findById recalcula estado y persiste cuando difiere', async () => {
  const loan = {
    id: 15,
    status: 'OPEN',
    items: [{ quantity: 2, returnedQuantity: 2 }]
  };
  loanRepository.findById = async () => loan;

  let updatedStatus;
  prisma.loan.update = async ({ data }) => {
    updatedStatus = data.status;
  };

  const result = await loanService.findById(15);

  assert.equal(updatedStatus, 'CLOSED');
  assert.equal(result.status, 'CLOSED');
});

test('returnService.list normaliza paginación y limita pageSize a 200', async () => {
  let receivedPagination;
  returnRepository.list = async (pagination) => {
    receivedPagination = pagination;
    return [];
  };
  returnRepository.count = async () => 0;

  const response = await returnService.list({ page: '-8', pageSize: '500' });

  assert.deepEqual(receivedPagination, {
    skip: 0,
    take: 200
  });
  assert.deepEqual(response.pagination, {
    page: 1,
    pageSize: 200,
    total: 0
  });
});

test('returnService.findById retorna NotFound cuando no existe', async () => {
  returnRepository.findById = async () => null;

  await assert.rejects(() => returnService.findById(777), (error) => {
    assert.equal(error.status, 404);
    assert.match(error.message, /Devolución no encontrada/);
    return true;
  });
});

test('authService.login retorna token y usuario cuando credenciales son válidas', async () => {
  userRepository.findByEmail = async () => ({
    id: 8,
    firstName: 'Ana',
    lastName: 'Pérez',
    email: 'ana@example.com',
    status: 'ACTIVE',
    passwordHash: 'hash',
    role: { code: 'ADMIN', isActive: true }
  });
  bcrypt.compare = async () => true;

  let auditPayload;
  auditRepository.create = async (payload) => {
    auditPayload = payload;
  };

  const result = await authService.login({ email: 'ana@example.com', password: 'secret' });

  assert.equal(typeof result.token, 'string');
  assert.ok(result.token.length > 10);
  assert.equal(result.user.email, 'ana@example.com');
  assert.equal(result.user.role, 'ADMIN');
  assert.equal(auditPayload.action, 'LOGIN');
  assert.equal(auditPayload.performedByUserId, 8);
});

test('authService.login rechaza credenciales inválidas sin generar auditoría', async () => {
  userRepository.findByEmail = async () => ({
    id: 9,
    status: 'ACTIVE',
    passwordHash: 'hash',
    role: { code: 'ADMIN', isActive: true }
  });
  bcrypt.compare = async () => false;

  let wasAuditCalled = false;
  auditRepository.create = async () => {
    wasAuditCalled = true;
  };

  await assert.rejects(() => authService.login({ email: 'x@y.com', password: 'bad' }), (error) => {
    assert.equal(error.status, 401);
    assert.match(error.message, /Credenciales incorrectas/);
    return true;
  });

  assert.equal(wasAuditCalled, false);
});