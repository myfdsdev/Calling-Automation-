import { Navigate, useLocation } from 'react-router-dom';
import { PhoneCall } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <span className="flex h-11 w-11 animate-pulse items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <PhoneCall className="h-6 w-6" />
          </span>
          <p className="text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
