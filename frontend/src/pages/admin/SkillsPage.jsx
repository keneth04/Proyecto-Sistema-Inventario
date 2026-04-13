import { useEffect, useState } from 'react';
import { SkillsApi } from '../../api/endpoints';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Spinner from '../../components/Spinner';
import { useToast } from '../../components/Toast';
import { getErrorMessage } from '../../utils/helpers';
import StatusToggle from '../../components/StatusToggle';

const EMPTY_SKILL_FORM = { name: '', color: '#765492', descripcion: '' };
const DEFAULT_LIMIT = 10;

export default function SkillsPage() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_SKILL_FORM);
  const [nameFilter, setNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [meta, setMeta] = useState({ page: 1, limit: DEFAULT_LIMIT, total: 0, totalPages: 0 });
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', color: '#765492', descripcion: '' });
  const { push } = useToast();

  const load = async ({ page = 1 } = {}) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: DEFAULT_LIMIT
      };

      if (nameFilter.trim()) {
        params.name = nameFilter.trim();
      }

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }

      const { data } = await SkillsApi.list(params);
      setSkills(data.body.items || []);
      setMeta({
        page: data.body.page || page,
        limit: data.body.limit || DEFAULT_LIMIT,
        total: data.body.total || 0,
        totalPages: data.body.totalPages || 0
      });
    } catch (error) {
      push(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      load({ page: 1 });
    }, 300);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameFilter, statusFilter, typeFilter]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await SkillsApi.create(form);
      push('Habilidad creada');
      setForm(EMPTY_SKILL_FORM);
      await load({ page: 1 });
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  const openEdit = (skill) => {
    setEditingSkill(skill);
    setEditForm({
      name: skill.name || '',
      color: skill.color || '#765492',
      descripcion: skill.descripcion || ''
    });
    setIsEditOpen(true);
  };

  const closeEdit = () => {
    setIsEditOpen(false);
    setEditingSkill(null);
    setEditForm({ name: '', color: '#765492', descripcion: '' });
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editingSkill?._id) return;

    try {
      await SkillsApi.update(editingSkill._id, editForm);
      push('Habilidad actualizada');
      closeEdit();
      await load({ page: meta.page });
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  const toggle = async (skill) => {
    try {
      await SkillsApi.setStatus(skill._id, skill.status === 'active' ? 'inactive' : 'active');
      await load({ page: meta.page });
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  const canGoPrevious = meta.page > 1;
  const canGoNext = meta.page < meta.totalPages;

  return (
    <section className="space-y-6">
      <h2 className="panel-title">Habilidades</h2>
      <form onSubmit={submit} className="card space-y-3 p-6">
        <p className="section-subtitle">Crear habilidad</p>
        <div className="grid gap-3 md:grid-cols-4">
          <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-11 w-full cursor-pointer p-1" />
          <input placeholder="Descripción" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          <button className="btn-primary">Crear</button>
        </div>
      </form>

      <div className="card space-y-3 p-4">
        <p className="section-subtitle">Filtros</p>
        <div className="grid gap-3 md:grid-cols-3">
          <input
            placeholder="Buscar por nombre"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">Todos los tipos</option>
            <option value="operative">Operativa</option>
            <option value="absence">Ausencia</option>
            <option value="break">Break</option>
            <option value="rest">Rest</option>
          </select>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <>
          <Table
            columns={[
              { key: 'name', label: 'Nombre' },
              { key: 'descripcion', label: 'Descripción', render: (row) => row.descripcion?.trim() || 'Sin descripción' },
              { key: 'type', label: 'Tipo' },
              {
                key: 'status',
                label: 'Estado',
                render: (row) => (
                  <StatusToggle
                    active={row.status === 'active'}
                    onToggle={() => toggle(row)}
                    label={`Cambiar estado de ${row.name}`}
                  />
                )
              },
              { key: 'color', label: 'Color', render: (row) => <span className="rounded-lg px-2 py-1 text-white" style={{ backgroundColor: row.color }}>{row.color}</span> },
              {
                key: 'actions',
                label: 'Acciones',
                render: (row) => (
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(row)} className="btn-secondary px-3 py-1.5">Editar</button>
                  </div>
                )
              }
            ]}
            rows={skills}
          />

          <div className="flex items-center justify-between rounded-xl border border-[#e6deef] bg-white px-4 py-3 text-sm text-[#4f4164]">
            <span>
              Página {meta.page} de {Math.max(meta.totalPages, 1)} · Total: {meta.total}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => load({ page: meta.page - 1 })}
                disabled={!canGoPrevious}
                className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => load({ page: meta.page + 1 })}
                disabled={!canGoNext}
                className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}

      <Modal open={isEditOpen} title="Editar habilidad" onClose={closeEdit}>
        <form onSubmit={submitEdit} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              placeholder="Nombre"
              value={editForm.name}
              disabled={editingSkill?.type === 'break' || editingSkill?.type === 'rest'}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
            <input
              type="color"
              value={editForm.color}
              onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
              className="h-10 w-full cursor-pointer p-1"
            />
          </div>

          <input
            className="w-full"
            placeholder="Descripción"
            value={editForm.descripcion}
            onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })}
          />

          {(editingSkill?.type === 'break' || editingSkill?.type === 'rest') && (
            <p className="text-sm text-[#6b7280]">El nombre de skills BREAK/REST no se puede editar.</p>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeEdit} className="btn-secondary">Cancelar</button>
            <button className="btn-primary">Guardar cambios</button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
