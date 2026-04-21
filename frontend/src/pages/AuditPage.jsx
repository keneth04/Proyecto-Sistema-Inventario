import { useEffect, useState } from 'react';
import { AuditApi } from '../api/endpoints';
import PageHeader from '../components/ui/PageHeader';
import Table from '../components/Table';
import { formatDateTime } from '../utils/format';

const ACTION_LABELS = {
  CREATE: 'Creación',
  UPDATE: 'Edición',
  DELETE: 'Eliminación lógica',
  LOGIN: 'Inicio de sesión',
  LOGOUT: 'Cierre de sesión',
  LOAN_REGISTERED: 'Préstamo',
  RETURN_REGISTERED: 'Devolución',
  STOCK_ADJUSTED: 'Ajuste de stock',
  STATUS_CHANGED: 'Cambio de estado'
};

const ENTITY_LABELS = {
  USER: 'Usuario',
  EMPLOYEE: 'Empleado',
  CATEGORY: 'Categoría',
  ASSET: 'Activo',
  LOAN: 'Préstamo',
  RETURN: 'Devolución',
  INVENTORY_MOVEMENT: 'Movimiento'
};

const formatActor = (row) => {
  const firstName = row?.performedByUser?.firstName;
  const lastName = row?.performedByUser?.lastName;
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  return fullName || row?.performedByUser?.email || 'Sistema';
};

const formatMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object') return '—';
  return Object.entries(metadata)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' · ');
};

export default function AuditPage() {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ assetId: '', employeeId: '' });
  const [pagination, setPagination] = useState({ total: 0 });

  const load = async () => {
    if (filters.assetId) {
      const { data } = await AuditApi.byAsset(filters.assetId, { page: 1, pageSize: 100 });
      setRows(data.body.items);
      setPagination(data.body.pagination || { total: data.body.items?.length || 0 });
      return;
    }
    if (filters.employeeId) {
      const { data } = await AuditApi.byEmployee(filters.employeeId, { page: 1, pageSize: 100 });
      setRows(data.body.items);
      setPagination(data.body.pagination || { total: data.body.items?.length || 0 });
      return;
    }
    const { data } = await AuditApi.general({ page: 1, pageSize: 100 });
    setRows(data.body.items);
    setPagination(data.body.pagination || { total: data.body.items?.length || 0 });
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader title="Trazabilidad" subtitle="Historial de acciones del sistema" />
      <div className="card mb-4 grid gap-2 md:grid-cols-4">
        <input placeholder="Filtrar por activo ID" value={filters.assetId} onChange={(e) => setFilters((v) => ({ ...v, assetId: e.target.value }))} />
        <input placeholder="Filtrar por empleado ID" value={filters.employeeId} onChange={(e) => setFilters((v) => ({ ...v, employeeId: e.target.value }))} />
        <button className="btn-secondary" onClick={load}>Aplicar</button>
        <button className="btn-secondary" onClick={() => { setFilters({ assetId: '', employeeId: '' }); }}>Limpiar</button>
      </div>
      <div className="mb-3 text-sm text-[#5b506c]">
        {pagination.total || 0} registro(s) de historial
      </div>
      <Table
        columns={[
          { key: 'createdAt', label: 'Fecha', render: (r) => formatDateTime(r.createdAt) },
          { key: 'performedByUser', label: 'Usuario', render: (r) => formatActor(r) },
          { key: 'action', label: 'Acción', render: (r) => ACTION_LABELS[r.action] || r.action },
          { key: 'entityType', label: 'Entidad', render: (r) => ENTITY_LABELS[r.entityType] || r.entityType },
          { key: 'entityId', label: 'ID entidad' },
          { key: 'summary', label: 'Detalle', render: (r) => <div className="space-y-1"><p>{r.summary}</p><p className="text-xs text-[#7a6f8e]">{formatMetadata(r.metadata)}</p></div> }
        ]}
        rows={rows}
      />
    </div>
  );
}