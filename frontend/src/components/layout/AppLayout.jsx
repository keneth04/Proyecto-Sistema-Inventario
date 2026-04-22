import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import logo from '../../assets/brand/hispacontact-logo.png';
import { ROLE_LABELS } from '../../constants/roles';
import { fullName } from '../../utils/format';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/assets', label: 'Activos' },
  { to: '/employees', label: 'Empleados' },
  { to: '/categories', label: 'Categorías' },
  { to: '/loans', label: 'Préstamos' },
  { to: '/returns', label: 'Devoluciones' },
  { to: '/audit', label: 'Trazabilidad' },
  { to: '/reports', label: 'Reportes' }
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#efedf5] text-[#261d35]">
      <div className="mx-auto flex w-full max-w-none gap-4 px-2 py-2 sm:gap-5 sm:px-3 sm:py-3 lg:px-4">
        <aside className="sticky top-2 hidden h-[calc(100vh-1rem)] w-[290px] flex-shrink-0 grid-rows-[auto,1fr,auto] overflow-hidden rounded-2xl border border-[#e3deec] bg-[#f7f6fb] p-4 shadow-[0_10px_28px_rgba(76,53,105,0.14)] lg:grid">
          <div className="mb-3">
            <div className="rounded-2xl border border-[#e2dce9] bg-[#edeaf2] p-4">
              <img src={logo} alt="HispaContact" className="h-16 w-auto" />
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#7e6c95]">{ROLE_LABELS[user?.role] || 'Usuario'}</p>
              <h1 className="text-3xl font-bold text-[#23163b]">{fullName(user)}</h1>
            </div>
            </div>
          <div className="min-h-0 overflow-y-auto pr-1">
            <p className="mb-3 rounded-lg border border-[#dfd8ea] bg-[#eeebf5] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#64547a]">moddulos</p>
            <nav className="space-y-1 pb-4">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `block rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'border-l-4 border-[#ef233c] bg-[#775599] text-white shadow-sm' : 'text-[#433257] hover:bg-[#ebe6f4]'}`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>
            <div className="rounded-xl border border-[#e1dae9] bg-white p-3 text-sm">
            <p className="font-semibold">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-[#6b6477]">{ROLE_LABELS[user?.role] || user?.role}</p>
          <button className="mt-3 w-full btn-danger py-2" onClick={onLogout}>Cerrar sesión</button>
          </div>
        
        </aside>

        <div className="min-w-0 flex-1">
          <header className="mb-4 rounded-2xl border border-[#e5dfed] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(90,63,120,0.08)] sm:mb-6 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[#775599]">Sistema de inventario y préstamos</p>
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

          <main className="page-transition" key={location.pathname}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}