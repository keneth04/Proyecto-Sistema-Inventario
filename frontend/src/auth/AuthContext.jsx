import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AuthApi } from '../api/endpoints';
import { storage } from '../services/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(storage.getUser);
  const [isBootstrapping, setIsBootstrapping] = useState(true);


  useEffect(() => {
    const bootstrap = async () => {
      try {
        const { data } = await AuthApi.me();
        setUser(data.body);
        storage.setUser(data.body);
      } catch {
        storage.clearUser();
        setUser(null);
      } finally {
        setIsBootstrapping(false);
      }
    };


    bootstrap();
  }, []);

  const login = (nextUser) => {
    storage.setUser(nextUser);
    setUser(nextUser);
  };

  const logout = async () => {
    try {
      await AuthApi.logout();
    } finally {
      storage.clearUser();
      setUser(null);
    }
  };

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      isBootstrapping,
      isAuthenticated: Boolean(user)
    }),
    [user, isBootstrapping]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
