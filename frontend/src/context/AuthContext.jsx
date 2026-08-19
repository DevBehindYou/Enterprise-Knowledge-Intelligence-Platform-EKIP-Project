import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authService } from '../services/authService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // true until the initial silent-refresh check resolves

  // On first load, the access token is gone (it only ever lived in memory), but the
  // HttpOnly refresh cookie may still be valid — try to silently restore the session.
  useEffect(() => {
    (async () => {
      try {
        await authService.refresh();
        const me = await authService.getCurrentUser();
        setUser(me);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    const loggedInUser = await authService.login(email, password);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const signup = useCallback(async (payload) => authService.signup(payload), []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const forgotPassword = useCallback(async (email) => authService.forgotPassword(email), []);

  // Keeps the shell (avatar, greeting) in sync after a Settings → Profile save.
  const updateProfile = useCallback(async (updates) => {
    const updated = await authService.updateProfile(updates);
    setUser(updated);
    return updated;
  }, []);

  const changePassword = useCallback(async (payload) => authService.changePassword(payload), []);

  // Revokes this session too, so the user lands back on /login.
  const logoutEverywhere = useCallback(async () => {
    await authService.logoutEverywhere();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        logout,
        forgotPassword,
        updateProfile,
        changePassword,
        logoutEverywhere,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
