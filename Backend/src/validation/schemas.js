const createError = require('http-errors');

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX_COLOR_REGEX = /^#([0-9A-F]{3}){1,2}$/i;

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
  const details = [];
  const unknownKeys = Object.keys(value).filter((key) => !allowedKeys.includes(key));

  unknownKeys.forEach((key) => {
    details.push({ field: key, message: `Campo no permitido: ${key}`, code: 'any.unknown' });
  });

  if (details.length) {
    throw buildValidationError(`Error de validación en ${source}`, details);
  }
};

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : value);

const requireString = ({ value, field, source, min = 1 }) => {
  if (typeof value !== 'string') {
    throw buildValidationError(`Error de validación en ${source}`, [{ field, message: `${field} debe ser texto`, code: 'string.base' }]);
  }

  const normalized = value.trim();
  if (normalized.length < min) {
    throw buildValidationError(`Error de validación en ${source}`, [{ field, message: `${field} es obligatorio`, code: 'string.empty' }]);
  }

  return normalized;
};

const optionalString = ({ value, field, source, allowEmpty = false }) => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw buildValidationError(`Error de validación en ${source}`, [{ field, message: `${field} debe ser texto`, code: 'string.base' }]);
  }

  const normalized = value.trim();
  if (!allowEmpty && normalized.length === 0) {
    throw buildValidationError(`Error de validación en ${source}`, [{ field, message: `${field} no puede estar vacío`, code: 'string.empty' }]);
  }

  return normalized;
};

const optionalObjectId = ({ value, field, source, required = false }) => {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw buildValidationError(`Error de validación en ${source}`, [{ field, message: `${field} es obligatorio`, code: 'any.required' }]);
    }
    return undefined;
  }

  if (typeof value !== 'string' || !OBJECT_ID_REGEX.test(value)) {
    throw buildValidationError(`Error de validación en ${source}`, [{ field, message: `${field} debe ser un ObjectId válido`, code: 'string.pattern.base' }]);
  }

  return value;
};

const optionalIsoDate = ({ value, field, source, required = false }) => {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw buildValidationError(`Error de validación en ${source}`, [{ field, message: `${field} es obligatorio`, code: 'any.required' }]);
    }
    return undefined;
  }

  if (typeof value !== 'string' || !ISO_DATE_REGEX.test(value.trim())) {
    throw buildValidationError(`Error de validación en ${source}`, [{ field, message: `${field} debe usar formato YYYY-MM-DD`, code: 'string.pattern.base' }]);
  }

  return value.trim();
};

const optionalEmail = ({ value, field, source, required = false }) => {
  const parsed = optionalString({ value, field, source, allowEmpty: false });

  if (parsed === undefined) {
    if (required) {
      throw buildValidationError(`Error de validación en ${source}`, [{ field, message: `${field} es obligatorio`, code: 'any.required' }]);
    }
    return undefined;
  }

  const normalized = parsed.toLowerCase();
  if (!EMAIL_REGEX.test(normalized)) {
    throw buildValidationError(`Error de validación en ${source}`, [{ field, message: `${field} no es válido`, code: 'string.email' }]);
  }

  return normalized;
};

const validateAllowedSkills = ({ value, source }) => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw buildValidationError(`Error de validación en ${source}`, [{ field: 'allowedSkills', message: 'allowedSkills debe ser un arreglo', code: 'array.base' }]);
  }

  const seen = new Set();
  const normalized = [];

  value.forEach((skillId, index) => {
    if (typeof skillId !== 'string' || !OBJECT_ID_REGEX.test(skillId)) {
      throw buildValidationError(`Error de validación en ${source}`, [{ field: `allowedSkills.${index}`, message: 'Cada skill debe ser ObjectId válido', code: 'string.pattern.base' }]);
    }

    if (!seen.has(skillId)) {
      seen.add(skillId);
      normalized.push(skillId);
    }
  });

  return normalized;
};

