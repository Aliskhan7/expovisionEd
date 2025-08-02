'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

interface AuthProviderProps {
  children: React.ReactNode;
}

// Component for protecting authenticated routes
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'student';
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  redirectTo = '/auth/login' 
}: ProtectedRouteProps) {
  const router = useRouter();
  const { user, isAuthenticated, isHydrated } = useAuthStore();

  useEffect(() => {
    // Wait for hydration to complete
    if (!isHydrated) return;

    // Check authentication after hydration
    if (!isAuthenticated) {
      router.push(redirectTo);
      return;
    }

    // Check role if required
    if (requiredRole && user?.role !== requiredRole) {
      router.push(redirectTo);
      return;
    }
  }, [isAuthenticated, isHydrated, user?.role, requiredRole, router, redirectTo]);

  // Show loading while hydrating
  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show loading if not authenticated (will redirect)
  if (!isAuthenticated || (requiredRole && user?.role !== requiredRole)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const { initializeAuth, isLoading } = useAuthStore();

  useEffect(() => {
    // Initialize auth state from localStorage on app startup
    initializeAuth();
  }, [initializeAuth]);

  // You can add a loading spinner here if needed
  // if (isLoading) {
  //   return (
  //     <div className="flex items-center justify-center min-h-screen">
  //       <div className="loading-spinner w-8 h-8"></div>
  //     </div>
  //   );
  // }

  return <>{children}</>;
} 