import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthApi } from '../api/endpoints';
import Spinner from '../components/Spinner';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { getErrorMessage } from '../utils/format';

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
      login(data.body.user, data.body.token);
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
    <div className="flex min-h-screen items-center justify-center p-4">
      <form className="card w-full max-w-md" onSubmit={onSubmit}>
        <p className="section-subtitle">Acceso interno</p>
        <h1 className="mb-6 text-3xl font-bold text-[#261d35]">Inventario empresarial</h1>
        <label className="mb-2 block text-sm font-semibold">Correo</label>
        <input
          className="mb-4 w-full"
          placeholder="usuario@empresa.com"
          value={form.email}
          onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
        />
        <label className="mb-2 block text-sm font-semibold">Contraseña</label>
        <input
          type="password"
          className="mb-4 w-full"
          placeholder="********"
          value={form.password}
          onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
        />

        {error ? <p className="mb-4 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p> : null}
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? <Spinner label="Validando" /> : 'Iniciar sesión'}
        </button>
      </form>
    </div>
  );
}
