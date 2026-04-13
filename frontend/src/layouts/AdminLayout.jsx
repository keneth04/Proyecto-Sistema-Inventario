import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import BrandLogo, { BrandMark } from '../components/BrandLogo';

const links = [
  { to: '/admin/skills', label: 'Habilidades' },
  { to: '/admin/users', label: 'Agentes' },
  { to: '/admin/horarios-dia', label: 'Ver horarios por día' },
  { to: '/admin/turnos-tipo', label: 'Turnos reutilizables' },
  { to: '/admin/crear-borrador', label: 'Crear horario borrador' },
  { to: '/admin/publicar-semana', label: 'Publicar semana' },
  { to: '/admin/editar-semana', label: 'Editar semana' },
  { to: '/admin/dotacion', label: 'Dotación por día' },
  { to: '/admin/reporte-horas', label: 'Reporte de horas' }
];

export default function AdminLayout() {
  const { logout, user } = useAuth();

  return (
    <div className="flex min-h-screen bg-[#f3f1f8]">
      <aside className="sticky top-0 flex h-screen w-80 flex-col border-r border-[#e5deee] bg-white px-5 py-6">
        <div className="rounded-2xl border border-[#ece4f5] bg-[#f8f5fc] p-4">
          <BrandLogo className="mb-3" />
          <p className="text-xs uppercase tracking-[0.14em] text-[#765492]">Administrador</p>
          <p className="text-sm font-semibold text-[#2b2139]">{user?.name}</p>
        </div>

        <nav className="mt-6 flex-1 space-y-1.5 overflow-y-auto pr-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `group relative block overflow-hidden rounded-xl px-4 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-[#765492] text-white shadow-md shadow-[#765492]/20' : 'text-[#4b3f5e] hover:bg-[#f4effa] hover:text-[#2d2340]'}`}
            >
              {({ isActive }) => (
                <>
                  <span className={`absolute inset-y-1 left-1 w-1 rounded-full bg-[#e12d2d] transition ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-70'}`} />
                  <span className="relative">{link.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sticky bottom-0 mt-4 border-t border-[#ece4f5] bg-white pt-4">
          <button onClick={() => logout()} className="btn-danger w-full">Cerrar sesión</button>
        </div>

      </aside>
      
      <main className="flex-1 p-6 lg:p-8">
        <header className="card mb-6 flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <BrandMark className="h-9 w-9 rounded-lg text-lg" />
            <div>
              <h1 className="text-xl font-bold text-[#251c34]">Panel de administración</h1>
              <p className="text-sm text-[#5e536d]">Gestiona horarios, agentes y habilidades de manera centralizada.</p>
            </div>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
