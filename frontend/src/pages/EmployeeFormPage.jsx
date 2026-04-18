export default function EmployeeFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(emptyForm);
  const { push } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isEdit) return;
    EmployeeApi.findById(id).then(({ data }) => setForm(data.body));
  }, [id, isEdit]);

  const title = useMemo(() => (isEdit ? 'Editar empleado' : 'Nuevo empleado'), [isEdit]);

  const submit = async (event) => {
    event.preventDefault();
    const payload = { ...form, email: form.email || undefined, phone: form.phone || undefined, department: form.department || undefined, position: form.position || undefined };
    try {
      if (isEdit) await EmployeeApi.update(id, payload);
      else await EmployeeApi.create(payload);
      push('Empleado guardado', 'info');
      navigate('/employees');
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  return (
    <div>
      <PageHeader title={title} actions={<Link to="/employees" className="btn-secondary">Volver</Link>} />
      <form className="card grid gap-3 md:grid-cols-2" onSubmit={submit}>
        <input placeholder="Código" value={form.employeeCode} onChange={(e) => setForm((v) => ({ ...v, employeeCode: e.target.value }))} />
        <input placeholder="Nombres" value={form.firstName} onChange={(e) => setForm((v) => ({ ...v, firstName: e.target.value }))} />
        <input placeholder="Apellidos" value={form.lastName} onChange={(e) => setForm((v) => ({ ...v, lastName: e.target.value }))} />
        <input placeholder="Correo" value={form.email || ''} onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))} />
        <input placeholder="Teléfono" value={form.phone || ''} onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))} />
        <input placeholder="Área" value={form.department || ''} onChange={(e) => setForm((v) => ({ ...v, department: e.target.value }))} />
        <input placeholder="Cargo" value={form.position || ''} onChange={(e) => setForm((v) => ({ ...v, position: e.target.value }))} />
        <select value={form.status} onChange={(e) => setForm((v) => ({ ...v, status: e.target.value }))}><option value="ACTIVE">Activo</option><option value="INACTIVE">Inactivo</option></select>
        <button className="btn-primary md:col-span-2">Guardar</button>
      </form>
    </div>
  );
}