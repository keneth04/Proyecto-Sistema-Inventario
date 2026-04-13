import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { AuthApi } from '../api/endpoints';

const AuthContext = createContext(null);
const CSRF_STORAGE_KEY = 'csrfToken';

const readPersistedUser = () => {
  const raw = localStorage.getItem('user');
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (_) {
    localStorage.removeItem('user');
    return null;
  }
};

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(readPersistedUser);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const persistCsrfToken = (token) => {
    if (typeof token === 'string' && token.trim().length > 0) {
      localStorage.setItem(CSRF_STORAGE_KEY, token);
      return;
    }

    localStorage.removeItem(CSRF_STORAGE_KEY);
  };

  const clearSession = (shouldRedirect = true) => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem(CSRF_STORAGE_KEY);
    if (shouldRedirect) {
      navigate('/login', { replace: true });
    }
  };

  useEffect(() => {
    let isMounted = true;
    const bootstrapSession = async () => {
      try {
        const { data } = await AuthApi.session();
        if (!isMounted) return;

        const sessionUser = data.body.user;
        persistCsrfToken(data.body.csrfToken);
        setUser(sessionUser);
        localStorage.setItem('user', JSON.stringify(sessionUser));
      } catch (_) {
        if (!isMounted) return;
        clearSession(false);
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    };

    bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {

    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error?.response?.status === 401) {
          clearSession(true);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [navigate]);

  const login = (nextUser, csrfToken) => {
    persistCsrfToken(csrfToken);
    setUser(nextUser);
    localStorage.setItem('user', JSON.stringify(nextUser));
  };

  const logout = async ({ silent = false } = {}) => {
    try {
      await AuthApi.logout(localStorage.getItem(CSRF_STORAGE_KEY));
    } catch (_) {
      // noop: cerrar sesión local aunque falle el endpoint
    } finally {
      clearSession(!silent);
    }
  };

  const value = useMemo(
    () => ({
      user,
      isBootstrapping,
      isAuthenticated: Boolean(user),
      login,
      logout
    }),
    [user, isBootstrapping]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
