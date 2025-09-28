import { useAuth } from '@/components/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Custom hook to require authentication
 * Redirects to login page if user is not authenticated
 */
export const useRequireAuth = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  return { user, loading, isAuthenticated: !!user };
};

/**
 * Custom hook to redirect authenticated users
 * Useful for login page to redirect already authenticated users
 */
export const useRedirectIfAuthenticated = (redirectTo: string = '/dashboard') => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  return { user, loading, isAuthenticated: !!user };
};

/**
 * Custom hook to check if user has specific role
 */
export const useRequireRole = (requiredRole: 'admin' | 'superadmin' | 'teacher') => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== requiredRole && requiredRole !== 'admin') {
        // If requiring superadmin, redirect non-superadmin users
        router.push('/dashboard'); // or show unauthorized page
      }
    }
  }, [user, loading, router, requiredRole]);

  const hasRole = user?.role === requiredRole || 
    (requiredRole === 'admin' && (user?.role === 'admin' || user?.role === 'superadmin'));

  return { user, loading, hasRole, isAuthenticated: !!user };
};