const validateBlock = (block, source, index) => {
  if (!isPlainObject(block)) {
    throw buildValidationError(`Error de validación en ${source}`, [{ field: `blocks.${index}`, message: 'Cada bloque debe ser un objeto', code: 'object.base' }]);
  }

  parseUnknownFields(block, ['start', 'end', 'skillId'], source);

  const start = requireString({ value: block.start, field: `blocks.${index}.start`, source });
  const end = requireString({ value: block.end, field: `blocks.${index}.end`, source });
  const skillId = optionalObjectId({ value: block.skillId, field: `blocks.${index}.skillId`, source, required: true });

  if (!TIME_REGEX.test(start) || !TIME_REGEX.test(end)) {
    throw buildValidationError(`Error de validación en ${source}`, [{ field: `blocks.${index}`, message: 'start/end deben tener formato HH:mm', code: 'string.pattern.base' }]);
  }

  return { start, end, skillId };
};

const validateBlocks = ({ value, source, required = false }) => {
  if (value === undefined) {
    if (required) {
      throw buildValidationError(`Error de validación en ${source}`, [{ field: 'blocks', message: 'blocks es obligatorio', code: 'any.required' }]);
    }
    return undefined;
  }

  if (!Array.isArray(value) || value.length === 0) {
    throw buildValidationError(`Error de validación en ${source}`, [{ field: 'blocks', message: 'blocks debe tener al menos un bloque', code: 'array.min' }]);
  }

  return value.map((block, index) => validateBlock(block, source, index));
};

const validateScheduleEntry = (entry, source, index) => {
  if (!isPlainObject(entry)) {
    throw buildValidationError(`Error de validación en ${source}`, [{ field: `schedules.${index}`, message: 'Cada schedule debe ser objeto', code: 'object.base' }]);
  }

  parseUnknownFields(entry, ['id', 'date', 'blocks'], source);

  return {
    id: optionalObjectId({ value: entry.id, field: `schedules.${index}.id`, source, required: true }),
    date: optionalIsoDate({ value: entry.date, field: `schedules.${index}.date`, source, required: true }),
    blocks: validateBlocks({ value: entry.blocks, source, required: true })
  };
};

const parseNumericQuery = ({ value, field, source, min, max }) => {
  if (value === undefined) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < min || (max !== undefined && parsed > max)) {
    throw buildValidationError(`Error de validación en ${source}`, [{ field, message: `${field} inválido`, code: 'number.base' }]);
  }
  return parsed;
};

const parseStatusesCsv = ({ value, field, source }) => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw buildValidationError(`Error de validación en ${source}`, [{ field, message: `${field} debe ser csv`, code: 'string.base' }]);
  }
  return value;
};

const authSchemas = {
  login: (body) => {
    const source = 'body';
    assertPlainObject(body, source);
    parseUnknownFields(body, ['email', 'password'], source);

    return {
      email: optionalEmail({ value: body.email, field: 'email', source, required: true }),
      password: requireString({ value: body.password, field: 'password', source })
    };
  },
  forgotPassword: (body) => {
    const source = 'body';
    assertPlainObject(body, source);
    parseUnknownFields(body, ['email'], source);

    return {
      email: optionalEmail({ value: body.email, field: 'email', source, required: true })
    };
  },
  resetPassword: (body) => {
    const source = 'body';
    assertPlainObject(body, source);
    parseUnknownFields(body, ['token', 'newPassword'], source);

    const newPassword = requireString({ value: body.newPassword, field: 'newPassword', source });
    if (newPassword.length < 8) {
      throw buildValidationError('Error de validación en body', [{ field: 'newPassword', message: 'newPassword debe tener al menos 8 caracteres', code: 'string.min' }]);
    }

    return {
      token: requireString({ value: body.token, field: 'token', source }),
      newPassword
    };
  }
};

