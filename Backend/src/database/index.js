const { prisma } = require('../prisma/client');
const { Logger } = require('../common/logger');

const connectDatabase = async () => {
  await prisma.$connect();
  Logger.info('database_connected', { provider: 'mysql_prisma' })
};

const disconnectDatabase = async () => {
  await prisma.$disconnect();
};

const DatabaseHealth = async () => {

  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'up' };
  } catch (error) {
    Logger.error('database_healthcheck_failed', { error: Logger.toErrorObject(error) });
    return { status: 'down', reason: error?.message || 'unknown_error' };
  }
};


module.exports = {
  connectDatabase,
  disconnectDatabase,
  DatabaseHealth
};
