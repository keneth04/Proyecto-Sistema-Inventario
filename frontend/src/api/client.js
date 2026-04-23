import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:3000/api',
  withCredentials: true
});

const getCookieValue = (cookieName) => {
  const rawCookies = document.cookie.split(';').map((cookie) => cookie.trim());
  const pair = rawCookies.find((cookie) => cookie.startsWith(`${cookieName}=`));

  if (!pair) {
    return '';
  }

  return decodeURIComponent(pair.split('=').slice(1).join('='));
};

api.interceptors.request.use((config) => {
  const requiresCsrfToken = !['get', 'head', 'options'].includes((config.method || 'get').toLowerCase());

  if (requiresCsrfToken) {
    const csrfToken = getCookieValue(import.meta.env.VITE_CSRF_COOKIE_NAME || 'csrf_token');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
});

export default api;
