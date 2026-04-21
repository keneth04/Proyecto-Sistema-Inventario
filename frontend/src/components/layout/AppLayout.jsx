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
    <div className="min-h-screen bg-[#f3f1f8] text-[#261d35]">
      <div className="mx-auto flex max-w-7xl gap-4 px-3 py-4 sm:gap-6 sm:px-4 sm:py-6">
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-[240px] flex-shrink-0 flex-col justify-between rounded-2xl border border-[#e6deef] bg-white p-4 shadow-[0_10px_30px_rgba(118,84,146,0.08)] lg:flex">
          <div>
            <div className="mb-5 border-b border-[#efe8f6] pb-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[#765492]">MVP Inventario</p>
              <h1 className="mt-1 text-lg font-bold text-[#261d35]">Gestión empresarial</h1>
            </div>
            <nav className="space-y-1">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-[#765492] text-white shadow-sm' : 'text-[#433257] hover:bg-[#f8f5fc]'}`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="rounded-xl border border-[#ede6f5] bg-[#faf8fd] p-3 text-sm">
            <p className="font-semibold">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-[#6b6477]">{user?.role}</p>
          <button className="mt-3 w-full btn-secondary py-1.5" onClick={onLogout}>Cerrar sesión</button>
          </div>
        
        </aside>

        <div className="min-w-0 flex-1">
          <header className="mb-4 rounded-2xl border border-[#e6deef] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(118,84,146,0.08)] sm:mb-6 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[#765492]">Sistema de inventario y préstamos</p>
                <h2 className="text-xl font-bold text-[#261d35]">Panel administrativo</h2>
              </div>
              <button className="btn-secondary py-1.5 lg:hidden" onClick={onLogout}>Cerrar sesión</button>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${isActive ? 'bg-[#765492] text-white' : 'border border-[#e3dcef] bg-white text-[#433257]'}`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </header>

          <main>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}