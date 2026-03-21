import { useState } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";

import { useAuth } from "./useAuth";

export function SignupPage(): JSX.Element {
  const { signUp, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/onboarding" replace />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signUp(email, password);
      navigate("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign up.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignup(): Promise<void> {
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
        <h1 className="text-3xl font-semibold text-white">Start your free trial</h1>
        <p className="mt-2 text-sm text-slate-400">Create your account and get 14 days of full access.</p>
        <div className="mt-6 space-y-4">
          <input className="w-full rounded-2xl border border-edge bg-[#11141D] px-4 py-3 text-white" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
          <input className="w-full rounded-2xl border border-edge bg-[#11141D] px-4 py-3 text-white" value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Password" />
        </div>
        {error && <div className="mt-4 text-sm text-block">{error}</div>}
        <button type="submit" disabled={loading} className="mt-6 w-full rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-white disabled:opacity-60">
          {loading ? "Creating account..." : "Create Account"}
        </button>
        <button
          type="button"
          onClick={() => void handleGoogleSignup()}
          disabled={loading}
          className="mt-3 w-full rounded-2xl border border-edge px-5 py-3 text-sm text-slate-100 disabled:opacity-60"
        >
          Continue with Google
        </button>
        <p className="mt-4 text-sm text-slate-400">
          Already have an account? <Link to="/login" className="text-primary">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
