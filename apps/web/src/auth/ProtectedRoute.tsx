import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { UserRole } from "@dmis/shared";
import { ShieldX } from "lucide-react";
import { FullPageError, FullPageLoading, EmptyState } from "../components/ui";
import { useAuth } from "./AuthContext";

/** Layout route: everything beneath it requires a signed-in user. */
export function ProtectedRoute() {
  const auth = useAuth();
  const location = useLocation();
  if (auth.status === "loading") return <FullPageLoading label="Restoring your session…" />;
  if (auth.status === "error") {
    return <FullPageError title="Can't reach the server" message={auth.error?.userMessage} onRetry={auth.retry} />;
  }
  if (auth.status === "unauthenticated") return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

/** UX-level role gate. The API independently enforces the same roles. */
export function RequireRole({ roles, children }: { roles?: UserRole[]; children: ReactNode }) {
  const { hasRole } = useAuth();
  if (roles && !hasRole(...roles)) {
    return <EmptyState icon={ShieldX} title="You don't have access to this section" description="Your role doesn't include this module. Contact an administrator if you think this is a mistake." />;
  }
  return <>{children}</>;
}
