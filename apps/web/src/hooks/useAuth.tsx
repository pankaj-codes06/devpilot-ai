import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AuthSessionUser, OrganizationDto } from '@devpilot/shared';
import { api } from '../services/api.js';

interface AuthContextType {
  user: AuthSessionUser | null;
  organizations: OrganizationDto[];
  currentOrg: OrganizationDto | null;
  isLoading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthSessionUser | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.auth.getMe();
      setUser(data.user);
      setOrganizations(data.organizations);
    } catch (err) {
      setUser(null);
      setOrganizations([]);
      // 401 is normal for unauthenticated guests
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const logout = async () => {
    try {
      await api.auth.logout();
      setUser(null);
      setOrganizations([]);
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const currentOrg =
    organizations.find((o) => o.id === user?.currentOrganizationId) ||
    organizations[0] ||
    null;

  return (
    <AuthContext.Provider
      value={{
        user,
        organizations,
        currentOrg,
        isLoading,
        error,
        refreshUser: fetchUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

