import { Navigate } from 'react-router-dom';
import { getRole, type Role } from '../services/api';

export default function RequireRole({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const current = getRole();

  if (!current) return <Navigate to="/login" replace />;
  if (current !== role) return <Navigate to={current === 'coach' ? '/coach' : '/runner/plan'} replace />;

  return <>{children}</>;
}
