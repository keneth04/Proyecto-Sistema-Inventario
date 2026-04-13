const { HorariosService } = require('./services');
const { Response } = require('../common/response');
const excel = require('excel4node');

module.exports.HorariosController = {

  getShiftTemplates: async (req, res, next) => {
    try {
      const result = await HorariosService.getShiftTemplates(req.query);
      Response.success(res, 200, 'Turnos tipo', result);
    } catch (error) {
      next(error);
    }
  },

  createShiftTemplate: async (req, res, next) => {
    try {
      const result = await HorariosService.createShiftTemplate({
        ...req.body,
        createdBy: req.user.id
      });
      Response.success(res, 201, 'Turno tipo creado correctamente', result);
    } catch (error) {
      next(error);
    }
  },

  updateShiftTemplate: async (req, res, next) => {
    try {
      const result = await HorariosService.updateShiftTemplate(req.params.id, {
        ...req.body,
        updatedBy: req.user.id
      });
      Response.success(res, 200, 'Turno tipo actualizado correctamente', result);
    } catch (error) {
      next(error);
    }
  },

  bulkAssignShiftTemplate: async (req, res, next) => {
    try {
      const result = await HorariosService.bulkAssignShiftTemplate({
        ...req.body,
        createdBy: req.user.id
      });
      Response.success(res, 200, 'Asignación masiva ejecutada', result);
    } catch (error) {
      next(error);
    }
  },

  getHorariosByDate: async (req, res, next) => {
    try {
      const { date, statuses } = req.query;
      const parsedStatuses = statuses
        ? String(statuses).split(',').map((s) => s.trim()).filter(Boolean)
        : undefined;

      const horarios = await HorariosService.getSchedulesByDate({
        date,
        statuses: parsedStatuses
      });

      Response.success(res, 200, 'Horarios del día', horarios);
    } catch (error) {
      next(error);
    }
  },

  getHorarios: async (req, res, next) => {
    try {
      const result = await HorariosService.getAll(req.query);
      Response.success(res, 200, 'Lista de horarios', result);
    } catch (error) {
      next(error);
    }
  },

  getHorario: async (req, res, next) => {
    try {
      const { id } = req.params;
      const horario = await HorariosService.getById(id);
      Response.success(res, 200, 'Horario encontrado', horario);
    } catch (error) {
      next(error);
    }
  },

  getHorariosByUser: async (req, res, next) => {
    try {
      const { userId } = req.params;
      const horarios = await HorariosService.getByUserId(userId);
      Response.success(res, 200, 'Horarios del usuario', horarios);
    } catch (error) {
      next(error);
    }
  },

  getMyHorarios: async (req, res, next) => {
    try {
      const userId = req.user.id.toString();
      const horarios = await HorariosService.getPublishedByUserId(userId);
      Response.success(res, 200, 'Mis horarios vigentes y próximos publicados', horarios);
    } catch (error) {
      next(error);
    }
  },

  getPublishedWeekByUser: async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { date } = req.query;

      const week = await HorariosService.getPublishedWeekByUser({ userId, date });
      Response.success(res, 200, 'Semana publicada del agente', week);
    } catch (error) {
      next(error);
    }
  },

  getWeekByUser: async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { date, status } = req.query;

      const week = await HorariosService.getWeekByUser({ userId, date, status });
      Response.success(res, 200, 'Semana del agente', week);
    } catch (error) {
      next(error);
    }
  },

  getPublishedWeekAllAgents: async (req, res, next) => {
    try {
      const { date } = req.query;
      const week = await HorariosService.getPublishedWeekAllAgents({ date });
      Response.success(res, 200, 'Semana publicada de todos los agentes', week);
    } catch (error) {
      next(error);
    }
  },

  getStaffingTableByDate: async (req, res, next) => {
    try {
      const { date, statuses, mode, campaign } = req.query;
      const parsedStatuses = statuses
        ? String(statuses).split(',').map((s) => s.trim()).filter(Boolean)
        : undefined;

      const table = await HorariosService.getStaffingTableByDate({
        date,
        statuses: parsedStatuses,
        mode,
        campaign
      });

      Response.success(res, 200, 'Tabla de dotación por hora y skill', table);
    } catch (error) {
      next(error);
    }
  },

  
  getWeeklyHoursReport: async (req, res, next) => {
    try {
      const { date, statuses, mode, campaign } = req.query;
      const parsedStatuses = statuses
        ? String(statuses).split(',').map((s) => s.trim()).filter(Boolean)
        : undefined;

      const report = await HorariosService.getWeeklyHoursReport({
        date,
        statuses: parsedStatuses,
        mode,
        campaign
      });

      Response.success(res, 200, 'Reporte semanal de horas por agente y skill', report);
    } catch (error) {
      next(error);
    }
  },

  getDailyOperativeHoursReport: async (req, res, next) => {
    try {
      const { date, statuses, mode, campaign } = req.query;
      const parsedStatuses = statuses
        ? String(statuses).split(',').map((status) => status.trim()).filter(Boolean)
        : undefined;

      const report = await HorariosService.getDailyOperativeHoursReport({
        date,
        statuses: parsedStatuses,
        mode,
        campaign
      });

      Response.success(res, 200, 'Reporte diario de horas operativas por agente', report);
    } catch (error) {
      next(error);
    }
  },

  downloadDailyOperativeHoursExcel: async (req, res, next) => {
    try {
      const { date, statuses, mode, campaign } = req.query;
      const parsedStatuses = statuses
        ? String(statuses).split(',').map((status) => status.trim()).filter(Boolean)
        : undefined;

      const report = await HorariosService.getDailyOperativeHoursReport({
        date,
        statuses: parsedStatuses,
        mode,
        campaign
      });

      const workbook = new excel.Workbook();
      const worksheet = workbook.addWorksheet('Horas operativas');

      const headerStyle = workbook.createStyle({
        font: {
          bold: true,
          color: '#FFFFFF'
        },
        fill: {
          type: 'pattern',
          patternType: 'solid',
          fgColor: '#4F46E5'
        },
        alignment: {
          horizontal: 'center',
          vertical: 'center'
        }
      });

      const dataStyle = workbook.createStyle({
        alignment: {
          horizontal: 'left',
          vertical: 'center'
        }
      });

      const hoursStyle = workbook.createStyle({
        numberFormat: '#,##0.00',
        alignment: {
          horizontal: 'right',
          vertical: 'center'
        }
      });

      const columns = [
        { header: 'Agente', width: 34 },
        { header: 'Fecha', width: 18 },
        { header: 'Horas operativas planificadas', width: 34 }
      ];

      columns.forEach((column, index) => {
        worksheet.cell(1, index + 1).string(column.header).style(headerStyle);
        worksheet.column(index + 1).setWidth(column.width);
      });

      report.rows.forEach((row, index) => {
        const line = index + 2;
        worksheet.cell(line, 1).string(row.agentName).style(dataStyle);
        worksheet.cell(line, 2).string(row.date.replaceAll('-', '/')).style(dataStyle);
        worksheet.cell(line, 3).number(row.operativeHours).style(hoursStyle);
      });

      const generatedAt = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `reporte-horas-operativas-${generatedAt}.xlsx`;
      const buffer = await workbook.writeToBuffer();

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Cache-Control', 'no-store');

      res.status(200).send(buffer);
    } catch (error) {
      next(error);
    }
  },

  createHorario: async (req, res, next) => {
    try {
      const horarioData = {
        ...req.body,
        createdBy: req.user.id
      };

      const insertedId = await HorariosService.create(horarioData);

      Response.success(res, 201, 'Horario creado como borrador', {
        id: insertedId
      });
    } catch (error) {
      next(error);
    }
  },

  updateHorario: async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await HorariosService.update(id, req.body);
      Response.success(res, 200, 'Horario actualizado correctamente', result);
    } catch (error) {
      next(error);
    }
  },

  publishByDate: async (req, res, next) => {
    try {
      const { date } = req.body;
      const result = await HorariosService.publishByDate(date);
      Response.success(res, 200, 'Horarios publicados correctamente', result);
    } catch (error) {
      next(error);
    }
  },

  editPublishedWeek: async (req, res, next) => {
    try {
      const result = await HorariosService.editPublishedWeek({
        ...req.body,
        editedBy: req.user.id
      });

      Response.success(res, 200, 'Semana publicada editada correctamente', result);
    } catch (error) {
      next(error);
    }
  },

    editWeek: async (req, res, next) => {
    try {
      const result = await HorariosService.editWeek({
        ...req.body,
        editedBy: req.user.id
      });

      Response.success(res, 200, 'Semana editada correctamente', result);
    } catch (error) {
      next(error);
    }
  }
};
