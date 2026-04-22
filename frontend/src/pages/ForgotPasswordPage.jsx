import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthApi } from '../api/endpoints';
import Spinner from '../components/Spinner';
import { useToast } from '../components/Toast';
import { getErrorMessage } from '../utils/format';
import logo from '../assets/brand/hispacontact-logo.png';

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
    <div className="flex min-h-screen items-center justify-center bg-[#efedf5] p-3 sm:p-4">
      <form className="w-full max-w-lg rounded-[22px] border border-[#e2dce9] bg-white p-6 shadow-[0_18px_40px_rgba(52,32,77,0.1)]" onSubmit={onSubmit}>
        <img src={logo} alt="HispaContact" className="mb-5 h-14 w-auto" />
        <h1 className="mb-2 text-4xl font-bold text-[#211a37]">Recuperar contraseña</h1>
        <p className="mb-6 text-sm text-[#5f6079]">
          Ingresa tu correo y te enviaremos un enlace para restablecerla.
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

        <Link to="/login" className="block text-sm font-medium text-[#765492] hover:underline">
          Volver al inicio de sesión
        </Link>
      </form>
    </div>
  );
}