import { useEffect, useState } from 'react';
import { CategoryApi } from '../api/endpoints';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/Modal';
import Table from '../components/Table';
import { useAuth } from '../auth/AuthContext';
import { canManageInventory } from '../utils/permissions';
import { useToast } from '../components/Toast';
import { getErrorMessage } from '../utils/format';
import ToggleSwitch from '../components/ui/ToggleSwitch';

const initial = { name: '', description: '', isActive: true };

export default function CategoriesPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const canManage = canManageInventory(user);
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initial);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [switchingId, setSwitchingId] = useState(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const { data } = await CategoryApi.list({ page: 1, pageSize: 100 });
      setRows(data.body.items);
    } catch (error) {
      push(getErrorMessage(error), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditing(null);
    setForm(initial);
    setOpen(true);
  };

  const handleToggleStatus = async (row) => {
    setSwitchingId(row.id);
    try {
      await CategoryApi.update(row.id, { isActive: !row.isActive });
      setRows((currentRows) => currentRows.map((item) => (item.id === row.id ? { ...item, isActive: !item.isActive } : item)));
      push(`Categoría ${!row.isActive ? 'activada' : 'desactivada'} correctamente`, 'success');
    } catch (error) {
      push(getErrorMessage(error), 'error');
    } finally {
      setSwitchingId(null);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        name: form.name?.trim(),
        description: form.description?.trim() || ''
      };
      if (editing) await CategoryApi.update(editing.id, payload);
      else await CategoryApi.create({ ...payload, isActive: true });
      setOpen(false);
      setEditing(null);
      setForm(initial);
      await load();
      push(editing ? 'Categoría actualizada correctamente' : 'Categoría creada correctamente', 'success');
    } catch (error) {
      push(getErrorMessage(error), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-content">
      <PageHeader
        title="Categorías"
        subtitle="Organiza el inventario en grupos claros para facilitar filtros, reportes y control operativo."
        actions={canManage ? <button className="btn-primary" onClick={handleCreate}>Nueva categoría</button> : null}
      />
      <Table
        columns={[
          { key: 'name', label: 'Nombre' },
          { key: 'description', label: 'Descripción' },
          {
            key: 'isActive',
            label: 'Estado',
            render: (row) => (
              <div className="flex items-center gap-3">
                {canManage ? (
                  <ToggleSwitch
                    checked={row.isActive}
                    onChange={() => handleToggleStatus(row)}
                    disabled={switchingId === row.id}
                    label={row.isActive ? 'Activa' : 'Inactiva'}
                  />
                ) : (
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${row.isActive ? 'bg-[#e9fbf5] text-[#0f8a6e]' : 'bg-[#f3f4f6] text-[#6b7280]'}`}>
                    {row.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                )}
              </div>
            )
          },
          {
            key: 'actions',
            label: 'Acciones',
            render: (row) => (canManage ? <button className="btn-secondary py-1.5" onClick={() => { setEditing(row); setForm(row); setOpen(true); }}>Editar</button> : '—')
          }
        ]}
        rows={rows}
        loading={isLoading}
      />

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar categoría' : 'Nueva categoría'}>
        <form className="space-y-4" onSubmit={save}>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6f6384]" htmlFor="category-name">Nombre de la categoría</label>
            <input
              id="category-name"
              placeholder="Ej. Tecnología"
              value={form.name}
              onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6f6384]" htmlFor="category-description">Descripción</label>
            <textarea
              id="category-description"
              rows={4}
              placeholder="Describe el uso de esta categoría en el inventario"
              value={form.description || ''}
              onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))}
            />
          </div>
          <button className="btn-primary w-full" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar categoría'}</button>
        </form>
      </Modal>
    </div>
  );
}