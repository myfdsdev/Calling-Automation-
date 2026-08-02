import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

/**
 * Route guard for feature-gated pages. Renders children only if the user is
 * entitled to the feature (owners always are); otherwise bounces to the
 * dashboard. `ownerOnly` restricts a route to the workspace owner.
 */
export function RequireFeature({ feature, ownerOnly = false, children }) {
  const { hasFeature, isOwner } = useAuth();
  const allowed = ownerOnly ? isOwner : hasFeature(feature);

  useEffect(() => {
    if (!allowed) toast.error("You don't have access to that section.");
  }, [allowed]);

  if (!allowed) return <Navigate to="/" replace />;
  return children;
}
