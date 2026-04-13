const { ObjectId } = require('mongodb');
const createError = require('http-errors');
const { Database } = require('../database');

const COLLECTION = 'horarios';
const USERS_COLLECTION = 'users';
const SKILLS_COLLECTION = 'skills';
const SHIFT_TEMPLATES_COLLECTION = 'turnos_tipo';

/* 🔒 CONSTANTES DE NEGOCIO */
const DAY_START = 8 * 60;     // 08:00
const DAY_END = 21 * 60;      // 21:00
const MIN_BLOCK_DURATION = 30; // minutos
const WEEKLY_REQUIRED_HOURS = 44;
const WEEKLY_REQUIRED_MINUTES = WEEKLY_REQUIRED_HOURS * 60;
const STRICT_ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const STRICT_DATE_ERROR_MESSAGE = 'Fecha inválida, formato esperado YYYY-MM-DD';
const ALLOWED_SCHEDULE_STATUSES = ['borrador', 'publicado', 'archivado'];
const ALLOWED_EDITABLE_STATUSES = ['borrador', 'publicado'];
const ALLOWED_EDIT_MODES = ['day', 'week'];
const ALLOWED_SHIFT_TEMPLATE_STATUSES = ['active', 'inactive'];
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const inferSkillTypeFromName = (skill = {}) => {
  const upperName = String(skill.name || '').trim().toUpperCase();

  if (upperName === 'BREAK') return 'break';
  if (upperName === 'REST' || upperName === 'DESCANSO') return 'rest';
  if (upperName === 'VACACIONES' || upperName === 'SANCION' || upperName === 'CUMPLEAÑOS') {
    return 'absence';
  }

  return upperName ? 'operative' : undefined;
};

const resolveSkillType = (skill) => {
  if (skill?.type) return skill.type;
  return inferSkillTypeFromName(skill);
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* =========================
 * Helpers base
 * ========================= */

const assertValidObjectId = (id, message = 'ID inválido') => {
  if (!ObjectId.isValid(id)) {
    throw new createError.BadRequest(message);
  }
};

const normalizePagination = ({ page, limit }) => {
  const parsedPage = Number.parseInt(page, 10);
  const parsedLimit = Number.parseInt(limit, 10);

  const safePage = Number.isNaN(parsedPage) || parsedPage < 1 ? DEFAULT_PAGE : parsedPage;
  const safeLimit = Number.isNaN(parsedLimit) || parsedLimit < 1
    ? DEFAULT_LIMIT
    : Math.min(parsedLimit, MAX_LIMIT);

  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
};

// HH:mm estricto
const isValidTimeFormat = (time) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);

const timeToMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const parseStrictISODateOrThrow = (
  date,
  message = STRICT_DATE_ERROR_MESSAGE
) => {
  if (typeof date !== 'string') {
    throw new createError.BadRequest(message);
  }

  const match = STRICT_ISO_DATE_REGEX.exec(date);
  if (!match) {
    throw new createError.BadRequest(message);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new createError.BadRequest(message);
  }

  return parsed;
};


const validateStatusesFilter = (statuses) => {
  if (!statuses) return ['publicado', 'borrador'];

  if (!Array.isArray(statuses) || statuses.length === 0) {
    throw new createError.BadRequest('statuses debe tener al menos un estado válido');
  }

  const cleaned = [...new Set(statuses.map((status) => String(status).trim().toLowerCase()))];

  const invalid = cleaned.filter((status) => !ALLOWED_SCHEDULE_STATUSES.includes(status));
  if (invalid.length) {
    throw new createError.BadRequest(`Estados no permitidos: ${invalid.join(', ')}`);
  }

  return cleaned;
};

const resolveStatusesFromMode = ({ statuses, mode }) => {
  if (statuses) {
    return validateStatusesFilter(statuses);
  }

  if (!mode) {
    return ['publicado', 'borrador'];
  }

  const normalizedMode = String(mode).trim().toLowerCase();

  if (normalizedMode === 'published') {
    return ['publicado'];
  }

  if (normalizedMode === 'draft') {
    return ['borrador'];
  }

  throw new createError.BadRequest('mode inválido, valores permitidos: published | draft');
};

const normalizeCampaignFilter = (campaign) => {
  if (campaign === undefined || campaign === null) {
    return '';
  }

  if (typeof campaign !== 'string') {
    throw new createError.BadRequest('campaign debe ser un texto');
  }

  return campaign.trim().toLowerCase();
};

const buildDurationMinutesExpression = (startPath, endPath) => ({
  $subtract: [
    {
      $add: [
        { $multiply: [{ $toInt: { $substrBytes: [endPath, 0, 2] } }, 60] },
        { $toInt: { $substrBytes: [endPath, 3, 2] } }
      ]
    },
    {
      $add: [
        { $multiply: [{ $toInt: { $substrBytes: [startPath, 0, 2] } }, 60] },
        { $toInt: { $substrBytes: [startPath, 3, 2] } }
      ]
    }
  ]
});

const buildReportBasePipeline = ({ weekStart, weekEnd, safeStatuses, campaignFilter }) => {
  const basePipeline = [
    {
      $match: {
        status: { $in: safeStatuses },
        date: { $gte: weekStart, $lte: weekEnd }
      }
    },
    {
      $lookup: {
        from: USERS_COLLECTION,
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    }
  ];

  if (campaignFilter) {
    basePipeline.push({
      $match: {
        $expr: {
          $eq: [
            {
              $toLower: {
                $trim: {
                  input: { $ifNull: ['$user.campaign', ''] }
                }
              }
            },
            campaignFilter
          ]
        }
      }
    });
  }

  return basePipeline;
};

const normalizeDate = (date) => {
  if (typeof date === 'string') {
    return parseStrictISODateOrThrow(date).toISOString().split('T')[0];
  }

  if (date instanceof Date && !Number.isNaN(date.getTime())) {
    return parseStrictISODateOrThrow(date.toISOString().split('T')[0]).toISOString().split('T')[0];
  }

  throw new createError.BadRequest(STRICT_DATE_ERROR_MESSAGE);
};

// Semana LUNES → DOMINGO (UTC)
const getWeekRange = (dateString) => {
  const d = parseStrictISODateOrThrow(dateString);
  const day = d.getUTCDay();

  // getUTCDay: 0=domingo, 1=lunes, ... 6=sábado
  const diffToMonday = (day + 6) % 7;

  const weekStart = new Date(d);
  weekStart.setUTCDate(d.getUTCDate() - diffToMonday);
  weekStart.setUTCHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
};

/* =========================
 * Validación estructura bloques (NO toca DB)
 * ========================= */

const validateBlocksStructure = (blocks) => {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    throw new createError.BadRequest('Debe existir al menos un bloque');
  }

  const processed = blocks.map((b) => {
    if (!b.start || !b.end || !b.skillId) {
      throw new createError.BadRequest('Bloque inválido: datos incompletos');
    }

        if (!ObjectId.isValid(b.skillId)) {
      throw new createError.BadRequest('SkillId inválido');
    }

    if (!isValidTimeFormat(b.start) || !isValidTimeFormat(b.end)) {
      throw new createError.BadRequest(`Formato inválido en bloque ${b.start} - ${b.end}`);
    }

    const startMin = timeToMinutes(b.start);
    const endMin = timeToMinutes(b.end);

    if (startMin >= endMin) {
      throw new createError.BadRequest(`La hora inicio debe ser menor que fin (${b.start}-${b.end})`);
    }

    if (endMin - startMin < MIN_BLOCK_DURATION) {
      throw new createError.BadRequest(`Bloque mínimo ${MIN_BLOCK_DURATION} minutos`);
    }

    if (startMin < DAY_START || endMin > DAY_END) {
      throw new createError.BadRequest('Bloques deben estar entre 08:00 y 21:00');
    }

    return { ...b, startMin, endMin };
  });

  processed.sort((a, b) => a.startMin - b.startMin);

  for (let i = 1; i < processed.length; i++) {
    if (processed[i].startMin < processed[i - 1].endMin) {
      throw new createError.BadRequest(
        `Solapamiento entre ${processed[i - 1].start} y ${processed[i].start}`
      );
    }
  }

  // devolver sin startMin/endMin
  return processed.map(({ startMin, endMin, ...rest }) => rest);
};

/* =========================
 * Helpers skills (DB)
 * ========================= */

