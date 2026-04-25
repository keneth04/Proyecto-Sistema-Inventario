const createError = require('http-errors');
const { Logger } = require('../common/logger');

const GENERIC_CLIENT_ERROR_MESSAGE = 'No fue posible completar la operación.';
const GENERIC_SERVER_ERROR_MESSAGE = 'Error interno del servidor';

const normalizeErrorMessage = (statusCode, message) => {
  if (statusCode >= 500) {
    return GENERIC_SERVER_ERROR_MESSAGE;
  }

  if (statusCode === 400 && (!message || /validaci[oó]n/i.test(message))) {
    return 'Información inválida. Revisa los campos del formulario.';
  }

  if (!message) {
    return GENERIC_CLIENT_ERROR_MESSAGE;
  }

  return message;
};

module.exports.ErrorMiddleware = (err, req, res, next) => {

  if (!err) {
    err = new createError.InternalServerError();
  }

  const statusCode = err.statusCode || 500;
  const message = normalizeErrorMessage(statusCode, err.message);
  const requestId = req?.requestId;
  const details = Array.isArray(err.details) ? err.details : undefined;

  Logger.error('http_error', {
    requestId,
    method: req?.method,
    path: req?.originalUrl,
    statusCode,
    details,
    error: Logger.toErrorObject(err)
  });

  res.status(statusCode).json({
    error: true,
    status: statusCode,
    message,
    requestId,
    details
  });
};
