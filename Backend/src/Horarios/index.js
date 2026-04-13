const express = require('express');
const { HorariosController } = require('./controller');

const { AuthMiddleware } = require('../middlewares/authMiddleware');
const { RoleMiddleware } = require('../middlewares/roleMiddleware');
const { ActiveUserMiddleware } = require('../middlewares/activeMiddleware');
const { HorariosRateLimiters } = require('../middlewares/rateLimitMiddleware');
const { validateRequest } = require('../middlewares/validateMiddleware');
const { horariosSchemas } = require('../validation/schemas');

const router = express.Router();

module.exports.HorariosAPI = (app) => {

  // 📌 ADMIN - turnos tipo reutilizables
  router.get(
    '/turnos-tipo',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    validateRequest({ query: horariosSchemas.shiftTemplatesQuery }),
    HorariosController.getShiftTemplates
  );

  router.post(
    '/turnos-tipo',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    validateRequest({ body: horariosSchemas.shiftTemplateCreate }),
    HorariosController.createShiftTemplate
  );

  router.patch(
    '/turnos-tipo/:id',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    validateRequest({ params: horariosSchemas.idParam, body: horariosSchemas.shiftTemplateUpdate }),
    HorariosController.updateShiftTemplate
  );

  router.post(
    '/asignacion-masiva',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    validateRequest({ body: horariosSchemas.bulkAssignShiftTemplate }),
    HorariosController.bulkAssignShiftTemplate
  );

  // 📌 ADMIN - ver horarios de un día (publicados y/o borradores)
  router.get(
    '/dia',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    validateRequest({ query: horariosSchemas.byDateQuery }),
    HorariosController.getHorariosByDate
  );

  // 📌 ADMIN - ver semana publicada por agente
  router.get(
    '/semana-publicada/usuario/:userId',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    validateRequest({ params: horariosSchemas.userIdParam, query: horariosSchemas.publishedWeekAllQuery }),
    HorariosController.getPublishedWeekByUser
  );

   // 📌 ADMIN - ver semana por agente y estado (borrador/publicado)
  router.get(
    '/semana/usuario/:userId',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    validateRequest({ params: horariosSchemas.userIdParam, query: horariosSchemas.weekByUserQuery }),
    HorariosController.getWeekByUser
  );

  // 📌 ADMIN - ver semana publicada de todos los agentes
  router.get(
    '/semana-publicada',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    validateRequest({ query: horariosSchemas.publishedWeekAllQuery }),
    HorariosController.getPublishedWeekAllAgents
  );

  // 📌 ADMIN - tabla visual de agentes por hora y skill
  router.get(
    '/dotacion/dia',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    HorariosRateLimiters.intensiveReports,
    validateRequest({ query: horariosSchemas.reportQuery }),
    HorariosController.getStaffingTableByDate
  );

   // 📌 ADMIN - reporte semanal de horas por agente y skill
  router.get(
    '/reporte/horas-semana',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    validateRequest({ query: horariosSchemas.reportQuery }),
    HorariosController.getWeeklyHoursReport
  );

  // 📌 ADMIN - descargar Excel de horas operativas planificadas por agente/día
  router.get(
    '/reporte/horas-operativas-diarias',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    validateRequest({ query: horariosSchemas.reportQuery }),
    HorariosController.getDailyOperativeHoursReport
  );

  router.get(
    '/reporte/horas-operativas-diarias/excel',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    HorariosRateLimiters.intensiveReports,
    validateRequest({ query: horariosSchemas.reportQuery }),
    HorariosController.downloadDailyOperativeHoursExcel
  );

  // 📌 AGENTE - ver solo sus horarios PUBLICADOS
  router.get(
    '/mi-horario',
    AuthMiddleware,
    ActiveUserMiddleware,
    RoleMiddleware(['agente']),
    HorariosController.getMyHorarios
  );

  // 📌 ADMIN - publicar horarios por fecha
  router.post(
    '/publicar',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    validateRequest({ body: horariosSchemas.publishByDate }),
    HorariosController.publishByDate
  );

  // 📌 ADMIN - editar semana ya publicada
  router.patch(
    '/editar-semana-publicada',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    validateRequest({ body: horariosSchemas.editPublishedWeek }),
    HorariosController.editPublishedWeek
  );
  
  // 📌 ADMIN - editar semana o día por estado (borrador/publicado)
  router.patch(
    '/editar-semana',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    validateRequest({ body: horariosSchemas.editWeek }),
    HorariosController.editWeek
  );

  // 📌 ADMIN - ver horarios por userId
  router.get(
    '/usuario/:userId',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    validateRequest({ params: horariosSchemas.userIdParam }),
    HorariosController.getHorariosByUser
  );

  // 📌 ADMIN - ver todos
  router.get(
    '/',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    validateRequest({ query: horariosSchemas.listQuery }),
    HorariosController.getHorarios
  );

  // 📌 ADMIN - ver por id
  router.get(
    '/:id',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    validateRequest({ params: horariosSchemas.idParam }),
    HorariosController.getHorario
  );

  // 📌 ADMIN - crear
  router.post(
    '/',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    validateRequest({ body: horariosSchemas.create }),
    HorariosController.createHorario
  );

  // 📌 ADMIN - actualizar
  router.patch(
    '/:id',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    validateRequest({ params: horariosSchemas.idParam, body: horariosSchemas.update }),
    HorariosController.updateHorario
  );

  app.use('/api/horarios', router);
};