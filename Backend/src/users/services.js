const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const createError = require('http-errors');
const { Database } = require('../database');

const COLLECTION = 'users';
const SKILLS_COLLECTION = 'skills';
const SALT_ROUNDS = 10;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const AGENTS_CATALOG_FIELDS = ['_id', 'name', 'email', 'campaign', 'allowedSkills', 'status'];
const DEFAULT_AGENTS_FIELDS = ['_id', 'name', 'email', 'campaign', 'allowedSkills'];

/** =========================
 * Helpers / Validaciones
 * ========================= */

const assertValidObjectId = (id) => {
  if (!ObjectId.isValid(id)) {
    throw new createError.BadRequest('ID inválido');
  }
};

const assertValidEmail = (email) => {
  if (!emailRegex.test(email)) {
    throw new createError.BadRequest('Email inválido');
  }
};

const normalizeEmailInput = (email) => {
  if (typeof email !== 'string') {
    throw new createError.BadRequest('Email inválido');
  }

  const normalizedEmail = email.trim().toLowerCase();
  assertValidEmail(normalizedEmail);
  return normalizedEmail;
};

const isMongoDuplicateKeyError = (error) => error?.code === 11000;

const mapDuplicateEmailError = (error, message = 'El email ya está en uso por otro usuario') => {
  if (!isMongoDuplicateKeyError(error)) {
    throw error;
  }

  throw new createError.Conflict(message);
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

const buildUsersFilter = ({ name, status }) => {
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

  return filter;
};

const hashPasswordIfPresent = async (payload) => {
  if (!payload.password) return payload;
  return {
    ...payload,
    password: await bcrypt.hash(payload.password, SALT_ROUNDS)
  };
};

const validateUpdatePayload = (body) => {
  if (!body || Object.keys(body).length === 0) {
    throw new createError.BadRequest('Datos incompletos');
  }

  // Mantener tu regla
  if (body.status) {
    throw new createError.BadRequest('El estado no puede modificarse desde este endpoint');
  }

  if (body.email) {
    assertValidEmail(body.email);
  }

  if (body.campaign !== undefined && typeof body.campaign !== 'string') {
    throw new createError.BadRequest('campaign debe ser un texto');
  }
};

const normalizeCampaign = (campaign) => {
  if (typeof campaign !== 'string') return '';
  return campaign.trim();
};

const normalizeFieldsCsv = (fields) => {
  if (fields === undefined) return [...DEFAULT_AGENTS_FIELDS];
  if (typeof fields !== 'string') {
    throw new createError.BadRequest('fields debe ser csv');
  }

  const parsedFields = [...new Set(
    fields
      .split(',')
      .map((field) => field.trim())
      .filter(Boolean)
  )];

  if (parsedFields.length === 0) {
    return [...DEFAULT_AGENTS_FIELDS];
  }

  const invalidField = parsedFields.find((field) => !AGENTS_CATALOG_FIELDS.includes(field));
  if (invalidField) {
    throw new createError.BadRequest(`Campo inválido en fields: ${invalidField}`);
  }

  if (!parsedFields.includes('_id')) {
    parsedFields.unshift('_id');
  }

  return parsedFields;
};

const buildProjectionFromFields = (fields = []) => (
  fields.reduce((projection, field) => {
    projection[field] = 1;
    return projection;
  }, {})
);

const normalizeUserCampaign = (user) => ({
  ...user,
  campaign: normalizeCampaign(user.campaign)
});

const validateAndNormalizeAllowedSkills = async (allowedSkills) => {
  if (allowedSkills === undefined) return undefined;

  if (!Array.isArray(allowedSkills)) {
    throw new createError.BadRequest('allowedSkills debe ser un arreglo');
  }

  const skillsCollection = await Database(SKILLS_COLLECTION);

  // quitar duplicados
  const uniqueSkills = [...new Set(allowedSkills)];
  const validatedSkills = [];

  for (const skillId of uniqueSkills) {
    if (!ObjectId.isValid(skillId)) {
      throw new createError.BadRequest(`Skill inválida: ${skillId}`);
    }

    const skill = await skillsCollection.findOne({
      _id: new ObjectId(skillId),
      status: 'active'
    });

    if (!skill) {
      throw new createError.BadRequest(`Skill no existe o está inactiva: ${skillId}`);
    }

    // Mantener tu regla: bloquear BREAK
    if (skill.type === 'break') {
      throw new createError.BadRequest('No se puede asignar la skill BREAK a un usuario');
    }

    validatedSkills.push(new ObjectId(skillId));
  }

  return validatedSkills;
};

/** =========================
 * Queries
 * ========================= */

const countUsers = async () => {
  const collection = await Database(COLLECTION);
    return collection.estimatedDocumentCount();
};

const getPaginated = async ({ page, limit, name, status }) => {
  const collection = await Database(COLLECTION);

  const pagination = normalizePagination({ page, limit });
  const filter = buildUsersFilter({ name, status });

  const [items, total] = await Promise.all([
    collection
      .find(filter, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .toArray(),
    collection.countDocuments(filter)
  ]);

  return {
    items: items.map(normalizeUserCampaign),
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pagination.limit)
  };
};

const getById = async (id) => {
  assertValidObjectId(id);

  const collection = await Database(COLLECTION);
  const user = await collection.findOne(
    { _id: new ObjectId(id) },
    { projection: { password: 0 } }
  );

  if (!user) {
    throw new createError.NotFound('Usuario no encontrado');
  }

  return normalizeUserCampaign(user);
};

const getByEmail = async (email) => {
  const collection = await Database(COLLECTION);
  return collection.findOne({ email: normalizeEmailInput(email) });
};

const getAgentsCatalog = async ({ status = 'active', fields }) => {
  const collection = await Database(COLLECTION);
  const selectedFields = normalizeFieldsCsv(fields);
  const projection = buildProjectionFromFields(selectedFields);
  const filter = { role: 'agente' };

  if (status !== 'all') {
    filter.status = status || 'active';
  }

  const items = await collection
    .find(filter, { projection })
    .sort({ name: 1, createdAt: -1 })
    .toArray();

  return items.map(normalizeUserCampaign);
};

const getCampaignsCatalog = async ({ status = 'active' }) => {
  const collection = await Database(COLLECTION);
  const filter = {
    role: 'agente',
    campaign: { $type: 'string' }
  };

  if (status !== 'all') {
    filter.status = status || 'active';
  }

  const campaigns = await collection.distinct('campaign', filter);

  return campaigns
    .map(normalizeCampaign)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'es'));
};

