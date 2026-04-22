import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AssetApi, EmployeeApi, LoanApi } from '../api/endpoints';
import PageHeader from '../components/ui/PageHeader';
import { useToast } from '../components/Toast';
import { getErrorMessage } from '../utils/format';

const createEmptyItem = () => ({ assetId: '', quantity: 1, notes: '' });

export default function LoanCreatePage() {
  const [employees, setEmployees] = useState([]);
  const [assets, setAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({
    employeeId: '',
    loanDate: '',
    expectedReturnDate: '',
    observations: '',
    items: [createEmptyItem()]
  });
  const { push } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [employeesResp, assetsResp] = await Promise.all([
          EmployeeApi.list({ page: 1, pageSize: 100 }),
          AssetApi.list({ page: 1, pageSize: 100 })
        ]);

        setEmployees(employeesResp.data.body.items);
        setAssets(assetsResp.data.body.items.filter((item) => item.availableQuantity > 0));
      } catch (error) {
        push(getErrorMessage(error), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [push]);

  
  const findAsset = (assetId) => assets.find((asset) => asset.id === Number(assetId));
   const selectedAssetIds = useMemo(
    () => new Set(form.items.map((item) => Number(item.assetId)).filter(Boolean)),
    [form.items]
  );

  const setItem = (index, patch) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, idx) => (idx === index ? { ...item, ...patch } : item))
    }));
  };

  const removeItem = (index) => {
    setForm((prev) => {
      if (prev.items.length === 1) return prev;
      return { ...prev, items: prev.items.filter((_, idx) => idx !== index) };
    });
  };

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, createEmptyItem()] }));
  };

  const availableForItem = (item) => findAsset(item.assetId)?.availableQuantity || 0;

  const submit = async (event) => {
    event.preventDefault();
    if (!form.employeeId) {
      push('Selecciona el empleado para registrar el préstamo', 'error');
      return;
    }

    if (form.items.length === 0) {
      push('Debes agregar al menos un activo al préstamo', 'error');
      return;
    }

    for (const [index, item] of form.items.entries()) {
      const asset = findAsset(item.assetId);
      const quantity = Number(item.quantity);

      if (!item.assetId) {
        push(`Selecciona un activo en la fila ${index + 1}`, 'error');
        return;
      }
      if (!Number.isInteger(quantity) || quantity < 1) {
        push(`La cantidad de la fila ${index + 1} debe ser mayor o igual a 1`, 'error');
        return;
      }

      if (quantity > availableForItem(item)) {
        push(`Stock insuficiente para ${asset?.name || 'el activo seleccionado'}`, 'error');
        return;
      }
    }

    try {
      await LoanApi.create({
        employeeId: Number(form.employeeId),
        loanDate: form.loanDate || undefined,
        expectedReturnDate: form.expectedReturnDate || undefined,
        observations: form.observations || undefined,
        items: form.items.map((item) => ({
          assetId: Number(item.assetId),
          quantity: Number(item.quantity),
          notes: item.notes || undefined
        }))
      });

      push('Préstamo registrado', 'info');
      navigate('/loans');
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  return (
   <div className="page-content">
      <PageHeader
        title="Registrar préstamo"
        subtitle="Agrega varios activos, ajusta cantidades y confirma en un solo registro."
        actions={<Link className="btn-secondary" to="/loans">Volver</Link>}
      />

      <form className="card space-y-5" onSubmit={submit}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <p className="section-subtitle">Empleado</p>
            <select
              value={form.employeeId}
              disabled={isLoading}
              onChange={(e) => setForm((v) => ({ ...v, employeeId: e.target.value }))}
            >
              <option value="">Seleccione empleado</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.employeeCode} - {employee.firstName} {employee.lastName}
                </option>
              ))}
            </select>
          </div>
         <div className="space-y-1">
            <p className="section-subtitle">Fechas</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="datetime-local"
                value={form.loanDate}
                onChange={(e) => setForm((v) => ({ ...v, loanDate: e.target.value }))}
              />
              <input
                type="datetime-local"
                value={form.expectedReturnDate}
                onChange={(e) => setForm((v) => ({ ...v, expectedReturnDate: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-[#eadff6] bg-[#fbf8ff] p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="section-subtitle">Activos a prestar</p>
              <p className="text-sm text-[#635776]">Puedes agregar, quitar y ajustar cantidades antes de guardar.</p>
            </div>
            <button type="button" className="btn-secondary" onClick={addItem}>
              Agregar ítem
            </button>
          </div>

          <div className="space-y-2">
            {form.items.map((item, idx) => {
              const selectedAsset = findAsset(item.assetId);
              const maxAvailable = Math.max(availableForItem(item), 1);

              return (
                <div key={idx} className="grid gap-2 rounded-xl border border-[#e4d8f2] bg-white p-3 md:grid-cols-[2fr_120px_1fr_auto]">
                  <select value={item.assetId} onChange={(e) => setItem(idx, { assetId: e.target.value, quantity: 1 })}>
                    <option value="">Activo</option>
                    {assets.map((asset) => {
                      const isTakenByAnotherRow = selectedAssetIds.has(asset.id) && Number(item.assetId) !== asset.id;
                      const loanedQuantity = Math.max((asset.totalQuantity || 0) - (asset.availableQuantity || 0), 0);

                      return (
                        <option key={asset.id} value={asset.id} disabled={isTakenByAnotherRow}>
                          {asset.assetCode} - {asset.name} (Disp: {asset.availableQuantity} | Prest: {loanedQuantity} | Total: {asset.totalQuantity})
                        </option>
                      );
                    })}
                  </select>

                  <input
                    type="number"
                    min="1"
                    max={maxAvailable}
                    value={item.quantity}
                    onChange={(e) => setItem(idx, { quantity: e.target.value })}
                  />

                  <input
                    placeholder="Notas"
                    value={item.notes}
                    onChange={(e) => setItem(idx, { notes: e.target.value })}
                  />

                  <button
                    type="button"
                    className="btn-danger"
                    disabled={form.items.length === 1}
                    onClick={() => removeItem(idx)}
                  >
                    Quitar
                  </button>

                  {selectedAsset && (
                    <p className="md:col-span-4 text-xs text-[#5f4b77]">
                      Disponible actual: <span className="font-semibold">{selectedAsset.availableQuantity}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-1">
          <p className="section-subtitle">Observaciones</p>
          <textarea
            placeholder="Comentarios opcionales del préstamo"
            value={form.observations}
            onChange={(e) => setForm((v) => ({ ...v, observations: e.target.value }))}
          />
        </div>

        <div className="flex justify-end">
          <button className="btn-primary" disabled={isLoading}>Registrar</button>
        </div>
      </form>
    </div>
  );
}