import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AssetApi, CategoryApi } from '../api/endpoints';
import Modal from '../components/Modal';
import Table from '../components/Table';
import PageHeader from '../components/ui/PageHeader';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { getErrorMessage } from '../utils/format';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Todos' },
  { value: 'AVAILABLE', label: 'Disponible' },
  { value: 'LOANED', label: 'Prestado' },
  { value: 'MAINTENANCE', label: 'Mantenimiento' },
  { value: 'INACTIVE', label: 'Inactivo' },
  { value: 'RETIRED', label: 'Retirado' }
];

const STATUS_LABELS = {
  ACTIVE: 'Disponible',
  INACTIVE: 'Inactivo',
  MAINTENANCE: 'Mantenimiento',
  RETIRED: 'Retirado'
};

const statusBadgeClass = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700',
  LOANED: 'bg-amber-100 text-amber-700',
  MAINTENANCE: 'bg-orange-100 text-orange-700',
  INACTIVE: 'bg-slate-200 text-slate-700',
  RETIRED: 'bg-rose-100 text-rose-700'
};

const initialForm = {
  name: '',
  brand: '',
  serialNumber: '',
  status: 'ACTIVE',
  description: '',
  categoryId: ''
};

const toOperationalStatus = (asset) => {
  if (asset.status === 'MAINTENANCE') return 'MAINTENANCE';
  if (asset.status === 'INACTIVE') return 'INACTIVE';
  if (asset.status === 'RETIRED') return 'RETIRED';
  if (asset.availableQuantity < asset.totalQuantity) return 'LOANED';
  return 'AVAILABLE';
};

const normalizeForm = (asset) => ({
  name: asset?.name || '',
  brand: asset?.brand || '',
  serialNumber: asset?.serialNumber || '',
  status: asset?.status || 'ACTIVE',
  description: asset?.description || '',
  categoryId: String(asset?.categoryId || '')
});

export default function AssetsPage() {
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [open, setOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [form, setForm] = useState(initialForm);
  const { user } = useAuth();
  const { push } = useToast();
  const canManage = ['ADMIN', 'INVENTORY_MANAGER'].includes(user?.role);

  const load = async () => {
    setIsLoading(true);
    try {
      const [{ data: assetsData }, { data: categoriesData }] = await Promise.all([
        AssetApi.list({ page: 1, pageSize: 200 }),
        CategoryApi.list({ page: 1, pageSize: 200 })
      ]);
      setRows(assetsData.body.items || []);
      setCategories(categoriesData.body.items || []);
    } catch (error) {
      push(getErrorMessage(error), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

   const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rows.filter((row) => {
      const operationalStatus = toOperationalStatus(row);
      const matchesStatus = statusFilter === 'ALL' || statusFilter === operationalStatus;
      const matchesCategory = categoryFilter === 'ALL' || String(row.categoryId) === categoryFilter;

      if (!matchesStatus || !matchesCategory) return false;
      if (!normalizedSearch) return true;

      const searchable = [
        row.name,
        row.brand,
        row.serialNumber,
        row.category?.name,
        row.description,
        row.assetCode
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [rows, search, statusFilter, categoryFilter]);

  const openCreate = () => {
    if (categories.length === 0) {
      push('Debes crear al menos una categoría antes de registrar activos', 'error');
      return;
    }
    setEditingAsset(null);
    setForm({ ...initialForm, categoryId: String(categories[0].id) });
    setOpen(true);
  };

  const openEdit = (asset) => {
    setEditingAsset(asset);
    setForm(normalizeForm(asset));
    setOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim() || undefined,
      serialNumber: form.serialNumber.trim() || undefined,
      status: form.status,
      description: form.description.trim() || undefined,
      categoryId: Number(form.categoryId)
    };

    try {
      if (editingAsset) {
        await AssetApi.update(editingAsset.id, payload);
        push('Activo actualizado correctamente', 'success');
      } else {
        await AssetApi.create({
          ...payload,
          assetCode: `AST-${Date.now()}`,
          totalQuantity: 1,
          minimumStock: 0
        });
        push('Activo creado correctamente', 'success');
      }
      await load();
      setOpen(false);
      setEditingAsset(null);
      setForm(initialForm);
    } catch (error) {
      push(getErrorMessage(error), 'error');
      } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Activos"
        subtitle="Gestiona equipos y mobiliario con filtros rápidos y estado operativo en tiempo real."
        actions={canManage ? <button className="btn-primary" onClick={openCreate}>Nuevo activo</button> : null}
      />

      <div className="card mb-4 grid gap-3 md:grid-cols-4">
        <input
          placeholder="Buscar por nombre, marca, serial o descripción"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          <option value="ALL">Todas las categorías</option>
          {categories.map((category) => (
            <option key={category.id} value={String(category.id)}>{category.name}</option>
          ))}
        </select>
        <div className="rounded-xl border border-[#e7deef] bg-[#faf8fd] px-3 py-2 text-sm text-[#5b506c]">
          {isLoading ? 'Cargando activos...' : `${filteredRows.length} activo(s) mostrado(s)`}
        </div>
      </div>

      <Table
        columns={[
          { key: 'name', label: 'Nombre' },
          { key: 'brand', label: 'Marca' },
          { key: 'serialNumber', label: 'Serial' },
          { key: 'category', label: 'Categoría', render: (row) => row.category?.name || '—' },
          {
            key: 'status',
            label: 'Estado',
            render: (row) => {
              const operationalStatus = toOperationalStatus(row);
              const label = STATUS_OPTIONS.find((option) => option.value === operationalStatus)?.label || STATUS_LABELS[row.status] || row.status;
              return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass[operationalStatus] || 'bg-slate-100 text-slate-700'}`}>{label}</span>;
            }
          },
          {
            key: 'description',
            label: 'Descripción',
            render: (row) => (row.description ? <span className="max-w-xs whitespace-normal break-words">{row.description}</span> : '—')
          },
          {
            key: 'actions',
            label: 'Acciones',
            render: (row) => (
              <div className="flex gap-2">
                {canManage ? <button className="btn-secondary py-1.5" onClick={() => openEdit(row)}>Editar rápido</button> : null}
                {canManage ? <Link className="btn-secondary py-1.5" to={`/assets/${row.id}/edit`}>Editar completo</Link> : null}
              </div>
            )
          }
        ]}
        rows={filteredRows}
      />

      <Modal open={open} onClose={() => setOpen(false)} title={editingAsset ? 'Editar activo' : 'Nuevo activo'}>
        <form className="grid gap-3" onSubmit={submit}>
          <input
            placeholder="Nombre del activo"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            required
          />
          <input
            placeholder="Marca"
            value={form.brand}
            onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))}
          />
          <input
            placeholder="Serial (único si aplica)"
            value={form.serialNumber}
            onChange={(event) => setForm((current) => ({ ...current, serialNumber: event.target.value }))}
          />
          <select value={form.categoryId} onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))} required>
            <option value="">Selecciona categoría</option>
            {categories.map((category) => (
              <option key={category.id} value={String(category.id)}>{category.name}</option>
            ))}
          </select>
          <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
            <option value="ACTIVE">Disponible</option>
            <option value="MAINTENANCE">Mantenimiento</option>
            <option value="INACTIVE">Inactivo</option>
            <option value="RETIRED">Retirado</option>
          </select>
          <textarea
            placeholder="Descripción (estado físico, observaciones, detalles)"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            rows={4}
          />
          <button className="btn-primary" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar activo'}</button>
        </form>
      </Modal>
    </div>
  );
}