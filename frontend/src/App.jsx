import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

/**
 * Fase 2 (limpieza): se desmontan rutas de dominio legado
 * para evitar contaminación funcional mientras se rediseña el dominio nuevo.
 */

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
