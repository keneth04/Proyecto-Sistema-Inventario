import { useEffect, useState } from 'react';
import { CategoryApi } from '../api/endpoints';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/Modal';
import Table from '../components/Table';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { getErrorMessage } from '../utils/format';

const initial = { name: '', description: '', isActive: true };

export default function CategoriesPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const canManage = ['ADMIN', 'INVENTORY_MANAGER'].includes(user?.role);
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initial);

  const load = async () => {
    const { data } = await CategoryApi.list({ page: 1, pageSize: 100 });
    setRows(data.body.items);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (event) => {
    event.preventDefault();
    try {
      if (editing) await CategoryApi.update(editing.id, form);
      else await CategoryApi.create(form);
      setOpen(false);
      setEditing(null);
      setForm(initial);
      await load();
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  return (
    <div>
      <PageHeader title="Categorías" actions={canManage ? <button className="btn-primary" onClick={() => setOpen(true)}>Nueva categoría</button> : null} />
      <Table
        columns={[
          { key: 'name', label: 'Nombre' },
          { key: 'description', label: 'Descripción' },
          { key: 'isActive', label: 'Estado', render: (row) => (row.isActive ? 'Activa' : 'Inactiva') },
          { key: 'actions', label: 'Acciones', render: (row) => canManage ? <button className="btn-secondary py-1.5" onClick={() => { setEditing(row); setForm(row); setOpen(true); }}>Editar</button> : '—' }
        ]}
        rows={rows}
      />

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar categoría' : 'Nueva categoría'}>
        <form className="space-y-3" onSubmit={save}>
          <input placeholder="Nombre" value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} />
          <textarea placeholder="Descripción" value={form.description || ''} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((v) => ({ ...v, isActive: e.target.checked }))} /> Activa</label>
          <button className="btn-primary">Guardar</button>
        </form>
      </Modal>
    </div>
  );
}