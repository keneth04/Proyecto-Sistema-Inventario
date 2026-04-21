import { useEffect, useState } from 'react';
import { InventoryApi } from '../api/endpoints';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Spinner from '../components/Spinner';
import Table from '../components/Table';
import { formatDateTime, fullName, getErrorMessage } from '../utils/format';
import { useToast } from '../components/Toast';

const movementTypeLabels = {
  INITIAL_LOAD: 'Carga inicial',
  LOAN_OUT: 'Préstamo',
  RETURN_IN: 'Devolución',
  ADJUSTMENT_UP: 'Ajuste +',
  ADJUSTMENT_DOWN: 'Ajuste -',
  MAINTENANCE_OUT: 'Salida a mantenimiento',
  MAINTENANCE_IN: 'Entrada de mantenimiento',
  RETIREMENT: 'Retiro'
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const { push } = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await InventoryApi.executiveDashboard();
        setDashboard(response.data.body);
      } catch (error) {
        push(getErrorMessage(error), 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [push]);

  if (loading) return <Spinner label="Cargando dashboard" />;
  if (!dashboard) return null;

  const { kpis, latestMovements } = dashboard;

  return (
    <div>
      <PageHeader
        title="Dashboard ejecutivo"
        subtitle="Visión operativa de activos, préstamos activos y movimientos recientes."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Activos totales" value={kpis.totalAssets} />
        <StatCard label="Disponibles" value={kpis.available} />
        <StatCard label="Prestados" value={kpis.loaned} />
        <StatCard label="En mantenimiento" value={kpis.maintenance} />
        <StatCard label="Devoluciones pendientes" value={kpis.pendingReturns} />
        <StatCard label="Empleados con préstamos" value={kpis.employeesWithActiveLoans} />
      </div>
        <h3 className="mb-2 text-lg font-bold">Últimos movimientos</h3>
      <Table
        columns={[
          {
            key: 'createdAt',
            label: 'Fecha',
            render: (row) => formatDateTime(row.createdAt)
          },
          {
            key: 'movementType',
            label: 'Movimiento',
            render: (row) => movementTypeLabels[row.movementType] || row.movementType
          },
          {
            key: 'asset',
            label: 'Activo',
            render: (row) => row.asset?.name || '—'
          },
          {
            key: 'employee',
            label: 'Empleado',
            render: (row) => fullName(row.employee)
          },
          {
            key: 'quantityDelta',
            label: 'Delta',
            render: (row) => (row.quantityDelta > 0 ? `+${row.quantityDelta}` : row.quantityDelta)
          },
          { key: 'reason', label: 'Detalle' }
        ]}
        rows={latestMovements}
      />
    </div>
  );
}