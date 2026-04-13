import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function ProtectedRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth();

    if (isBootstrapping) {
      return null;
    }

    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
  }

export function RoleRoute({ role }) {
  const { user, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return null;
  }
  
  if (!user) return <Navigate to="/login" replace />;

  if (user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/agent'} replace />;
  }

  return <Outlet />;
}
