import { useEffect, useMemo, useState } from 'react';
import { HorariosApi, SkillsApi, UsersApi } from '../../api/endpoints';
import FancyCheckbox from '../../components/FancyCheckbox';
import { useToast } from '../../components/Toast';
import { getErrorMessage, isValidHour } from '../../utils/helpers';
import { getAllowedSkillsForUser } from '../../utils/skills';

const emptyBlock = { start: '08:00', end: '09:00', skillId: '' };

const HOURS_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'deficit', label: 'Déficit' },
  { value: 'balanced', label: 'En rango' },
  { value: 'excess', label: 'Exceso' }
];

const getWeekdayRange = (startDate) => {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return { startDate, endDate: startDate };

  const day = start.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(start);
  monday.setUTCDate(start.getUTCDate() + mondayOffset);

  const friday = new Date(monday);
  friday.setUTCDate(monday.getUTCDate() + 4);

  return {
    startDate: monday.toISOString().slice(0, 10),
    endDate: friday.toISOString().slice(0, 10)
  };
};

const getWholeWeekRange = (startDate) => {
  const weekdays = getWeekdayRange(startDate);
  const sunday = new Date(`${weekdays.startDate}T00:00:00.000Z`);
  sunday.setUTCDate(sunday.getUTCDate() + 6);

  return {
    startDate: weekdays.startDate,
    endDate: sunday.toISOString().slice(0, 10)
  };
};

const formatHours = (value) => {
  const numeric = Number(value || 0);
  if (Number.isNaN(numeric)) return '0.0';
  return numeric.toFixed(1);
};

const getBalanceBadgeClasses = (status) => {
  if (status === 'excess') return 'bg-[#FEE2E2] text-[#991B1B]';
  if (status === 'deficit') return 'bg-[#FEF3C7] text-[#92400E]';
  return 'bg-[#DCFCE7] text-[#166534]';
};

const getBalanceLabel = (status) => {
  if (status === 'excess') return 'Exceso';
  if (status === 'deficit') return 'Déficit';
  return 'En rango';
};