const buildSkillsMapFromIds = async (skillsCollection, ids) => {
  const objectIds = [...new Set(ids.map(String))].map((id) => new ObjectId(id));
  const skills = await skillsCollection.find({ _id: { $in: objectIds } }).toArray();

  const map = {};
  for (const s of skills) map[s._id.toString()] = s;
  return map;
};

const getSkillFromMapOrThrow = (skillsMap, skillId, messageIfMissing = 'Skill no existe') => {
  const skill = skillsMap[String(skillId)];
  if (!skill) throw new createError.BadRequest(messageIfMissing);

  const resolvedType = resolveSkillType(skill);
  if (!resolvedType) {
    throw new createError.BadRequest(`La skill ${skill.name || skillId} no tiene un tipo válido`);
  }

  if (!skill.type) {
    return { ...skill, type: resolvedType };
  }
  
  return skill;
};

const normalizeShiftTemplateCode = (code) => String(code || '').trim().toUpperCase();

const normalizeShiftTemplateName = (name) => {
  if (name === undefined || name === null) return '';
  return String(name).trim();
};

const getDateRangeDays = ({ startDate, endDate }) => {
  const start = parseStrictISODateOrThrow(startDate, 'startDate inválida, formato esperado YYYY-MM-DD');
  const end = parseStrictISODateOrThrow(endDate, 'endDate inválida, formato esperado YYYY-MM-DD');

  if (start > end) {
    throw new createError.BadRequest('startDate no puede ser mayor a endDate');
  }

  const days = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    days.push(cursor.toISOString().split('T')[0]);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  if (days.length > 31) {
    throw new createError.BadRequest('El rango máximo permitido es de 31 días');
  }

  return days;
};

const sumOperativeMinutes = ({ blocks, skillsMap }) => blocks.reduce((total, block) => {
  const skill = skillsMap[String(block.skillId)];
  if (!skill || skill.type !== 'operative') return total;
  return total + (timeToMinutes(block.end) - timeToMinutes(block.start));
}, 0);

const ensureActiveSkillsOrThrow = ({ blocks, skillsMap }) => {
  for (const block of blocks) {
    const skill = skillsMap[String(block.skillId)];
    if (!skill) {
      throw new createError.BadRequest('Skill no existe o está inactiva');
    }
    if (skill.status !== 'active') {
      throw new createError.BadRequest(`La skill "${skill.name}" está inactiva y no puede usarse`);
    }
  }
};

const toShiftTemplateResponse = ({ template, skillsMap }) => {
  const operativeMinutes = sumOperativeMinutes({
    blocks: template.blocks || [],
    skillsMap
  });

  return {
    _id: template._id,
    code: template.code,
    name: template.name || '',
    status: template.status || 'active',
    operativeMinutes,
    operativeHours: Number((operativeMinutes / 60).toFixed(2)),
    blocks: (template.blocks || []).map((block) => ({
      start: block.start,
      end: block.end,
      skill: skillsMap[String(block.skillId)] || null
    })),
    createdAt: template.createdAt,
    updatedAt: template.updatedAt || null
  };
};

/* =========================
 * Validación lógica día (REST / BREAK / 4H)
 * - Mantiene tus mismas reglas y mensajes clave
 * ========================= */

const validateDayBlocksBusinessRules = ({ blocks, skillsMap, allowedSkillsSet = null, userName = 'Usuario desconocido' }) => {
  let hasRest = false;
  let hasAbsence = false;
  let consecutiveWorkMinutes = 0;

  for (const block of blocks) {
    assertValidObjectId(block.skillId, 'SkillId inválido');

    const skill = getSkillFromMapOrThrow(skillsMap, block.skillId, 'Skill no existe o está inactiva');

    const duration = timeToMinutes(block.end) - timeToMinutes(block.start);

    // ✅ REST (descanso semanal) - bloque completo y no se mezcla
    if (skill.type === 'rest') {
      if (hasRest) {
        throw new createError.BadRequest('Solo puede existir un bloque de descanso por día');
      }

      if (blocks.length !== 1) {
        throw new createError.BadRequest('El descanso no puede mezclarse con otros bloques');
      }

      if (block.start !== '08:00' || block.end !== '21:00') {
        throw new createError.BadRequest('El descanso debe cubrir la jornada completa (08:00 - 21:00)');
      }

      hasRest = true;
      consecutiveWorkMinutes = 0;
      continue;
    }

    // ✅ ABSENCE (VACACIONES / SANCION / CUMPLEAÑOS) - bloque completo y no se mezcla
    if (skill.type === 'absence') {
      if (hasAbsence) {
        throw new createError.BadRequest('Solo puede existir un bloque de ausencia por día');
      }

      if (blocks.length !== 1) {
        throw new createError.BadRequest('La ausencia no puede mezclarse con otros bloques');
      }

      if (block.start !== '08:00' || block.end !== '21:00') {
        throw new createError.BadRequest('La ausencia debe cubrir la jornada completa (08:00 - 21:00)');
      }

      hasAbsence = true;
      consecutiveWorkMinutes = 0;
      continue;
    }

    // 🔥 Operativas
    if (skill.type === 'operative') {
      if (allowedSkillsSet && !allowedSkillsSet.has(skill._id.toString())) {
        throw new createError.BadRequest(`La skill "${skill.name}" no está asignada al agente "${userName}". Solo puedes usar skills predeterminadas o skills operativas asignadas al agente.`);
      }

      consecutiveWorkMinutes += duration;

      if (consecutiveWorkMinutes > 240) {
        throw new createError.BadRequest('No se puede trabajar más de 4 horas consecutivas sin break');
      }
      continue;
    }

    // 🔥 Break resetea consecutivas
    if (skill.type === 'break') {
      consecutiveWorkMinutes = 0;
      continue;
    }

    // 🔒 Si llega un tipo desconocido, fallar (para evitar “colados”)
    throw new createError.BadRequest(`Tipo de skill no soportado: ${skill.type}`);
  }
};

/* =========================
 * Queries base
 * ========================= */

const buildShiftTemplatesFilter = ({ status, code }) => {
  const filter = {};

  if (typeof status === 'string' && status !== 'all' && status.trim() !== '') {
    const normalizedStatus = status.trim().toLowerCase();
    if (!ALLOWED_SHIFT_TEMPLATE_STATUSES.includes(normalizedStatus)) {
      throw new createError.BadRequest('Filtro de estado inválido');
    }
    filter.status = normalizedStatus;
  }

  if (typeof code === 'string' && code.trim() !== '') {
    filter.code = { $regex: escapeRegex(code.trim()), $options: 'i' };
  }

  return filter;
};

const buildSchedulesFilter = ({ userId, status, fromDate, toDate }) => {
  const filter = {};

  if (userId !== undefined) {
    assertValidObjectId(userId, 'ID de usuario inválido');
    filter.userId = new ObjectId(userId);
  }

  if (typeof status === 'string' && status !== 'all' && status.trim() !== '') {
    const normalizedStatus = status.trim().toLowerCase();
    if (!ALLOWED_SCHEDULE_STATUSES.includes(normalizedStatus)) {
      throw new createError.BadRequest('Filtro de estado inválido');
    }
    filter.status = normalizedStatus;
  }

  if (fromDate || toDate) {
    const dateFilter = {};

    if (fromDate) {
      dateFilter.$gte = parseStrictISODateOrThrow(fromDate);
    }

    if (toDate) {
      const endDate = parseStrictISODateOrThrow(toDate);
      endDate.setUTCHours(23, 59, 59, 999);
      dateFilter.$lte = endDate;
    }

    filter.date = dateFilter;
  }

  return filter;
};

