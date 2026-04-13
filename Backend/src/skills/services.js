const { ObjectId } = require('mongodb');
const createError = require('http-errors');
const { Database } = require('../database');

const COLLECTION = 'skills';

const HEX_COLOR_REGEX = /^#([0-9A-F]{3}){1,2}$/i;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const assertValidObjectId = (id) => {
  if (!ObjectId.isValid(id)) {
    throw new createError.BadRequest('ID inválido');
  }
};

const assertValidHexColor = (color) => {
  if (!HEX_COLOR_REGEX.test(color)) {
    throw new createError.BadRequest('Color inválido, debe ser formato HEX (#FFFFFF)');
  }
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizePagination = ({ page, limit }) => {
  const parsedPage = Number.parseInt(page, 10);
  const parsedLimit = Number.parseInt(limit, 10);

  const safePage = Number.isNaN(parsedPage) || parsedPage < 1 ? DEFAULT_PAGE : parsedPage;
  const safeLimit = Number.isNaN(parsedLimit) || parsedLimit < 1
    ? DEFAULT_LIMIT
    : Math.min(parsedLimit, MAX_LIMIT);

  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
};

const normalizeName = (name) => {
  const normalized = (name || '').trim();
  if (!normalized) {
    throw new createError.BadRequest('El nombre no puede estar vacío');
  }
  return normalized;
};

const buildSkillsFilter = ({ name, status, type }) => {
  const filter = {};

  if (typeof name === 'string' && name.trim() !== '') {
    filter.name = { $regex: escapeRegex(name.trim()), $options: 'i' };
  }

  if (typeof status === 'string' && status !== 'all' && status.trim() !== '') {
    if (!['active', 'inactive'].includes(status)) {
      throw new createError.BadRequest('Filtro de estado inválido');
    }

    filter.status = status;
  }

  if (typeof type === 'string' && type !== 'all' && type.trim() !== '') {
    if (!['break', 'rest', 'absence', 'operative'].includes(type)) {
      throw new createError.BadRequest('Filtro de tipo inválido');
    }

    filter.type = type;
  }

  return filter;
};

const inferTypeFromName = (name) => {
  const upper = name.toUpperCase();

  if (upper === 'BREAK') return 'break';
  if (upper === 'REST' || upper === 'DESCANSO') return 'rest';

  // ✅ AUSENCIAS (bloque completo)
  if (upper === 'VACACIONES' || upper === 'SANCIÓN' || upper === 'CUMPLEAÑOS') {
    return 'absence';
  }

  return 'operative';
};

const ensureUniqueName = async (collection, name, excludeId = null) => {
  const query = {
    name: { $regex: `^${name}$`, $options: 'i' }
  };

  if (excludeId) {
    query._id = { $ne: new ObjectId(excludeId) };
  }

  const existing = await collection.findOne(query);
  if (existing) {
    throw new createError.Conflict('Ya existe una skill con ese nombre');
  }
};

const ensureSingleActiveByType = async (collection, type) => {
  if (type !== 'break' && type !== 'rest') return;

  const existing = await collection.findOne({ type, status: 'active' });

  if (existing) {
    const label = type.toUpperCase();
    throw new createError.Conflict(`Ya existe una skill ${label} activa`);
  }
};

const getPaginated = async ({ page, limit, name, status, type }) => {
  const collection = await Database(COLLECTION);

  const pagination = normalizePagination({ page, limit });
  const filter = buildSkillsFilter({ name, status, type });

  const [items, total] = await Promise.all([
    collection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .toArray(),
    collection.countDocuments(filter)
  ]);

  return {
    items,
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pagination.limit)
  };
};


/* 🔹 Obtener por ID */
const getById = async (id) => {
  assertValidObjectId(id);

  const collection = await Database(COLLECTION);
  const skill = await collection.findOne({ _id: new ObjectId(id) });

  if (!skill) {
    throw new createError.NotFound('Skill no encontrada');
  }

  return skill;
};

/* 🔥 Crear skill blindada */
const create = async (body) => {
  const collection = await Database(COLLECTION);

  const { name, color, descripcion } = body;

  if (!name || !color) {
    throw new createError.BadRequest('Datos incompletos');
  }

  const normalizedName = normalizeName(name);

  assertValidHexColor(color);

  // No duplicados por nombre (case-insensitive)
  await ensureUniqueName(collection, normalizedName);

  const type = inferTypeFromName(normalizedName);

  // Solo una BREAK activa / solo una REST activa
  await ensureSingleActiveByType(collection, type);

  const newSkill = {
    name: normalizedName,
    color,
    descripcion: descripcion || '',
    type,
    status: 'active',
    createdAt: new Date()
  };

  const result = await collection.insertOne(newSkill);
  return result.insertedId;
};

/* 🔥 Actualizar skill blindada */
const updateSkill = async (id, body) => {
  assertValidObjectId(id);

  const collection = await Database(COLLECTION);

  const skill = await collection.findOne({ _id: new ObjectId(id) });
  if (!skill) {
    throw new createError.NotFound('Skill no encontrada');
  }

  // ❌ No permitir modificar type jamás
  if (body.type) {
    throw new createError.BadRequest('No se puede modificar el tipo de skill');
  }

  // ❌ Si es BREAK o REST no permitir cambiar nombre
  if ((skill.type === 'break' || skill.type === 'rest') && body.name) {
    throw new createError.BadRequest('No se puede modificar el nombre de una skill BREAK o REST');
  }

  if (!body || Object.keys(body).length === 0) {
    throw new createError.BadRequest('Datos incompletos');
  }

  const updateData = {};

  if (body.name) {
    const newName = normalizeName(body.name);

    // Evitar duplicados (excluyendo la skill actual)
    await ensureUniqueName(collection, newName, id);

    updateData.name = newName;
  }

  if (body.color) {
    assertValidHexColor(body.color);
    updateData.color = body.color;
  }

  if (body.descripcion !== undefined) {
    updateData.descripcion = body.descripcion;
  }

  updateData.updatedAt = new Date();

  await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateData }
  );

  return { updated: true };
};

/* 🔹 Cambiar estado */
const changeStatus = async (id, status) => {
  assertValidObjectId(id);

  if (!['active', 'inactive'].includes(status)) {
    throw new createError.BadRequest('Estado inválido');
  }

  const collection = await Database(COLLECTION);

  const skill = await collection.findOne({ _id: new ObjectId(id) });
  if (!skill) {
    throw new createError.NotFound('Skill no encontrada');
  }

  // 🔒 No permitir desactivar BREAK ni REST
  if ((skill.type === 'break' || skill.type === 'rest') && status === 'inactive') {
    throw new createError.BadRequest('No se puede desactivar una skill BREAK o REST');
  }

  await collection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status,
        updatedAt: new Date()
      }
    }
  );

  return { status };
};

module.exports.SkillsService = {
  getPaginated,
  getById,
  create,
  updateSkill,
  changeStatus
};