export default function CreateDraftPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [userId, setUserId] = useState('');
  const [users, setUsers] = useState([]);
  const [skills, setSkills] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [bulkTemplateId, setBulkTemplateId] = useState('');
  const [bulkStartDate, setBulkStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [bulkEndDate, setBulkEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [bulkSearch, setBulkSearch] = useState('');
  const [bulkCampaign, setBulkCampaign] = useState('all');
  const [bulkSelectedUserIds, setBulkSelectedUserIds] = useState([]);
  const [bulkHoursFilter, setBulkHoursFilter] = useState('all');
  const [overwriteDraft, setOverwriteDraft] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkInsightsLoading, setBulkInsightsLoading] = useState(false);
  const [bulkHoursByUser, setBulkHoursByUser] = useState({});
  const [bulkBalanceCounters, setBulkBalanceCounters] = useState({ deficit: 0, balanced: 0, excess: 0 });
  const [bulkCoverageRows, setBulkCoverageRows] = useState([]);
  const [blocks, setBlocks] = useState([{ ...emptyBlock }]);
  const { push } = useToast();

  const selectedUser = useMemo(
    () => users.find((user) => String(user._id) === String(userId)) || null,
    [users, userId]
  );

  const availableSkills = useMemo(() => (
    getAllowedSkillsForUser({ skills, user: selectedUser })
  ), [skills, selectedUser]);

  const campaignOptions = useMemo(() => {
    const values = [...new Set(users.map((user) => (user.campaign || '').trim()).filter(Boolean))];
    return values.sort((a, b) => a.localeCompare(b, 'es'));
  }, [users]);

  const filteredBulkUsers = useMemo(() => {
    const normalizedSearch = bulkSearch.trim().toLowerCase();

    return users.filter((user) => {
      const campaignMatch = bulkCampaign === 'all' || (user.campaign || '') === bulkCampaign;
      if (!campaignMatch) return false;

      const userInsights = bulkHoursByUser[String(user._id)];
      const hoursMatch = bulkHoursFilter === 'all' || userInsights?.balanceStatus === bulkHoursFilter;
      if (!hoursMatch) return false

      if (!normalizedSearch) return true;

      const searchTarget = `${user.name || ''} ${user.email || ''}`.toLowerCase();
      return searchTarget.includes(normalizedSearch);
    });
  }, [users, bulkSearch, bulkCampaign, bulkHoursByUser, bulkHoursFilter]);

  const allFilteredSelected = useMemo(() => (
    filteredBulkUsers.length > 0
    && filteredBulkUsers.every((user) => bulkSelectedUserIds.includes(String(user._id)))
  ), [filteredBulkUsers, bulkSelectedUserIds]);

  const selectedUsersSummary = useMemo(() => {
    const selectedSet = new Set(bulkSelectedUserIds.map(String));
    return users.reduce((acc, user) => {
      if (!selectedSet.has(String(user._id))) return acc;

      const insights = bulkHoursByUser[String(user._id)];
      const status = insights?.balanceStatus || 'balanced';
      if (Object.prototype.hasOwnProperty.call(acc.counters, status)) {
        acc.counters[status] += 1;
      }
      acc.totalHours += Number(insights?.totalOperativeHours || 0);
      return acc;
    }, {
      counters: { deficit: 0, balanced: 0, excess: 0 },
      totalHours: 0
    });
  }, [bulkSelectedUserIds, users, bulkHoursByUser]);

  const projectedAssignments = useMemo(() => {
    if (!bulkStartDate || !bulkEndDate || bulkEndDate < bulkStartDate) return 0;

    const start = new Date(`${bulkStartDate}T00:00:00.000Z`);
    const end = new Date(`${bulkEndDate}T00:00:00.000Z`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

    const days = Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
    return Math.max(days, 0) * bulkSelectedUserIds.length;
  }, [bulkStartDate, bulkEndDate, bulkSelectedUserIds.length]);

  useEffect(() => {
    Promise.all([
      UsersApi.agents({ status: 'active', fields: '_id,name,email,campaign,allowedSkills' }),
      SkillsApi.list({ page: 1, limit: 100, status: 'active' }),
      HorariosApi.shiftTemplates({ page: 1, limit: 100, status: 'active' })
    ]).then(([u, s, t]) => {
      const activeUsers = Array.isArray(u?.data?.body?.items) ? u.data.body.items : [];
      setUsers(activeUsers);
      setUserId(activeUsers[0]?._id || '');
      setBulkSelectedUserIds(activeUsers.map((user) => String(user._id)));
      setSkills(Array.isArray(s?.data?.body?.items) ? s.data.body.items : []);
      const activeTemplates = Array.isArray(t?.data?.body?.items) ? t.data.body.items : [];
      setTemplates(activeTemplates);
      setBulkTemplateId(activeTemplates[0]?._id || '');
    }).catch((error) => push(getErrorMessage(error), 'error'));
  }, []);

  useEffect(() => {
    const validSkillIds = new Set(availableSkills.map((skill) => String(skill._id)));

    setBlocks((prev) => prev.map((block) => {
      if (!block.skillId) return block;
      if (validSkillIds.has(String(block.skillId))) return block;

      return { ...block, skillId: '' };
    }));
  }, [availableSkills]);

  useEffect(() => {
    if (!bulkStartDate) return;

    const loadBulkInsights = async () => {
      setBulkInsightsLoading(true);
      try {
        const [weeklyRes, staffingRes] = await Promise.all([
          HorariosApi.weeklyHoursReport({ date: bulkStartDate, mode: 'draft' }),
          HorariosApi.staffingByDay({ date: bulkStartDate, mode: 'draft' })
        ]);

        const agents = weeklyRes?.data?.body?.agents || [];
        const counters = { deficit: 0, balanced: 0, excess: 0 };
        const byUser = agents.reduce((acc, agent) => {
          const status = agent.balanceStatus || 'balanced';
          if (Object.prototype.hasOwnProperty.call(counters, status)) {
            counters[status] += 1;
          }
          acc[String(agent.userId)] = agent;
          return acc;
        }, {});

        setBulkHoursByUser(byUser);
        setBulkBalanceCounters(counters);
        setBulkCoverageRows(staffingRes?.data?.body?.rows || []);
      } catch (error) {
        setBulkHoursByUser({});
        setBulkBalanceCounters({ deficit: 0, balanced: 0, excess: 0 });
        setBulkCoverageRows([]);
        push(getErrorMessage(error), 'error');
      } finally {
        setBulkInsightsLoading(false);
      }
    };

    loadBulkInsights();
  }, [bulkStartDate, push]);

  const setBlock = (idx, field, value) => setBlocks((prev) => prev.map((b, i) => i === idx ? { ...b, [field]: value } : b));

  const add = () => setBlocks((prev) => [...prev, { ...emptyBlock }]);

  const remove = (idx) => {
    setBlocks((prev) => {
      if (prev.length === 1) {
        push('Debe existir al menos un bloque', 'error');
        return prev;
      }

      return prev.filter((_, blockIndex) => blockIndex !== idx);
    });
  };

  const save = async () => {
    for (const block of blocks) {
      if (!isValidHour(block.start) || !isValidHour(block.end) || block.end <= block.start) {
        push('Valida formato HH:mm y que end sea mayor a start', 'error');
        return;
      }
    }
    try {
      await HorariosApi.create({ userId, date, blocks });
      push('Borrador creado');
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  const applyTemplate = () => {
    const template = templates.find((item) => String(item._id) === String(selectedTemplateId));

    if (!template) {
      push('Selecciona un turno tipo válido', 'error');
      return;
    }

    const nextBlocks = (template.blocks || []).map((block) => ({
      start: block.start,
      end: block.end,
      skillId: block.skill?._id || ''
    }));

    if (!nextBlocks.length) {
      push('El turno tipo seleccionado no tiene bloques', 'error');
      return;
    }

    setBlocks(nextBlocks);
    push(`Turno tipo ${template.code} aplicado`);
  };

  const toggleBulkUser = (selectedUserId) => {
    setBulkSelectedUserIds((prev) => (
      prev.includes(selectedUserId)
        ? prev.filter((id) => id !== selectedUserId)
        : [...prev, selectedUserId]
    ));
  };

  const toggleSelectAllFiltered = () => {
    const filteredIds = filteredBulkUsers.map((user) => String(user._id));
    setBulkSelectedUserIds((prev) => {
      if (allFilteredSelected) {
        return prev.filter((id) => !filteredIds.includes(id));
      }

      const next = new Set(prev);
      filteredIds.forEach((id) => next.add(id));
      return [...next];
    });
  };

  const selectUsersByBalance = (status) => {
    const matchingIds = users
      .filter((user) => {
        if (bulkCampaign !== 'all' && (user.campaign || '') !== bulkCampaign) return false;

        const normalizedSearch = bulkSearch.trim().toLowerCase();
        if (normalizedSearch) {
          const haystack = `${user.name || ''} ${user.email || ''}`.toLowerCase();
          if (!haystack.includes(normalizedSearch)) return false;
        }

        if (status === 'all') return true;
        return bulkHoursByUser[String(user._id)]?.balanceStatus === status;
      })
      .map((user) => String(user._id));

    setBulkSelectedUserIds(matchingIds);
  };

  const applyRangePreset = (preset) => {
    const range = preset === 'workweek'
      ? getWeekdayRange(bulkStartDate)
      : getWholeWeekRange(bulkStartDate);

    setBulkStartDate(range.startDate);
    setBulkEndDate(range.endDate);
  };

  const runBulkAssignment = async () => {
    if (!bulkTemplateId) {
      push('Selecciona un turno tipo para la asignación masiva', 'error');
      return;
    }

    if (bulkSelectedUserIds.length === 0) {
      push('Selecciona al menos un agente', 'error');
      return;
    }

    if (!bulkStartDate || !bulkEndDate) {
      push('Debes seleccionar fecha inicio y fecha fin', 'error');
      return;
    }

    if (bulkEndDate < bulkStartDate) {
      push('La fecha fin no puede ser menor que la fecha inicio', 'error');
      return;
    }

    try {
      const response = await HorariosApi.bulkAssignShiftTemplate({
        templateId: bulkTemplateId,
        userIds: bulkSelectedUserIds,
        startDate: bulkStartDate,
        endDate: bulkEndDate,
        overwriteDraft
      });

      const result = response?.data?.body || null;
      setBulkResult(result);

      if (!result) {
        push('Asignación masiva completada');
        return;
      }

      const summary = `Asignación masiva lista: ${result.insertedCount || 0} creados, ${result.updatedCount || 0} actualizados, ${result.conflictCount || 0} conflictos.`;
      push(summary, result.conflictCount ? 'warning' : 'success');
    } catch (error) {
      setBulkResult(null);
      push(getErrorMessage(error), 'error');
    }
  };

  return (
    <section className="space-y-6">
      <h2 className="panel-title">Crear horario borrador</h2>
      <div className="card space-y-4 p-4">
        <p className="section-subtitle">Asignación masiva</p>
        <div>
          <h3 className="text-base font-bold text-[#2b2139]">Asignación masiva de turnos de tipo A, B, C...</h3>
          <p className="text-sm text-[#5e536d]">Aplica un turno tipo a múltiples agentes y un rango de fechas. Si ya existe un horario, el sistema reporta conflicto o lo reemplaza solo si activas sobrescribir borrador.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <select value={bulkTemplateId} onChange={(e) => setBulkTemplateId(e.target.value)}>
            <option value="">Selecciona turno tipo</option>
            {templates.map((template) => (
              <option key={template._id} value={template._id}>
                {template.code}{template.name ? ` - ${template.name}` : ''}
              </option>
            ))}
          </select>
          <input type="date" value={bulkStartDate} onChange={(e) => setBulkStartDate(e.target.value)} />
          <input type="date" value={bulkEndDate} onChange={(e) => setBulkEndDate(e.target.value)} />
          <FancyCheckbox
            id="overwrite-draft"
            checked={overwriteDraft}
            onChange={(e) => setOverwriteDraft(e.target.checked)}
            label="Sobrescribir borradores existentes"
            className="w-full justify-center md:justify-start"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => applyRangePreset('workweek')} className="btn-secondary">Rango rápido: L-V</button>
          <button onClick={() => applyRangePreset('week')} className="btn-secondary">Rango rápido: semana completa</button>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={bulkSearch}
            onChange={(e) => setBulkSearch(e.target.value)}
            placeholder="Buscar agente por nombre o correo"
          />
          <select value={bulkCampaign} onChange={(e) => setBulkCampaign(e.target.value)}>
            <option value="all">Todas las campañas</option>
            {campaignOptions.map((campaign) => (
              <option key={campaign} value={campaign}>{campaign}</option>
            ))}
          </select>
          <select value={bulkHoursFilter} onChange={(e) => setBulkHoursFilter(e.target.value)}>
            {HOURS_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>{filter.label}</option>
            ))}
          </select>

          <button onClick={toggleSelectAllFiltered} className="btn-secondary">
            {allFilteredSelected ? 'Deseleccionar filtrados' : 'Seleccionar filtrados'}
          </button>
        </div>
  
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-[#fdecc8] bg-[#fff9eb] p-3 text-sm text-[#7a2e0e]">
            Déficit detectado: <strong>{bulkBalanceCounters.deficit}</strong>
            <button onClick={() => selectUsersByBalance('deficit')} className="mt-2 block text-xs font-semibold underline">Seleccionar déficit</button>
          </div>
          <div className="rounded-xl border border-[#d1fadf] bg-[#ecfdf3] p-3 text-sm text-[#067647]">
            En rango: <strong>{bulkBalanceCounters.balanced}</strong>
            <button onClick={() => selectUsersByBalance('balanced')} className="mt-2 block text-xs font-semibold underline">Seleccionar en rango</button>
          </div>
          <div className="rounded-xl border border-[#fee4e2] bg-[#fff5f4] p-3 text-sm text-[#7a271a]">
            Exceso detectado: <strong>{bulkBalanceCounters.excess}</strong>
            <button onClick={() => selectUsersByBalance('excess')} className="mt-2 block text-xs font-semibold underline">Seleccionar exceso</button>
          </div>
        </div>

        <div className="max-h-64 overflow-auto rounded-xl border border-[#e6deef]">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f8f5fc]">
              <tr>
                <th className="px-3 py-2 text-left">Sel.</th>
                <th className="px-3 py-2 text-left">Agente</th>
                <th className="px-3 py-2 text-left">Campaña</th>
                <th className="px-3 py-2 text-right">Horas semana</th>
                <th className="px-3 py-2 text-right">Meta</th>
                <th className="px-3 py-2 text-left">Balance</th>
              </tr>
            </thead>
            <tbody>
              {filteredBulkUsers.map((user) => {
                const checked = bulkSelectedUserIds.includes(String(user._id));
                const insights = bulkHoursByUser[String(user._id)];
                return (
                  <tr key={user._id} className="border-t border-[#efe8f6]">
                    <td className="px-3 py-2">
                      <FancyCheckbox
                        id={`bulk-user-${user._id}`}
                        checked={checked}
                        onChange={() => toggleBulkUser(String(user._id))}
                        label={`Seleccionar a ${user.name}`}
                        hideLabel
                        className="border-transparent bg-transparent p-0 hover:border-transparent hover:shadow-none"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-[#2b2139]">{user.name}</p>
                      <p className="text-xs text-[#6b7280]">{user.email}</p>
                    </td>
                    <td className="px-3 py-2">{user.campaign || '-'}</td>
                    <td className="px-3 py-2 text-right">{formatHours(insights?.totalOperativeHours || 0)}</td>
                    <td className="px-3 py-2 text-right">{formatHours(insights?.expectedOperativeHours || 44)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getBalanceBadgeClasses(insights?.balanceStatus || 'balanced')}`}>
                        {getBalanceLabel(insights?.balanceStatus || 'balanced')}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredBulkUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-[#6b7280]">No hay agentes para los filtros seleccionados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 rounded-xl border border-[#e6deef] bg-[#fbf9ff] p-3 md:grid-cols-4">
          <p className="text-sm text-[#2b2139]">Seleccionados: <strong>{bulkSelectedUserIds.length}</strong></p>
          <p className="text-sm text-[#2b2139]">Asignaciones proyectadas: <strong>{projectedAssignments}</strong></p>
          <p className="text-sm text-[#2b2139]">Seleccionados en déficit: <strong>{selectedUsersSummary.counters.deficit}</strong></p>
          <p className="text-sm text-[#2b2139]">Horas semanales (seleccionados): <strong>{formatHours(selectedUsersSummary.totalHours)}</strong></p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={runBulkAssignment} className="btn-primary">Aplicar asignación masiva</button>
          {bulkInsightsLoading && <span className="text-sm text-[#6b7280]">Actualizando visibilidad operativa...</span>}
        </div>

        {bulkResult && (
          <div className="rounded-xl border border-[#e6deef] bg-[#fbf9ff] p-3 text-sm">
            <p className="font-semibold text-[#2b2139]">Resultado: {bulkResult.insertedCount} creados, {bulkResult.updatedCount} actualizados, {bulkResult.conflictCount} conflictos.</p>
            {!!bulkResult.conflicts?.length && (
              <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-auto pl-5 text-[#5e536d]">
                {bulkResult.conflicts.map((conflict, index) => (
                  <li key={`${conflict.userId || 'na'}-${conflict.date || 'nodate'}-${index}`}>
                    [{conflict.type}] {conflict.userName || conflict.userId}: {conflict.date || 'sin fecha'} — {conflict.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="rounded-xl border border-[#e6deef] bg-white p-3">
          <h4 className="text-sm font-semibold text-[#2b2139]">Pulso rápido de cobertura (borrador) para {bulkStartDate}</h4>
          {!bulkCoverageRows.length ? (
            <p className="mt-2 text-sm text-[#6b7280]">Sin filas de cobertura para la fecha seleccionada.</p>
          ) : (
            <div className="mt-2 max-h-52 overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#f8f9fb]">
                  <tr>
                    <th className="px-3 py-2 text-left">Franja</th>
                    <th className="px-3 py-2 text-left">Skills cubiertos</th>
                    <th className="px-3 py-2 text-right">Dotación total</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkCoverageRows.map((row) => {
                    const totalAgents = (row.skills || []).reduce((sum, skillRow) => sum + Number(skillRow.totalAgents || 0), 0);
                    return (
                      <tr key={row.hour} className="border-t border-[#eef0f4]">
                        <td className="px-3 py-2">{row.hour}</td>
                        <td className="px-3 py-2">{(row.skills || []).map((skillRow) => skillRow.skill?.name || 'Skill').join(', ') || '-'}</td>
                        <td className="px-3 py-2 text-right">{totalAgents}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card space-y-4 p-4">
        <p className="section-subtitle">Asignación individual</p>
        <div>
          <h3 className="text-base font-bold text-[#2b2139]">Crear borrador por agente y día</h3>
          <p className="text-sm text-[#5e536d]">Selecciona agente, fecha y arma los bloques manualmente o aplica un turno tipo existente.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <select value={userId} onChange={(e) => setUserId(e.target.value)}>{users.map((u) => <option value={u._id} key={u._id}>{u.name}</option>)}</select>
          <div className="flex gap-2">
            <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}>
              <option value="">Turno tipo (opcional)</option>
              {templates.map((template) => (
                <option key={template._id} value={template._id}>
                  {template.code}{template.name ? ` - ${template.name}` : ''}
                </option>
              ))}
            </select>
            <button onClick={applyTemplate} className="btn-secondary">Aplicar</button>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-[#e6deef] bg-[#fbf9ff] p-3">
          <p className="text-sm font-semibold text-[#2b2139]">Bloques del día</p>
          {blocks.map((block, idx) => (
            <div key={idx} className="card grid gap-3 p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
              <input value={block.start} onChange={(e) => setBlock(idx, 'start', e.target.value)} />
              <input value={block.end} onChange={(e) => setBlock(idx, 'end', e.target.value)} />
              <select value={block.skillId} disabled={!selectedUser} onChange={(e) => setBlock(idx, 'skillId', e.target.value)}>
                <option value="">{selectedUser ? 'Habilidad' : 'Selecciona un agente primero'}</option>
                {availableSkills.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
              <button onClick={() => remove(idx)} className="btn-danger">Eliminar bloque</button>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={add} className="btn-secondary">Agregar bloque</button>
          <button onClick={save} className="btn-primary">Guardar borrador</button>
        </div>
      </div>
    </section>
  );
}