const getShiftTemplates = async ({ page, limit, status, code } = {}) => {
  const templatesCollection = await Database(SHIFT_TEMPLATES_COLLECTION);
  const skillsCollection = await Database(SKILLS_COLLECTION);

  const pagination = normalizePagination({ page, limit });
  const filter = buildShiftTemplatesFilter({ status, code });

  const [templates, total] = await Promise.all([
    templatesCollection
      .find(filter)
      .sort({ status: 1, code: 1, createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .toArray(),
    templatesCollection.countDocuments(filter)
  ]);

  const skillIds = templates.flatMap((template) => (
    (template.blocks || []).map((block) => String(block.skillId))
  ));
  const skillsMap = skillIds.length
    ? await buildSkillsMapFromIds(skillsCollection, skillIds)
    : {};

  return {
    items: templates.map((template) => toShiftTemplateResponse({ template, skillsMap })),
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pagination.limit)
  };
};

const getAll = async ({ page, limit, userId, status, fromDate, toDate } = {}) => {
  const collection = await Database(COLLECTION);
  const pagination = normalizePagination({ page, limit });
  const filter = buildSchedulesFilter({ userId, status, fromDate, toDate });

  const [items, total] = await Promise.all([
    collection
      .find(filter)
      .sort({ date: -1, _id: -1 })
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

const getById = async (id) => {
  assertValidObjectId(id, 'ID de horario inválido');

  const collection = await Database(COLLECTION);
  const horario = await collection.findOne({ _id: new ObjectId(id) });

  if (!horario) throw new createError.NotFound('Horario no encontrado');

  return horario;
};

const getByUserId = async (userId) => {
  assertValidObjectId(userId, 'ID de usuario inválido');

  const collection = await Database(COLLECTION);
  return collection.find({ userId: new ObjectId(userId) }).sort({ date: -1 }).toArray();
};

const getPublishedByUserId = async (userId) => {
  assertValidObjectId(userId, 'ID de usuario inválido');

  const collection = await Database(COLLECTION);
  const skillsCollection = await Database(SKILLS_COLLECTION);
  
  const today = normalizeDate(new Date());
  const { weekStart: currentWeekStart, weekEnd: currentWeekEnd } = getWeekRange(today);

  const nextWeekStart = new Date(currentWeekStart);
  nextWeekStart.setUTCDate(currentWeekStart.getUTCDate() + 7);

  const nextWeekEnd = new Date(nextWeekStart);
  nextWeekEnd.setUTCDate(nextWeekStart.getUTCDate() + 6);
  nextWeekEnd.setUTCHours(23, 59, 59, 999);

  const horarios = await collection
    .find({
      userId: new ObjectId(userId),
      $or: [
        {
          date: { $gte: currentWeekStart, $lte: currentWeekEnd },
          status: { $in: ['publicado', 'archivado'] }
        },
        {
          date: { $gte: nextWeekStart, $lte: nextWeekEnd },
          status: 'publicado'
        }
      ]
    })
    .sort({ date: 1 })
    .toArray();

  if (!horarios.length) return [];

  const skillIds = horarios.flatMap((h) => h.blocks.map((b) => b.skillId.toString()));
  const skillsMap = await buildSkillsMapFromIds(skillsCollection, skillIds);

  return horarios.map((h) => ({
    ...h,
    blocks: h.blocks.map((b) => ({
      start: b.start,
      end: b.end,
      skill: skillsMap[b.skillId.toString()] || null
    }))
  }));
};

const buildScheduleQueryByDate = (date, statuses = ['publicado', 'borrador']) => {
  const scheduleDate = parseStrictISODateOrThrow(date);
  const startOfDay = new Date(scheduleDate);
  startOfDay.setUTCHours(0, 0, 0, 0);

  const endOfDay = new Date(scheduleDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  return {
    date: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: statuses }
  };
};

const hydrateSchedulesWithUserAndSkills = async ({ horarios, usersCollection, skillsCollection }) => {
  if (!horarios.length) return [];

  const userIds = [...new Set(horarios.map((h) => h.userId.toString()))].map((id) => new ObjectId(id));
  const users = await usersCollection
    .find({ _id: { $in: userIds } }, { projection: { password: 0 } })
    .toArray();

  const userMap = {};
  for (const u of users) userMap[u._id.toString()] = u;

  const skillIds = horarios.flatMap((h) => h.blocks.map((b) => b.skillId.toString()));
  const skillsMap = await buildSkillsMapFromIds(skillsCollection, skillIds);

  return horarios.map((h) => ({
    ...h,
    user: userMap[h.userId.toString()] || null,
    blocks: h.blocks.map((b) => ({
      start: b.start,
      end: b.end,
      skill: skillsMap[b.skillId.toString()] || null
    }))
  }));
};

const getSchedulesByDate = async ({ date, statuses }) => {
  const safeStatuses = validateStatusesFilter(statuses);
  const collection = await Database(COLLECTION);
  const usersCollection = await Database(USERS_COLLECTION);
  const skillsCollection = await Database(SKILLS_COLLECTION);

  const query = buildScheduleQueryByDate(date, safeStatuses);

  const horarios = await collection.find(query).sort({ userId: 1, date: 1 }).toArray();

  return hydrateSchedulesWithUserAndSkills({ horarios, usersCollection, skillsCollection });
};

const getPublishedWeekByUser = async ({ userId, date }) => {
  assertValidObjectId(userId, 'ID de usuario inválido');

  const collection = await Database(COLLECTION);
  const usersCollection = await Database(USERS_COLLECTION);
  const skillsCollection = await Database(SKILLS_COLLECTION);

  const normalizedDate = normalizeDate(date || new Date());
  const { weekStart, weekEnd } = getWeekRange(normalizedDate);

  const horarios = await collection
    .find({
      userId: new ObjectId(userId),
      status: 'publicado',
      date: { $gte: weekStart, $lte: weekEnd }
    })
    .sort({ date: 1 })
    .toArray();

  return {
    week: { from: weekStart, to: weekEnd },
    schedules: await hydrateSchedulesWithUserAndSkills({ horarios, usersCollection, skillsCollection })
  };
};

const getWeekByUser = async ({ userId, date, status = 'publicado' }) => {
  assertValidObjectId(userId, 'ID de usuario inválido');

  if (!ALLOWED_EDITABLE_STATUSES.includes(status)) {
    throw new createError.BadRequest('status inválido, valores permitidos: borrador | publicado');
  }

  const collection = await Database(COLLECTION);
  const usersCollection = await Database(USERS_COLLECTION);
  const skillsCollection = await Database(SKILLS_COLLECTION);

  const normalizedDate = normalizeDate(date || new Date());
  const { weekStart, weekEnd } = getWeekRange(normalizedDate);

  const horarios = await collection
    .find({
      userId: new ObjectId(userId),
      status,
      date: { $gte: weekStart, $lte: weekEnd }
    })
    .sort({ date: 1 })
    .toArray();

  return {
    week: { from: weekStart, to: weekEnd },
    status,
    schedules: await hydrateSchedulesWithUserAndSkills({ horarios, usersCollection, skillsCollection })
  };
};

const getPublishedWeekAllAgents = async ({ date }) => {
  const collection = await Database(COLLECTION);
  const usersCollection = await Database(USERS_COLLECTION);
  const skillsCollection = await Database(SKILLS_COLLECTION);

  const normalizedDate = normalizeDate(date || new Date());
  const { weekStart, weekEnd } = getWeekRange(normalizedDate);

  const horarios = await collection
    .find({
      status: 'publicado',
      date: { $gte: weekStart, $lte: weekEnd }
    })
    .sort({ userId: 1, date: 1 })
    .toArray();

  const hydrated = await hydrateSchedulesWithUserAndSkills({ horarios, usersCollection, skillsCollection });

  const grouped = {};
  for (const schedule of hydrated) {
    const key = schedule.userId.toString();
    if (!grouped[key]) {
      grouped[key] = {
        user: schedule.user,
        schedules: []
      };
    }
    grouped[key].schedules.push(schedule);
  }

  return {
    week: { from: weekStart, to: weekEnd },
    agents: Object.values(grouped)
  };
};

const getStaffingTableByDate = async ({ date, statuses, mode, campaign }) => {
  const safeStatuses = resolveStatusesFromMode({ statuses, mode });
  const campaignFilter = normalizeCampaignFilter(campaign);

  const collection = await Database(COLLECTION);
  const usersCollection = await Database(USERS_COLLECTION);
  const skillsCollection = await Database(SKILLS_COLLECTION);

  const query = buildScheduleQueryByDate(date, safeStatuses);
  const horarios = await collection.find(query).toArray();

  const userIds = [...new Set(horarios.map((h) => h.userId.toString()))];
  const users = userIds.length
    ? await usersCollection
      .find(
        { _id: { $in: userIds.map((id) => new ObjectId(id)) } },
        { projection: { _id: 1, name: 1, campaign: 1 } }
      )
      .toArray()
    : [];

  const usersMap = users.reduce((acc, user) => {
    acc[user._id.toString()] = user;
    return acc;
  }, {});

  const filteredSchedules = campaignFilter
    ? horarios.filter((schedule) => {
      const user = usersMap[schedule.userId.toString()];
      const userCampaign = String(user?.campaign || '').trim().toLowerCase();
      return userCampaign === campaignFilter;
    })
    : horarios;

  const skillIds = filteredSchedules.flatMap((h) => h.blocks.map((b) => b.skillId.toString()));

  const skillsMap = await buildSkillsMapFromIds(skillsCollection, skillIds);

  const table = {};

  for (const schedule of filteredSchedules) {
    const userId = schedule.userId.toString();
    const user = usersMap[userId];

    for (const block of schedule.blocks) {
      const startHour = Math.floor(timeToMinutes(block.start) / 60);
      const endMinutes = timeToMinutes(block.end);
      const endHourExclusive = Math.ceil(endMinutes / 60);
      const skillId = block.skillId.toString();
      const skill = skillsMap[skillId] || null;

      for (let hour = startHour; hour < endHourExclusive; hour++) {
        const label = `${String(hour).padStart(2, '0')}:00`;
        if (!table[label]) table[label] = {};
        if (!table[label][skillId]) {
          table[label][skillId] = {
            skill,
            agentsMap: new Map()
          };
        }

        if (!table[label][skillId].agentsMap.has(userId)) {
          table[label][skillId].agentsMap.set(userId, {
            id: userId,
            name: user?.name || 'Sin nombre',
            campaign: String(user?.campaign || '').trim()
          });
        }

      }
    }
  }

  const rows = Object.keys(table)
    .sort()
    .map((hour) => ({
      hour,
      skills: Object.values(table[hour]).map((entry) => {
        const agents = Array.from(entry.agentsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        return {
          skill: entry.skill,
          totalAgents: agents.length,
          agents
        };
      })
    }));

  return {
    date: normalizeDate(date),
    mode: mode ? String(mode).trim().toLowerCase() : null,
    campaign: campaign || '',
    statuses: safeStatuses,
    rows
  };
};


const getWeeklyHoursReport = async ({ date, statuses, mode, campaign }) => {
  const safeStatuses = resolveStatusesFromMode({ statuses, mode });
  const campaignFilter = normalizeCampaignFilter(campaign);

  const collection = await Database(COLLECTION);
  const usersCollection = await Database(USERS_COLLECTION);

  const normalizedDate = normalizeDate(date || new Date());
  const { weekStart, weekEnd } = getWeekRange(normalizedDate);

  const summary = await collection.aggregate([
    ...buildReportBasePipeline({ weekStart, weekEnd, safeStatuses, campaignFilter }),
    {
      $addFields: {
        blocks: { $ifNull: ['$blocks', []] },
        agentName: { $ifNull: ['$user.name', 'Sin nombre'] },
        agentCampaign: { $trim: { input: { $ifNull: ['$user.campaign', ''] } } }
      }

    },
    {
      $unwind: {
        path: '$blocks',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: SKILLS_COLLECTION,
        localField: 'blocks.skillId',
        foreignField: '_id',
        as: 'skill'
      }
    },
    {
      $unwind: {
        path: '$skill',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $addFields: {
        durationMinutes: {
          $cond: [
            {
              $and: [
                { $ne: ['$blocks.start', null] },
                { $ne: ['$blocks.end', null] },
                { $ne: ['$skill._id', null] }
              ]
            },
            buildDurationMinutesExpression('$blocks.start', '$blocks.end'),
            0
          ]
        }
      }
    },
    {
      $group: {
        _id: {
          userId: '$userId',
          agentName: '$agentName',
          campaign: '$agentCampaign',
          skillName: '$skill.name',
          skillType: '$skill.type'
        },
        minutes: { $sum: '$durationMinutes' }
      }
    },
    {
      $group: {
        _id: {
          userId: '$_id.userId',
          agentName: '$_id.agentName',
          campaign: '$_id.campaign'
        },
        skills: {
          $push: {
            name: '$_id.skillName',
            minutes: '$minutes'
          }
        },
        totalOperativeMinutes: {
          $sum: {
            $cond: [
              { $eq: ['$_id.skillType', 'operative'] },
              '$minutes',
              0
            ]
          }
        }
      }
    }

  ]).toArray();

   const absenceSummary = await collection.aggregate([
    ...buildReportBasePipeline({ weekStart, weekEnd, safeStatuses, campaignFilter }),
    {
      $unwind: {
        path: '$blocks',
        preserveNullAndEmptyArrays: false
      }
    },
    {
      $lookup: {
        from: SKILLS_COLLECTION,
        localField: 'blocks.skillId',
        foreignField: '_id',
        as: 'skill'
      }
    },
    {
      $unwind: {
        path: '$skill',
        preserveNullAndEmptyArrays: false
      }
    },
    {
      $match: {
        'skill.type': 'absence'
      }
    },
    {
      $group: {
        _id: {
          userId: '$userId',
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$date',
              timezone: 'UTC'
            }
          }
        }
      }
    },
    {
      $group: {
        _id: '$_id.userId',
        absenceDays: { $sum: 1 }
      }
    }
  ]).toArray();

  const absenceByUserId = new Map(
    absenceSummary.map((row) => [String(row._id), Number(row.absenceDays || 0)])
  );

  const activeAgents = await usersCollection
    .find({
      role: 'agente',
      status: 'active'
    })
    .project({ _id: 1, name: 1, campaign: 1 })
    .toArray();

  const filteredAgents = campaignFilter
    ? activeAgents.filter((agent) => String(agent.campaign || '').trim().toLowerCase() === campaignFilter)
    : activeAgents;

  const summaryByUserId = new Map();
  for (const agent of summary) {
    summaryByUserId.set(String(agent._id.userId), agent);
  }

  const allSkillNames = new Set();
  const agents = filteredAgents
    .map((agentUser) => {
      const agent = summaryByUserId.get(String(agentUser._id));
      const totalsBySkillHours = {};

      for (const skill of agent?.skills || []) {
        if (!skill?.name || typeof skill.minutes !== 'number' || skill.minutes <= 0) continue;
        allSkillNames.add(skill.name);
        totalsBySkillHours[skill.name] = Number((skill.minutes / 60).toFixed(2));
      }

      const absenceDays = absenceByUserId.get(String(agentUser._id)) || 0;
      const expectedOperativeHours = Math.max(0, WEEKLY_REQUIRED_HOURS - (absenceDays * 7));
      const totalOperativeHours = Number((((agent?.totalOperativeMinutes || 0) / 60)).toFixed(2));
      const hoursBalance = Number((totalOperativeHours - expectedOperativeHours).toFixed(2));

      let balanceStatus = 'balanced';
      if (hoursBalance > 0) balanceStatus = 'excess';
      if (hoursBalance < 0) balanceStatus = 'deficit';

      return {
      userId: agentUser._id.toString(),
        agentName: agentUser.name || 'Sin nombre',
        campaign: String(agentUser.campaign || '').trim(),
        totalsBySkillHours,
        totalOperativeHours,
        expectedOperativeHours,
        absenceDays,
        hoursBalance,
        balanceStatus
      };
    })
    .sort((a, b) => a.agentName.localeCompare(b.agentName));

  const skillColumns = [...allSkillNames].sort((a, b) => a.localeCompare(b));

  return {
    week: {
      from: weekStart,
      to: weekEnd
    },
    mode: mode ? String(mode).trim().toLowerCase() : null,
    campaign: campaign || '',
    statuses: safeStatuses,
    skillColumns,
    agents
  };
};

const getDailyOperativeHoursReport = async ({ date, statuses, mode, campaign }) => {
  const safeStatuses = resolveStatusesFromMode({ statuses, mode });
  const campaignFilter = normalizeCampaignFilter(campaign);

  const collection = await Database(COLLECTION);

  const normalizedDate = normalizeDate(date || new Date());
  const { weekStart, weekEnd } = getWeekRange(normalizedDate);

  const rowsSummary = await collection.aggregate([
    ...buildReportBasePipeline({ weekStart, weekEnd, safeStatuses, campaignFilter }),
    {
      $unwind: '$blocks'
    },
    {
      $lookup: {
        from: SKILLS_COLLECTION,
        localField: 'blocks.skillId',
        foreignField: '_id',
        as: 'skill'
      }
    },
    {
      $unwind: '$skill'
    },
    {
      $match: {
        'skill.type': 'operative'
      }
    },
    {
      $group: {
        _id: {
          userId: '$userId',
          agentName: { $ifNull: ['$user.name', 'Sin nombre'] },
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$date',
              timezone: 'UTC'
            }
          }
        },
        operativeMinutes: {
          $sum: buildDurationMinutesExpression('$blocks.start', '$blocks.end')
        }
      }
    },
    {
      $sort: {
        '_id.agentName': 1,
        '_id.date': 1
      }
    }
  ]).toArray();

  const rows = rowsSummary.map((row) => ({
    userId: row._id.userId.toString(),
    agentName: row._id.agentName,
    date: row._id.date,
    operativeHours: Number((row.operativeMinutes / 60).toFixed(2))
  }));

  return {
    week: {
      from: weekStart,
      to: weekEnd
    },
    mode: mode ? String(mode).trim().toLowerCase() : null,
    campaign: campaign || '',
    statuses: safeStatuses,
    rows
  };
};

/* =========================
 * Commands
 * ========================= */

const createShiftTemplate = async ({ code, name, blocks, createdBy }) => {
  const templatesCollection = await Database(SHIFT_TEMPLATES_COLLECTION);
  const skillsCollection = await Database(SKILLS_COLLECTION);

  const normalizedCode = normalizeShiftTemplateCode(code);
  const normalizedName = normalizeShiftTemplateName(name);

  if (!normalizedCode) {
    throw new createError.BadRequest('code es obligatorio');
  }

  assertValidObjectId(createdBy, 'CreatedBy inválido');

  const existing = await templatesCollection.findOne({
    code: { $regex: `^${normalizedCode}$`, $options: 'i' }
  });

  if (existing) {
    throw new createError.Conflict('Ya existe un turno tipo con ese código');
  }

  const validatedBlocks = validateBlocksStructure(blocks);
  const skillIds = validatedBlocks.map((block) => String(block.skillId));
  const skillsMap = await buildSkillsMapFromIds(skillsCollection, skillIds);

  ensureActiveSkillsOrThrow({ blocks: validatedBlocks, skillsMap });

  validateDayBlocksBusinessRules({
    blocks: validatedBlocks,
    skillsMap,
    allowedSkillsSet: null,
    userName: `Turno tipo ${normalizedCode}`
  });

  const blocksToSave = validatedBlocks.map((block) => ({
    start: block.start,
    end: block.end,
    skillId: new ObjectId(block.skillId)
  }));

  const result = await templatesCollection.insertOne({
    code: normalizedCode,
    name: normalizedName,
    blocks: blocksToSave,
    status: 'active',
    createdBy: new ObjectId(createdBy),
    createdAt: new Date()
  });

  return {
    id: result.insertedId
  };
};

const updateShiftTemplate = async (id, { code, name, blocks, status, updatedBy }) => {
  assertValidObjectId(id, 'ID inválido');
  assertValidObjectId(updatedBy, 'UpdatedBy inválido');

  const templatesCollection = await Database(SHIFT_TEMPLATES_COLLECTION);
  const skillsCollection = await Database(SKILLS_COLLECTION);

  const template = await templatesCollection.findOne({ _id: new ObjectId(id) });
  if (!template) {
    throw new createError.NotFound('Turno tipo no encontrado');
  }

  const updateData = {};

  if (code !== undefined) {
    const normalizedCode = normalizeShiftTemplateCode(code);
    if (!normalizedCode) {
      throw new createError.BadRequest('code es obligatorio');
    }

    const existing = await templatesCollection.findOne({
      _id: { $ne: new ObjectId(id) },
      code: { $regex: `^${normalizedCode}$`, $options: 'i' }
    });

    if (existing) {
      throw new createError.Conflict('Ya existe un turno tipo con ese código');
    }

    updateData.code = normalizedCode;
  }

  if (name !== undefined) {
    updateData.name = normalizeShiftTemplateName(name);
  }

  if (status !== undefined) {
    if (!ALLOWED_SHIFT_TEMPLATE_STATUSES.includes(status)) {
      throw new createError.BadRequest('status inválido, permitido: active | inactive');
    }
    updateData.status = status;
  }

  if (blocks !== undefined) {
    const validatedBlocks = validateBlocksStructure(blocks);
    const skillIds = validatedBlocks.map((block) => String(block.skillId));
    const skillsMap = await buildSkillsMapFromIds(skillsCollection, skillIds);

    ensureActiveSkillsOrThrow({ blocks: validatedBlocks, skillsMap });

    validateDayBlocksBusinessRules({
      blocks: validatedBlocks,
      skillsMap,
      allowedSkillsSet: null,
      userName: updateData.code || template.code
    });

    updateData.blocks = validatedBlocks.map((block) => ({
      start: block.start,
      end: block.end,
      skillId: new ObjectId(block.skillId)
    }));
  }

  updateData.updatedBy = new ObjectId(updatedBy);
  updateData.updatedAt = new Date();

  await templatesCollection.updateOne({ _id: new ObjectId(id) }, { $set: updateData });

  return { updated: true };
};

const bulkAssignShiftTemplate = async ({
  templateId,
  userIds,
  startDate,
  endDate,
  overwriteDraft = false,
  createdBy
}) => {
  assertValidObjectId(templateId, 'templateId inválido');
  assertValidObjectId(createdBy, 'createdBy inválido');

  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new createError.BadRequest('Debe enviar al menos un userId');
  }

  const collection = await Database(COLLECTION);
  const usersCollection = await Database(USERS_COLLECTION);
  const skillsCollection = await Database(SKILLS_COLLECTION);
  const templatesCollection = await Database(SHIFT_TEMPLATES_COLLECTION);

  const uniqueUserIds = [...new Set(userIds.map(String))];
  uniqueUserIds.forEach((id) => assertValidObjectId(id, `userId inválido: ${id}`));

  const targetDates = getDateRangeDays({ startDate, endDate });
  const dateRangeStart = parseStrictISODateOrThrow(targetDates[0]);
  const dateRangeEnd = parseStrictISODateOrThrow(targetDates[targetDates.length - 1]);
  dateRangeEnd.setUTCHours(23, 59, 59, 999);

  const template = await templatesCollection.findOne({ _id: new ObjectId(templateId) });
  if (!template) {
    throw new createError.NotFound('Turno tipo no encontrado');
  }

  if (template.status !== 'active') {
    throw new createError.BadRequest('El turno tipo seleccionado está inactivo');
  }

  const normalizedBlocks = validateBlocksStructure((template.blocks || []).map((block) => ({
    start: block.start,
    end: block.end,
    skillId: String(block.skillId)
  })));

  const blockSkillIds = normalizedBlocks.map((block) => String(block.skillId));
  const skillsMap = await buildSkillsMapFromIds(skillsCollection, blockSkillIds);
  ensureActiveSkillsOrThrow({ blocks: normalizedBlocks, skillsMap });

  const users = await usersCollection.find({
    _id: { $in: uniqueUserIds.map((id) => new ObjectId(id)) }
  }).toArray();

  const usersMap = {};
  users.forEach((user) => {
    usersMap[user._id.toString()] = user;
  });

  const existingSchedules = await collection.find({
    userId: { $in: uniqueUserIds.map((id) => new ObjectId(id)) },
    date: { $gte: dateRangeStart, $lte: dateRangeEnd }
  }).toArray();

  const existingByKey = {};
  existingSchedules.forEach((schedule) => {
    const dayKey = normalizeDate(schedule.date);
    existingByKey[`${schedule.userId.toString()}__${dayKey}`] = schedule;
  });

  const conflicts = [];
  const operations = [];

  for (const rawUserId of uniqueUserIds) {
    const user = usersMap[rawUserId];

    if (!user) {
      conflicts.push({
        userId: rawUserId,
        date: null,
        type: 'user_not_found',
        message: 'El agente no existe'
      });
      continue;
    }

    if (user.status !== 'active' || user.role !== 'agente') {
      conflicts.push({
        userId: rawUserId,
        userName: user.name || 'Sin nombre',
        date: null,
        type: 'user_not_assignable',
        message: 'Solo se pueden asignar turnos a agentes activos'
      });
      continue;
    }

    const allowedSet = new Set((user.allowedSkills || []).map((skillId) => String(skillId)));

    try {
      validateDayBlocksBusinessRules({
        blocks: normalizedBlocks,
        skillsMap,
        allowedSkillsSet: allowedSet,
        userName: user.name || 'Usuario desconocido'
      });
    } catch (error) {
      conflicts.push({
        userId: rawUserId,
        userName: user.name || 'Sin nombre',
        date: null,
        type: 'skills_not_allowed',
        message: error.message
      });
      continue;
    }

    for (const day of targetDates) {
      const existing = existingByKey[`${rawUserId}__${day}`];
      const dateObject = parseStrictISODateOrThrow(day);

      if (!existing) {
        operations.push({
          insertOne: {
            document: {
              userId: new ObjectId(rawUserId),
              date: dateObject,
              blocks: normalizedBlocks.map((block) => ({
                start: block.start,
                end: block.end,
                skillId: new ObjectId(block.skillId)
              })),
              createdBy: new ObjectId(createdBy),
              createdAt: new Date(),
              status: 'borrador',
              templateId: new ObjectId(templateId)
            }
          }
        });
        continue;
      }

      if (existing.status !== 'borrador') {
        conflicts.push({
          userId: rawUserId,
          userName: user.name || 'Sin nombre',
          date: day,
          type: 'status_locked',
          message: `Ya existe un horario en estado ${existing.status}`
        });
        continue;
      }

      if (!overwriteDraft) {
        conflicts.push({
          userId: rawUserId,
          userName: user.name || 'Sin nombre',
          date: day,
          type: 'draft_exists',
          message: 'Ya existe un borrador (activa sobrescribir borradores para reemplazarlo)'
        });
        continue;
      }

      operations.push({
        updateOne: {
          filter: { _id: existing._id },
          update: {
            $set: {
              blocks: normalizedBlocks.map((block) => ({
                start: block.start,
                end: block.end,
                skillId: new ObjectId(block.skillId)
              })),
              templateId: new ObjectId(templateId),
              editedAt: new Date(),
              editedBy: new ObjectId(createdBy)
            }
          }
        }
      });
    }
  }

  if (operations.length) {
    await collection.bulkWrite(operations, { ordered: false });
  }

  const insertedCount = operations.filter((operation) => operation.insertOne).length;
  const updatedCount = operations.filter((operation) => operation.updateOne).length;

  return {
    templateId,
    overwriteDraft,
    range: {
      startDate: targetDates[0],
      endDate: targetDates[targetDates.length - 1],
      totalDays: targetDates.length
    },
    requestedAgents: uniqueUserIds.length,
    assignmentsAttempted: uniqueUserIds.length * targetDates.length,
    insertedCount,
    updatedCount,
    conflictCount: conflicts.length,
    conflicts
  };
};

const create = async (horario) => {
  const collection = await Database(COLLECTION);
  const usersCollection = await Database(USERS_COLLECTION);
  const skillsCollection = await Database(SKILLS_COLLECTION);

  const { userId, date, blocks, createdBy } = horario;

  if (!userId || !date || !blocks) {
    throw new createError.BadRequest('Datos incompletos');
  }

  assertValidObjectId(userId, 'El identificador del horario no es válido');
  assertValidObjectId(createdBy, 'El identificador del horario no es válido');

  const scheduleDate = parseStrictISODateOrThrow(date);

  const startOfDay = new Date(scheduleDate);
  startOfDay.setUTCHours(0, 0, 0, 0);

  const endOfDay = new Date(scheduleDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const exists = await collection.findOne({
    userId: new ObjectId(userId),
    date: { $gte: startOfDay, $lte: endOfDay }
  });

  if (exists) {
    throw new createError.Conflict('Ya existe un horario para ese usuario en esa fecha');
  }

  const user = await usersCollection.findOne({
    _id: new ObjectId(userId),
    status: 'active'
  });

  if (!user) {
    throw new createError.NotFound('Usuario no existe o inactivo');
  }

  const validatedBlocks = validateBlocksStructure(blocks);

  // 🔥 SkillsMap: cargarlas en 1 query (más eficiente)
  const skillIds = validatedBlocks.map((b) => b.skillId.toString());
  const skillsMap = await buildSkillsMapFromIds(skillsCollection, skillIds);

  const allowedSet = new Set((user.allowedSkills || []).map((id) => id.toString()));

  // 🔥 Validaciones día (incluye skill permitida y 4h sin break y rest)
  validateDayBlocksBusinessRules({
    blocks: validatedBlocks,
    skillsMap,
    allowedSkillsSet: allowedSet,
    userName: user.name || 'Usuario desconocido'
  });

  // Convertir skillId a ObjectId (igual que antes)
  const blocksToSave = validatedBlocks.map((b) => ({
    ...b,
    skillId: new ObjectId(b.skillId)
  }));

  const result = await collection.insertOne({
    userId: new ObjectId(userId),
    date: scheduleDate,
    blocks: blocksToSave,
    createdBy: new ObjectId(createdBy),
    createdAt: new Date(),
    status: 'borrador'
  });

  return result.insertedId;
};

const update = async (id, body) => {
  const collection = await Database(COLLECTION);
  const skillsCollection = await Database(SKILLS_COLLECTION);
  const usersCollection = await Database(USERS_COLLECTION);

  assertValidObjectId(id);

  const existing = await collection.findOne({ _id: new ObjectId(id) });
  if (!existing) throw new createError.NotFound('Horario no encontrado');

  if (existing.status === 'archivado') throw new createError.BadRequest('No editable');

  if (body.userId || body.createdBy || body.status) {
    throw new createError.BadRequest('No se permite modificar userId, createdBy o status');
  }

  const updateData = {};

  if (body.date) {
    updateData.date = parseStrictISODateOrThrow(body.date);
  }

  if (body.blocks) {
    const validatedBlocks = validateBlocksStructure(body.blocks);

    // SkillsMap de los bloques del día (1 query)
    const skillIds = validatedBlocks.map((b) => b.skillId.toString());
    const skillsMap = await buildSkillsMapFromIds(skillsCollection, skillIds);

    const user = await usersCollection.findOne({ _id: existing.userId });
    if (!user) {
      throw new createError.NotFound('Usuario asociado al horario no existe');
    }

    const allowedSet = new Set((user.allowedSkills || []).map((skillId) => skillId.toString()));

    // Validación día: rest/absence/break/operative + 4h (sin allowedSkills en update)
    validateDayBlocksBusinessRules({
      blocks: validatedBlocks,
      skillsMap,
      allowedSkillsSet: allowedSet,
      userName: user.name || 'Usuario desconocido'
    });

    // 🔥 VALIDACIÓN SEMANAL SI ESTÁ PUBLICADO
    if (existing.status === 'publicado') {
      const targetDate = updateData.date || existing.date;
      const { weekStart, weekEnd } = getWeekRange(normalizeDate(targetDate));

      const weeklyPublished = await collection
        .find({
          userId: existing.userId,
          status: 'publicado',
          date: { $gte: weekStart, $lte: weekEnd }
        })
        .toArray();

      // SkillsMap para TODA la semana (1 query)
      const weekSkillIds = weeklyPublished.flatMap((s) =>
        (s._id.toString() === id ? validatedBlocks : s.blocks).map((b) => b.skillId.toString())
      );
      const weekSkillsMap = await buildSkillsMapFromIds(skillsCollection, weekSkillIds);

      let totalOperativeMinutes = 0;
      let absenceDays = 0;

      for (const schedule of weeklyPublished) {
        const blocksToUse = schedule._id.toString() === id ? validatedBlocks : schedule.blocks;

        // contar ausencia por DÍA (regla: si existe absence, es bloque único)
        let dayHasAbsence = false;

        for (const b of blocksToUse) {
          const skill = weekSkillsMap[b.skillId.toString()];

          if (!skill) {
            throw new createError.BadRequest('Skill inválida detectada en una semana publicada');
          }

          if (skill.type === 'absence') {
            dayHasAbsence = true;
            continue;
          }

          if (skill.type === 'operative') {
            totalOperativeMinutes += timeToMinutes(b.end) - timeToMinutes(b.start);
          }
          // break/rest no suman
        }

        if (dayHasAbsence) absenceDays += 1;
      }

      // ✅ requerido variable: 44h - 7h por día absence
      const requiredMinutes = WEEKLY_REQUIRED_MINUTES - (absenceDays * 420);

      if (totalOperativeMinutes !== requiredMinutes) {
        throw new createError.BadRequest(
          `No se puede modificar. La semana publicada debe mantener exactamente ${requiredMinutes / 60} horas operativas`
        );
      }
    }

    // Guardar bloques (skillId a ObjectId)
    updateData.blocks = validatedBlocks.map((b) => ({
      ...b,
      skillId: new ObjectId(b.skillId)
    }));
  }

  updateData.updatedAt = new Date();

  await collection.updateOne({ _id: new ObjectId(id) }, { $set: updateData });

  return { updated: true };
};

const publishByDate = async (date) => {
  const collection = await Database(COLLECTION);
  const skillsCollection = await Database(SKILLS_COLLECTION);
  const usersCollection = await Database(USERS_COLLECTION);

  if (!date) throw new createError.BadRequest('Fecha obligatoria');

  const normalizedPublishDate = normalizeDate(date);
  const { weekStart, weekEnd } = getWeekRange(normalizedPublishDate);

  const weeklyDrafts = await collection
    .find({
      status: 'borrador',
      date: { $gte: weekStart, $lte: weekEnd }
    })
    .toArray();

  if (!weeklyDrafts.length) {
    throw new createError.BadRequest('No existen horarios en borrador para esa semana');
  }

  // Agrupar por agente
  const groupedByUser = {};
  for (const schedule of weeklyDrafts) {
    const uid = schedule.userId.toString();
    if (!groupedByUser[uid]) groupedByUser[uid] = [];
    groupedByUser[uid].push(schedule);
  }

  // SkillsMap para toda la semana (1 query)
  const skillIds = weeklyDrafts.flatMap((h) => h.blocks.map((b) => b.skillId.toString()));
  const skillsMap = await buildSkillsMapFromIds(skillsCollection, skillIds);

  // Validaciones por agente
  for (const userId in groupedByUser) {
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    const userName = user?.name || 'Usuario desconocido';
    const schedules = groupedByUser[userId];

    if (schedules.length !== 7) {
      throw new createError.BadRequest(
        `El usuario ${userName} debe tener exactamente 7 días en borrador`
      );
    }

    let totalMinutes = 0;
    let restDayDate = null;
    const uniqueDays = new Set();
    let absenceDays = 0;

    for (const h of schedules) {
      const dayKey = new Date(h.date).toISOString().split('T')[0];

      if (uniqueDays.has(dayKey)) {
        throw new createError.BadRequest(
          `El usuario ${userName} tiene múltiples horarios el día ${dayKey}`
        );
      }

      uniqueDays.add(dayKey);

      let hasRest = false;
      let hasAbsence = false;

      for (const b of h.blocks) {
        const skill = skillsMap[b.skillId.toString()];

        if (!skill) {
          throw new createError.BadRequest(
            `Skill inválida detectada en horario del usuario ${userName}`
          );
        }

        // ✅ REST (solo)
        if (skill.type === 'rest') {
          if (hasRest) {
            throw new createError.BadRequest(
              `El usuario ${userName} tiene múltiples bloques de descanso el día ${dayKey}`
            );
          }

          if (h.blocks.length !== 1) {
            throw new createError.BadRequest(
              `El descanso del usuario ${userName} debe ser un único bloque el día ${dayKey}`
            );
          }

          if (b.start !== '08:00' || b.end !== '21:00') {
            throw new createError.BadRequest(
              `El descanso del usuario ${userName} debe cubrir 08:00 - 21:00`
            );
          }

          hasRest = true;
          restDayDate = new Date(h.date);
          continue;
        }

        // ✅ ABSENCE (solo)
        if (skill.type === 'absence') {
          if (hasAbsence) {
            throw new createError.BadRequest(
              `El usuario ${userName} tiene múltiples bloques de ausencia el día ${dayKey}`
            );
          }

          if (h.blocks.length !== 1) {
            throw new createError.BadRequest(
              `La ausencia del usuario ${userName} debe ser un único bloque el día ${dayKey}`
            );
          }

          if (b.start !== '08:00' || b.end !== '21:00') {
            throw new createError.BadRequest(
              `La ausencia del usuario ${userName} debe cubrir 08:00 - 21:00`
            );
          }

          hasAbsence = true;
          absenceDays += 1;
          continue;
        }

        // ⏱ Sumar solo operativas (ni break ni rest ni absence)
        if (skill.type === 'operative') {
          totalMinutes += timeToMinutes(b.end) - timeToMinutes(b.start);
          continue;
        }

        if (skill.type === 'break') {
          continue; // no suma, pero es válido
        }

        throw new createError.BadRequest(
          `Tipo de skill no soportado en publishByDate: ${skill.type}`
        );
      }
    }

    if (!restDayDate) {
      throw new createError.BadRequest(
        `El usuario ${userName} no tiene su día de descanso semanal obligatorio`
      );
    }

    const requiredMinutes = WEEKLY_REQUIRED_MINUTES - (absenceDays * 420);

    if (totalMinutes !== requiredMinutes) {
      throw new createError.BadRequest(
        `El usuario ${userName} tiene ${totalMinutes / 60} horas. Debe tener exactamente ${requiredMinutes / 60} horas operativas`
      );
    }

    // ✅ FIX QUIRÚRGICO: Regla 3–9 días entre descansos
    // (Antes usabas skillsMap de la semana actual; eso puede NO contener la skill REST de semanas anteriores)
    const previousSchedules = await collection
      .find({
        userId: new ObjectId(userId),
        status: { $in: ['publicado', 'archivado'] },
        date: { $lt: restDayDate }
      })
      .sort({ date: -1 })
      .toArray();

    let lastRestDate = null;

    // Cargar skills históricas (1 query)
    const prevSkillIds = previousSchedules.flatMap((s) =>
      (s.blocks || []).map((b) => b.skillId.toString())
    );

    const prevSkillsMap = prevSkillIds.length
      ? await buildSkillsMapFromIds(skillsCollection, prevSkillIds)
      : {};

    for (const schedule of previousSchedules) {
      for (const b of schedule.blocks) {
        const skill = prevSkillsMap[b.skillId.toString()];
        if (skill && skill.type === 'rest') {
          lastRestDate = new Date(schedule.date);
          break;
        }
      }
      if (lastRestDate) break;
    }

    if (lastRestDate) {
      const diffDays = Math.floor(
        (restDayDate - lastRestDate) / (1000 * 60 * 60 * 24)
      );

      if (diffDays < 3 || diffDays > 9) {
        throw new createError.BadRequest(
          `El descanso del usuario ${userName} incumple la regla de 3 a 9 días entre descansos`
        );
      }
    }

    const today = normalizeDate(new Date());
    const { weekStart: currentWeekStart } = getWeekRange(today);

    // Archivar semanas publicadas antiguas de este agente.
    // Se conserva la semana actual en curso para que el agente no pierda visibilidad
    // cuando se publica anticipadamente la próxima semana.

    await collection.updateMany(
      {
        userId: new ObjectId(userId),
        status: 'publicado',
        date: { $lt: currentWeekStart }
      },
      { $set: { status: 'archivado', archivedAt: new Date() } }
    );
  }

  // Publicar nueva semana (todos los borradores)
  const result = await collection.updateMany(
    { status: 'borrador', date: { $gte: weekStart, $lte: weekEnd } },
    { $set: { status: 'publicado', publishedAt: new Date() } }
  );

  return {
    week: { from: weekStart, to: weekEnd },
    totalUsersValidated: Object.keys(groupedByUser).length,
    totalDocumentsPublished: result.modifiedCount
  };
};

const validateAndPrepareWeekSchedules = async ({
  schedules,
  userId,
  weekStart,
  weekEnd,
  collection,
  skillsCollection,
  usersCollection,
  existingMap
}) => {

  const userData = await usersCollection.findOne({ _id: new ObjectId(userId) });
  const userName = userData?.name || 'Usuario desconocido';
  const allowedSet = new Set((Array.isArray(userData?.allowedSkills) ? userData.allowedSkills : []).map((skillId) => skillId.toString()));

  const allSkillIds = schedules.flatMap((d) => (d.blocks || []).map((b) => b.skillId?.toString()));
  const skillsMap = await buildSkillsMapFromIds(skillsCollection, allSkillIds.filter(Boolean));

  let totalMinutes = 0;
  let restDayDate = null;
  const uniqueDays = new Set();
  let absenceDays = 0;

  const normalizedSchedules = [];

  for (const day of schedules) {
    assertValidObjectId(day.id, `El identificador ${day.id} no es válido`);

    if (!existingMap[day.id]) {
      throw new createError.BadRequest(
        `El identificador ${day.id} no pertenece a la semana seleccionada del agente o no existe`
      );
    }

    const scheduleDate = parseStrictISODateOrThrow(day.date);
    const dayKey = normalizeDate(scheduleDate);

    const originalDate = existingMap[day.id];
    if (originalDate !== dayKey) {
      throw new createError.BadRequest(
        `El identificador ${day.id} corresponde a la fecha ${originalDate} y no puede reasignarse a ${dayKey}`
      );
    }
  
  
    if (uniqueDays.has(dayKey)) {
      throw new createError.BadRequest(`Error semanal: día duplicado en la semana (${dayKey})`)
    }
    uniqueDays.add(dayKey);

    let validatedBlocks;

    try {
      validatedBlocks = validateBlocksStructure(day.blocks);
    } catch (error) {
      throw new createError.BadRequest(`Error diario en ${dayKey}: ${error.message}`);
    }

    
    try {
      validateDayBlocksBusinessRules({
        blocks: validatedBlocks,
        skillsMap,
        allowedSkillsSet: allowedSet,
        userName
      });
    } catch (error) {
      throw new createError.BadRequest(`Error diario en ${dayKey}: ${error.message}`);
    }

    for (const block of validatedBlocks) {
      const skill = getSkillFromMapOrThrow(
        skillsMap,
        block.skillId,
        `Error diario en ${dayKey}: una de las habilidades asignadas no existe o está inactiva`
      );

      const duration = timeToMinutes(block.end) - timeToMinutes(block.start);

      if (skill.type === 'rest') {
        restDayDate = scheduleDate;
      } else if (skill.type === 'operative') {
        totalMinutes += duration;
      }

      if (skill.type === 'absence') {

        absenceDays += 1;
      }
    }
    
    normalizedSchedules.push({
      ...day,
      date: scheduleDate,
      blocks: validatedBlocks
    });
  }
  
  if (!restDayDate) {
    throw new createError.BadRequest(
      `Error semanal: el usuario ${userName} no tiene su día de descanso semanal obligatorio`
    );
  }

  const requiredMinutes = WEEKLY_REQUIRED_MINUTES - (absenceDays * 420);

  if (totalMinutes !== requiredMinutes) {
    throw new createError.BadRequest(
      `Error semanal: la semana del agente ${userName} tiene ${totalMinutes / 60} horas operativas. Debe tener exactamente ${requiredMinutes / 60} horas`
    );
  }

  const previousRest = await collection
    .find({
      userId: new ObjectId(userId),
      status: { $in: ['publicado', 'archivado'] },
      date: { $lt: weekStart }
    })
    .sort({ date: -1 })
    .toArray();

  let lastRestDate = null;

  const prevSkillIds = previousRest.flatMap((s) => s.blocks.map((b) => b.skillId.toString()));
  const prevSkillsMap = prevSkillIds.length
    ? await buildSkillsMapFromIds(skillsCollection, prevSkillIds)
    : {};

  for (const schedule of previousRest) {
    for (const b of schedule.blocks) {
      const skill = prevSkillsMap[b.skillId.toString()];
      if (skill && skill.type === 'rest') {
        lastRestDate = new Date(schedule.date);
        break;
      }
    }
    if (lastRestDate) break;
  }

  if (lastRestDate) {
    const diffDays = Math.floor((restDayDate - lastRestDate) / (1000 * 60 * 60 * 24));
    if (diffDays < 3 || diffDays > 9) {
      throw new createError.BadRequest(
        `Error semanal: el descanso del agente ${userName} incumple la regla de 3 a 9 días entre descansos`
      );
    }
  }
  
    return normalizedSchedules;
};

const editWeek = async ({ userId, date, status = 'publicado', mode = 'week', schedule, schedules, editedBy }) => {
  const collection = await Database(COLLECTION);
  const skillsCollection = await Database(SKILLS_COLLECTION);
  const usersCollection = await Database(USERS_COLLECTION);

  assertValidObjectId(userId, 'UserId inválido');
  assertValidObjectId(editedBy, 'EditedBy inválido');

  if (!ALLOWED_EDITABLE_STATUSES.includes(status)) {
    throw new createError.BadRequest('status inválido, valores permitidos: borrador | publicado');
  }

  if (!ALLOWED_EDIT_MODES.includes(mode)) {
    throw new createError.BadRequest('mode inválido, valores permitidos: day | week');
  }

  if (!date) {
    throw new createError.BadRequest('date es obligatorio');
  }

  const normalizedWeekDate = normalizeDate(date);
  const { weekStart, weekEnd } = getWeekRange(normalizedWeekDate);

  const existingWeek = await collection
    .find({
      userId: new ObjectId(userId),
      status,
      date: { $gte: weekStart, $lte: weekEnd }
    })
    .toArray();

  if (!existingWeek.length) {
    throw new createError.BadRequest(`No existe una semana ${status} para ese agente y fecha`);
  }

  const existingMap = {};
  existingWeek.forEach((doc) => {
    existingMap[doc._id.toString()] = normalizeDate(doc.date);
  });

  if (mode === 'day') {
    if (!schedule || !schedule.id || !schedule.date || !Array.isArray(schedule.blocks)) {
      throw new createError.BadRequest('Para edición diaria debe enviar schedule con id, date y blocks');
    }

    assertValidObjectId(schedule.id, `El identificador ${schedule.id} no es válido`);

    if (!existingMap[schedule.id]) {
      throw new createError.BadRequest(`El identificador ${schedule.id} no pertenece a la semana ${status} seleccionada`);
    }

    const dayKey = normalizeDate(schedule.date);
    if (existingMap[schedule.id] !== dayKey) {
      throw new createError.BadRequest(
        `Error diario en ${dayKey}: el identificador ${schedule.id} corresponde a ${existingMap[schedule.id]} y no puede reasignarse`
      );
    }

    const userData = await usersCollection.findOne({ _id: new ObjectId(userId) });
    const userName = userData?.name || 'Usuario desconocido';
    const allowedSet = new Set((Array.isArray(userData?.allowedSkills) ? userData.allowedSkills : []).map((skillId) => skillId.toString()));

    let validatedBlocks;
    try {
      validatedBlocks = validateBlocksStructure(schedule.blocks);
    } catch (error) {
      throw new createError.BadRequest(`Error diario en ${dayKey}: ${error.message}`);
    }

    const skillIds = validatedBlocks.map((b) => String(b.skillId));
    const skillsMap = await buildSkillsMapFromIds(skillsCollection, skillIds);

    try {
      validateDayBlocksBusinessRules({
        blocks: validatedBlocks,
        skillsMap,
        allowedSkillsSet: allowedSet,
        userName
      });
    } catch (error) {
      throw new createError.BadRequest(`Error diario en ${dayKey}: ${error.message}`);
    }


    await collection.updateOne(
      { _id: new ObjectId(schedule.id), userId: new ObjectId(userId), status },
      {
        $set: {
          blocks: validatedBlocks.map((b) => ({ ...b, skillId: new ObjectId(b.skillId) })),
          editedAt: new Date(),
          editedBy: new ObjectId(editedBy)
        }
      }
    );

    return { edited: true, mode, status, updatedDays: 1 };
  }

  if (!Array.isArray(schedules) || schedules.length !== 7) {
    throw new createError.BadRequest('Para edición semanal debe enviar exactamente los 7 días de la semana');
  }

  if (existingWeek.length !== 7) {
    throw new createError.BadRequest(`La semana ${status} está incompleta y no puede editarse en modo semanal`);
  }

  const normalizedSchedules = await validateAndPrepareWeekSchedules({
    schedules,
    userId,
    weekStart,
    weekEnd,
    collection,
    skillsCollection,
    usersCollection,
    existingMap
  });

  for (const day of normalizedSchedules) {
    await collection.updateOne(
      { _id: new ObjectId(day.id), userId: new ObjectId(userId), status },
      {
        $set: {
          date: day.date,
          blocks: day.blocks.map((b) => ({
            start: b.start,
            end: b.end,
            skillId: new ObjectId(b.skillId)
          })),
          editedAt: new Date(),
          editedBy: new ObjectId(editedBy)
        }
      }
    );
  }

  return { edited: true, mode, status, updatedDays: normalizedSchedules.length };
};

const editPublishedWeek = async ({ userId, date, schedules, editedBy }) => {
  return editWeek({
    userId,
    date,
    status: 'publicado',
    mode: 'week',
    schedules,
    editedBy
  });
};

module.exports.HorariosService = {
  getShiftTemplates,
  getAll,
  getById,
  getByUserId,
  getPublishedByUserId,
  getSchedulesByDate,
  getPublishedWeekByUser,
  getWeekByUser,
  getPublishedWeekAllAgents,
  getStaffingTableByDate,
  getWeeklyHoursReport,
  getDailyOperativeHoursReport,
  createShiftTemplate,
  updateShiftTemplate,
  bulkAssignShiftTemplate,
  create,
  update,
  publishByDate,
  editPublishedWeek,
  editWeek
};

module.exports.HorariosServiceInternals = {
  parseStrictISODateOrThrow,
  validateBlocksStructure,
  resolveStatusesFromMode,
  normalizePagination
};
