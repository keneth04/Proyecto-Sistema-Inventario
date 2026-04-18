import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmployeeApi } from '../api/endpoints';
import PageHeader from '../components/ui/PageHeader';
import Table from '../components/Table';
import { useAuth } from '../auth/AuthContext';

export default function EmployeesPage() {
  const [rows, setRows] = useState([]);
  const { user } = useAuth();
  const canManage = ['ADMIN', 'INVENTORY_MANAGER'].includes(user?.role);

  useEffect(() => {
    EmployeeApi.list({ page: 1, pageSize: 100 }).then(({ data }) => setRows(data.body.items));
  }, []);

  return (
    <div>
      <PageHeader title="Empleados" actions={canManage ? <Link to="/employees/new" className="btn-primary">Nuevo empleado</Link> : null} />
      <Table
        columns={[
          { key: 'employeeCode', label: 'Código' },
          { key: 'firstName', label: 'Nombre' },
          { key: 'lastName', label: 'Apellido' },
          { key: 'department', label: 'Área' },
          { key: 'position', label: 'Cargo' },
          { key: 'status', label: 'Estado' },
          { key: 'actions', label: 'Acciones', render: (r) => canManage ? <Link className="btn-secondary py-1.5" to={`/employees/${r.id}/edit`}>Editar</Link> : '—' }
        ]}
        rows={rows}
      />
    </div>
  );
}