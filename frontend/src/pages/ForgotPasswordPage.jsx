import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthApi } from '../api/endpoints';
import Spinner from '../components/Spinner';
import { useToast } from '../components/Toast';
import { getErrorMessage } from '../utils/format';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { push } = useToast();

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await AuthApi.forgotPassword({ email });
      setSent(true);
      push('Si el correo existe, recibirás un enlace de recuperación.', 'success');
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
        <h1 className="mb-4 text-3xl font-bold text-[#261d35]">Recuperar contraseña</h1>
        <p className="mb-6 text-sm text-slate-600">
          Ingresa tu correo corporativo y te enviaremos un enlace seguro para restablecer tu contraseña.
        </p>

        <label className="mb-2 block text-sm font-semibold">Correo</label>
        <input
          type="email"
          className="mb-4 w-full"
          placeholder="usuario@empresa.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {sent ? (
          <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
            Si el correo está registrado, revisa tu bandeja de entrada.
          </p>
        ) : null}

        <button className="btn-primary mb-4 w-full" disabled={loading}>
          {loading ? <Spinner label="Enviando" /> : 'Enviar enlace'}
        </button>

        <Link to="/login" className="block text-center text-sm font-medium text-[#6f3ff5] hover:underline">
          Volver al login
        </Link>
      </form>
    </div>
  );
}