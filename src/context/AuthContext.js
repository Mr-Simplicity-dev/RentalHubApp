import React, { createContext, useState, useEffect, useRef } from 'react';
import { authService } from '../services/authService';
import { biometricService } from '../services/biometricService';
import { storageService } from '../services/storageService';
import { unregisterPushDevice } from '../services/pushNotificationService';
import { setOnUnauthorized } from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);

  const logoutRef = useRef();
  const clearLocalSessionRef = useRef();
  const restoreOriginalSessionRef = useRef();

  useEffect(() => {
    setOnUnauthorized(() => clearLocalSessionRef.current?.());
    initAuth();
    return () => setOnUnauthorized(null);
  }, []);

  const initAuth = async () => {
    try {
      const originalSession = await storageService.getImpersonationSession();
      const hasImpersonationSession = Boolean(
        originalSession?.token &&
        originalSession?.sessionToken &&
        originalSession?.user
      );
      setIsImpersonating(hasImpersonationSession);

      const biometricStatus = hasImpersonationSession
        ? { enabled: false }
        : await biometricService.getStatus();

      if (biometricStatus.enabled) {
        const biometricResult = await biometricService.unlockSession();

        if (!biometricResult.success) {
          setUser(null);
          setIsAuthenticated(false);
          return;
        }

        await authService.hydrateSession(biometricResult.data);
      }

      const isAuth = await authService.isAuthenticated();
      if (!isAuth) {
        await clearLocalSessionRef.current?.();
        return;
      }

      try {
        const response = await authService.getCurrentUser();
        if (response.success && response.data) {
          setUser(response.data);
          setIsAuthenticated(true);
        } else {
          await clearLocalSessionRef.current?.();
        }
      } catch (error) {
        if (error?.sessionInvalidated) {
          return;
        }

        if (error?.response?.status === 401 || error?.response?.status === 403) {
          await clearLocalSessionRef.current?.();
        } else {
          const userData = await storageService.getUser();
          const hasUsableLocalSession = await authService.hasLocallyUsableSession();
          if (userData && hasUsableLocalSession) {
            setUser(userData);
            setIsAuthenticated(true);
          } else {
            await clearLocalSessionRef.current?.();
          }
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      const fallbackUser = await storageService.getUser();
      const hasUsableLocalSession = await authService.hasLocallyUsableSession();
      if (fallbackUser && hasUsableLocalSession) {
        setUser(fallbackUser);
        setIsAuthenticated(true);
      } else {
        await clearLocalSessionRef.current?.();
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await authService.login(email, password);
    if (response.success) {
      if (!response.data?.token || !response.data?.user) {
        throw new Error('Login succeeded but the server did not return a complete mobile session.');
      }
      await storageService.clearImpersonationSession();
      await authService.hydrateSession(response.data);
      setUser(response.data.user);
      setIsAuthenticated(true);
      setIsImpersonating(false);
    }
    return response;
  };

  const register = async (userData) => {
    const response = await authService.register(userData);
    if (response.success) {
      await storageService.clearImpersonationSession();
      setUser(response.data.user);
      setIsAuthenticated(true);
      setIsImpersonating(false);
    }
    return response;
  };

  const restoreOriginalSession = async () => {
    const originalSession = await storageService.getImpersonationSession();
    if (
      !originalSession?.token ||
      !originalSession?.sessionToken ||
      !originalSession?.user
    ) {
      await storageService.clearImpersonationSession();
      setIsImpersonating(false);
      return false;
    }

    await authService.hydrateSession({
      token: originalSession.token,
      session_token: originalSession.sessionToken,
      user: originalSession.user,
    });
    await storageService.clearImpersonationSession();
    setUser(originalSession.user);
    setIsAuthenticated(true);
    setIsImpersonating(false);
    return true;
  };

  const clearLocalSession = async ({ restoreImpersonation = true } = {}) => {
    if (
      restoreImpersonation &&
      await restoreOriginalSessionRef.current?.()
    ) {
      return;
    }

    await storageService.clearAll();
    await biometricService.clearStoredSession();
    setUser(null);
    setIsAuthenticated(false);
    setIsImpersonating(false);
  };

  const logout = async () => {
    await unregisterPushDevice().catch(() => {});
    await authService.logout().catch(() => {});
    await clearLocalSession({ restoreImpersonation: false });
  };
  logoutRef.current = logout;
  clearLocalSessionRef.current = clearLocalSession;
  restoreOriginalSessionRef.current = restoreOriginalSession;

  const establishSession = async (sessionData) => {
    await authService.hydrateSession(sessionData);
    setUser(sessionData?.user || null);
    setIsAuthenticated(Boolean(sessionData?.token && sessionData?.user));
  };

  const beginImpersonation = async (sessionData) => {
    if (!sessionData?.token || !sessionData?.user) {
      throw new Error('The server did not return a complete impersonation session.');
    }

    if (String(user?.user_type || '').toLowerCase() !== 'super_admin') {
      throw new Error('Only a signed-in super admin can start impersonation.');
    }

    const existingOriginal = await storageService.getImpersonationSession();
    if (existingOriginal) {
      throw new Error('Exit the current impersonated admin before switching again.');
    }

    const [token, sessionToken, storedUser] = await Promise.all([
      storageService.getToken(),
      storageService.getSessionToken(),
      storageService.getUser(),
    ]);
    const originalUser = storedUser || user;

    if (!token || !sessionToken || !originalUser) {
      throw new Error(
        'Your super-admin session cannot be safely restored. Please sign in again before impersonating.'
      );
    }

    const originalSession = { token, sessionToken, user: originalUser };
    await storageService.saveImpersonationSession(originalSession);

    try {
      // The temporary impersonation token deliberately has no refresh token.
      // Removing the original refresh token prevents privilege crossover.
      await storageService.clearSessionToken();
      await authService.hydrateSession({
        token: sessionData.token,
        user: sessionData.user,
      });
      setUser(sessionData.user);
      setIsAuthenticated(true);
      setIsImpersonating(true);
    } catch (error) {
      await authService.hydrateSession({
        token,
        session_token: sessionToken,
        user: originalUser,
      });
      await storageService.clearImpersonationSession();
      setUser(originalUser);
      setIsAuthenticated(true);
      setIsImpersonating(false);
      throw error;
    }
  };

  const exitImpersonation = async () => {
    const restored = await restoreOriginalSession();
    if (!restored) {
      throw new Error('The original super-admin session is no longer available.');
    }
    return true;
  };

  const loginWithBiometrics = async () => {
    const biometricResult = await biometricService.unlockSession();

    if (!biometricResult.success) {
      return biometricResult;
    }

    try {
      await authService.hydrateSession(biometricResult.data);
      const response = await authService.getCurrentUser();

      if (!response.success) {
        throw new Error(response.message || 'Biometric login failed.');
      }

      setUser(response.data);
      setIsAuthenticated(true);
      await storageService.clearImpersonationSession();
      setIsImpersonating(false);

      return {
        success: true,
        data: response.data,
        label: biometricResult.label,
      };
    } catch (error) {
      if (error?.response?.status === 401) {
        await biometricService.clearStoredSession();
      }

      return {
        success: false,
        message:
          error?.response?.status === 401
            ? 'Saved biometric login is no longer valid. Please sign in with your password again.'
            : error?.response?.data?.message || 'Biometric login failed. Please try again.',
      };
    }
  };

  const updateUser = async (userData) => {
    setUser(userData);
    await storageService.saveUser(userData);
  };

  const hasRole = (...roles) => roles.includes(user?.user_type);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        login,
        register,
        logout,
        establishSession,
        beginImpersonation,
        exitImpersonation,
        isImpersonating,
        loginWithBiometrics,
        updateUser,
        hasRole,
      }}>
      {children}
    </AuthContext.Provider>
  );
};
