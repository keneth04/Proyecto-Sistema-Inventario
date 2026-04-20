const createError = require('http-errors');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const buildValidationError = (message, details = []) => {
  const error = new createError.BadRequest(message);
  error.details = details;
  return error;
};

const isPlainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const assertObject = (payload, source) => {
  if (!isPlainObject(payload)) {
    throw buildValidationError(`Error de validación en ${source}`, [{ field: source, message: 'Debe ser un objeto', code: 'object.base' }]);
  }
};

const allowOnly = (payload, allowedKeys, source) => {
  const unknown = Object.keys(payload).filter((key) => !allowedKeys.includes(key));
  if (unknown.length) {
    throw buildValidationError(`Error de validación en ${source}`, unknown.map((key) => ({ field: key, message: `Campo no permitido: ${key}`, code: 'any.unknown' })));
  }
};


const asString = ({ value, field, source, required = true, min = 1, max = 255 }) => {
  if ((value === undefined || value === null) && !required) return undefined;
  if (typeof value !== 'string') throw buildValidationError(`Error de validación en ${source}`, [{ field, message: 'Debe ser texto', code: 'string.base' }]);
  

  const normalized = value.trim();

if (normalized.length < min) throw buildValidationError(`Error de validación en ${source}`, [{ field, message: 'Campo obligatorio', code: 'string.empty' }]);
  if (normalized.length > max) throw buildValidationError(`Error de validación en ${source}`, [{ field, message: `Máximo ${max} caracteres`, code: 'string.max' }]);

  return normalized;
};

const asEmail = ({ value, field, source, required = true }) => {
  const normalized = asString({ value, field, source, required, min: 5, max: 120 });
  if (normalized === undefined) return undefined;
  const lowered = normalized.toLowerCase();
  if (!EMAIL_REGEX.test(lowered)) throw buildValidationError(`Error de validación en ${source}`, [{ field, message: 'Correo inválido', code: 'string.email' }]);
  return lowered;
};

  const asInt = ({ value, field, source, required = true, min = Number.MIN_SAFE_INTEGER }) => {
  if ((value === undefined || value === null) && !required) return undefined;
  if (!Number.isInteger(value)) throw buildValidationError(`Error de validación en ${source}`, [{ field, message: 'Debe ser entero', code: 'number.base' }]);
  if (value < min) throw buildValidationError(`Error de validación en ${source}`, [{ field, message: `Debe ser >= ${min}`, code: 'number.min' }]);
  return value;
};

  const asEnum = ({ value, field, source, required = true, values = [] }) => {
  if ((value === undefined || value === null) && !required) return undefined;
  if (!values.includes(value)) throw buildValidationError(`Error de validación en ${source}`, [{ field, message: `Valor inválido. Permitidos: ${values.join(', ')}`, code: 'any.only' }]);
  return value;
};

const parseListQuery = (query) => ({
  page: Number.parseInt(query.page || '1', 10) || 1,
  pageSize: Math.min(Number.parseInt(query.pageSize || '20', 10) || 20, 100)
});

const authSchemas = {
  login: (body) => {
    const source = 'body';
    assertObject(body, source);
    allowOnly(body, ['email', 'password'], source);
    return {
      email: asEmail({ value: body.email, field: 'email', source }),
      password: asString({ value: body.password, field: 'password', source, min: 8, max: 100 })
    };
    },
  forgotPassword: (body) => {
    const source = 'body';
    assertObject(body, source);
    allowOnly(body, ['email'], source);
    return {
      email: asEmail({ value: body.email, field: 'email', source })
    };
  },
  resetPassword: (body) => {
    const source = 'body';
    assertObject(body, source);
    allowOnly(body, ['token', 'newPassword'], source);
    return {
      token: asString({ value: body.token, field: 'token', source, min: 32, max: 300 }),
      newPassword: asString({ value: body.newPassword, field: 'newPassword', source, min: 8, max: 100 })
    };
  }
};

const commonIdParam = (params) => {
  assertObject(params, 'params');
  return { id: asInt({ value: Number(params.id), field: 'id', source: 'params', min: 1 }) };
};

