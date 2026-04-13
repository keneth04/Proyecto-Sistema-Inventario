import { Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { BrandMark } from '../components/BrandLogo';

export default function AgentLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#f3f1f8]">
      <header className="border-b border-[#e6deef] bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandMark className="h-9 w-9 rounded-lg text-lg" />
            <div>
              <p className="text-base font-extrabold leading-none tracking-tight"><span className="text-[#e12d2d]">hispa</span><span className="text-[#765492]">contact</span></p>
              <h1 className="text-sm font-semibold text-[#2d2340]">Mi horario · {user?.name}</h1>
            </div>
          </div>
          <button onClick={() => logout()} className="btn-danger">Cerrar sesión</button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6">
        <Outlet />
      </main>
    </div>
  );
}
