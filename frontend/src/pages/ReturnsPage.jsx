import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ReturnApi } from '../api/endpoints';
import PageHeader from '../components/ui/PageHeader';
import Table from '../components/Table';
import { useToast } from '../components/Toast';
import { formatDateTime, fullName, getErrorMessage } from '../utils/format';

import { useAuth } from '../auth/AuthContext';
import { canManageInventory } from '../utils/permissions';


export default function ReturnsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ query: '', status: 'ALL', returnDate: '' });
  const { user } = useAuth();
  const { push } = useToast();
  const canManage = canManageInventory(user);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await ReturnApi.list({ page: 1, pageSize: 200 });
        setRows(data.body.items || []);
      } catch (error) {
        push(getErrorMessage(error), 'error');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [push]);

  const statusLabel = (status) => {
    if (status === 'CLOSED') return 'Devuelto completo';
    if (status === 'PARTIALLY_RETURNED') return 'Devuelto parcial';
    if (status === 'OPEN') return 'Préstamo abierto';
    if (status === 'CANCELLED') return 'Préstamo cancelado';
    return 'Registrado';
  };

  const statusBadgeClass = (status) => {
    if (status === 'CLOSED') return 'bg-emerald-100 text-emerald-700';
    if (status === 'PARTIALLY_RETURNED') return 'bg-purple-100 text-purple-700';
    if (status === 'OPEN') return 'bg-amber-100 text-amber-700';
    if (status === 'CANCELLED') return 'bg-rose-100 text-rose-700';
    return 'bg-slate-100 text-slate-700';
  };

    const filteredRows = useMemo(() => {
    const normalizedQuery = filters.query.trim().toLowerCase();

    return rows.filter((record) => {
      const deliveredByName = fullName(record.loan?.deliveredByUser);
      const employeeName = fullName(record.employee);
      const assetNames = (record.items || []).map((item) => item.asset?.name || '').join(' ');
      const returnDate = record.returnDate ? new Date(record.returnDate).toISOString().slice(0, 10) : '';

      const matchesQuery =
        !normalizedQuery ||
        String(record.id).includes(normalizedQuery) ||
        deliveredByName.toLowerCase().includes(normalizedQuery) ||
        employeeName.toLowerCase().includes(normalizedQuery) ||
        assetNames.toLowerCase().includes(normalizedQuery) ||
        (record.observations || '').toLowerCase().includes(normalizedQuery);

      const matchesStatus = filters.status === 'ALL' || record.loan?.status === filters.status;
      const matchesReturnDate = !filters.returnDate || returnDate === filters.returnDate;

      return matchesQuery && matchesStatus && matchesReturnDate;
    });
  
  }, [rows, filters]);

  return (
    <div className="page-content">
      <PageHeader
        title="Devoluciones"
        subtitle="Revisa el historial completo de devoluciones y registra nuevas desde un flujo separado y limpio."
        actions={canManage ? <Link className="btn-primary" to="/returns/new">Registrar devolución</Link> : null}
      />
      <section className="card space-y-3">
        <p className="section-subtitle">Historial de devoluciones</p>
        <div className="grid gap-3 md:grid-cols-3">
          <input
            placeholder="Buscar por responsable, empleado, activo u observación"
            value={filters.query}
            onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))}
          />
          <select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
            <option value="ALL">Todos los estados</option>
            <option value="CLOSED">Devuelto completo</option>
            <option value="PARTIALLY_RETURNED">Devuelto parcial</option>
            <option value="OPEN">Préstamo abierto</option>
            <option value="CANCELLED">Préstamo cancelado</option>
          </select>
          <input
            type="date"
            value={filters.returnDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, returnDate: e.target.value }))}
          />
        </div>
        <Table
          loading={loading}
          columns={[
            { key: 'deliveredBy', label: 'Quién prestó', render: (record) => fullName(record.loan?.deliveredByUser) },
            { key: 'employee', label: 'A quién se prestó', render: (record) => fullName(record.employee) },
            {
              key: 'assets',
              label: 'Qué se prestó',
              render: (record) =>
                (record.items || [])
                  .map((item) => `${item.asset?.name || `Activo #${item.assetId}`} (${item.quantity})`)
                  .join(', ')
            },
            {
              key: 'quantity',
              label: 'Cantidad',
              render: (record) => (record.items || []).reduce((total, item) => total + (item.quantity || 0), 0)
            },
            { key: 'loanDate', label: 'Fecha préstamo', render: (record) => formatDateTime(record.loan?.loanDate) },
            { key: 'returnDate', label: 'Fecha devolución', render: (record) => formatDateTime(record.returnDate) },
            {
              key: 'status',
              label: 'Estado devolución',
              render: (record) => (
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(record.loan?.status)}`}>
                  {statusLabel(record.loan?.status)}
                </span>
              )
            },
            { key: 'observations', label: 'Observaciones', render: (record) => record.observations || 'Sin observaciones' }
          ]}
          rows={filteredRows}
          emptyLabel="No hay devoluciones registradas con los filtros aplicados"
        />
      </section>
    </div>
  );
}