const userSchemas = {
  create: (body) => {
    assertObject(body, 'body');
    allowOnly(body, ['firstName', 'lastName', 'email', 'password', 'roleCode', 'status'], 'body');

    return {
      firstName: asString({ value: body.firstName, field: 'firstName', source: 'body', max: 80 }),
      lastName: asString({ value: body.lastName, field: 'lastName', source: 'body', max: 80 }),
      email: asEmail({ value: body.email, field: 'email', source: 'body' }),
      password: asString({ value: body.password, field: 'password', source: 'body', min: 8, max: 100 }),
      roleCode: asEnum({ value: body.roleCode, field: 'roleCode', source: 'body', values: ['ADMIN', 'INVENTORY_MANAGER', 'VIEWER'] }),
      status: asEnum({ value: body.status || 'ACTIVE', field: 'status', source: 'body', values: ['ACTIVE', 'INACTIVE'] })
    };
  },

  update: (body) => {
    assertObject(body, 'body');
    allowOnly(body, ['firstName', 'lastName', 'email', 'password', 'roleCode', 'status'], 'body');
    return {
      firstName: asString({ value: body.firstName, field: 'firstName', source: 'body', required: false, max: 80 }),
      lastName: asString({ value: body.lastName, field: 'lastName', source: 'body', required: false, max: 80 }),
      email: asEmail({ value: body.email, field: 'email', source: 'body', required: false }),
      password: asString({ value: body.password, field: 'password', source: 'body', required: false, min: 8, max: 100 }),
      roleCode: asEnum({ value: body.roleCode, field: 'roleCode', source: 'body', required: false, values: ['ADMIN', 'INVENTORY_MANAGER', 'VIEWER'] }),
      status: asEnum({ value: body.status, field: 'status', source: 'body', required: false, values: ['ACTIVE', 'INACTIVE'] })
    };
  },
  list: parseListQuery,
  idParam: commonIdParam
};

  const employeeSchemas = {
  create: (body) => {
    assertObject(body, 'body');
    allowOnly(body, ['employeeCode', 'firstName', 'lastName', 'email', 'phone', 'department', 'position', 'status'], 'body');

    return {
      employeeCode: asString({ value: body.employeeCode, field: 'employeeCode', source: 'body', max: 40 }),
      firstName: asString({ value: body.firstName, field: 'firstName', source: 'body', max: 80 }),
      lastName: asString({ value: body.lastName, field: 'lastName', source: 'body', max: 80 }),
      email: asEmail({ value: body.email, field: 'email', source: 'body', required: false }),
      phone: asString({ value: body.phone, field: 'phone', source: 'body', required: false, max: 30 }),
      department: asString({ value: body.department, field: 'department', source: 'body', required: false, max: 100 }),
      position: asString({ value: body.position, field: 'position', source: 'body', required: false, max: 100 }),
      status: asEnum({ value: body.status || 'ACTIVE', field: 'status', source: 'body', values: ['ACTIVE', 'INACTIVE'] })
    };
  },

  update: (body) => {
    assertObject(body, 'body');
    allowOnly(body, ['employeeCode', 'firstName', 'lastName', 'email', 'phone', 'department', 'position', 'status'], 'body');
    return {
      employeeCode: asString({ value: body.employeeCode, field: 'employeeCode', source: 'body', required: false, max: 40 }),
      firstName: asString({ value: body.firstName, field: 'firstName', source: 'body', required: false, max: 80 }),
      lastName: asString({ value: body.lastName, field: 'lastName', source: 'body', required: false, max: 80 }),
      email: asEmail({ value: body.email, field: 'email', source: 'body', required: false }),
      phone: asString({ value: body.phone, field: 'phone', source: 'body', required: false, max: 30 }),
      department: asString({ value: body.department, field: 'department', source: 'body', required: false, max: 100 }),
      position: asString({ value: body.position, field: 'position', source: 'body', required: false, max: 100 }),
      status: asEnum({ value: body.status, field: 'status', source: 'body', required: false, values: ['ACTIVE', 'INACTIVE'] })
    };
  },
  list: parseListQuery,
  idParam: commonIdParam
};


  const categorySchemas = {
  create: (body) => {
    assertObject(body, 'body');
    allowOnly(body, ['name', 'description', 'isActive'], 'body');
    return {
      name: asString({ value: body.name, field: 'name', source: 'body', max: 100 }),
      description: asString({ value: body.description, field: 'description', source: 'body', required: false, max: 255 }),
      isActive: body.isActive === undefined ? true : Boolean(body.isActive)
    };
  },
  update: (body) => {
    assertObject(body, 'body');
    allowOnly(body, ['name', 'description', 'isActive'], 'body');
    return {
      name: asString({ value: body.name, field: 'name', source: 'body', required: false, max: 100 }),
      description: asString({ value: body.description, field: 'description', source: 'body', required: false, max: 255 }),
      isActive: body.isActive === undefined ? undefined : Boolean(body.isActive)
    };
  },
  list: parseListQuery,
  idParam: commonIdParam
};

    const assetSchemas = {
  create: (body) => {
    assertObject(body, 'body');
    allowOnly(body, ['categoryId', 'assetCode', 'name', 'brand', 'model', 'serialNumber', 'description', 'totalQuantity', 'minimumStock', 'status'], 'body');
    const totalQuantity = asInt({ value: body.totalQuantity, field: 'totalQuantity', source: 'body', min: 0 });
    return {
      categoryId: asInt({ value: body.categoryId, field: 'categoryId', source: 'body', min: 1 }),
      assetCode: asString({ value: body.assetCode, field: 'assetCode', source: 'body', max: 50 }),
      name: asString({ value: body.name, field: 'name', source: 'body', max: 120 }),
      brand: asString({ value: body.brand, field: 'brand', source: 'body', required: false, max: 80 }),
      model: asString({ value: body.model, field: 'model', source: 'body', required: false, max: 80 }),
      serialNumber: asString({ value: body.serialNumber, field: 'serialNumber', source: 'body', required: false, max: 120 }),
      description: asString({ value: body.description, field: 'description', source: 'body', required: false, max: 2000 }),
      totalQuantity,
      minimumStock: asInt({ value: body.minimumStock ?? 0, field: 'minimumStock', source: 'body', min: 0 }),
      status: asEnum({ value: body.status || 'ACTIVE', field: 'status', source: 'body', values: ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'RETIRED'] })
    };
  },
  update: (body) => {
    assertObject(body, 'body');
    allowOnly(body, ['categoryId', 'name', 'brand', 'model', 'serialNumber', 'description', 'minimumStock', 'status'], 'body');
    return {
      categoryId: asInt({ value: body.categoryId, field: 'categoryId', source: 'body', required: false, min: 1 }),
      name: asString({ value: body.name, field: 'name', source: 'body', required: false, max: 120 }),
      brand: asString({ value: body.brand, field: 'brand', source: 'body', required: false, max: 80 }),
      model: asString({ value: body.model, field: 'model', source: 'body', required: false, max: 80 }),
      serialNumber: asString({ value: body.serialNumber, field: 'serialNumber', source: 'body', required: false, max: 120 }),
      description: asString({ value: body.description, field: 'description', source: 'body', required: false, max: 2000 }),
      minimumStock: asInt({ value: body.minimumStock, field: 'minimumStock', source: 'body', required: false, min: 0 }),
      status: asEnum({ value: body.status, field: 'status', source: 'body', required: false, values: ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'RETIRED'] })
    };
  },
  list: parseListQuery,
  idParam: commonIdParam
};

