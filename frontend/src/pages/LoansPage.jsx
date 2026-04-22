import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LoanApi } from '../api/endpoints';
import PageHeader from '../components/ui/PageHeader';
import Table from '../components/Table';
import { formatDateTime, fullName } from '../utils/format';
import { useAuth } from '../auth/AuthContext';
import { canManageInventory } from '../utils/permissions';

export default function LoansPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('loanDate');
  const [sortDirection, setSortDirection] = useState('desc');
  const { user } = useAuth();
  const canManage = canManageInventory(user);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await LoanApi.list({ page: 1, pageSize: 200 });
        setRows(data.body.items || []);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const statusOptions = useMemo(
    () => [
      { value: 'ALL', label: 'Todos los estados' },
      { value: 'OPEN', label: 'Abierto' },
      { value: 'PARTIALLY_RETURNED', label: 'Devuelto parcial' },
      { value: 'CLOSED', label: 'Cerrado' },
      { value: 'CANCELLED', label: 'Cancelado' }
    ],
    []
  );

  const sortOptions = useMemo(
    () => [
      { value: 'loanDate', label: 'Fecha de préstamo' },
      { value: 'expectedReturnDate', label: 'Fecha estimada de entrega' },
      { value: 'employee', label: 'Empleado' },
      { value: 'deliveredBy', label: 'Entregado por' },
      { value: 'totalQuantity', label: 'Cantidad' }
    ],
    []
  );

  const statusLabel = (status) => {
    const option = statusOptions.find((item) => item.value === status);
    return option?.label || status;
  };

  const statusBadgeClass = (status) => {
    if (status === 'OPEN') return 'bg-amber-100 text-amber-700';
    if (status === 'PARTIALLY_RETURNED') return 'bg-purple-100 text-purple-700';
    if (status === 'CLOSED') return 'bg-emerald-100 text-emerald-700';
    if (status === 'CANCELLED') return 'bg-rose-100 text-rose-700';
    return 'bg-slate-100 text-slate-700';
  };

  const visibleRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filtered = rows.filter((row) => {
      if (statusFilter !== 'ALL' && row.status !== statusFilter) return false;
      if (!normalizedSearch) return true;

      const assetNames = (row.items || []).map((item) => item.asset?.name || '').join(' ');
      const haystack = [
        fullName(row.employee),
        fullName(row.deliveredByUser || row.deliveredBy),
        assetNames,
        row.observations || '',
        statusLabel(row.status)
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });

    return filtered.sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      const employeeA = fullName(a.employee).toLowerCase();
      const employeeB = fullName(b.employee).toLowerCase();
      const deliveredByA = fullName(a.deliveredByUser || a.deliveredBy).toLowerCase();
      const deliveredByB = fullName(b.deliveredByUser || b.deliveredBy).toLowerCase();
      const qtyA = (a.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
      const qtyB = (b.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

      const map = {
        loanDate: new Date(a.loanDate).getTime() - new Date(b.loanDate).getTime(),
        expectedReturnDate: new Date(a.expectedReturnDate || 0).getTime() - new Date(b.expectedReturnDate || 0).getTime(),
        employee: employeeA.localeCompare(employeeB, 'es'),
        deliveredBy: deliveredByA.localeCompare(deliveredByB, 'es'),
        totalQuantity: qtyA - qtyB
      };

      return (map[sortBy] || 0) * direction;
    });
  }, [rows, search, statusFilter, sortBy, sortDirection]);

  return (
    <div className="page-content">
      <PageHeader
        title="Préstamos"
        subtitle="Controla asignaciones activas, responsables de entrega y fechas clave del proceso."
        actions={canManage ? <Link className="btn-primary" to="/loans/new">Registrar préstamo</Link> : null}
      />
      <div className="list-toolbar md:grid-cols-4">
        <input
          placeholder="Buscar por empleado, entregado por o activo"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <button className="btn-secondary" onClick={() => setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))}>
          Orden: {sortDirection === 'asc' ? 'Ascendente' : 'Descendente'}
        </button>
      </div>

      <Table
        columns={[
          { key: 'employee', label: 'Empleado', render: (r) => fullName(r.employee) },
          { key: 'deliveredBy', label: 'Entregado por', render: (r) => fullName(r.deliveredByUser || r.deliveredBy) },
          {
            key: 'loanedAsset',
            label: 'Activo prestado',
            render: (r) => {
              const names = (r.items || []).map((item) => item.asset?.name).filter(Boolean);
              if (names.length === 0) return '—';
              if (names.length === 1) return names[0];
              return `${names[0]} +${names.length - 1} más`;
            }
          },
          {
            key: 'quantity',
            label: 'Cantidad',
            render: (r) => (r.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0)
          },
          { key: 'loanDate', label: 'Fecha préstamo', render: (r) => formatDateTime(r.loanDate) },
          {
            key: 'expectedReturnDate',
            label: 'Fecha estimada entrega',
            render: (r) => (r.expectedReturnDate ? formatDateTime(r.expectedReturnDate) : 'Sin fecha')
          },
          {
            key: 'status',
            label: 'Estado',
            render: (r) => <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(r.status)}`}>{statusLabel(r.status)}</span>
          }
        ]}
        rows={visibleRows}
        loading={loading}
        emptyLabel="No se encontraron préstamos con los filtros aplicados"
      />
    </div>
  );
}