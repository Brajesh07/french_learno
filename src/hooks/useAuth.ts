import { useAuth } from '@/components/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Require authentication — redirects to /login if not logged in.
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
 * Redirect authenticated users away from a page (e.g. the login page).
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
 * Require a specific role — redirects to /dashboard if role doesn't match.
 * Currently only 'admin' is used; extend as needed.
 */
export const useRequireRole = (requiredRole: 'admin' | 'student') => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== requiredRole) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router, requiredRole]);

  const hasRole = user?.role === requiredRole;

  return { user, loading, hasRole, isAuthenticated: !!user };
};
