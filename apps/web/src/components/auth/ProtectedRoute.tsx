'use client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'owner' | 'manager' | 'cashier';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/sign-in');
        return;
      }

      if (requiredRole && profile?.role !== requiredRole) {
        // Redirect to dashboard if user doesn't have required role
        router.push('/dashboard');
        return;
      }
    }
  }, [user, profile, loading, requiredRole, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 rounded-full bg-gradient-to-b from-brand-500 to-brand-700 mx-auto mb-4" />
          <div className="text-sm text-slate-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user || (requiredRole && profile?.role !== requiredRole)) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}
