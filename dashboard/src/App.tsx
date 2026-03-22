import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./auth/ProtectedRoute";
import { Layout } from "./components/Layout";
import { Billing } from "./pages/Billing";
import { Chat } from "./pages/Chat";
import { DisciplineScore } from "./pages/DisciplineScore";
import { Landing } from "./pages/Landing";
import { LoginPage } from "./auth/LoginPage";
import { Onboarding } from "./pages/Onboarding";
import { RuleBuilder } from "./pages/RuleBuilder";
import { SessionReview } from "./pages/SessionReview";
import { Profile } from "./pages/Profile";
import { Settings } from "./pages/Settings";
import { SignupPage } from "./auth/SignupPage";

export function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/onboarding" element={<ProtectedRoute allowOnboarding><Onboarding /></ProtectedRoute>} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/app" element={<Navigate to="/rules" replace />} />
        <Route path="/rules" element={<RuleBuilder />} />
        <Route path="/session" element={<SessionReview />} />
        <Route path="/score" element={<DisciplineScore />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