/** =========================
 * Commands
 * ========================= */

const create = async (body) => {
  const collection = await Database(COLLECTION);

  const { name, email, password, role: bodyRole, campaign, allowedSkills } = body;

  if (!name || !email || !password) {
    throw new createError.BadRequest('Datos incompletos');
  }

  const normalizedEmail = normalizeEmailInput(email);

  const userExists = await getByEmail(normalizedEmail);
  if (userExists) {
    throw new createError.Conflict('El usuario ya existe');
  }

  // Mantener tu lógica: primer usuario => admin
  const totalUsers = await collection.countDocuments();
  let finalRole = bodyRole || 'agente';
  if (totalUsers === 0) {
    finalRole = 'admin';
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const normalizedAllowedSkills = await validateAndNormalizeAllowedSkills(allowedSkills);

  const newUser = {
    name,
    email: normalizedEmail,
    password: hashedPassword,
    role: finalRole,
    status: 'active',
    sessionVersion: 0,
    campaign: normalizeCampaign(campaign),
    allowedSkills: normalizedAllowedSkills ?? [],
    createdAt: new Date()
  };

  try {
    const result = await collection.insertOne(newUser);
    return result.insertedId;
  } catch (error) {
    mapDuplicateEmailError(error, 'El usuario ya existe');
  }
};

const updateUser = async (id, body) => {
  assertValidObjectId(id);
  validateUpdatePayload(body);

  const collection = await Database(COLLECTION);

  const existingUser = await collection.findOne({ _id: new ObjectId(id) });
  if (!existingUser) {
    throw new createError.NotFound('Usuario no encontrado');
  }

  // Construimos payload sin mutar "body" directo
  let payload = { ...body };

  // password
  const isPasswordChange = Boolean(payload.password);
  payload = await hashPasswordIfPresent(payload);
  if (isPasswordChange) {
    payload.sessionVersion = (existingUser.sessionVersion || 0) + 1;
  }

  if (payload.campaign !== undefined) {
    payload.campaign = normalizeCampaign(payload.campaign);
  }

  if (payload.email) {
    const normalizedEmail = normalizeEmailInput(payload.email);
    const userWithSameEmail = await collection.findOne({
      email: normalizedEmail,
      _id: { $ne: new ObjectId(id) }
    });

    if (userWithSameEmail) {
      throw new createError.Conflict('El email ya está en uso por otro usuario');
    }

    payload.email = normalizedEmail;
  }

  // allowedSkills
  if (payload.allowedSkills !== undefined) {
    payload.allowedSkills = await validateAndNormalizeAllowedSkills(payload.allowedSkills);
  }

  payload.updatedAt = new Date();

  try {
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: payload }
    );


  return { modifiedCount: result.modifiedCount };
  } catch (error) {
    mapDuplicateEmailError(error);
  }
};

const changeStatus = async (id, status) => {
  assertValidObjectId(id);

  if (!['active', 'inactive'].includes(status)) {
    throw new createError.BadRequest('Estado inválido');
  }

  const collection = await Database(COLLECTION);

  const existingUser = await collection.findOne(
    { _id: new ObjectId(id) },
    { projection: { sessionVersion: 1 } }
  );

  if (!existingUser) {
    throw new createError.NotFound('Usuario no encontrado');
  }

  const updateSet = {
    status,
    updatedAt: new Date()
  };

  if (status === 'inactive') {
    updateSet.sessionVersion = (existingUser.sessionVersion || 0) + 1;
  }

  await collection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: updateSet
    }
  );

  return { status };
};

module.exports.UsersService = {
  countUsers,
  getPaginated,
  getById,
  getByEmail,
  getAgentsCatalog,
  getCampaignsCatalog,
  create,
  updateUser,
  changeStatus
};

module.exports.UsersServiceInternals = {
  normalizeEmailInput,
  isMongoDuplicateKeyError,
  mapDuplicateEmailError,
  normalizeFieldsCsv,
  buildProjectionFromFields
};