const usersSchemas = {
  query: (query = {}) => {
    const source = 'query params';
    assertPlainObject(query, source);
    parseUnknownFields(query, ['page', 'limit', 'name', 'status'], source);

    const status = optionalString({ value: query.status, field: 'status', source });
    if (status !== undefined && !['all', 'active', 'inactive'].includes(status)) {
      throw buildValidationError('Error de validación en query params', [{ field: 'status', message: 'status inválido', code: 'any.only' }]);
    }

    return {
      page: parseNumericQuery({ value: query.page, field: 'page', source, min: 1 }),
      limit: parseNumericQuery({ value: query.limit, field: 'limit', source, min: 1, max: 100 }),
      name: query.name === undefined ? undefined : normalizeString(String(query.name)),
      status
    };
  },
  idParam: (params = {}) => ({
    id: optionalObjectId({ value: params.id, field: 'id', source: 'params', required: true })
  }),
  create: (body) => {
    const source = 'body';
    assertPlainObject(body, source);
    parseUnknownFields(body, ['name', 'email', 'password', 'role', 'campaign', 'allowedSkills'], source);

    const role = optionalString({ value: body.role, field: 'role', source });
    if (role !== undefined && !['admin', 'agente'].includes(role)) {
      throw buildValidationError('Error de validación en body', [{ field: 'role', message: 'role inválido', code: 'any.only' }]);
    }

    const password = requireString({ value: body.password, field: 'password', source });
    if (password.length < 8) {
      throw buildValidationError('Error de validación en body', [{ field: 'password', message: 'password debe tener al menos 8 caracteres', code: 'string.min' }]);
    }

    return {
      name: requireString({ value: body.name, field: 'name', source }),
      email: optionalEmail({ value: body.email, field: 'email', source, required: true }),
      password,
      role,
      campaign: optionalString({ value: body.campaign, field: 'campaign', source, allowEmpty: true }),
      allowedSkills: validateAllowedSkills({ value: body.allowedSkills, source })
    };
  },
  update: (body) => {
    const source = 'body';
    assertPlainObject(body, source);
    parseUnknownFields(body, ['name', 'email', 'password', 'role', 'campaign', 'allowedSkills'], source);

    if (Object.keys(body).length === 0) {
      throw buildValidationError('Error de validación en body', [{ field: 'body', message: 'Debe enviar al menos un campo para actualizar', code: 'object.min' }]);
    }

    const result = {};

    if (body.name !== undefined) result.name = requireString({ value: body.name, field: 'name', source });
    if (body.email !== undefined) result.email = optionalEmail({ value: body.email, field: 'email', source, required: true });

    if (body.password !== undefined) {
      const password = requireString({ value: body.password, field: 'password', source });
      if (password.length < 8) {
        throw buildValidationError('Error de validación en body', [{ field: 'password', message: 'password debe tener al menos 8 caracteres', code: 'string.min' }]);
      }
      result.password = password;
    }

    if (body.role !== undefined) {
      const role = requireString({ value: body.role, field: 'role', source });
      if (!['admin', 'agente'].includes(role)) {
        throw buildValidationError('Error de validación en body', [{ field: 'role', message: 'role inválido', code: 'any.only' }]);
      }
      result.role = role;
    }

    if (body.campaign !== undefined) result.campaign = optionalString({ value: body.campaign, field: 'campaign', source, allowEmpty: true });
    if (body.allowedSkills !== undefined) result.allowedSkills = validateAllowedSkills({ value: body.allowedSkills, source });

    return result;
  },
  changeStatus: (body) => {
    const source = 'body';
    assertPlainObject(body, source);
    parseUnknownFields(body, ['status'], source);

    const status = requireString({ value: body.status, field: 'status', source });
    if (!['active', 'inactive'].includes(status)) {
      throw buildValidationError('Error de validación en body', [{ field: 'status', message: 'status inválido', code: 'any.only' }]);
    }

    return { status };
  },
  agentsCatalogQuery: (query = {}) => {
    const source = 'query params';
    assertPlainObject(query, source);
    parseUnknownFields(query, ['status', 'fields'], source);

    const status = optionalString({ value: query.status, field: 'status', source });
    if (status !== undefined && !['all', 'active', 'inactive'].includes(status)) {
      throw buildValidationError('Error de validación en query params', [{ field: 'status', message: 'status inválido', code: 'any.only' }]);
    }

    const fields = optionalString({ value: query.fields, field: 'fields', source });

    return {
      status,
      fields
    };
  },
  campaignsCatalogQuery: (query = {}) => {
    const source = 'query params';
    assertPlainObject(query, source);
    parseUnknownFields(query, ['status'], source);

    const status = optionalString({ value: query.status, field: 'status', source });
    if (status !== undefined && !['all', 'active', 'inactive'].includes(status)) {
      throw buildValidationError('Error de validación en query params', [{ field: 'status', message: 'status inválido', code: 'any.only' }]);
    }

    return { status };
  }
};

