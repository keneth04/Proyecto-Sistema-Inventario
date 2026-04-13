import { useEffect, useMemo, useState } from 'react';
import { HorariosApi, SkillsApi, UsersApi } from '../../api/endpoints';
import { useToast } from '../../components/Toast';
import { getErrorMessage, isValidHour } from '../../utils/helpers';
import { buildAllowedSkillsSet, getAllowedSkillsForUser } from '../../utils/skills';

const EMPTY_BLOCK = { start: '08:00', end: '09:00', skillId: '' };

const STATUS_OPTIONS = [
  { value: 'publicado', label: 'Publicado' },
  { value: 'borrador', label: 'Borrador' }
];

const EDIT_MODE_OPTIONS = [
  { value: 'week', label: 'Semana completa' },
  { value: 'day', label: 'Un solo día' }
];
const timeToMinutes = (time) => {
  const [hour, minute] = String(time || '00:00').split(':').map(Number);
  return (hour * 60) + minute;
};

const buildHourSlotsFromBlocks = (blocks = []) => {
  const slots = [];

  blocks.forEach((block) => {
    if (!block?.start || !block?.end || !block?.skillId) return;

    const startHour = Math.floor(timeToMinutes(block.start) / 60);
    const endHourExclusive = Math.ceil(timeToMinutes(block.end) / 60);

    for (let hour = startHour; hour < endHourExclusive; hour += 1) {
      slots.push({
        hour,
        skillId: String(block.skillId)
      });
    }
  });

  return slots;
};

const hourLabel = (hour) => `${String(hour).padStart(2, '0')}:00`;
const formatSignedValue = (value) => (value > 0 ? `+${value}` : `${value}`);