const loanSchemas = {
  create: (body) => {
    assertObject(body, 'body');
    allowOnly(body, ['employeeId', 'loanDate', 'expectedReturnDate', 'observations', 'items'], 'body');
    if (!Array.isArray(body.items) || body.items.length === 0) {
      throw buildValidationError('Error de validación en body', [{ field: 'items', message: 'Debe incluir al menos un item', code: 'array.min' }]);
    }

    return {
      employeeId: asInt({ value: body.employeeId, field: 'employeeId', source: 'body', min: 1 }),
      loanDate: body.loanDate ? new Date(body.loanDate) : new Date(),
      expectedReturnDate: body.expectedReturnDate ? new Date(body.expectedReturnDate) : undefined,
      observations: asString({ value: body.observations, field: 'observations', source: 'body', required: false, max: 2000 }),
      items: body.items.map((item, index) => ({
        assetId: asInt({ value: item.assetId, field: `items.${index}.assetId`, source: 'body', min: 1 }),
        quantity: asInt({ value: item.quantity, field: `items.${index}.quantity`, source: 'body', min: 1 }),
        notes: asString({ value: item.notes, field: `items.${index}.notes`, source: 'body', required: false, max: 255 })
      }))
    };
  },
  list: parseListQuery,
  idParam: commonIdParam
};

const returnSchemas = {
  create: (body) => {
    assertObject(body, 'body');
    allowOnly(body, ['loanId', 'employeeId', 'returnDate', 'observations', 'items'], 'body');
    if (!Array.isArray(body.items) || body.items.length === 0) {
      throw buildValidationError('Error de validación en body', [{ field: 'items', message: 'Debe incluir al menos un item', code: 'array.min' }]);
    }
    return {
      loanId: asInt({ value: body.loanId, field: 'loanId', source: 'body', min: 1 }),
      employeeId: asInt({ value: body.employeeId, field: 'employeeId', source: 'body', min: 1 }),
      returnDate: body.returnDate ? new Date(body.returnDate) : new Date(),
      observations: asString({ value: body.observations, field: 'observations', source: 'body', required: false, max: 2000 }),
      items: body.items.map((item, index) => ({
        loanItemId: asInt({ value: item.loanItemId, field: `items.${index}.loanItemId`, source: 'body', min: 1 }),
        assetId: asInt({ value: item.assetId, field: `items.${index}.assetId`, source: 'body', min: 1 }),
        quantity: asInt({ value: item.quantity, field: `items.${index}.quantity`, source: 'body', min: 1 }),
        itemCondition: asEnum({ value: item.itemCondition, field: `items.${index}.itemCondition`, source: 'body', values: ['GOOD', 'FAIR', 'DAMAGED', 'NON_FUNCTIONAL'] }),
        observations: asString({ value: item.observations, field: `items.${index}.observations`, source: 'body', required: false, max: 255 })
      }))
    };
  },
  list: parseListQuery,
  idParam: commonIdParam
};

module.exports = {
    authSchemas,
  userSchemas,
  employeeSchemas,
  categorySchemas,
  assetSchemas,
  loanSchemas,
  returnSchemas
};