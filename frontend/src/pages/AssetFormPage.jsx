import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AssetApi, CategoryApi } from '../api/endpoints';
import PageHeader from '../components/ui/PageHeader';
import { useToast } from '../components/Toast';
import { getErrorMessage } from '../utils/format';

const emptyForm = { categoryId: '', assetCode: '', name: '', brand: '', model: '', serialNumber: '', description: '', totalQuantity: 1, status: 'ACTIVE' };

const normalizeAssetForForm = (asset) => ({
  categoryId: String(asset?.categoryId ?? ''),
  assetCode: asset?.assetCode ?? '',
  name: asset?.name ?? '',
  brand: asset?.brand ?? '',
  model: asset?.model ?? '',
  serialNumber: asset?.serialNumber ?? '',
  description: asset?.description ?? '',
  totalQuantity: asset?.totalQuantity ?? 1,
  status: asset?.status ?? 'ACTIVE'
});

export default function AssetFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const { push } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data: categoryData } = await CategoryApi.list({ page: 1, pageSize: 100 });
      setCategories(categoryData.body.items);
      if (isEdit) {
        const { data } = await AssetApi.findById(id);
        setForm(normalizeAssetForForm(data.body));
      }
    };
    load();
  }, [id, isEdit]);

  const title = useMemo(() => (isEdit ? 'Editar activo' : 'Nuevo activo'), [isEdit]);

  const submit = async (event) => {
    event.preventDefault();
    const basePayload = {
      categoryId: Number(form.categoryId),
      name: form.name,
      brand: form.brand || undefined,
      model: form.model || undefined,
      serialNumber: form.serialNumber || undefined,
      description: form.description || undefined,
      totalQuantity: Number(form.totalQuantity),
      status: form.status
    };

    try {
      if (isEdit) {
        await AssetApi.update(id, basePayload);
      } else {
        await AssetApi.create({
          ...basePayload,
          assetCode: form.assetCode
        });
      }
      push('Activo guardado correctamente', 'info');
      navigate('/assets');
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  return (
    <div>
      <PageHeader title={title} actions={<Link className="btn-secondary" to="/assets">Volver</Link>} />
      <form className="card grid gap-3 md:grid-cols-2" onSubmit={submit}>
        <input placeholder="Código activo" value={form.assetCode} onChange={(e) => setForm((v) => ({ ...v, assetCode: e.target.value }))} disabled={isEdit} />
        <input placeholder="Nombre" value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} />
        <select value={form.categoryId} onChange={(e) => setForm((v) => ({ ...v, categoryId: e.target.value }))}>
          <option value="">Seleccione categoría</option>
          {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <input placeholder="Marca" value={form.brand || ''} onChange={(e) => setForm((v) => ({ ...v, brand: e.target.value }))} />
        <input placeholder="Modelo" value={form.model || ''} onChange={(e) => setForm((v) => ({ ...v, model: e.target.value }))} />
        <input placeholder="Serial" value={form.serialNumber || ''} onChange={(e) => setForm((v) => ({ ...v, serialNumber: e.target.value }))} />
        <input type="number" min="0" placeholder="Cantidad total" value={form.totalQuantity} onChange={(e) => setForm((v) => ({ ...v, totalQuantity: e.target.value }))} />
        <select value={form.status} onChange={(e) => setForm((v) => ({ ...v, status: e.target.value }))}>
          <option value="ACTIVE">Activo</option><option value="INACTIVE">Inactivo</option><option value="MAINTENANCE">Mantenimiento</option><option value="RETIRED">Retirado</option>
        </select>
        <textarea className="md:col-span-2" placeholder="Descripción" value={form.description || ''} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} />
        <button className="btn-primary md:col-span-2">Guardar</button>
      </form>
    </div>
  );
}