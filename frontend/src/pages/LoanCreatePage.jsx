import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AssetApi, EmployeeApi, LoanApi } from '../api/endpoints';
import PageHeader from '../components/ui/PageHeader';
import { useToast } from '../components/Toast';
import { getErrorMessage } from '../utils/format';

export default function LoanCreatePage() {
  const [employees, setEmployees] = useState([]);
  const [assets, setAssets] = useState([]);
  const [form, setForm] = useState({ employeeId: '', loanDate: '', expectedReturnDate: '', observations: '', items: [{ assetId: '', quantity: 1, notes: '' }] });
  const { push } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      EmployeeApi.list({ page: 1, pageSize: 100 }),
      AssetApi.list({ page: 1, pageSize: 100 })
    ]).then(([employeesResp, assetsResp]) => {
      setEmployees(employeesResp.data.body.items);
      setAssets(assetsResp.data.body.items.filter((item) => item.availableQuantity > 0));
    });
  }, []);

  const setItem = (index, patch) => setForm((prev) => ({ ...prev, items: prev.items.map((item, idx) => (idx === index ? { ...item, ...patch } : item)) }));
  const findAsset = (assetId) => assets.find((asset) => asset.id === Number(assetId));
  const availableForItem = (item) => findAsset(item.assetId)?.availableQuantity || 0;

  const submit = async (event) => {
    event.preventDefault();
    for (const item of form.items) {
      const available = availableForItem(item);
      if (!item.assetId) {
        push('Debes seleccionar un activo para cada ítem', 'error');
        return;
      }
      if (Number(item.quantity) > available) {
        const selectedAsset = findAsset(item.assetId);
        push(`Stock insuficiente para ${selectedAsset?.name || 'el activo seleccionado'}`, 'error');
        return;
      }
    }
    try {
      await LoanApi.create({
        employeeId: Number(form.employeeId),
        loanDate: form.loanDate || undefined,
        expectedReturnDate: form.expectedReturnDate || undefined,
        observations: form.observations || undefined,
        items: form.items.map((item) => ({ assetId: Number(item.assetId), quantity: Number(item.quantity), notes: item.notes || undefined }))
      });
      push('Préstamo registrado', 'info');
      navigate('/loans');
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  return (
    <div>
      <PageHeader title="Registrar préstamo" actions={<Link className="btn-secondary" to="/loans">Volver</Link>} />
      <form className="card space-y-3" onSubmit={submit}>
        <select value={form.employeeId} onChange={(e) => setForm((v) => ({ ...v, employeeId: e.target.value }))}><option value="">Seleccione empleado</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.employeeCode} - {e.firstName} {e.lastName}</option>)}</select>
        <div className="grid gap-3 md:grid-cols-2"><input type="datetime-local" value={form.loanDate} onChange={(e) => setForm((v) => ({ ...v, loanDate: e.target.value }))} /><input type="datetime-local" value={form.expectedReturnDate} onChange={(e) => setForm((v) => ({ ...v, expectedReturnDate: e.target.value }))} /></div>
        {form.items.map((item, idx) => (
          <div key={idx} className="grid gap-2 md:grid-cols-3">
            <select value={item.assetId} onChange={(e) => setItem(idx, { assetId: e.target.value })}>
              <option value="">Activo</option>
              {assets.map((a) => {
                const loanedQuantity = Math.max((a.totalQuantity || 0) - (a.availableQuantity || 0), 0);
                return (
                  <option key={a.id} value={a.id}>
                    {a.assetCode} - {a.name} (Disp: {a.availableQuantity} | Prest: {loanedQuantity} | Total: {a.totalQuantity})
                  </option>
                );
              })}
            </select>
            <input type="number" min="1" max={Math.max(availableForItem(item), 1)} value={item.quantity} onChange={(e) => setItem(idx, { quantity: e.target.value })} />
            <input placeholder="Notas" value={item.notes} onChange={(e) => setItem(idx, { notes: e.target.value })} />
          </div>
        ))}
        <button type="button" className="btn-secondary" onClick={() => setForm((v) => ({ ...v, items: [...v.items, { assetId: '', quantity: 1, notes: '' }] }))}>Agregar ítem</button>
        <textarea placeholder="Observaciones" value={form.observations} onChange={(e) => setForm((v) => ({ ...v, observations: e.target.value }))} />
        <button className="btn-primary">Registrar</button>
      </form>
    </div>
  );
}