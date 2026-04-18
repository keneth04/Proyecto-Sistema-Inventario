import { useEffect, useState } from 'react';
import { AuditApi } from '../api/endpoints';
import PageHeader from '../components/ui/PageHeader';
import Table from '../components/Table';
import { formatDateTime } from '../utils/format';

export default function AuditPage() {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ assetId: '', employeeId: '' });

  const load = async () => {
    if (filters.assetId) {
      const { data } = await AuditApi.byAsset(filters.assetId, { page: 1, pageSize: 100 });
      setRows(data.body.items);
      return;
    }
    if (filters.employeeId) {
      const { data } = await AuditApi.byEmployee(filters.employeeId, { page: 1, pageSize: 100 });
      setRows(data.body.items);
      return;
    }
    const { data } = await AuditApi.general({ page: 1, pageSize: 100 });
    setRows(data.body.items);
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
      <Table
        columns={[
          { key: 'createdAt', label: 'Fecha', render: (r) => formatDateTime(r.createdAt) },
          { key: 'action', label: 'Acción' },
          { key: 'entityType', label: 'Entidad' },
          { key: 'entityId', label: 'ID entidad' },
          { key: 'summary', label: 'Resumen' }
        ]}
        rows={rows}
      />
    </div>
  );
}