const createError = require('http-errors');
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const buildValidationError = (message, details = []) => {
  const error = new createError.BadRequest(message);
  error.details = details;
  return error;
};

const isPlainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const assertPlainObject = (value, source) => {
  if (!isPlainObject(value)) {
    throw buildValidationError(`Error de validación en ${source}`, [{
      field: source,
      message: `${source} debe ser un objeto JSON`,
      code: 'object.base'
    }]);
  }
};

const parseUnknownFields = (value, allowedKeys, source) => {

  const unknownKeys = Object.keys(value).filter((key) => !allowedKeys.includes(key));

  if (unknownKeys.length) {
    throw buildValidationError(
      `Error de validación en ${source}`,
      unknownKeys.map((key) => ({
        field: key,
        message: `Campo no permitido: ${key}`,
        code: 'any.unknown'
      }))
    );
  }
};


const requireString = ({ value, field, source, min = 1 }) => {
  if (typeof value !== 'string') {
    throw buildValidationError(`Error de validación en ${source}`, [{
      field,
      message: `${field} debe ser texto`,
      code: 'string.base'
    }]);
  }

  const normalized = value.trim();

if (normalized.length < min) {
    throw buildValidationError(`Error de validación en ${source}`, [{
      field,
      message: `${field} es obligatorio`,
      code: 'string.empty'
    }]);
  }

  return normalized;
};

const requireEmail = ({ value, field, source }) => {
  const normalized = requireString({ value, field, source }).toLowerCase();

  if (!EMAIL_REGEX.test(normalized)) {
    throw buildValidationError(`Error de validación en ${source}`, [{
      field,
      message: `${field} no es válido`,
      code: 'string.email'
    }]);
  }

  return normalized;
};

const authSchemas = {
  login: (body) => {
    const source = 'body';
    assertPlainObject(body, source);
    parseUnknownFields(body, ['email', 'password'], source);

    return {
      email: requireEmail({ value: body.email, field: 'email', source }),
      password: requireString({ value: body.password, field: 'password', source })
    };
  },

  forgotPassword: (body) => {
    const source = 'body';
    assertPlainObject(body, source);
    parseUnknownFields(body, ['email'], source);

    return {
      email: requireEmail({ value: body.email, field: 'email', source })
    };
  },

  resetPassword: (body) => {
    const source = 'body';
    assertPlainObject(body, source);
    parseUnknownFields(body, ['token', 'newPassword'], source);

    const newPassword = requireString({ value: body.newPassword, field: 'newPassword', source, min: 8 });

    return {
      token: requireString({ value: body.token, field: 'token', source }),
      newPassword
    };
  }
};


module.exports = {
  authSchemas
};