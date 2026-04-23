const createError = require('http-errors');

const runValidator = (schema, payload, source) => {
  if (!schema) {
    return payload;
  }

  if (typeof schema === 'function') {
    return schema(payload);
  }

  if (typeof schema.validate === 'function') {
    const { error, value } = schema.validate(payload, {
      abortEarly: false,
      convert: true,
      stripUnknown: true
    });

    if (error) {
      const validationError = new createError.BadRequest('Información inválida');
      validationError.details = (error.details || []).map((detail) => ({
        field: detail.path.join('.'),
        message: 'Revisa los datos ingresados.',
        code: detail.type
      }));
      throw validationError;
    }

    return value;
  }

  throw new createError.InternalServerError(`Configuración inválida de validación para ${source}`);
};

const validateRequest = ({ body, query, params }) => (req, res, next) => {
  try {
    req.body = runValidator(body, req.body, 'body');
    req.query = runValidator(query, req.query, 'query params');
    req.params = runValidator(params, req.params, 'params');

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  validateRequest
};