export default function EditPublishedWeekPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [users, setUsers] = useState([]);
  const [skills, setSkills] = useState([]);
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState('publicado');
  const [editMode, setEditMode] = useState('week');
  const [selectedDayId, setSelectedDayId] = useState('');
  const [week, setWeek] = useState([]);
  const [sourceWeek, setSourceWeek] = useState([]);
  const [daySchedules, setDaySchedules] = useState([]);
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [coverageTargets, setCoverageTargets] = useState({});
  const { push } = useToast();

  const selectedUser = useMemo(
    () => users.find((user) => String(user._id) === String(userId)) || null,
    [users, userId]
  );

  const availableSkills = useMemo(() => (
    getAllowedSkillsForUser({ skills, user: selectedUser })
  ), [skills, selectedUser]);

  const availableSkillIds = useMemo(() => buildAllowedSkillsSet(availableSkills), [availableSkills]);
  
  const selectedDay = useMemo(
    () => week.find((day) => String(day.id) === String(selectedDayId)) || null,
    [week, selectedDayId]
  );

  const selectedDaySource = useMemo(
    () => sourceWeek.find((day) => String(day.id) === String(selectedDayId)) || null,
    [sourceWeek, selectedDayId]
  );

  const skillsById = useMemo(() => skills.reduce((acc, skill) => {
    acc[String(skill._id)] = skill;
    return acc;
  }, {}), [skills]);

  useEffect(() => {
    Promise.all([
      UsersApi.agents({ status: 'active', fields: '_id,name,campaign,allowedSkills' }),
      SkillsApi.list({ page: 1, limit: 100, status: 'active' })
    ]).then(([u, s]) => {
      const agents = Array.isArray(u?.data?.body?.items) ? u.data.body.items : [];
      setUsers(agents);
      setUserId(agents[0]?._id || '');
      setSkills(Array.isArray(s?.data?.body?.items) ? s.data.body.items : []);
    }).catch((error) => push(getErrorMessage(error), 'error'));
  }, [push]);

  useEffect(() => {
    if (!selectedUser) return;

    setWeek((prev) => prev.map((day) => ({
      ...day,
      blocks: day.blocks.map((block) => {
        if (!block.skillId) return block;
        if (availableSkillIds.has(String(block.skillId))) return block;

        return { ...block, skillId: '' };
      })
    })));
  }, [availableSkillIds, selectedUser]);
  
  useEffect(() => {
    if (!week.length) {
      setSelectedDayId('');
      return;
    }

    if (!selectedDayId || !week.some((day) => String(day.id) === String(selectedDayId))) {
      setSelectedDayId(week[0].id);
    }
  }, [week, selectedDayId]);

  useEffect(() => {
    if (!selectedDay?.date || !status) {
      setDaySchedules([]);
      return;
    }

    const loadDaySchedules = async () => {
      setCoverageLoading(true);
      try {
        const res = await HorariosApi.byDay({
          date: selectedDay.date,
          statuses: [status]
        });
        setDaySchedules(res?.data?.body || []);
      } catch (error) {
        setDaySchedules([]);
        push(getErrorMessage(error), 'error');
      } finally {
        setCoverageLoading(false);
      }
    };

    loadDaySchedules();
  }, [selectedDay?.date, status, push]);


  const load = async () => {
    try {
      const res = await HorariosApi.weekByUserWithStatus({ userId, date, status });
      const schedules = res.data.body.schedules.map((day) => ({
        id: day._id,
        date: new Date(day.date).toISOString().slice(0, 10),
        blocks: day.blocks.map((b) => ({ start: b.start, end: b.end, skillId: b.skill?._id || '' }))
      }));
      setWeek(schedules);
      setSourceWeek(JSON.parse(JSON.stringify(schedules)));
      setCoverageTargets({});
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  const updateBlock = (dayIndex, blockIndex, field, value) => {
    setWeek((prev) => prev.map((d, i) => i !== dayIndex ? d : {
      ...d,
      blocks: d.blocks.map((b, bi) => bi !== blockIndex ? b : { ...b, [field]: value })
    }));
  };

  const addBlock = (dayIndex) => {
    setWeek((prev) => prev.map((d, i) => i !== dayIndex ? d : {
      ...d,
      blocks: [...d.blocks, { ...EMPTY_BLOCK }]
    }));
  };

  const removeBlock = (dayIndex, blockIndex) => {
    setWeek((prev) => prev.map((d, i) => {
      if (i !== dayIndex) return d;

      return {
        ...d,
        blocks: d.blocks.filter((_, bi) => bi !== blockIndex)
      };
    }));
  };

  const getSkillName = (skillId) => skillsById[String(skillId)]?.name || String(skillId);
const coverageByHourAndSkill = useMemo(() => {
    const baseCoverage = {};
    const candidatesBySlot = {};
    const selectedUserId = String(userId);
    const selectedUserOriginalSlots = buildHourSlotsFromBlocks(selectedDaySource?.blocks || []);
    const selectedUserEditedSlots = buildHourSlotsFromBlocks(selectedDay?.blocks || []);

    const addCoverage = (bucket, hour, skillId, delta) => {
      if (!bucket[hour]) bucket[hour] = {};
      if (!bucket[hour][skillId]) bucket[hour][skillId] = 0;
      bucket[hour][skillId] += delta;
    };

    daySchedules.forEach((schedule) => {
      const scheduleUserId = String(schedule.userId || schedule.user?._id || '');
      if (!scheduleUserId || scheduleUserId === selectedUserId) return;

      const userBlocks = (schedule.blocks || []).map((block) => ({
        start: block.start,
        end: block.end,
        skillId: block.skill?._id || block.skillId || ''
      }));

      buildHourSlotsFromBlocks(userBlocks).forEach((slot) => {
        addCoverage(baseCoverage, slot.hour, slot.skillId, 1);
      });
    });

    selectedUserOriginalSlots.forEach((slot) => {
      addCoverage(baseCoverage, slot.hour, slot.skillId, 1);
    });

    const projectedCoverage = JSON.parse(JSON.stringify(baseCoverage));
    selectedUserOriginalSlots.forEach((slot) => addCoverage(projectedCoverage, slot.hour, slot.skillId, -1));
    selectedUserEditedSlots.forEach((slot) => addCoverage(projectedCoverage, slot.hour, slot.skillId, 1));

    const skillIds = new Set();
    const hours = new Set();

    const collectKeys = (coverage) => {
      Object.entries(coverage).forEach(([hour, bySkill]) => {
        hours.add(Number(hour));
        Object.keys(bySkill || {}).forEach((skillId) => skillIds.add(skillId));
      });
    };

    collectKeys(baseCoverage);
    collectKeys(projectedCoverage);

    const sortedSkills = [...skillIds].sort((a, b) => getSkillName(a).localeCompare(getSkillName(b), 'es'));
    const sortedHours = [...hours].sort((a, b) => a - b);

    sortedHours.forEach((hour) => {
      sortedSkills.forEach((skillId) => {
        const delta = Number(projectedCoverage[hour]?.[skillId] || 0) - Number(baseCoverage[hour]?.[skillId] || 0);
        const slotKey = `${hour}-${skillId}`;

        if (delta < 0) {
          const replacementCandidates = users
            .filter((candidate) => {
              if (String(candidate._id) === selectedUserId) return false;
              if (candidate.status !== 'active' || candidate.role !== 'agente') return false;

              const allowedSkillIds = (candidate.allowedSkills || []).map((id) => String(id));
              if (!allowedSkillIds.includes(skillId)) return false;

              const candidateSchedule = daySchedules.find(
                (schedule) => String(schedule.userId || schedule.user?._id || '') === String(candidate._id)
              );

              if (!candidateSchedule) return true;

              return !buildHourSlotsFromBlocks(
                (candidateSchedule.blocks || []).map((block) => ({
                  start: block.start,
                  end: block.end,
                  skillId: block.skill?._id || block.skillId || ''
                }))
              ).some((slot) => slot.hour === hour);
            })
            .map((candidate) => candidate.name || 'Sin nombre')
            .sort((a, b) => a.localeCompare(b, 'es'));

          candidatesBySlot[slotKey] = replacementCandidates;
        }

        if (!candidatesBySlot[slotKey]) candidatesBySlot[slotKey] = [];
        addCoverage(baseCoverage, hour, skillId, 0);
        addCoverage(projectedCoverage, hour, skillId, 0);
      });
    });

    return {
      skills: sortedSkills,
      hours: sortedHours,
      baseCoverage,
      projectedCoverage,
      candidatesBySlot,
      toCell(hour, skillId) {
        const base = Number(baseCoverage[hour]?.[skillId] || 0);
        const projected = Number(projectedCoverage[hour]?.[skillId] || 0);
        const delta = projected - base;
        const target = Number(coverageTargets[skillId] || 0);
        const targetGap = target > 0 ? projected - target : null;

        return {
          base,
          projected,
          delta,
          target,
          targetGap,
          replacementCandidates: candidatesBySlot[`${hour}-${skillId}`] || []
        };
      }
    };
  }, [daySchedules, selectedDay?.blocks, selectedDaySource?.blocks, userId, users, coverageTargets, skillsById]);

  const updateCoverageTarget = (skillId, value) => {
    const numeric = Number(value);
    if (!value || Number.isNaN(numeric) || numeric <= 0) {
      setCoverageTargets((prev) => {
        const next = { ...prev };
        delete next[skillId];
        return next;
      });
      return;
    }

    setCoverageTargets((prev) => ({
      ...prev,
      [skillId]: Math.floor(numeric)
    }));
  };

  const coverageSummary = useMemo(() => {
    let drops = 0;
    let unmetTargets = 0;
    let slotsWithSuggestions = 0;

    coverageByHourAndSkill.hours.forEach((hour) => {
      coverageByHourAndSkill.skills.forEach((skillId) => {
        const cell = coverageByHourAndSkill.toCell(hour, skillId);
        if (cell.delta < 0) drops += 1;
        if (cell.targetGap !== null && cell.targetGap < 0) unmetTargets += 1;
        if (cell.delta < 0 && cell.replacementCandidates.length > 0) slotsWithSuggestions += 1;
      });
    });

    return { drops, unmetTargets, slotsWithSuggestions };
  }, [coverageByHourAndSkill]);

  const validateDay = (day) => {
    if (!day) return 'Debe seleccionar un día válido para editar';

      if (!Array.isArray(day.blocks) || day.blocks.length === 0) return `Día ${day.date}: debe existir al menos un bloque`;

    for (let blockIndex = 0; blockIndex < day.blocks.length; blockIndex += 1) {
      const block = day.blocks[blockIndex];
      const blockLabel = `Día ${day.date}, bloque ${blockIndex + 1}`;

      if (!block.start || !block.end || !block.skillId) return `${blockLabel}: faltan datos obligatorios (inicio, fin o skill)`;
      if (!isValidHour(block.start)) return `${blockLabel}: la hora de inicio debe tener formato HH:mm`;
      if (!isValidHour(block.end)) return `${blockLabel}: la hora de fin debe tener formato HH:mm`;
      if (block.end <= block.start) return `${blockLabel}: la hora fin debe ser mayor a la hora inicio`;

      if (!availableSkillIds.has(String(block.skillId))) {
        const agentName = selectedUser?.name || 'Agente sin nombre';
        return `La skill “${getSkillName(block.skillId)}” no está asignada al agente “${agentName}”. Solo puedes usar skills predeterminadas o skills operativas asignadas al agente.`;
        }
      }

    return null;
  };

  const validateWeek = () => {
    if (!week.length) return 'Debe cargar una semana antes de guardar';

    for (let dayIndex = 0; dayIndex < week.length; dayIndex += 1) {
      const dayError = validateDay(week[dayIndex]);
      if (dayError) return dayError;
    }

    return null;
  };

  const save = async () => {
    const validationError = editMode === 'day' ? validateDay(selectedDay) : validateWeek();

    if (validationError) {
      push(validationError, 'error');
      return;
    }

    try {
      if (editMode === 'day') {
        await HorariosApi.editWeekByMode({ userId, date, status, mode: 'day', schedule: selectedDay });
      } else {
        await HorariosApi.editWeekByMode({ userId, date, status, mode: 'week', schedules: week });
      }

      push(`Edición ${editMode === 'day' ? 'diaria' : 'semanal'} guardada (${status})`);
      await load();
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  const daysToRender = editMode === 'day' && selectedDay
    ? [{ day: selectedDay, dayIdx: week.findIndex((item) => item.id === selectedDay.id) }]
    : week.map((day, dayIdx) => ({ day, dayIdx }));

  return (
    <section className="space-y-6">
      <h2 className="panel-title">Editar semana</h2>
      <div className="card flex flex-wrap gap-3 p-4">
        <select value={userId} onChange={(e) => setUserId(e.target.value)}>{users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}</select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select value={editMode} onChange={(e) => setEditMode(e.target.value)}>
          {EDIT_MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>

        {editMode === 'day' && (
          <select value={selectedDayId} onChange={(e) => setSelectedDayId(e.target.value)}>
            {week.map((day) => <option key={day.id} value={day.id}>{day.date}</option>)}
          </select>
        )}

        <button onClick={load} className="btn-secondary">Cargar</button>
        <button onClick={save} className="btn-primary">Guardar</button>
      </div>
      
      <div className="space-y-4">
        {daysToRender.map(({ day, dayIdx }) => (
          <div key={day.id} className="card p-4">
            <p className="mb-3 font-semibold text-[#1f2937]">{day.date}</p>
            {day.blocks.map((block, blockIdx) => (
              <div key={blockIdx} className="mb-2 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                <input value={block.start} onChange={(e) => updateBlock(dayIdx, blockIdx, 'start', e.target.value)} />
                <input value={block.end} onChange={(e) => updateBlock(dayIdx, blockIdx, 'end', e.target.value)} />
                <select value={block.skillId} onChange={(e) => updateBlock(dayIdx, blockIdx, 'skillId', e.target.value)}>
                  <option value="">Habilidad</option>
                  {availableSkills.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
                <button onClick={() => removeBlock(dayIdx, blockIdx)} className="btn-danger">Eliminar bloque</button>
              </div>
            ))}
            <button onClick={() => addBlock(dayIdx)} className="btn-secondary mt-2">Agregar bloque</button>
          </div>
        ))}
      </div>

        <div className="card space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-[#1f2937]">Impacto operativo por cobertura (día seleccionado)</h3>
            <p className="text-sm text-[#6b7280]">
              Vista previa en tiempo real para validar huecos al ajustar bloques del agente.
              Base = cobertura actual guardada | Proyectado = cobertura si guardas los cambios.
            </p>
          </div>
          {selectedDay?.date && (
            <span className="rounded-full bg-[#f3f4f6] px-3 py-1 text-xs font-semibold text-[#374151]">
              Día: {selectedDay.date}
            </span>
          )}
        </div>

        {coverageLoading ? (
          <p className="text-sm text-[#6b7280]">Calculando cobertura...</p>
        ) : (
          <div className="space-y-4">
            {coverageByHourAndSkill.skills.length > 0 && (
              <div className="rounded-xl border border-[#e5e7eb] bg-[#fafbff] p-3">
                <p className="mb-2 text-sm font-semibold text-[#1f2937]">Meta opcional por skill (aplica a cada franja horaria)</p>
                <div className="grid gap-2 md:grid-cols-3">
                  {coverageByHourAndSkill.skills.map((skillId) => (
                    <label key={skillId} className="flex items-center justify-between gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm">
                      <span className="truncate">{getSkillName(skillId)}</span>
                      <input
                        type="number"
                        min="1"
                        placeholder="Meta"
                        className="w-24"
                        value={coverageTargets[skillId] || ''}
                        onChange={(e) => updateCoverageTarget(skillId, e.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-[#e5e7eb]">
              <div className="grid gap-2 border-b border-[#e5e7eb] bg-[#fbfbfd] p-3 md:grid-cols-3">
                <div className="rounded-lg border border-[#fee4e2] bg-[#fff5f4] px-3 py-2 text-sm text-[#7a271a]">
                  Franjas con caída de cobertura: <strong>{coverageSummary.drops}</strong>
                </div>
                <div className="rounded-lg border border-[#fdecc8] bg-[#fff9eb] px-3 py-2 text-sm text-[#7a2e0e]">
                  Franjas bajo meta: <strong>{coverageSummary.unmetTargets}</strong>
                </div>
                <div className="rounded-lg border border-[#d1fadf] bg-[#ecfdf3] px-3 py-2 text-sm text-[#067647]">
                  Franjas con reemplazo sugerido: <strong>{coverageSummary.slotsWithSuggestions}</strong>
                </div>
              </div>
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-[#f8f9fb]">
                  <tr>
                    <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-[#344054]">Hora</th>
                    <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-[#344054]">Skill</th>
                    <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-[#344054]">Base</th>
                    <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-[#344054]">Proyectado</th>
                    <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-[#344054]">Delta</th>
                    <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-[#344054]">Meta</th>
                    <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-[#344054]">Brecha meta</th>
                    <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-[#344054]">Posibles reemplazos</th>
                  </tr>
                </thead>
                <tbody>
                  {!coverageByHourAndSkill.hours.length && (
                    <tr>
                      <td colSpan={8} className="px-3 py-4 text-center text-[#6b7280]">
                        Carga una semana y selecciona un día para visualizar impacto de cobertura.
                      </td>
                    </tr>
                  )}
                  {coverageByHourAndSkill.hours.flatMap((hour) => (
                    coverageByHourAndSkill.skills.map((skillId, skillIndex) => {
                      const cell = coverageByHourAndSkill.toCell(hour, skillId);
                      const isHourHeader = skillIndex === 0;
                      const rowBackground = isHourHeader ? 'bg-[#fcfcfd]' : 'bg-white';
                      const deltaBadgeClass = cell.delta < 0
                        ? 'border-[#fecdca] bg-[#fff5f4] text-[#b42318]'
                        : cell.delta > 0
                          ? 'border-[#abefc6] bg-[#ecfdf3] text-[#067647]'
                          : 'border-[#d0d5dd] bg-[#f9fafb] text-[#344054]';
                      const targetBadgeClass = cell.targetGap === null
                        ? 'border-[#d0d5dd] bg-[#f9fafb] text-[#344054]'
                        : cell.targetGap < 0
                          ? 'border-[#fecdca] bg-[#fff5f4] text-[#b42318]'
                          : 'border-[#abefc6] bg-[#ecfdf3] text-[#067647]';

                      return (
                        <tr key={`${hour}-${skillId}`} className={`border-t border-[#eef0f4] ${rowBackground}`}>
                          <td className={`px-3 py-2 font-semibold ${isHourHeader ? 'text-[#1f2937]' : 'text-[#9ca3af]'}`}>
                            {isHourHeader ? hourLabel(hour) : '↳'}
                          </td>
                          <td className="px-3 py-2">{getSkillName(skillId)}</td>
                          <td className="px-3 py-2 text-right font-medium text-[#344054]">{cell.base}</td>
                          <td className="px-3 py-2 text-right font-medium text-[#344054]">{cell.projected}</td>
                          <td className="px-3 py-2 text-right">
                            <span className={`inline-flex min-w-14 items-center justify-center rounded-full border px-2 py-1 text-xs font-semibold ${deltaBadgeClass}`}>
                              {formatSignedValue(cell.delta)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-[#344054]">{cell.target || '-'}</td>
                          <td className="px-3 py-2 text-right">
                            <span className={`inline-flex min-w-14 items-center justify-center rounded-full border px-2 py-1 text-xs font-semibold ${targetBadgeClass}`}>
                              {cell.targetGap === null ? '-' : formatSignedValue(cell.targetGap)}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {cell.replacementCandidates.length
                              ? (
                                <div className="flex flex-wrap gap-1">
                                  {cell.replacementCandidates.slice(0, 3).map((candidate) => (
                                    <span key={`${hour}-${skillId}-${candidate}`} className="rounded-full bg-[#eef4ff] px-2 py-1 text-xs font-medium text-[#3538cd]">
                                      {candidate}
                                    </span>
                                  ))}
                                  {cell.replacementCandidates.length > 3 && (
                                    <span className="rounded-full bg-[#f2f4f7] px-2 py-1 text-xs font-medium text-[#475467]">
                                      +{cell.replacementCandidates.length - 3} más
                                    </span>
                                  )}
                                </div>
                              )
                              : (cell.delta < 0 ? 'Sin reemplazo libre sugerido' : '-')}
                          </td>
                        </tr>
                      );
                    })
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </section>
  );
}
