import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmployeeApi } from '../api/endpoints';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/Modal';
import Table from '../components/Table';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { getErrorMessage } from '../utils/format';

const initialForm = {
  employeeCode: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  department: '',
  position: '',
  status: 'ACTIVE'
};

export default function EmployeesPage() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const { push } = useToast();
  const canManage = ['ADMIN', 'INVENTORY_MANAGER'].includes(user?.role);

  const load = async () => {
    setIsLoading(true);
    try {
      const { data } = await EmployeeApi.list({ page: 1, pageSize: 100 });
      setRows(data.body.items);
    } catch (error) {
      push(getErrorMessage(error), 'error');
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    load();
  }, []);

  const onOpenCreate = () => {
    setForm(initialForm);
    setOpen(true);
  };

  const onCreate = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        employeeCode: form.employeeCode.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        department: form.department.trim() || undefined,
        position: form.position.trim() || undefined,
        status: form.status
      };
      await EmployeeApi.create(payload);
      await load();
      setOpen(false);
      setForm(initialForm);
      push('Empleado creado correctamente', 'success');
    } catch (error) {
      push(getErrorMessage(error), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Empleados"
        subtitle="Administra colaboradores y mantén trazabilidad clara sobre préstamos activos y devoluciones."
        actions={canManage ? <button className="btn-primary" onClick={onOpenCreate}>Nuevo empleado</button> : null}
      />
      <Table
        columns={[
          { key: 'employeeCode', label: 'Código' },
          { key: 'firstName', label: 'Nombre' },
          { key: 'lastName', label: 'Apellido' },
          { key: 'department', label: 'Área' },
          { key: 'position', label: 'Cargo' },
          { key: 'status', label: 'Estado' },
          {
            key: 'actions',
            label: 'Acciones',
            render: (r) => (canManage ? <Link className="btn-secondary py-1.5" to={`/employees/${r.id}/edit`}>Editar</Link> : '—')
          }
        ]}
        rows={rows}
        loading={isLoading}
      />
      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo empleado">
        <form className="grid gap-3 md:grid-cols-2" onSubmit={onCreate}>
          <input
            placeholder="Código"
            value={form.employeeCode}
            onChange={(e) => setForm((v) => ({ ...v, employeeCode: e.target.value }))}
            required
          />
          <input
            placeholder="Nombres"
            value={form.firstName}
            onChange={(e) => setForm((v) => ({ ...v, firstName: e.target.value }))}
            required
          />
          <input
            placeholder="Apellidos"
            value={form.lastName}
            onChange={(e) => setForm((v) => ({ ...v, lastName: e.target.value }))}
            required
          />
          <input
            placeholder="Correo"
            value={form.email}
            onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))}
            type="email"
          />
          <input
            placeholder="Teléfono"
            value={form.phone}
            onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))}
          />
          <input
            placeholder="Área"
            value={form.department}
            onChange={(e) => setForm((v) => ({ ...v, department: e.target.value }))}
          />
          <input
            placeholder="Cargo"
            value={form.position}
            onChange={(e) => setForm((v) => ({ ...v, position: e.target.value }))}
          />
          <select value={form.status} onChange={(e) => setForm((v) => ({ ...v, status: e.target.value }))}>
            <option value="ACTIVE">Activo</option>
            <option value="INACTIVE">Inactivo</option>
          </select>
          <button className="btn-primary md:col-span-2" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar empleado'}</button>
        </form>
      </Modal>
    </div>
  );
}