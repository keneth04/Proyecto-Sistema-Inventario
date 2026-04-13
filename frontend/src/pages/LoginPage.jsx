import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import Spinner from '../components/Spinner';
import { useToast } from '../components/Toast';
import { getErrorMessage } from '../utils/helpers';
import BrandLogo from '../components/BrandLogo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lockUntil, setLockUntil] = useState(null);
  const [now, setNow] = useState(Date.now());
  const { login } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!lockUntil) return undefined;

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [lockUntil]);

  useEffect(() => {
    if (lockUntil && now >= lockUntil) {
      setLockUntil(null);
      setErrorMessage('');
    }
  }, [lockUntil, now]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      const { data } = await AuthApi.login({ email, password });
      login(data.body.user, data.body.csrfToken);
      navigate(data.body.user.role === 'admin' ? '/admin' : '/agent', { replace: true });
    } catch (error) {
      const message = getErrorMessage(error);
      const lockMatch = message.match(/Cuenta bloqueada, intenta nuevamente en (\d+) minutos/i);
      if (lockMatch) {
        const lockMinutes = Number(lockMatch[1]);
        setLockUntil(Date.now() + lockMinutes * 60 * 1000);
      }
      setErrorMessage(message);
      push(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const isLocked = Boolean(lockUntil && now < lockUntil);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f1f8] p-4 md:p-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-[#e6deef] bg-white shadow-[0_24px_60px_rgba(35,18,56,0.12)] lg:grid-cols-2">
        <form onSubmit={onSubmit} className="p-7 md:p-10 lg:p-12">
          <p className="section-subtitle">Acceso seguro</p>
          <h1 className="mb-2 text-3xl font-bold text-[#261d35]">Inicio de sesión</h1>
          <p className="mb-8 text-sm text-[#6b6477]">Gestiona tu operación en minutos con una experiencia clara y profesional.</p>

        <label className="mb-2 block text-sm font-semibold text-[#413653]">Correo</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="mb-4 w-full" placeholder="correo@empresa.com" />

        <label className="mb-2 block text-sm font-semibold text-[#413653]">Contraseña</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mb-2 w-full" placeholder="••••••••" />

        <div className="mb-5 text-right">
            <Link to="/forgot-password" className="text-sm font-semibold text-[#765492] transition hover:text-[#5c3f73] hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {errorMessage ? (
          <p className="mb-4 rounded-xl border border-[#e12d2d]/20 bg-[#e12d2d]/10 px-3 py-2 text-sm text-[#b42323]">
              {errorMessage}
            </p>
          ) : null}

          <button disabled={loading || isLocked} className="btn-primary w-full">
            {loading ? <Spinner label="Ingresando..." /> : 'Iniciar sesión'}
          </button>
        </form>

        <aside className="relative hidden overflow-hidden bg-[#765492] p-12 text-white lg:flex lg:flex-col lg:justify-center">
          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-24 -left-14 h-64 w-64 rounded-full bg-[#5c3f73]/40" />

          <div className="relative z-10 rounded-3xl border border-white/20 bg-white/10 p-6 shadow-[0_14px_40px_rgba(27,13,42,0.25)] backdrop-blur-sm">
            <BrandLogo className="mb-8 h-16" />
            <h2 className="mb-3 text-4xl font-bold leading-tight">Bienvenido de vuelta</h2>
            <p className="max-w-md text-base leading-relaxed text-white/90">
              Hoy también es un gran día para coordinar turnos con precisión y mantener a tu equipo conectado.
            </p>
            <div className="mt-8 h-1.5 w-28 rounded-full bg-[#e12d2d]" />
          </div>
        </aside>
      </div>
    </div>
  );
}
