import { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { Navigate, useLocation } from "react-router-dom";

const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

export default RequireAuth;
