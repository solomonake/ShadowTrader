import { useState } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-shell px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-[28px] border border-edge bg-panel p-8 shadow-panel">
        <h1 className="text-3xl font-semibold text-white">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-400">Sign in to manage your rules, brokers, and billing.</p>
        <div className="mt-6 space-y-4">
          <input className="w-full rounded-2xl border border-edge bg-[#11141D] px-4 py-3 text-white" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
          <input className="w-full rounded-2xl border border-edge bg-[#11141D] px-4 py-3 text-white" value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Password" />
        </div>
        {error && <div className="mt-4 text-sm text-block">{error}</div>}
        <button type="submit" disabled={loading} className="mt-6 w-full rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-white disabled:opacity-60">
          {loading ? "Signing in..." : "Sign In"}
        </button>
        <button
          type="button"
          onClick={() => void handleGoogleSignIn()}
          disabled={loading}
          className="mt-3 w-full rounded-2xl border border-edge px-5 py-3 text-sm text-slate-100 disabled:opacity-60"
        >
          Continue with Google
        </button>
        <p className="mt-4 text-sm text-slate-400">
          New here? <Link to="/signup" className="text-primary">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
