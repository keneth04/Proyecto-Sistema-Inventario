import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthApi } from '../api/endpoints';
import Spinner from '../components/Spinner';
import { useToast } from '../components/Toast';
import { getErrorMessage } from '../utils/helpers';
import BrandLogo from '../components/BrandLogo';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { push } = useToast();

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      push('El enlace no es válido: falta el token de recuperación', 'error');
      return;
    }

    if (password.length < 8) {
      push('La nueva contraseña debe tener al menos 8 caracteres', 'error');
      return;
    }

    if (password !== confirmPassword) {
      push('La confirmación no coincide con la nueva contraseña', 'error');
      return;
    }

    setLoading(true);
    try {
      await AuthApi.resetPassword({ token, newPassword: password });
      setSuccess(true);
      push('Contraseña actualizada correctamente', 'info');
    } catch (error) {
      push(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f1f8] p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-3xl border border-[#e6deef] bg-white p-7 shadow-[0_18px_45px_rgba(35,18,56,0.12)] md:p-8">
        <BrandLogo className="mb-5" />
        <h1 className="mb-2 text-xl font-bold text-[#261d35]">Restablecer contraseña</h1>
        <p className="mb-5 text-sm text-[#5e536d]">Define una contraseña nueva para tu cuenta.</p>

        <label className="mb-2 block text-sm font-semibold text-[#413653]">Nueva contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-3 w-full"
          required
        />

        <label className="mb-2 block text-sm font-semibold text-[#413653]">Confirmar contraseña</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mb-4 w-full"
          required
        />

        <button disabled={loading || success} className="btn-primary mb-3 w-full">
          {loading ? <Spinner label="Guardando..." /> : 'Guardar nueva contraseña'}
        </button>

        {success ? <p className="mb-3 text-sm font-medium text-emerald-700">Tu contraseña fue actualizada. Ya puedes iniciar sesión.</p> : null}

        <Link to="/login" className="text-sm font-semibold text-[#765492] hover:text-[#5c3f73] hover:underline">
          Ir al inicio de sesión
        </Link>
      </form>
    </div>
  );
}
