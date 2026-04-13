import { useMemo, useState } from 'react';
import { HorariosApi } from '../../api/endpoints';
import { useToast } from '../../components/Toast';
import { getErrorMessage } from '../../utils/helpers';
import Spinner from '../../components/Spinner';

const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const BALANCE_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'excess', label: 'Exceso' },
  { value: 'deficit', label: 'Déficit' },
  { value: 'balanced', label: 'En rango' }
];
const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Nombre A-Z' },
  { value: 'balance-desc', label: 'Mayor exceso' },
  { value: 'balance-asc', label: 'Mayor déficit' }
];


const toUtcDateKey = (dateValue) => {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const formatHours = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '0.0';
  return value.toFixed(1);
};

export default function PublishWeekPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [result, setResult] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [preview, setPreview] = useState({ rows: [], week: null });
  const [balanceFilter, setBalanceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name-asc');
  const { push } = useToast();

  const loadPreview = async () => {
    setLoadingPreview(true);
    try {
      const [dailyRes, weeklyRes] = await Promise.all([
        HorariosApi.dailyOperativeHoursReport({ date, mode: 'draft' }),
        HorariosApi.weeklyHoursReport({ date, mode: 'draft' })
      ]);

      const dailyRows = dailyRes?.data?.body?.rows || [];
      const weeklyAgents = weeklyRes?.data?.body?.agents || [];
      const week = dailyRes?.data?.body?.week || weeklyRes?.data?.body?.week || null;

      const byAgent = new Map();
      for (const agent of weeklyAgents) {
        const userId = String(agent.userId);
        byAgent.set(userId, {
          userId,
          agentName: agent.agentName || 'Sin nombre',
          campaign: agent.campaign || '',
          dailyHours: Array(7).fill(0),
          weeklyHours: Number(agent.totalOperativeHours || 0),
          expectedWeeklyHours: Number(agent.expectedOperativeHours || 0),
          hoursBalance: Number(agent.hoursBalance || 0),
          balanceStatus: agent.balanceStatus || 'balanced'
        });
      }

      const weekStart = week?.from ? new Date(week.from) : null;
      for (const row of dailyRows) {
        const agentName = row.agentName || 'Sin nombre';
        const rowDate = toUtcDateKey(row.date);
        if (!rowDate || !weekStart || Number.isNaN(weekStart.getTime())) continue;

        const dayIndex = Math.floor((new Date(`${rowDate}T00:00:00.000Z`) - weekStart) / (24 * 60 * 60 * 1000));
        if (dayIndex < 0 || dayIndex > 6) continue;

        const key = String(row.userId || `${agentName}-${rowDate}`);
        if (!byAgent.has(key)) {
          byAgent.set(key, {
            userId: key,
            agentName,
            campaign: '',
            dailyHours: Array(7).fill(0),
            weeklyHours: 0,
            expectedWeeklyHours: 44,
            hoursBalance: -44,
            balanceStatus: 'deficit'
          });
        }

        byAgent.get(key).dailyHours[dayIndex] += Number(row.operativeHours || 0);
      }

      const rows = [...byAgent.values()]
        .map((row) => ({
          ...row,
          weeklyHours: row.weeklyHours || Number((row.dailyHours.reduce((sum, value) => sum + value, 0)).toFixed(2))
        }))
        .sort((a, b) => a.agentName.localeCompare(b.agentName, 'es'));

      setPreview({ rows, week });
    } catch (error) {
      push(getErrorMessage(error), 'error');
    } finally {
      setLoadingPreview(false);
    }
  };

  const publish = async () => {
    try {
      const res = await HorariosApi.publish(date);
      setResult(res.data.body);
      push(res.data.message);
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  const weekRangeLabel = useMemo(() => {
    if (!preview.week?.from || !preview.week?.to) return '';
    const from = toUtcDateKey(preview.week.from).replaceAll('-', '/');
    const to = toUtcDateKey(preview.week.to).replaceAll('-', '/');
    return `${from} - ${to}`;
  }, [preview.week]);

  const filteredRows = useMemo(() => (
    preview.rows.filter((row) => balanceFilter === 'all' || row.balanceStatus === balanceFilter)
  ), [preview.rows, balanceFilter]);

  const sortedRows = useMemo(() => {
    const rows = [...filteredRows];

    if (sortBy === 'balance-desc') {
      rows.sort((a, b) => b.hoursBalance - a.hoursBalance || a.agentName.localeCompare(b.agentName, 'es'));
      return rows;
    }

    if (sortBy === 'balance-asc') {
      rows.sort((a, b) => a.hoursBalance - b.hoursBalance || a.agentName.localeCompare(b.agentName, 'es'));
      return rows;
    }

    rows.sort((a, b) => a.agentName.localeCompare(b.agentName, 'es'));
    return rows;
  }, [filteredRows, sortBy]);

  const summaryCounters = useMemo(() => (
    preview.rows.reduce((acc, row) => {
      if (!Object.prototype.hasOwnProperty.call(acc, row.balanceStatus)) return acc;
      acc[row.balanceStatus] += 1;
      return acc;
    }, { excess: 0, deficit: 0, balanced: 0 })
  ), [preview.rows]);

  const formatSignedHours = (value) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '0.0';
    if (value > 0) return `+${formatHours(value)}`;
    return formatHours(value);
  };

  const getStatusLabel = (status) => {
    if (status === 'excess') return 'Exceso';
    if (status === 'deficit') return 'Déficit';
    return 'En rango';
  };

  const getStatusClasses = (status) => {
    if (status === 'excess') return 'bg-[#FEE2E2] text-[#991B1B]';
    if (status === 'deficit') return 'bg-[#FEF3C7] text-[#92400E]';
    return 'bg-[#DCFCE7] text-[#166534]';
  };

  return (
    <section className="space-y-6">
      <h2 className="panel-title">Publicar semana</h2>
      <div className="card flex flex-wrap gap-3 p-4">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button onClick={loadPreview} className="btn-secondary">Ver horas borrador</button>
        <button onClick={publish} className="btn-primary">Publicar</button>
      </div>
        <div className="card space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-[#2b2139]">Horas operativas por agente antes de publicar</h3>
          {weekRangeLabel && <span className="text-sm text-[#5e536d]">Semana: {weekRangeLabel}</span>}
        </div>
        <div className="grid gap-3 rounded-xl border border-[#eef0f4] bg-[#faf8ff] p-3 text-sm text-[#2b2139] md:grid-cols-4">
          <div>Exceso: <strong>{summaryCounters.excess}</strong></div>
          <div>Déficit: <strong>{summaryCounters.deficit}</strong></div>
          <div>En rango: <strong>{summaryCounters.balanced}</strong></div>
          <div>Total agentes: <strong>{preview.rows.length}</strong></div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <select value={balanceFilter} onChange={(e) => setBalanceFilter(e.target.value)}>
            {BALANCE_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        {loadingPreview ? <Spinner label="Calculando horas en borrador..." /> : (
          <div className="overflow-x-auto rounded-xl border border-[#eef0f4] bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f8f9fb]">
                <tr>
                  <th className="px-3 py-2 text-left">Agente</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  {WEEK_DAYS.map((day) => (
                    <th key={day} className="px-3 py-2 text-right">{day}</th>
                  ))}
                  <th className="px-3 py-2 text-right">Meta semana</th>
                  <th className="px-3 py-2 text-right">Total semana</th>
                  <th className="px-3 py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {!sortedRows.length && (
                  <tr>
                    <td colSpan={WEEK_DAYS.length + 5} className="px-3 py-4 text-center text-[#6b7280]">
                      Ejecuta "Ver horas borrador" para visualizar horas diarias y semanales antes de publicar.
                    </td>
                  </tr>
                )}

                {sortedRows.map((row) => (
                  <tr key={row.userId} className="border-t border-[#eef0f4]">
                    <td className="px-3 py-2">{row.agentName}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusClasses(row.balanceStatus)}`}>
                        {getStatusLabel(row.balanceStatus)}
                      </span>
                    </td>
                    {row.dailyHours.map((hours, index) => (
                      <td key={`${row.userId}-${index}`} className="px-3 py-2 text-right">{formatHours(hours)}</td>
                    ))}
                    <td className="px-3 py-2 text-right">{formatHours(row.expectedWeeklyHours)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatHours(row.weeklyHours)}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${row.hoursBalance === 0 ? 'text-[#166534]' : row.hoursBalance > 0 ? 'text-[#991B1B]' : 'text-[#92400E]'}`}>
                      {formatSignedHours(row.hoursBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {result && <pre className="card text-xs">{JSON.stringify(result, null, 2)}</pre>}
    </section>
  );
}
