import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { token, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f7f7]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles) {
    const userRole = user?.user_metadata?.role || 'staff';
    if (!allowedRoles.includes(userRole)) {
      // Redirect to a safe default page based on role if they try to access something unauthorized
      if (userRole === 'super_admin') return <Navigate to="/super-admin" replace />;
      if (userRole === 'gym_admin') return <Navigate to="/" replace />;
      return <Navigate to="/attendance" replace />;
    }
  }

  return <>{children}</>;
}
