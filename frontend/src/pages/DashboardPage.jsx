import { useEffect, useState } from 'react';
import { InventoryApi } from '../api/endpoints';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Spinner from '../components/Spinner';
import Table from '../components/Table';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [loanedAssets, setLoanedAssets] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [summaryResp, loanedResp] = await Promise.all([
        InventoryApi.summary(),
        InventoryApi.loanedAssets()
      ]);
      setSummary(summaryResp.data.body);
      setLoanedAssets(loanedResp.data.body.slice(0, 5));
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <Spinner label="Cargando dashboard" />;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Resumen operativo de inventario y préstamos" />
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard label="Activos" value={summary.totalAssets} />
        <StatCard label="Stock total" value={summary.totalQuantity} />
        <StatCard label="Disponibles" value={summary.totalAvailable} />
        <StatCard label="En préstamo" value={summary.totalLoaned} />
      </div>
      <h3 className="mb-2 text-lg font-bold">Activos actualmente prestados</h3>
      <Table
        columns={[
          { key: 'assetCode', label: 'Código' },
          { key: 'name', label: 'Activo' },
          { key: 'totalQuantity', label: 'Total' },
          { key: 'availableQuantity', label: 'Disponible' }
        ]}
        rows={loanedAssets}
      />
    </div>
  );
}