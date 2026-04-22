import { useEffect, useMemo, useState } from 'react';
import { LoanApi, ReturnApi } from '../api/endpoints';
import PageHeader from '../components/ui/PageHeader';
import Table from '../components/Table';
import { useToast } from '../components/Toast';
import { formatDateTime, fullName, getErrorMessage } from '../utils/format';

const DEFAULT_CONDITION = 'GOOD';


export default function ReturnsPage() {
  const [activeLoans, setActiveLoans] = useState([]);
  const [returnsHistory, setReturnsHistory] = useState([]);
  const [selectedLoanId, setSelectedLoanId] = useState(null);
  const [form, setForm] = useState({ itemCondition: DEFAULT_CONDITION, observations: '', returnDate: '' });
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({ query: '', employee: '', asset: '', loanDate: '' });
  const [historyFilters, setHistoryFilters] = useState({ query: '', status: 'ALL', returnDate: '' });
  const { push } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [loanResponse, returnResponse] = await Promise.all([
          LoanApi.list({ page: 1, pageSize: 100 }),
          ReturnApi.list({ page: 1, pageSize: 200 })
        ]);
        setActiveLoans(loanResponse.data.body.items.filter((loan) => loan.status !== 'CLOSED'));
        setReturnsHistory(returnResponse.data.body.items || []);
      } catch (error) {
        push(getErrorMessage(error), 'error');
      } finally {
        setLoading(false);
        setHistoryLoading(false);
      }
    };

    loadData();
  }, [push]);

  const employeeOptions = useMemo(() => {
    const map = new Map();
    activeLoans.forEach((loan) => {
      map.set(loan.employeeId, fullName(loan.employee));
    });

    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [activeLoans]);

  const assetOptions = useMemo(() => {
    const map = new Map();
    activeLoans.forEach((loan) => {
      loan.items.forEach((item) => {
        if (item.returnedQuantity < item.quantity) {
          map.set(item.assetId, item.asset?.name || `Activo #${item.assetId}`);
        }
      });
    });
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [activeLoans]);

  const filteredLoans = useMemo(() => {
    const normalizedQuery = filters.query.trim().toLowerCase();

    return activeLoans.filter((loan) => {
      const employeeName = fullName(loan.employee).toLowerCase();
      const assetNames = loan.items.map((item) => item.asset?.name || '').join(' ').toLowerCase();
      const loanDate = loan.loanDate ? new Date(loan.loanDate).toISOString().slice(0, 10) : '';

      const matchesQuery =
        !normalizedQuery ||
        String(loan.id).includes(normalizedQuery) ||
        employeeName.includes(normalizedQuery) ||
        assetNames.includes(normalizedQuery);

      const matchesEmployee = !filters.employee || String(loan.employeeId) === filters.employee;
      const matchesAsset = !filters.asset || loan.items.some((item) => String(item.assetId) === filters.asset && item.returnedQuantity < item.quantity);
      const matchesDate = !filters.loanDate || loanDate === filters.loanDate;

      return matchesQuery && matchesEmployee && matchesAsset && matchesDate;
    });
  }, [activeLoans, filters]);

  const selectedLoan = useMemo(() => activeLoans.find((loan) => loan.id === selectedLoanId) || null, [activeLoans, selectedLoanId]);

  const pendingItems = useMemo(
    () =>
      selectedLoan
        ? selectedLoan.items
            .filter((item) => item.returnedQuantity < item.quantity)
            .map((item) => ({
              loanItemId: item.id,
              assetId: item.assetId,
              assetName: item.asset?.name || `Activo #${item.assetId}`,
              pendingQuantity: item.quantity - item.returnedQuantity
            }))
        : [],
    [selectedLoan]
  );

  const reloadActiveLoans = async () => {
    setLoading(true);
    setHistoryLoading(true);
    try {
      const [loanResponse, returnResponse] = await Promise.all([
        LoanApi.list({ page: 1, pageSize: 100 }),
        ReturnApi.list({ page: 1, pageSize: 200 })
      ]);
      setActiveLoans(loanResponse.data.body.items.filter((loan) => loan.status !== 'CLOSED'));
      setReturnsHistory(returnResponse.data.body.items || []);
      setSelectedLoanId(null);
    } catch (error) {
      push(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
      setHistoryLoading(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!selectedLoan) {
      push('Selecciona un préstamo activo antes de registrar la devolución.', 'error');
      return;
    }

    if (pendingItems.length === 0) {
      push('El préstamo seleccionado ya no tiene ítems pendientes de devolución.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await ReturnApi.create({
        loanId: selectedLoan.id,
        employeeId: selectedLoan.employeeId,
        returnDate: form.returnDate || undefined,
        observations: form.observations || undefined,
        items: pendingItems.map((item) => ({
          loanItemId: item.loanItemId,
          assetId: item.assetId,
          quantity: item.pendingQuantity,
          itemCondition: form.itemCondition,
          observations: form.observations || undefined
        }))
      });

      push('Devolución registrada correctamente', 'info');
      setForm({ itemCondition: DEFAULT_CONDITION, observations: '', returnDate: '' });
      await reloadActiveLoans();
    } catch (error) {
      push(getErrorMessage(error), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel = (status) => {
    if (status === 'CLOSED') return 'Devuelto completo';
    if (status === 'PARTIALLY_RETURNED') return 'Devuelto parcial';
    return 'Registrado';
  };

  const historyRows = useMemo(() => {
    const normalizedQuery = historyFilters.query.trim().toLowerCase();

    return returnsHistory.filter((record) => {
      const deliveredByName = fullName(record.loan?.deliveredByUser);
      const employeeName = fullName(record.employee);
      const assetNames = (record.items || []).map((item) => item.asset?.name || '').join(' ');
      const conditionText = (record.items || []).map((item) => item.itemCondition || '').join(' ');
      const returnDate = record.returnDate ? new Date(record.returnDate).toISOString().slice(0, 10) : '';

      const matchesQuery =
        !normalizedQuery ||
        String(record.id).includes(normalizedQuery) ||
        deliveredByName.toLowerCase().includes(normalizedQuery) ||
        employeeName.toLowerCase().includes(normalizedQuery) ||
        assetNames.toLowerCase().includes(normalizedQuery) ||
        conditionText.toLowerCase().includes(normalizedQuery) ||
        (record.observations || '').toLowerCase().includes(normalizedQuery);

      const matchesStatus = historyFilters.status === 'ALL' || record.loan?.status === historyFilters.status;
      const matchesReturnDate = !historyFilters.returnDate || returnDate === historyFilters.returnDate;

      return matchesQuery && matchesStatus && matchesReturnDate;
    });
  }, [historyFilters, returnsHistory]);


  return (
    <div className="space-y-4">
      <PageHeader
        title="Devoluciones"
        subtitle="Consulta préstamos activos, aplica filtros y registra devoluciones sin cambiar de pantalla."
      />
      <section className="card space-y-3">
        <p className="section-subtitle">Filtro rápido</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            placeholder="Buscar por préstamo, empleado o activo"
            value={filters.query}
            onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))}
          />
          <select value={filters.employee} onChange={(e) => setFilters((prev) => ({ ...prev, employee: e.target.value }))}>
            <option value="">Todos los empleados</option>
            {employeeOptions.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
          <select value={filters.asset} onChange={(e) => setFilters((prev) => ({ ...prev, asset: e.target.value }))}>
            <option value="">Todos los activos</option>
            {assetOptions.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </select>
          <input type="date" value={filters.loanDate} onChange={(e) => setFilters((prev) => ({ ...prev, loanDate: e.target.value }))} />
        </div>
      </section>

      <section className="card space-y-3">
        <p className="section-subtitle">Préstamos activos</p>
        <Table
          loading={loading}
          columns={[
            { key: 'id', label: '#' },
            { key: 'employee', label: 'Empleado', render: (loan) => fullName(loan.employee) },
            { key: 'loanDate', label: 'Fecha préstamo', render: (loan) => formatDateTime(loan.loanDate) },
            {
              key: 'assets',
              label: 'Activos pendientes',
              render: (loan) =>
                loan.items
                  .filter((item) => item.returnedQuantity < item.quantity)
                  .map((item) => `${item.asset?.name || `Activo #${item.assetId}`} (${item.quantity - item.returnedQuantity})`)
                  .join(', ')
            },
            { key: 'status', label: 'Estado' },
            {
              key: 'action',
              label: 'Acción',
              render: (loan) => (
                <button
                  type="button"
                  className={selectedLoanId === loan.id ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => setSelectedLoanId(loan.id)}
                >
                  {selectedLoanId === loan.id ? 'Seleccionado' : 'Seleccionar'}
                </button>
              )
            }
          ]}
          rows={filteredLoans}
          emptyLabel="No hay préstamos activos pendientes de devolución"
        />
      </section>

      <form className="card space-y-3" onSubmit={submit}>
        <p className="section-subtitle">Registrar devolución</p>
        <div className="rounded-xl border border-[#e6deef] bg-[#f8f5fc] p-3 text-sm text-[#493b5f]">
          {selectedLoan ? (
            <>
              <p>
                <span className="font-semibold">Préstamo:</span> #{selectedLoan.id} — {fullName(selectedLoan.employee)}
              </p>
              <p className="mt-1">
                <span className="font-semibold">Ítems pendientes:</span>{' '}
                {pendingItems.map((item) => `${item.assetName} (${item.pendingQuantity})`).join(', ')}
              </p>
            </>
          ) : (
            <p>Selecciona un préstamo activo para habilitar el registro.</p>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <select
            value={form.itemCondition}
            onChange={(e) => setForm((prev) => ({ ...prev, itemCondition: e.target.value }))}
            disabled={!selectedLoan}
          >
            <option value="GOOD">Estado entrega: Bueno</option>
            <option value="FAIR">Estado entrega: Regular</option>
            <option value="DAMAGED">Estado entrega: Dañado</option>
            <option value="NON_FUNCTIONAL">Estado entrega: No funcional</option>
          </select>
          <input
            type="datetime-local"
            value={form.returnDate}
            onChange={(e) => setForm((prev) => ({ ...prev, returnDate: e.target.value }))}
            disabled={!selectedLoan}
          />
          <input
            placeholder="Observación"
            value={form.observations}
            onChange={(e) => setForm((prev) => ({ ...prev, observations: e.target.value }))}
            disabled={!selectedLoan}
          />
        </div>

        <button className="btn-primary" disabled={!selectedLoan || submitting}>
          {submitting ? 'Registrando...' : 'Registrar devolución'}
        </button>
      </form>

      <section className="card space-y-3">
        <p className="section-subtitle">Historial de devoluciones</p>
        <div className="grid gap-3 md:grid-cols-3">
          <input
            placeholder="Buscar por responsable, empleado, activo u observación"
            value={historyFilters.query}
            onChange={(e) => setHistoryFilters((prev) => ({ ...prev, query: e.target.value }))}
          />
          <select
            value={historyFilters.status}
            onChange={(e) => setHistoryFilters((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="ALL">Todos los estados</option>
            <option value="CLOSED">Devuelto completo</option>
            <option value="PARTIALLY_RETURNED">Devuelto parcial</option>
            <option value="OPEN">Préstamo abierto</option>
            <option value="CANCELLED">Préstamo cancelado</option>
          </select>
          <input
            type="date"
            value={historyFilters.returnDate}
            onChange={(e) => setHistoryFilters((prev) => ({ ...prev, returnDate: e.target.value }))}
          />
        </div>

        <Table
          loading={historyLoading}
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
            { key: 'status', label: 'Estado devolución', render: (record) => statusLabel(record.loan?.status) },
            { key: 'observations', label: 'Observaciones', render: (record) => record.observations || 'Sin observaciones' }
          ]}
          rows={historyRows}
          emptyLabel="No hay devoluciones registradas con los filtros aplicados"
        />
      </section>

    </div>
  );
}