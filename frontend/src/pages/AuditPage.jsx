import { useEffect, useState } from 'react';
import { AuditApi } from '../api/endpoints';
import PageHeader from '../components/ui/PageHeader';
import Table from '../components/Table';
import { formatDateTime, getErrorMessage } from '../utils/format';
import { useToast } from '../components/Toast';

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
  const [filters, setFilters] = useState({ assetName: '', employeeName: '', performedBy: '', module: '', action: '', date: '' });
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useToast();

  const load = async ({ nextPage = pagination.page, nextPageSize = pagination.pageSize, nextFilters = filters } = {}) => {
    setIsLoading(true);
    try {
      const { data } = await AuditApi.general({ page: nextPage, pageSize: nextPageSize, ...nextFilters });
      setRows(data.body.items || []);
      setPagination(data.body.pagination || { page: nextPage, pageSize: nextPageSize, total: data.body.items?.length || 0 });
    } catch (error) {
      push(getErrorMessage(error), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / (pagination.pageSize || 20)));

  const applyFilters = () => {
    load({ nextPage: 1, nextFilters: filters });
  };

  const clearFilters = () => {
    const resetFilters = { assetName: '', employeeName: '', performedBy: '', module: '', action: '', date: '' };
    setFilters(resetFilters);
    load({ nextPage: 1, nextFilters: resetFilters });
  };


  return (
    <div className="page-content">
      <PageHeader title="Trazabilidad" subtitle="Historial de acciones del sistema" />
      <div className="list-toolbar md:grid-cols-4">
        <input placeholder="Filtrar por nombre de activo" value={filters.assetName} onChange={(e) => setFilters((v) => ({ ...v, assetName: e.target.value }))} />
        <input placeholder="Filtrar por empleado" value={filters.employeeName} onChange={(e) => setFilters((v) => ({ ...v, employeeName: e.target.value }))} />
        <input placeholder="Filtrar por usuario ejecutor" value={filters.performedBy} onChange={(e) => setFilters((v) => ({ ...v, performedBy: e.target.value }))} />
        <input type="date" value={filters.date} onChange={(e) => setFilters((v) => ({ ...v, date: e.target.value }))} />
        <select value={filters.module} onChange={(e) => setFilters((v) => ({ ...v, module: e.target.value }))}>
          <option value="">Todos los módulos</option>
          {Object.entries(ENTITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={filters.action} onChange={(e) => setFilters((v) => ({ ...v, action: e.target.value }))}>
          <option value="">Todas las acciones</option>
          {Object.entries(ACTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button className="btn-secondary" onClick={applyFilters} disabled={isLoading}>Aplicar</button>
        <button className="btn-secondary" onClick={clearFilters} disabled={isLoading}>Limpiar</button>
      </div>
      <div className="mb-3 text-sm text-[#5b506c]">
        {isLoading ? 'Cargando trazabilidad...' : `${rows.length} registro(s) en página / ${pagination.total || 0} total`}
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
        loading={isLoading}
      />
      <div className="list-footer">
        <div className="flex items-center gap-2">
          <span>Página {pagination.page || 1} de {totalPages}</span>
          <select
            className="w-auto"
            value={pagination.pageSize}
            onChange={(event) => load({ nextPage: 1, nextPageSize: Number(event.target.value) })}
            disabled={isLoading}
          >
            <option value={10}>10 por página</option>
            <option value={20}>20 por página</option>
            <option value={50}>50 por página</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary py-1.5" disabled={(pagination.page || 1) <= 1 || isLoading} onClick={() => load({ nextPage: (pagination.page || 1) - 1 })}>Anterior</button>
          <button className="btn-secondary py-1.5" disabled={(pagination.page || 1) >= totalPages || isLoading} onClick={() => load({ nextPage: (pagination.page || 1) + 1 })}>Siguiente</button>
        </div>
      </div>
    </div>
  );
}