import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EmployeeApi } from '../api/endpoints';
import PageHeader from '../components/ui/PageHeader';
import { useToast } from '../components/Toast';
import { getErrorMessage } from '../utils/format';
import ToggleSwitch from '../components/ui/ToggleSwitch';

const emptyForm = {
  employeeCode: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  department: '',
  position: '',
  status: 'ACTIVE'
};


export default function EmployeeFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(emptyForm);
  const { push } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isEdit) {
      navigate('/employees', { replace: true });
      return;
    }

    const load = async () => {
      try {
        const { data } = await EmployeeApi.findById(id);
        setForm({ ...emptyForm, ...data.body });
      } catch (error) {
        push(getErrorMessage(error), 'error');
        navigate('/employees', { replace: true });
      }
    };

    load();
  }, [id, isEdit, navigate, push]);

  const title = useMemo(() => (isEdit ? 'Editar empleado' : 'Nuevo empleado'), [isEdit]);

  const submit = async (event) => {
    event.preventDefault();
    const payload = {
      employeeCode: form.employeeCode.trim(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email?.trim() || undefined,
      phone: form.phone?.trim() || undefined,
      department: form.department?.trim() || undefined,
      position: form.position?.trim() || undefined,
      status: form.status
    };

    try {
      await EmployeeApi.update(id, payload);
      push('Empleado actualizado', 'success');
      navigate('/employees');
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  return (
    <div>
      <PageHeader title={title} actions={<Link to="/employees" className="btn-secondary">Volver</Link>} />
      <form className="card grid gap-3 md:grid-cols-2" onSubmit={submit}>
        <input placeholder="Código" value={form.employeeCode} onChange={(e) => setForm((v) => ({ ...v, employeeCode: e.target.value }))} required />
        <input placeholder="Nombres" value={form.firstName} onChange={(e) => setForm((v) => ({ ...v, firstName: e.target.value }))} required />
        <input placeholder="Apellidos" value={form.lastName} onChange={(e) => setForm((v) => ({ ...v, lastName: e.target.value }))} required />
        <input placeholder="Correo" value={form.email || ''} onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))} type="email" />
        <input placeholder="Teléfono" value={form.phone || ''} onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))} />
        <input placeholder="Área" value={form.department || ''} onChange={(e) => setForm((v) => ({ ...v, department: e.target.value }))} />
        <input placeholder="Cargo" value={form.position || ''} onChange={(e) => setForm((v) => ({ ...v, position: e.target.value }))} />
        <div className="md:col-span-2">
          <ToggleSwitch
            checked={form.status === 'ACTIVE'}
            onChange={(checked) => setForm((v) => ({ ...v, status: checked ? 'ACTIVE' : 'INACTIVE' }))}
            label={form.status === 'ACTIVE' ? 'Empleado activo' : 'Empleado inactivo'}
          />
        </div>
        <button className="btn-primary md:col-span-2">Guardar</button>
      </form>
    </div>
  );
}