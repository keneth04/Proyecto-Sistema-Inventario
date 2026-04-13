const createError = require('http-errors');
const { Logger } = require('../common/logger');

module.exports.ErrorMiddleware = (err, req, res, next) => {

  if (!err) {
    err = new createError.InternalServerError();
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';
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
