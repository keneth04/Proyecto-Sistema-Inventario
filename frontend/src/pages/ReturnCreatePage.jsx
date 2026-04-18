import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LoanApi, ReturnApi } from '../api/endpoints';
import PageHeader from '../components/ui/PageHeader';
import { useToast } from '../components/Toast';
import { getErrorMessage } from '../utils/format';

export default function ReturnCreatePage() {
  const [loans, setLoans] = useState([]);
  const [loanDetail, setLoanDetail] = useState(null);
  const [form, setForm] = useState({ loanId: '', employeeId: '', returnDate: '', observations: '', items: [] });
  const { push } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    LoanApi.list({ page: 1, pageSize: 100 }).then(({ data }) => {
      setLoans(data.body.items.filter((loan) => loan.status !== 'CLOSED'));
    });
  }, []);

  const onLoanChange = async (value) => {
    setForm((prev) => ({ ...prev, loanId: value }));
    if (!value) return;
    const { data } = await LoanApi.findById(value);
    const loan = data.body;
    setLoanDetail(loan);
    setForm((prev) => ({
      ...prev,
      loanId: value,
      employeeId: loan.employeeId,
      items: loan.items
        .filter((item) => item.returnedQuantity < item.quantity)
        .map((item) => ({
          loanItemId: item.id,
          assetId: item.assetId,
          quantity: item.quantity - item.returnedQuantity,
          itemCondition: 'GOOD',
          observations: ''
        }))
    }));
  };

  const setItem = (index, patch) => setForm((prev) => ({ ...prev, items: prev.items.map((item, idx) => (idx === index ? { ...item, ...patch } : item)) }));

  const submit = async (event) => {
    event.preventDefault();
    try {
      await ReturnApi.create({
        loanId: Number(form.loanId),
        employeeId: Number(form.employeeId),
        returnDate: form.returnDate || undefined,
        observations: form.observations || undefined,
        items: form.items.map((item) => ({ ...item, quantity: Number(item.quantity) }))
      });
      push('Devolución registrada', 'info');
      navigate('/returns');
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  return (
    <div>
      <PageHeader title="Registrar devolución" actions={<Link className="btn-secondary" to="/returns">Volver</Link>} />
      <form className="card space-y-3" onSubmit={submit}>
        <select value={form.loanId} onChange={(e) => onLoanChange(e.target.value)}>
          <option value="">Seleccione préstamo</option>
          {loans.map((loan) => <option key={loan.id} value={loan.id}>Préstamo #{loan.id}</option>)}
        </select>
        {loanDetail ? <p className="text-sm text-[#6b6477]">Empleado: {loanDetail.employee?.firstName} {loanDetail.employee?.lastName}</p> : null}
        {form.items.map((item, idx) => (
          <div key={idx} className="grid gap-2 md:grid-cols-4">
            <input disabled value={`Item préstamo #${item.loanItemId}`} />
            <input type="number" min="1" value={item.quantity} onChange={(e) => setItem(idx, { quantity: Number(e.target.value) })} />
            <select value={item.itemCondition} onChange={(e) => setItem(idx, { itemCondition: e.target.value })}><option>GOOD</option><option>FAIR</option><option>DAMAGED</option><option>NON_FUNCTIONAL</option></select>
            <input placeholder="Observación" value={item.observations} onChange={(e) => setItem(idx, { observations: e.target.value })} />
          </div>
        ))}
        <button className="btn-primary">Registrar devolución</button>
      </form>
    </div>
  );
}