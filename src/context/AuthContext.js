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

  const logoutRef = useRef();
  const clearLocalSessionRef = useRef();

  useEffect(() => {
    initAuth();
    setOnUnauthorized(() => clearLocalSessionRef.current?.());
    return () => setOnUnauthorized(null);
  }, []);

  const initAuth = async () => {
    try {
      const biometricStatus = await biometricService.getStatus();

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
      if (isAuth) {
        const userData = await storageService.getUser();
        const hasCachedUser = Boolean(userData);
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
        }

        try {
          const response = await authService.getCurrentUser();
          if (response.success) {
            setUser(response.data);
            setIsAuthenticated(true);
          } else if (!hasCachedUser) {
            await clearLocalSessionRef.current?.();
          }
        } catch (error) {
          if (error?.response?.status === 401 && !hasCachedUser) {
            await clearLocalSessionRef.current?.();
          }
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      const fallbackUser = await storageService.getUser();
      const fallbackToken = await storageService.getToken();
      if (fallbackUser && fallbackToken) {
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
      await authService.hydrateSession(response.data);
      setUser(response.data.user);
      setIsAuthenticated(true);
    }
    return response;
  };

  const register = async (userData) => {
    const response = await authService.register(userData);
    if (response.success) {
      setUser(response.data.user);
      setIsAuthenticated(true);
    }
    return response;
  };

  const clearLocalSession = async () => {
    await storageService.clearAll();
    await biometricService.clearStoredSession();
    setUser(null);
    setIsAuthenticated(false);
  };

  const logout = async () => {
    await unregisterPushDevice().catch(() => {});
    await authService.logout().catch(() => {});
    await clearLocalSession();
  };
  logoutRef.current = logout;
  clearLocalSessionRef.current = clearLocalSession;

  const establishSession = async (sessionData) => {
    await authService.hydrateSession(sessionData);
    setUser(sessionData?.user || null);
    setIsAuthenticated(Boolean(sessionData?.token && sessionData?.user));
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
        loginWithBiometrics,
        updateUser,
        hasRole,
      }}>
      {children}
    </AuthContext.Provider>
  );
};
