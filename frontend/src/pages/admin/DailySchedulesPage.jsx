import { useState } from 'react';
import { HorariosApi } from '../../api/endpoints';
import Spinner from '../../components/Spinner';
import { useToast } from '../../components/Toast';
import { getErrorMessage } from '../../utils/helpers';

export default function DailySchedulesPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [statuses, setStatuses] = useState(['publicado', 'borrador']);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await HorariosApi.byDay({ date, statuses });
      setData(res.data.body);
    } catch (error) {
      push(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <h2 className="panel-title">Horarios por día</h2>
      <div className="card flex flex-wrap gap-3 p-4">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input value={statuses.join(',')} onChange={(e) => setStatuses(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />
        <button onClick={load} className="btn-primary">Buscar</button>
      </div>
      {loading ? <Spinner /> : (
        <div className="space-y-3">
          {data.map((h) => (
            <div key={h._id} className="card p-4">
              <p className="font-semibold text-[#1f2937]">{h.user?.name} - {new Date(h.date).toISOString().slice(0, 10)} - {h.status}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {h.blocks.map((b, i) => (
                  <span key={i} className="rounded-lg px-3 py-1 text-xs text-white" style={{ backgroundColor: b.skill?.color || '#835da2' }}>
                    {b.start}-{b.end} {b.skill?.name || 'Habilidad'}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
