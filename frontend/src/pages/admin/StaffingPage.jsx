import { useEffect, useMemo, useState } from 'react';
import { HorariosApi } from '../../api/endpoints';
import { UsersApi } from '../../api/endpoints';
import { useToast } from '../../components/Toast';
import { getErrorMessage } from '../../utils/helpers';

const MODES = [
  { value: 'published', label: 'Publicado' },
  { value: 'draft', label: 'Borrador' }
];

const MAX_COVERAGE_SUGGESTIONS = 3;

const formatHours = (value) => {
  const numeric = Number(value || 0);
  if (Number.isNaN(numeric)) return '0.0';
  return numeric.toFixed(1);
};

const getBalanceLabel = (status) => {
  if (status === 'excess') return 'Exceso';
  if (status === 'deficit') return 'Déficit';
  return 'En rango';
};

const getBalanceBadgeClasses = (status) => {
  if (status === 'excess') return 'bg-[#FEE2E2] text-[#991B1B]';
  if (status === 'deficit') return 'bg-[#FEF3C7] text-[#92400E]';
  return 'bg-[#DCFCE7] text-[#166534]';
};

const normalizeCampaign = (campaign) => String(campaign || '').trim().toLowerCase();

export default function StaffingPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState([]);
  const [mode, setMode] = useState('published');
  const [campaign, setCampaign] = useState('');
  const [campaignOptions, setCampaignOptions] = useState([]);
  const [agents, setAgents] = useState([]);
  const [targetAgentsPerSkill, setTargetAgentsPerSkill] = useState(2);
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  const loadCampaigns = async () => {
    try {
      const campaignsRes = await UsersApi.campaigns({ status: 'active' });
      setCampaignOptions(Array.isArray(campaignsRes?.data?.body?.items) ? campaignsRes.data.body.items : []);
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [staffingRes, weeklyRes] = await Promise.all([
        HorariosApi.staffingByDay({ date, mode, campaign }),
        HorariosApi.weeklyHoursReport({ date, mode, campaign })
      ]);

      setRows(staffingRes?.data?.body?.rows || []);
      setAgents(weeklyRes?.data?.body?.agents || []);
    } catch (error) {
      push(getErrorMessage(error), 'error');
      } finally {
      setLoading(false)
    }
  };

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const agentById = useMemo(() => (
    agents.reduce((acc, agent) => {
      acc[String(agent.userId)] = agent;
      return acc;
    }, {})
  ), [agents]);

  const hourAssignmentsByAgent = useMemo(() => {
    const map = {};

    rows.forEach((row) => {
      (row.skills || []).forEach((skillRow) => {
        (skillRow.agents || []).forEach((agent) => {
          const id = String(agent.id || '');
          if (!id) return;

          if (!map[id]) {
            map[id] = new Set();
          }

          map[id].add(row.hour);
        });
      });
    });

    return map;
  }, [rows]);

  const weakCoverageSlots = useMemo(() => {
    const threshold = Math.max(Number(targetAgentsPerSkill) || 0, 0);
    const normalizedCampaign = normalizeCampaign(campaign);

    const eligibleAgents = agents.filter((agent) => {
      if (!normalizedCampaign) return true;
      return normalizeCampaign(agent.campaign) === normalizedCampaign;
    });

    return rows.flatMap((row) => {
      return (row.skills || []).flatMap((skillRow) => {
        const totalAgents = Number(skillRow.totalAgents || 0);
        if (totalAgents >= threshold) return [];

        const missing = Math.max(threshold - totalAgents, 0);
        const assignedAgentIds = new Set((skillRow.agents || []).map((agent) => String(agent.id || '')));

        const suggestions = eligibleAgents
          .filter((agent) => {
            const id = String(agent.userId);
            if (assignedAgentIds.has(id)) return false;

            const assignedHours = hourAssignmentsByAgent[id];
            return !(assignedHours && assignedHours.has(row.hour));
          })
          .sort((a, b) => {
            const balanceA = Number(a.hoursBalance || 0);
            const balanceB = Number(b.hoursBalance || 0);
            if (balanceA !== balanceB) return balanceA - balanceB;
            return String(a.agentName || '').localeCompare(String(b.agentName || ''));
          })
          .slice(0, MAX_COVERAGE_SUGGESTIONS)
          .map((candidate) => ({
            userId: candidate.userId,
            agentName: candidate.agentName,
            campaign: candidate.campaign,
            hoursBalance: candidate.hoursBalance,
            balanceStatus: candidate.balanceStatus
          }));

        return [{
          hour: row.hour,
          skillName: skillRow.skill?.name || 'Skill sin nombre',
          skillId: String(skillRow.skill?._id || ''),
          totalAgents,
          missing,
          suggestions
        }];
      });
    }).sort((a, b) => {
      if (b.missing !== a.missing) return b.missing - a.missing;
      if (a.hour !== b.hour) return a.hour.localeCompare(b.hour);
      return a.skillName.localeCompare(b.skillName);
    });
  }, [rows, targetAgentsPerSkill, agents, campaign, hourAssignmentsByAgent]);

  const excessAgents = useMemo(() => {
    return agents
      .filter((agent) => agent.balanceStatus === 'excess')
      .sort((a, b) => Number(b.hoursBalance || 0) - Number(a.hoursBalance || 0));
  }, [agents]);

  const deficitAgents = useMemo(() => {
    return agents
      .filter((agent) => agent.balanceStatus === 'deficit')
      .sort((a, b) => Number(a.hoursBalance || 0) - Number(b.hoursBalance || 0));
  }, [agents]);

  useEffect(() => {
    loadCampaigns();
  }, []);

  return (
    <section className="space-y-6">
      <h2 className="panel-title">Dotación por día</h2>
      <div className="card flex flex-wrap gap-3 p-4">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          {MODES.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <input list="campaign-options" value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="Filtrar por campaña" />
        <datalist id="campaign-options">
          {campaignOptions.map((option) => <option key={option} value={option} />)}
        </datalist>

        <label className="flex items-center gap-2 rounded-lg border border-[#e6deef] bg-white px-3 py-2 text-sm text-[#2b2139]">
          Meta mínima por skill/hora
          <input
            type="number"
            min="0"
            value={targetAgentsPerSkill}
            onChange={(e) => setTargetAgentsPerSkill(e.target.value)}
            className="w-16"
          />
        </label>

        <button onClick={load} className="btn-primary">Consultar</button>
      </div>

        <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-[#fee4e2] bg-[#fff5f4] p-4">
          <p className="text-sm text-[#7a271a]">Agentes para bajar horas (exceso)</p>
          <p className="text-2xl font-bold text-[#7a271a]">{excessAgents.length}</p>
        </div>
        <div className="rounded-xl border border-[#fdecc8] bg-[#fff9eb] p-4">
          <p className="text-sm text-[#7a2e0e]">Agentes para subir horas (déficit)</p>
          <p className="text-2xl font-bold text-[#7a2e0e]">{deficitAgents.length}</p>
        </div>
        <div className="rounded-xl border border-[#d0d5dd] bg-[#f8f9fb] p-4">
          <p className="text-sm text-[#344054]">Franjas/skills por debajo de meta</p>
          <p className="text-2xl font-bold text-[#344054]">{weakCoverageSlots.length}</p>
        </div>
      </div>

      <div className="card space-y-3 p-4">
        <h3 className="text-base font-semibold text-[#1f2937]">Resumen operativo para ajustes rápidos</h3>
        {loading && <p className="text-sm text-[#6b7280]">Cargando resumen operativo...</p>}
        {!loading && !weakCoverageSlots.length && (
          <p className="text-sm text-[#6b7280]">No hay franjas por debajo de la meta configurada para estos filtros.</p>
        )}

        {!loading && !!weakCoverageSlots.length && (
          <div className="overflow-x-auto rounded-xl border border-[#eef0f4]">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f8f9fb]">
                <tr>
                  <th className="px-3 py-2 text-left">Franja</th>
                  <th className="px-3 py-2 text-left">Skill</th>
                  <th className="px-3 py-2 text-right">Actual</th>
                  <th className="px-3 py-2 text-right">Faltan</th>
                  <th className="px-3 py-2 text-left">Sugerencias para cubrir</th>
                </tr>
              </thead>
              <tbody>
                {weakCoverageSlots.map((slot) => (
                  <tr key={`${slot.hour}-${slot.skillName}`} className="border-t border-[#eef0f4] align-top">
                    <td className="px-3 py-2 font-medium text-[#1f2937]">{slot.hour}</td>
                    <td className="px-3 py-2">{slot.skillName}</td>
                    <td className="px-3 py-2 text-right">{slot.totalAgents}</td>
                    <td className="px-3 py-2 text-right font-semibold text-[#B42318]">{slot.missing}</td>
                    <td className="px-3 py-2">
                      {slot.suggestions.length ? (
                        <div className="flex flex-wrap gap-2">
                          {slot.suggestions.map((candidate) => (
                            <span key={`${slot.hour}-${slot.skillId}-${candidate.userId}`} className="rounded-full border border-[#e4e7ec] bg-white px-2 py-1 text-xs text-[#344054]">
                              {candidate.agentName} ({formatHours(candidate.hoursBalance)}h)
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-[#6b7280]">Sin candidatos libres en esta franja</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card p-4">
          <h3 className="mb-3 text-base font-semibold text-[#1f2937]">Top agentes con exceso</h3>
          {!excessAgents.length ? (
            <p className="text-sm text-[#6b7280]">No hay agentes en exceso para los filtros actuales.</p>
          ) : (
            <div className="space-y-2">
              {excessAgents.slice(0, 8).map((agent) => (
                <div key={agent.userId} className="flex items-center justify-between rounded-lg border border-[#fee4e2] bg-[#fff5f4] px-3 py-2">
                  <div>
                    <p className="font-medium text-[#7a271a]">{agent.agentName}</p>
                    <p className="text-xs text-[#7a271a]">{agent.campaign || 'Sin campaña'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#B42318]">+{formatHours(agent.hoursBalance)}h</p>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getBalanceBadgeClasses(agent.balanceStatus)}`}>
                      {getBalanceLabel(agent.balanceStatus)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-4">
          <h3 className="mb-3 text-base font-semibold text-[#1f2937]">Top agentes con déficit</h3>
          {!deficitAgents.length ? (
            <p className="text-sm text-[#6b7280]">No hay agentes en déficit para los filtros actuales.</p>
          ) : (
            <div className="space-y-2">
              {deficitAgents.slice(0, 8).map((agent) => (
                <div key={agent.userId} className="flex items-center justify-between rounded-lg border border-[#fdecc8] bg-[#fff9eb] px-3 py-2">
                  <div>
                    <p className="font-medium text-[#7a2e0e]">{agent.agentName}</p>
                    <p className="text-xs text-[#7a2e0e]">{agent.campaign || 'Sin campaña'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#B54708]">{formatHours(agent.hoursBalance)}h</p>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getBalanceBadgeClasses(agent.balanceStatus)}`}>
                      {getBalanceLabel(agent.balanceStatus)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card p-4">
        {!rows.length && (
          <p className="text-sm text-[#6b7280]">No hay datos de dotación para los filtros seleccionados.</p>
        )}
        {rows.map((row) => (
          <div key={row.hour} className="rounded-xl border border-[#e4e7ec] bg-white p-4 shadow-sm [&:not(:last-child)]:mb-4">
            <p className="text-base font-semibold text-[#1f2937]">Franja: {row.hour}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {row.skills.map((skillRow, idx) => (
                <div key={idx} className="rounded-lg border border-[#eef0f4] bg-[#f8fafc] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-[#111827]">{skillRow.skill?.name || 'Skill sin nombre'}</p>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-[#374151]">
                      {skillRow.totalAgents} {skillRow.totalAgents === 1 ? 'persona' : 'personas'}
                    </span>
                  </div>

                  <p className="mt-2 text-xs font-medium uppercase tracking-wide text-[#6b7280]">Personas</p>
                  <ul className="mt-1 space-y-1 text-sm text-[#374151]">
                    {skillRow.agents?.length ? (
                      skillRow.agents.map((agent) => {
                        const balanceStatus = agentById[String(agent.id)]?.balanceStatus || 'balanced';
                        return (
                          <li key={agent.id || agent.name} className="flex items-center justify-between rounded bg-white px-2 py-1">
                            <span>{agent.name}</span>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getBalanceBadgeClasses(balanceStatus)}`}>
                              {getBalanceLabel(balanceStatus)}
                            </span>
                          </li>
                        );
                      })
                    ) : (
                      <li className="rounded bg-white px-2 py-1 text-[#6b7280]">Sin asignación</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
