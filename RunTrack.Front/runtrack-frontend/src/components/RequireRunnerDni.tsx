import { Navigate } from 'react-router-dom';
import { getRole } from '../services/api';

export default function RequireRunnerDni({ children }: { children: JSX.Element }) {
  if (getRole() !== 'runner') return <Navigate to="/runner/login" replace />;
  return children;
}
