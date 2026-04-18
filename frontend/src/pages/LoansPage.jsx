import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LoanApi } from '../api/endpoints';
import PageHeader from '../components/ui/PageHeader';
import Table from '../components/Table';
import { formatDateTime, fullName } from '../utils/format';
import { useAuth } from '../auth/AuthContext';

export default function LoansPage() {
  const [rows, setRows] = useState([]);
  const { user } = useAuth();
  const canManage = ['ADMIN', 'INVENTORY_MANAGER'].includes(user?.role);

  useEffect(() => {
    LoanApi.list({ page: 1, pageSize: 100 }).then(({ data }) => setRows(data.body.items));
  }, []);

  return (
    <div>
      <PageHeader title="Préstamos" actions={canManage ? <Link className="btn-primary" to="/loans/new">Registrar préstamo</Link> : null} />
      <Table
        columns={[
          { key: 'id', label: '#' },
          { key: 'employee', label: 'Empleado', render: (r) => fullName(r.employee) },
          { key: 'deliveredBy', label: 'Entregado por', render: (r) => fullName(r.deliveredBy) },
          { key: 'loanDate', label: 'Fecha', render: (r) => formatDateTime(r.loanDate) },
          { key: 'status', label: 'Estado' }
        ]}
        rows={rows}
      />
    </div>
  );
}