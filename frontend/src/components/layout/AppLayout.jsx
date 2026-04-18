import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/assets', label: 'Activos' },
  { to: '/employees', label: 'Empleados' },
  { to: '/categories', label: 'Categorías' },
  { to: '/loans', label: 'Préstamos' },
  { to: '/returns', label: 'Devoluciones' },
  { to: '/audit', label: 'Trazabilidad' }
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#f3f1f8]">
      <header className="border-b border-[#e8deef] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-[#765492]">MVP Inventario</p>
            <h1 className="text-xl font-bold text-[#261d35]">Gestión de Activos y Préstamos</h1>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-[#6b6477]">{user?.role}</p>
            <button className="mt-2 btn-secondary py-1.5" onClick={onLogout}>Cerrar sesión</button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        <aside className="card h-fit p-3">
          <nav className="space-y-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-[#765492] text-white' : 'text-[#433257] hover:bg-[#f8f5fc]'}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}