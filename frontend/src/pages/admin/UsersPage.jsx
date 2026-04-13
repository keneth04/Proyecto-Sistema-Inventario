import { useEffect, useMemo, useState } from 'react';
import { SkillsApi, UsersApi } from '../../api/endpoints';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { getErrorMessage } from '../../utils/helpers';
import FancyCheckbox from '../../components/FancyCheckbox';
import StatusToggle from '../../components/StatusToggle';

const EMPTY_CREATE_FORM = {
  name: '',
  email: '',
  password: '',
  role: 'agente',
  campaign: '',
  allowedSkills: []
};

const DEFAULT_LIMIT = 10;

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [skills, setSkills] = useState([]);
  const [form, setForm] = useState(EMPTY_CREATE_FORM);
  const [nameFilter, setNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: DEFAULT_LIMIT, total: 0, totalPages: 0 });
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'agente', campaign: '', allowedSkills: [] });
  const { push } = useToast();

  const loadSkills = async () => {
    const skillsRes = await SkillsApi.list({ page: 1, limit: 100, status: 'active' });
    const skillsItems = Array.isArray(skillsRes.data.body?.items)
      ? skillsRes.data.body.items
      : [];
    setSkills(skillsItems.filter((s) => s.type !== 'break'));
  };

  const loadUsers = async ({ page = currentPage } = {}) => {
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

    const usersRes = await UsersApi.list(params);
    const payload = usersRes.data.body;

    setUsers(payload.items || []);
    setMeta({
      page: payload.page || page,
      limit: payload.limit || DEFAULT_LIMIT,
      total: payload.total || 0,
      totalPages: payload.totalPages || 0
    });
    setCurrentPage(payload.page || page);
  };

  const load = async ({ page = currentPage } = {}) => {
    try {
      await Promise.all([loadUsers({ page }), loadSkills()]);
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  useEffect(() => {
    load({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadUsers({ page: 1 }).catch((error) => {
        push(getErrorMessage(error), 'error');
      });
    }, 300);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameFilter, statusFilter]);

  const create = async (e) => {
    e.preventDefault();
    try {
      await UsersApi.create(form);
      push('Usuario creado');
      setForm(EMPTY_CREATE_FORM);
      await loadUsers({ page: 1 });
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  const toggleSkill = (id) => {
    setForm((prev) => ({
      ...prev,
      allowedSkills: prev.allowedSkills.includes(id)
        ? prev.allowedSkills.filter((sid) => sid !== id)
        : [...prev.allowedSkills, id]
    }));
  };

  const toggleEditSkill = (id) => {
    setEditForm((prev) => ({
      ...prev,
      allowedSkills: prev.allowedSkills.includes(id)
        ? prev.allowedSkills.filter((sid) => sid !== id)
        : [...prev.allowedSkills, id]
    }));
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'agente',
      campaign: user.campaign || '',
      allowedSkills: Array.isArray(user.allowedSkills)
        ? user.allowedSkills.map((skillId) => String(skillId))
        : []
    });
    setIsEditOpen(true);
  };

  const closeEdit = () => {
    setIsEditOpen(false);
    setEditingUser(null);
    setEditForm({ name: '', email: '', role: 'agente', campaign: '', allowedSkills: [] });
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editingUser?._id) return;

    try {
      await UsersApi.update(editingUser._id, editForm);
      push('Usuario actualizado');
      closeEdit();
      await loadUsers({ page: currentPage });
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  const toggleStatus = async (user) => {
    try {
      await UsersApi.setStatus(user._id, user.status === 'active' ? 'inactive' : 'active');
      await loadUsers({ page: currentPage });
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };


  const skillsById = useMemo(() => {
    return skills.reduce((acc, skill) => {
      acc[String(skill._id)] = skill;
      return acc;
    }, {});
  }, [skills]);

  const renderAllowedSkills = (user) => {
    const allowedSkills = Array.isArray(user.allowedSkills) ? user.allowedSkills : [];

    if (allowedSkills.length === 0) {
      return <span className="text-slate-500">Sin skills asignadas</span>;
    }

    const resolvedSkills = allowedSkills
      .map((skillId) => skillsById[String(skillId)])
      .filter(Boolean);

    if (resolvedSkills.length === 0) {
      return <span className="text-slate-500">Sin skills asignadas</span>;
    }

    return (
      <div className="flex flex-wrap gap-1.5">
        {resolvedSkills.map((skill) => (
          <span
            key={skill._id}
            className="rounded-full border border-[#e0d7ec] bg-[#faf8fd] px-2.5 py-1 text-xs font-medium text-[#4f4164]"
          >
            {skill.name}
          </span>
        ))}
      </div>
    );
  };

  const canGoPrevious = meta.page > 1;
  const canGoNext = meta.page < meta.totalPages;

  return (
    <section className="space-y-6">
      <h2 className="panel-title">Usuarios</h2>
      <form onSubmit={create} className="card space-y-5 p-6">
        <div>
          <p className="section-subtitle">Filtros</p>
          <div className="grid gap-4 md:grid-cols-2">
            <input
              placeholder="Buscar por nombre"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
        </div>

        <div>
          <p className="section-subtitle">Crear usuario</p>
          <div className="grid gap-3 lg:grid-cols-5">
            <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input placeholder="Correo" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input type="password" placeholder="Contraseña" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="agente">agente</option><option value="admin">admin</option></select>
            <input placeholder="Campaña" value={form.campaign} onChange={(e) => setForm({ ...form, campaign: e.target.value })} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <FancyCheckbox
              key={skill._id}
              id={`create-skill-${skill._id}`}
              checked={form.allowedSkills.includes(skill._id)}
              onChange={() => toggleSkill(skill._id)}
              label={skill.name}
            />
          ))}
        </div>
        <button className="btn-primary">Crear usuario</button>
      </form>

      <Table
        columns={[
          { key: 'name', label: 'Nombre' },
          { key: 'email', label: 'Correo' },
          { key: 'role', label: 'Rol' },
          { key: 'campaign', label: 'Campaña', render: (row) => row.campaign || 'Sin campaña' },
          { key: 'allowedSkills', label: 'Habilidades disponibles', render: renderAllowedSkills },
          {
            key: 'status',
            label: 'Estado',
            render: (row) => (
              <StatusToggle
                active={row.status === 'active'}
                onToggle={() => toggleStatus(row)}
                label={`Cambiar estado de ${row.name}`}
              />
            )
          },
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
        rows={users}
      />
      
      <div className="flex items-center justify-between rounded-xl border border-[#e6deef] bg-white px-4 py-3 text-sm text-[#4f4164]">
        <span>
          Página {meta.page} de {Math.max(meta.totalPages, 1)} · Total: {meta.total}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => loadUsers({ page: meta.page - 1 })}
            disabled={!canGoPrevious}
            className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => loadUsers({ page: meta.page + 1 })}
            disabled={!canGoNext}
            className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            Siguiente
          </button>
        </div>
      </div>


      <Modal open={isEditOpen} title="Editar usuario" onClose={closeEdit}>
        <form onSubmit={submitEdit} className="space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            <input
              placeholder="Nombre"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
            <input
              placeholder="Correo"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            />
            <select
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
            >
              <option value="agente">agente</option>
              <option value="admin">admin</option>
            </select>
            <input
              placeholder="Campaña"
              value={editForm.campaign}
              onChange={(e) => setEditForm({ ...editForm, campaign: e.target.value })}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <FancyCheckbox
                key={skill._id}
                id={`edit-skill-${skill._id}`}
                checked={editForm.allowedSkills.includes(skill._id)}
                onChange={() => toggleEditSkill(skill._id)}
                label={skill.name}
              />
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeEdit} className="btn-secondary">Cancelar</button>
            <button className="btn-primary">Guardar cambios</button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
