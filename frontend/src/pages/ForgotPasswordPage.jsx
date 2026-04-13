import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthApi } from '../api/endpoints';
import Spinner from '../components/Spinner';
import { useToast } from '../components/Toast';
import { getErrorMessage } from '../utils/helpers';
import BrandLogo from '../components/BrandLogo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const { push } = useToast();

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setSuccessMessage('');

    try {
      const { data } = await AuthApi.forgotPassword({ email });
      setSuccessMessage(data.message);
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
        <h1 className="mb-2 text-xl font-bold text-[#261d35]">Recuperar contraseña</h1>
        <p className="mb-5 text-sm text-[#5e536d]">Ingresa tu correo y te enviaremos un enlace para restablecerla.</p>

        <label className="mb-2 block text-sm font-semibold text-[#413653]">Correo</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full"
          placeholder="correo@empresa.com"
          required
        />

        <button disabled={loading} className="btn-primary mb-3 w-full">
          {loading ? <Spinner label="Enviando..." /> : 'Enviar enlace'}
        </button>

        {successMessage ? <p className="mb-3 text-sm font-medium text-emerald-700">{successMessage}</p> : null}

        <Link to="/login" className="text-sm font-semibold text-[#765492] hover:text-[#5c3f73] hover:underline">
          Volver al inicio de sesión
        </Link>
      </form>
    </div>
  );
}
