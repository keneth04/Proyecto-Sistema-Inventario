const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const CURRENT_LEVEL = process.env.LOG_LEVEL || 'info';

const shouldLog = (level) => {
  const configuredLevel = LOG_LEVELS[CURRENT_LEVEL] ?? LOG_LEVELS.info;
  const targetLevel = LOG_LEVELS[level] ?? LOG_LEVELS.info;
  return targetLevel <= configuredLevel;
};

const toErrorObject = (error) => {
  if (!error) return undefined;

  return {
    name: error.name,
    message: error.message,
    statusCode: error.statusCode,
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
  };
};

const writeLog = (level, message, metadata = {}) => {
  if (!shouldLog(level)) return;

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...metadata
  };

  const serialized = JSON.stringify(payload);

  if (level === 'error') {
    console.error(serialized);
    return;
  }

  console.log(serialized);
};

module.exports.Logger = {
  info: (message, metadata) => writeLog('info', message, metadata),
  warn: (message, metadata) => writeLog('warn', message, metadata),
  error: (message, metadata) => writeLog('error', message, metadata),
  debug: (message, metadata) => writeLog('debug', message, metadata),
  toErrorObject
};