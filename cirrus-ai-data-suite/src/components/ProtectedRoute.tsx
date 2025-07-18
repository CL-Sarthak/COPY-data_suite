'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LoginPage } from './LoginPage';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, login, loading, error } = useAuth();

  if (!isAuthenticated) {
    return (
      <LoginPage 
        onLogin={login}
        loading={loading}
        error={error || undefined}
      />
    );
  }

  return <>{children}</>;
}