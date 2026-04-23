import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthApi } from '../api/endpoints';
import Spinner from '../components/Spinner';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { getErrorMessage } from '../utils/format';
import logo from '../assets/brand/hispacontact-logo.png';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const location = useLocation();

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await AuthApi.login(form);
      login(data.body.user);
      const target = location.state?.from?.pathname || '/';
      navigate(target, { replace: true });
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      push(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#efedf5] p-3 sm:p-4">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-[#e3deec] bg-white shadow-[0_24px_52px_rgba(59,35,90,0.14)] lg:grid-cols-2">
        <form className="p-6 sm:p-8" onSubmit={onSubmit}>
          <p className="section-subtitle">Acceso seguro</p>
          <h1 className="mb-2 text-4xl font-bold leading-tight text-[#1f214c]">Inicio de sesión</h1>
          <p className="mb-7 max-w-md text-base text-[#5f6079]">Gestiona tu operación en minutos con una experiencia clara y profesional.</p>

          <label className="mb-2 block text-sm font-semibold text-[#2f2346]">Correo</label>
          <input
            className="mb-5 w-full"
            placeholder="correo@empresa.com"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />

          <label className="mb-2 block text-sm font-semibold text-[#2f2346]">Contraseña</label>
          <input
            type="password"
            className="mb-5 w-full"
            placeholder="********"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
          />

          <div className="mb-5 text-right">
            <Link to="/forgot-password" className="text-sm font-semibold text-[#765492] hover:text-[#5f3f79] hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {error ? <p className="mb-4 rounded-xl border border-[#ffccd3] bg-[#fff3f6] p-3 text-sm text-[#b4233d]">{error}</p> : null}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? <Spinner label="Validando" /> : 'Iniciar sesión'}
          </button>
        </form>

        <aside className="relative hidden overflow-hidden bg-[#7a589c] p-8 text-white lg:block">
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-[#6b4c8d] opacity-60" />
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#9c7ab9] opacity-40" />
          <div className="relative z-10 mt-8 rounded-3xl border border-[#ffffff33] bg-[#ffffff1a] p-7 shadow-[0_18px_40px_rgba(26,9,43,0.22)]">
            <img src={logo} alt="HispaContact" className="h-14 w-auto" />
            <h2 className="mt-7 text-4xl font-bold leading-tight">Bienvenido de vuelta</h2>
            <p className="mt-5 text-xl leading-relaxed text-[#f2ebfa]">Hoy también es un gran día para coordinar préstamos y mantener tu inventario bajo control.</p>
            <div className="mt-8 h-2 w-28 rounded-full bg-[#ef233c]" />
          </div>
        </aside>
      </section>
    </div>
  );
}
