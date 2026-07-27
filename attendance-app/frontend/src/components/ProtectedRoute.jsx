import { Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

const DASHBOARD_BY_ROLE = { student: "/student", teacher: "/teacher", hod: "/hod", principal: "/principal" };

export default function ProtectedRoute({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={DASHBOARD_BY_ROLE[user.role] || "/login"} replace />;
  }
  return children;
}
