import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthApi } from '../api/endpoints';
import Spinner from '../components/Spinner';
import { useToast } from '../components/Toast';
import { getErrorMessage } from '../utils/format';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const token = useMemo(() => (searchParams.get('token') || '').trim(), [searchParams]);
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const hasValidToken = token.length >= 32;

  const onSubmit = async (event) => {
    event.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      push('Las contraseñas no coinciden.', 'error');
      return;
    }

    setLoading(true);
    try {
      await AuthApi.resetPassword({
        token,
        newPassword: form.newPassword
      });
      push('Contraseña actualizada. Ahora puedes iniciar sesión.', 'success');
      navigate('/login', { replace: true });
    } catch (error) {
      push(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form className="card w-full max-w-md" onSubmit={onSubmit}>
        <p className="section-subtitle">Recuperar acceso</p>
        <h1 className="mb-4 text-3xl font-bold text-[#261d35]">Nueva contraseña</h1>

        {!hasValidToken ? (
          <p className="mb-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            El enlace no es válido. Solicita una nueva recuperación.
          </p>
        ) : null}

        <label className="mb-2 block text-sm font-semibold">Nueva contraseña</label>
        <input
          type="password"
          className="mb-4 w-full"
          placeholder="Mínimo 8 caracteres"
          value={form.newPassword}
          onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))}
          minLength={8}
          required
          disabled={!hasValidToken}
        />

        <label className="mb-2 block text-sm font-semibold">Confirmar contraseña</label>
        <input
          type="password"
          className="mb-6 w-full"
          placeholder="Repite la contraseña"
          value={form.confirmPassword}
          onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
          minLength={8}
          required
          disabled={!hasValidToken}
        />

        <button className="btn-primary mb-4 w-full" disabled={loading || !hasValidToken}>
          {loading ? <Spinner label="Actualizando" /> : 'Actualizar contraseña'}
        </button>

        <Link to="/login" className="block text-center text-sm font-medium text-[#6f3ff5] hover:underline">
          Volver al login
        </Link>
      </form>
    </div>
  );
}