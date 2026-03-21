import { Navigate, Link } from "react-router-dom";

import { PricingCard } from "../components/PricingCard";
import { useAuth } from "../auth/useAuth";

export function Landing(): JSX.Element {
  const { user, isOnboarded } = useAuth();

  if (user) {
    return <Navigate to={isOnboarded ? "/rules" : "/onboarding"} replace />;
  }

  return (
    <main className="min-h-screen bg-shell text-slate-100">
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-primary">
              ShadowTrader AI
            </div>
            <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-tight text-white">
              Your trading rules, enforced in real-time.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
              Connect your broker, define discipline rules, catch revenge trading as it happens, and review your behavior with AI coaching grounded in your actual trade history.
            </p>
            <div className="mt-8 flex gap-4">
              <Link to="/signup" className="rounded-2xl bg-primary px-6 py-4 text-sm font-medium text-white">
                Start Free Trial
              </Link>
              <Link to="/login" className="rounded-2xl border border-edge px-6 py-4 text-sm text-slate-200">
                Sign In
              </Link>
            </div>
          </div>
          <div className="grid gap-4">
            {[
              "Real-time overlay alerts that never place trades for you",
              "Behavioral pattern detection for overtrading, revenge, and size escalation",
              "Daily summaries and coaching chat built around your actual numbers",
            ].map((item) => (
              <div key={item} className="rounded-[24px] border border-edge bg-panel p-5 shadow-panel">
                <div className="text-sm leading-7 text-slate-200">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-20 lg:grid-cols-2">
        <PricingCard
          title="Starter"
          price="$29/mo"
          description="Rule enforcement, overlay alerts, basic pattern detection, and the discipline scorecard."
          features={["Overlay alerts", "2 broker integrations", "Basic patterns", "Daily scorecard"]}
          action={<Link to="/signup" className="inline-block rounded-2xl border border-edge px-5 py-3 text-sm text-slate-100">Choose Starter</Link>}
        />
        <PricingCard
          title="Pro"
          price="$59/mo"
          description="Full coaching stack with AI chat, daily summaries, and unlimited integrations."
          features={["Everything in Starter", "AI coaching chat", "Daily AI summaries", "Unlimited brokers"]}
          highlighted
          action={<Link to="/signup" className="inline-block rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-white">Choose Pro</Link>}
        />
      </section>
    </main>
  );
}
