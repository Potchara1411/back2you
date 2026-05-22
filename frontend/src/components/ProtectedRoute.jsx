import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function isTokenExpired(token) {
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1]));
    return Date.now() >= exp * 1000;
  } catch {
    return true;
  }
}

export default function ProtectedRoute({ children, allowedRoles, redirectTo = '/' }) {
  const { token, user, logout } = useAuth();
  if (!token || isTokenExpired(token)) {
    if (token) logout();
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to={redirectTo} replace />;
  }
  return children;
}
