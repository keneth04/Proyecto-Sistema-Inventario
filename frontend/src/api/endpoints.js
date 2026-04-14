import api from './client';

/**
 * Fase 2 (limpieza): se conserva únicamente auth,
 * removiendo contratos del dominio legado.
 */

export const AuthApi = {
  login: (payload) => api.post('/auth/login', payload),
  session: () => api.get('/auth/session'),
  logout: (csrfToken) =>
    api.post('/auth/logout', null, {
      headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined
    }),
  forgotPassword: (payload) => api.post('/auth/forgot-password', payload),
  resetPassword: (payload) => api.post('/auth/reset-password', payload)
};

