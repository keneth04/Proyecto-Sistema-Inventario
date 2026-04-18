import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ReturnApi } from '../api/endpoints';
import PageHeader from '../components/ui/PageHeader';
import Table from '../components/Table';
import { formatDateTime, fullName } from '../utils/format';
import { useAuth } from '../auth/AuthContext';

export default function ReturnsPage() {
  const [rows, setRows] = useState([]);
  const { user } = useAuth();
  const canManage = ['ADMIN', 'INVENTORY_MANAGER'].includes(user?.role);

  useEffect(() => {
    ReturnApi.list({ page: 1, pageSize: 100 }).then(({ data }) => setRows(data.body.items));
  }, []);

  return (
    <div>
      <PageHeader title="Devoluciones" actions={canManage ? <Link className="btn-primary" to="/returns/new">Registrar devolución</Link> : null} />
      <Table
        columns={[
          { key: 'id', label: '#' },
          { key: 'employee', label: 'Empleado', render: (row) => fullName(row.employee) },
          { key: 'receivedBy', label: 'Recibido por', render: (row) => fullName(row.receivedBy) },
          { key: 'returnDate', label: 'Fecha', render: (row) => formatDateTime(row.returnDate) }
        ]}
        rows={rows}
      />
    </div>
  );
}