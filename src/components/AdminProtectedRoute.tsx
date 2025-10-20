import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export default function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading, isRoleLoading } = useAuth();

  useEffect(() => {
    // Only redirect once loading is complete
    if (!isLoading && !isRoleLoading) {
      if (!user || !isAdmin) {
        navigate('/auth', { replace: true });
      }
    }
  }, [user, isAdmin, isLoading, isRoleLoading, navigate]);

  if (isLoading || isRoleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return <>{children}</>;
}