const skillsSchemas = {
  query: (query = {}) => {
    const source = 'query params';
    assertPlainObject(query, source);
    parseUnknownFields(query, ['page', 'limit', 'name', 'status', 'type'], source);

    const status = optionalString({ value: query.status, field: 'status', source });
    if (status !== undefined && !['all', 'active', 'inactive'].includes(status)) {
      throw buildValidationError('Error de validación en query params', [{ field: 'status', message: 'status inválido', code: 'any.only' }]);
    }

    const type = optionalString({ value: query.type, field: 'type', source });
    if (type !== undefined && !['all', 'break', 'rest', 'absence', 'operative'].includes(type)) {
      throw buildValidationError('Error de validación en query params', [{ field: 'type', message: 'type inválido', code: 'any.only' }]);
    }

    return {
      page: parseNumericQuery({ value: query.page, field: 'page', source, min: 1 }),
      limit: parseNumericQuery({ value: query.limit, field: 'limit', source, min: 1, max: 100 }),
      name: query.name === undefined ? undefined : normalizeString(String(query.name)),
      status,
      type
    };
  },
  idParam: (params = {}) => ({
    id: optionalObjectId({ value: params.id, field: 'id', source: 'params', required: true })
  }),
  create: (body) => {
    const source = 'body';
    assertPlainObject(body, source);
    parseUnknownFields(body, ['name', 'color', 'descripcion'], source);

    const color = requireString({ value: body.color, field: 'color', source });
    if (!HEX_COLOR_REGEX.test(color)) {
      throw buildValidationError('Error de validación en body', [{ field: 'color', message: 'color debe ser HEX válido', code: 'string.pattern.base' }]);
    }

    return {
      name: requireString({ value: body.name, field: 'name', source }),
      color,
      descripcion: optionalString({ value: body.descripcion, field: 'descripcion', source, allowEmpty: true })
    };
  },
  update: (body) => {
    const source = 'body';
    assertPlainObject(body, source);
    parseUnknownFields(body, ['name', 'color', 'descripcion'], source);

    if (Object.keys(body).length === 0) {
      throw buildValidationError('Error de validación en body', [{ field: 'body', message: 'Debe enviar al menos un campo para actualizar', code: 'object.min' }]);
    }

    const result = {};

    if (body.name !== undefined) result.name = requireString({ value: body.name, field: 'name', source });
    if (body.descripcion !== undefined) result.descripcion = optionalString({ value: body.descripcion, field: 'descripcion', source, allowEmpty: true });

    if (body.color !== undefined) {
      const color = requireString({ value: body.color, field: 'color', source });
      if (!HEX_COLOR_REGEX.test(color)) {
        throw buildValidationError('Error de validación en body', [{ field: 'color', message: 'color debe ser HEX válido', code: 'string.pattern.base' }]);
      }
      result.color = color;
    }

    return result;
  },
  changeStatus: (body) => {
    const source = 'body';
    assertPlainObject(body, source);
    parseUnknownFields(body, ['status'], source);

    const status = requireString({ value: body.status, field: 'status', source });
    if (!['active', 'inactive'].includes(status)) {
      throw buildValidationError('Error de validación en body', [{ field: 'status', message: 'status inválido', code: 'any.only' }]);
    }

    return { status };
  }
};

