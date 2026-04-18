import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AssetsPage from './pages/AssetsPage';
import AssetFormPage from './pages/AssetFormPage';
import EmployeesPage from './pages/EmployeesPage';
import EmployeeFormPage from './pages/EmployeeFormPage';
import CategoriesPage from './pages/CategoriesPage';
import LoansPage from './pages/LoansPage';
import LoanCreatePage from './pages/LoanCreatePage';
import ReturnsPage from './pages/ReturnsPage';
import ReturnCreatePage from './pages/ReturnCreatePage';
import AuditPage from './pages/AuditPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleRoute from './routes/RoleRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
       <Route path="/403" element={<UnauthorizedPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route element={<RoleRoute allowedRoles={['ADMIN', 'INVENTORY_MANAGER']} />}>
            <Route path="/assets/new" element={<AssetFormPage />} />
            <Route path="/assets/:id/edit" element={<AssetFormPage />} />
            <Route path="/employees/new" element={<EmployeeFormPage />} />
            <Route path="/employees/:id/edit" element={<EmployeeFormPage />} />
            <Route path="/loans/new" element={<LoanCreatePage />} />
            <Route path="/returns/new" element={<ReturnCreatePage />} />
          </Route>

          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/loans" element={<LoansPage />} />
          <Route path="/returns" element={<ReturnsPage />} />
          <Route path="/audit" element={<AuditPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
      <Route path="/home" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
