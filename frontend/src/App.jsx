import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { ProtectedRoute, RoleRoute } from './routes/Guards';
import AdminLayout from './layouts/AdminLayout';
import AgentLayout from './layouts/AgentLayout';
import SkillsPage from './pages/admin/SkillsPage';
import UsersPage from './pages/admin/UsersPage';
import DailySchedulesPage from './pages/admin/DailySchedulesPage';
import CreateDraftPage from './pages/admin/CreateDraftPage';
import ShiftTemplatesPage from './pages/admin/ShiftTemplatesPage';
import PublishWeekPage from './pages/admin/PublishWeekPage';
import EditPublishedWeekPage from './pages/admin/EditPublishedWeekPage';
import StaffingPage from './pages/admin/StaffingPage';
import WeeklyHoursReportPage from './pages/admin/WeeklyHoursReportPage';
import MySchedulePage from './pages/agent/MySchedulePage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<RoleRoute role="admin" />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="skills" replace />} />
            <Route path="skills" element={<SkillsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="horarios-dia" element={<DailySchedulesPage />} />
            <Route path="crear-borrador" element={<CreateDraftPage />} />
            <Route path="turnos-tipo" element={<ShiftTemplatesPage />} />
            <Route path="publicar-semana" element={<PublishWeekPage />} />
            <Route path="editar-semana" element={<EditPublishedWeekPage />} />
            <Route path="dotacion" element={<StaffingPage />} />
            <Route path="reporte-horas" element={<WeeklyHoursReportPage />} />
          </Route>
        </Route>

        <Route element={<RoleRoute role="agente" />}>
          <Route path="/agent" element={<AgentLayout />}>
            <Route index element={<MySchedulePage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