const horariosSchemas = {
  idParam: (params = {}) => ({
    id: optionalObjectId({ value: params.id, field: 'id', source: 'params', required: true })
  }),
  userIdParam: (params = {}) => ({
    userId: optionalObjectId({ value: params.userId, field: 'userId', source: 'params', required: true })
  }),
  byDateQuery: (query = {}) => {
    const source = 'query params';
    assertPlainObject(query, source);
    parseUnknownFields(query, ['date', 'statuses'], source);

    return {
      date: optionalIsoDate({ value: query.date, field: 'date', source, required: true }),
      statuses: parseStatusesCsv({ value: query.statuses, field: 'statuses', source })
    };
  },
  listQuery: (query = {}) => {
    const source = 'query params';
    assertPlainObject(query, source);
    parseUnknownFields(query, ['page', 'limit', 'userId', 'status', 'fromDate', 'toDate'], source);

    const status = optionalString({ value: query.status, field: 'status', source });
    if (status !== undefined && !['all', 'borrador', 'publicado', 'archivado'].includes(status)) {
      throw buildValidationError('Error de validación en query params', [{ field: 'status', message: 'status inválido', code: 'any.only' }]);
    }

    return {
      page: parseNumericQuery({ value: query.page, field: 'page', source, min: 1 }),
      limit: parseNumericQuery({ value: query.limit, field: 'limit', source, min: 1, max: 100 }),
      userId: optionalObjectId({ value: query.userId, field: 'userId', source }),
      status,
      fromDate: optionalIsoDate({ value: query.fromDate, field: 'fromDate', source }),
      toDate: optionalIsoDate({ value: query.toDate, field: 'toDate', source })
    };
  },
  shiftTemplatesQuery: (query = {}) => {
    const source = 'query params';
    assertPlainObject(query, source);
    parseUnknownFields(query, ['page', 'limit', 'status', 'code'], source);

    const status = optionalString({ value: query.status, field: 'status', source });
    if (status !== undefined && !['all', 'active', 'inactive'].includes(status)) {
      throw buildValidationError('Error de validación en query params', [{ field: 'status', message: 'status inválido', code: 'any.only' }]);
    }

    return {
      page: parseNumericQuery({ value: query.page, field: 'page', source, min: 1 }),
      limit: parseNumericQuery({ value: query.limit, field: 'limit', source, min: 1, max: 100 }),
      status,
      code: query.code === undefined ? undefined : normalizeString(String(query.code))
    };
  },

  weekByUserQuery: (query = {}) => {
    const source = 'query params';
    assertPlainObject(query, source);
    parseUnknownFields(query, ['date', 'status'], source);

    const status = optionalString({ value: query.status, field: 'status', source });
    if (status !== undefined && !['borrador', 'publicado'].includes(status)) {
      throw buildValidationError('Error de validación en query params', [{ field: 'status', message: 'status inválido', code: 'any.only' }]);
    }

    return {
      date: optionalIsoDate({ value: query.date, field: 'date', source }),
      status
    };
  },
  publishedWeekAllQuery: (query = {}) => {
    const source = 'query params';
    assertPlainObject(query, source);
    parseUnknownFields(query, ['date'], source);

    return {
      date: optionalIsoDate({ value: query.date, field: 'date', source })
    };
  },
  reportQuery: (query = {}) => {
    const source = 'query params';
    assertPlainObject(query, source);
    parseUnknownFields(query, ['date', 'statuses', 'mode', 'campaign'], source);

    const mode = optionalString({ value: query.mode, field: 'mode', source });
    if (mode !== undefined && !['published', 'draft'].includes(mode)) {
      throw buildValidationError('Error de validación en query params', [{ field: 'mode', message: 'mode inválido', code: 'any.only' }]);
    }

    return {
      date: optionalIsoDate({ value: query.date, field: 'date', source }),
      statuses: parseStatusesCsv({ value: query.statuses, field: 'statuses', source }),
      mode,
      campaign: optionalString({ value: query.campaign, field: 'campaign', source, allowEmpty: true })
    };
  },
  create: (body) => {
    const source = 'body';
    assertPlainObject(body, source);
    parseUnknownFields(body, ['userId', 'date', 'blocks'], source);

    return {
      userId: optionalObjectId({ value: body.userId, field: 'userId', source, required: true }),
      date: optionalIsoDate({ value: body.date, field: 'date', source, required: true }),
      blocks: validateBlocks({ value: body.blocks, source, required: true })
    };
  },
  update: (body) => {
    const source = 'body';
    assertPlainObject(body, source);
    parseUnknownFields(body, ['date', 'blocks'], source);

    if (Object.keys(body).length === 0) {
      throw buildValidationError('Error de validación en body', [{ field: 'body', message: 'Debe enviar al menos un campo para actualizar', code: 'object.min' }]);
    }

    return {
      date: optionalIsoDate({ value: body.date, field: 'date', source }),
      blocks: validateBlocks({ value: body.blocks, source })
    };
  },
  publishByDate: (body) => {
    const source = 'body';
    assertPlainObject(body, source);
    parseUnknownFields(body, ['date'], source);

    return {
      date: optionalIsoDate({ value: body.date, field: 'date', source, required: true })
    };
  },
  editWeek: (body) => {
    const source = 'body';
    assertPlainObject(body, source);
    parseUnknownFields(body, ['userId', 'date', 'status', 'mode', 'schedule', 'schedules'], source);

    const mode = optionalString({ value: body.mode, field: 'mode', source, allowEmpty: false }) || 'week';
    const status = optionalString({ value: body.status, field: 'status', source, allowEmpty: false }) || 'publicado';

    if (!['day', 'week'].includes(mode)) {
      throw buildValidationError('Error de validación en body', [{ field: 'mode', message: 'mode inválido, permitido: day | week', code: 'any.only' }]);
    }

    if (!['borrador', 'publicado'].includes(status)) {
      throw buildValidationError('Error de validación en body', [{ field: 'status', message: 'status inválido, permitido: borrador | publicado', code: 'any.only' }]);
    }

    const result = {
      userId: optionalObjectId({ value: body.userId, field: 'userId', source, required: true }),
      date: optionalIsoDate({ value: body.date, field: 'date', source, required: true }),
      status,
      mode
    };

    if (mode === 'day') {
      if (!isPlainObject(body.schedule)) {
        throw buildValidationError('Error de validación en body', [{ field: 'schedule', message: 'schedule es obligatorio cuando mode=day', code: 'any.required' }]);
      }

      parseUnknownFields(body.schedule, ['id', 'date', 'blocks'], source);
      result.schedule = {
        id: optionalObjectId({ value: body.schedule.id, field: 'schedule.id', source, required: true }),
        date: optionalIsoDate({ value: body.schedule.date, field: 'schedule.date', source, required: true }),
        blocks: validateBlocks({ value: body.schedule.blocks, source, required: true })
      };
      return result;
    }

    if (!Array.isArray(body.schedules) || body.schedules.length !== 7) {
      throw buildValidationError('Error de validación en body', [{ field: 'schedules', message: 'schedules debe contener exactamente 7 días cuando mode=week', code: 'array.length' }]);
    }

    result.schedules = body.schedules.map((entry, index) => validateScheduleEntry(entry, source, index));

    return result;
  },
  editPublishedWeek: (body) => {
    const source = 'body';
    assertPlainObject(body, source);
    parseUnknownFields(body, ['userId', 'date', 'schedules'], source);

    if (!Array.isArray(body.schedules) || body.schedules.length !== 7) {
      throw buildValidationError('Error de validación en body', [{ field: 'schedules', message: 'schedules debe contener exactamente 7 días', code: 'array.length' }]);
    }

    return {
      userId: optionalObjectId({ value: body.userId, field: 'userId', source, required: true }),
      date: optionalIsoDate({ value: body.date, field: 'date', source, required: true }),
      schedules: body.schedules.map((entry, index) => validateScheduleEntry(entry, source, index))
    };
  },
  shiftTemplateCreate: (body) => {
    const source = 'body';
    assertPlainObject(body, source);
    parseUnknownFields(body, ['code', 'name', 'blocks'], source);

    return {
      code: requireString({ value: body.code, field: 'code', source }),
      name: optionalString({ value: body.name, field: 'name', source, allowEmpty: true }),
      blocks: validateBlocks({ value: body.blocks, source, required: true })
    };
  },
  shiftTemplateUpdate: (body) => {
    const source = 'body';
    assertPlainObject(body, source);
    parseUnknownFields(body, ['code', 'name', 'blocks', 'status'], source);

    if (Object.keys(body).length === 0) {
      throw buildValidationError('Error de validación en body', [{ field: 'body', message: 'Debe enviar al menos un campo para actualizar', code: 'object.min' }]);
    }

    const result = {};

    if (body.code !== undefined) {
      result.code = requireString({ value: body.code, field: 'code', source });
    }

    if (body.name !== undefined) {
      result.name = optionalString({ value: body.name, field: 'name', source, allowEmpty: true });
    }

    if (body.blocks !== undefined) {
      result.blocks = validateBlocks({ value: body.blocks, source, required: true });
    }

    if (body.status !== undefined) {
      const status = requireString({ value: body.status, field: 'status', source });
      if (!['active', 'inactive'].includes(status)) {
        throw buildValidationError('Error de validación en body', [{ field: 'status', message: 'status inválido, permitido: active | inactive', code: 'any.only' }]);
      }
      result.status = status;
    }

    return result;
    },
  bulkAssignShiftTemplate: (body) => {
    const source = 'body';
    assertPlainObject(body, source);
    parseUnknownFields(body, ['templateId', 'userIds', 'startDate', 'endDate', 'overwriteDraft'], source);

    if (!Array.isArray(body.userIds) || body.userIds.length === 0) {
      throw buildValidationError('Error de validación en body', [{ field: 'userIds', message: 'userIds debe contener al menos un agente', code: 'array.min' }]);
    }

    const userIds = [];
    const seen = new Set();

    body.userIds.forEach((userId, index) => {
      if (typeof userId !== 'string' || !OBJECT_ID_REGEX.test(userId)) {
        throw buildValidationError('Error de validación en body', [{ field: `userIds.${index}`, message: 'Cada userId debe ser ObjectId válido', code: 'string.pattern.base' }]);
      }

      if (!seen.has(userId)) {
        seen.add(userId);
        userIds.push(userId);
      }
    });

    const overwriteDraft = body.overwriteDraft === undefined
      ? false
      : Boolean(body.overwriteDraft);

    return {
      templateId: optionalObjectId({ value: body.templateId, field: 'templateId', source, required: true }),
      userIds,
      startDate: optionalIsoDate({ value: body.startDate, field: 'startDate', source, required: true }),
      endDate: optionalIsoDate({ value: body.endDate, field: 'endDate', source, required: true }),
      overwriteDraft
    };
  }
};

module.exports = {
  authSchemas,
  usersSchemas,
  skillsSchemas,
  horariosSchemas
};