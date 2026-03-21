import { Navigate } from "react-router-dom";

import { useAuth } from "./useAuth";

export function ProtectedRoute({
  children,
  allowOnboarding = false,
}: {
  children: JSX.Element;
  allowOnboarding?: boolean;
}): JSX.Element {
  const { user, loading, isOnboarded } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-shell text-slate-200">Loading...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!allowOnboarding && !isOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}
