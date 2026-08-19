import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/** Usage: <Route element={<RequireRole roles={['admin']} />}>...</Route> */
export default function RequireRole({ roles }) {
  const { user } = useAuth();
  if (!roles.includes(user?.role)) {
    return <Navigate to="/error/403" replace />;
  }
  return <Outlet />;
}
