import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export default function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const isAdmin = localStorage.getItem('isAdmin') === 'true';

    if (!isAuthenticated || !isAdmin) {
      navigate('/');
    }
  }, [navigate]);

  return <>{children}</>;
}