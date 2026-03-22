import { Zap } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { AUTH_MODE } from "../lib/constants";
import { useAuth } from "./useAuth";

export function LoginPage(): JSX.Element {
  const { signIn, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("test@shadowtrader.dev");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/rules" replace />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
      navigate("/rules");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDevSkip(): Promise<void> {
    setLoading(true);
    try {
      await signIn("test@shadowtrader.dev", "devmode");
      navigate("/rules");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to continue with Google.");
      setLoading(false);
    }
  }

  const isDev = AUTH_MODE === "dev";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0B0E14] px-4">
      {/* Subtle grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#3B82F6 1px, transparent 1px), linear-gradient(to right, #3B82F6 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Radial glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-blue-600/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30">
            <Zap size={22} className="text-white" />
          </div>
          <div>
            <div className="text-xl font-semibold text-white">ShadowTrader</div>
            <div className="text-sm text-slate-500">Discipline First</div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[#1E2130] bg-[#13161F] p-8 shadow-2xl"
        >
          <h1 className="text-2xl font-semibold text-white">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your trading workspace.</p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-4 py-2.5 text-sm text-white outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
                Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-4 py-2.5 text-sm text-white outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>

          <button
            type="button"
            onClick={() => void handleGoogleSignIn()}
            disabled={loading}
            className="mt-3 flex w-full items-center justify-center gap-3 rounded-lg border border-[#2A2D37] bg-transparent px-4 py-2.5 text-sm text-slate-300 transition hover:bg-[#1A1D27] hover:text-white disabled:opacity-60"
          >
            {/* Google "G" icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          {isDev && (
            <button
              type="button"
              onClick={() => void handleDevSkip()}
              disabled={loading}
              className="mt-3 w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-400 transition hover:bg-amber-500/20 disabled:opacity-60"
            >
              ⚡ Dev Mode: Skip Login
            </button>
          )}

          <p className="mt-5 text-center text-sm text-slate-500">
            Don't have an account?{" "}
            <Link to="/signup" className="font-medium text-blue-400 hover:text-blue-300">
              Sign up free
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
