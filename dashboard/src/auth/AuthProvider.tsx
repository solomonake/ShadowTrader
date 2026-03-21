import { createContext, useEffect, useMemo, useState } from "react";

import { AUTH_MODE, SUPABASE_ANON_KEY, SUPABASE_URL, USER_ID } from "../lib/constants";
import type { AuthUser } from "../lib/types";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  isOnboarded: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

function getDevUser(): AuthUser {
  return { id: USER_ID, email: "test@shadowtrader.dev" };
}

export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabaseClient, setSupabaseClient] = useState<any>(null);
  const [isOnboarded, setIsOnboarded] = useState<boolean>(
    window.localStorage.getItem("shadowtrader-onboarding-complete") === "true",
  );

  useEffect(() => {
    const devMode = AUTH_MODE === "dev" || !SUPABASE_URL || !SUPABASE_ANON_KEY;
    if (devMode) {
      setUser(getDevUser());
      setLoading(false);
      return;
    }

    let isMounted = true;
    void (async () => {
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      if (!isMounted) {
        return;
      }
      setSupabaseClient(client);

      const { data } = await client.auth.getSession();
      const session = data.session;
      if (session?.user) {
        window.localStorage.setItem("shadowtrader-access-token", session.access_token);
        setUser({ id: session.user.id, email: session.user.email ?? null });
      } else {
        setUser(null);
      }
      setLoading(false);

      client.auth.onAuthStateChange((_event: string, nextSession: any) => {
        if (nextSession?.user) {
          window.localStorage.setItem("shadowtrader-access-token", nextSession.access_token);
          setUser({ id: nextSession.user.id, email: nextSession.user.email ?? null });
        } else {
          window.localStorage.removeItem("shadowtrader-access-token");
          setUser(null);
        }
      });
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isOnboarded,
      async signIn(email: string, password: string) {
        if (AUTH_MODE === "dev" || !supabaseClient) {
          setUser({ id: USER_ID, email });
          return;
        }
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
          throw new Error(error.message);
        }
      },
      async signUp(email: string, password: string) {
        if (AUTH_MODE === "dev" || !supabaseClient) {
          setUser({ id: USER_ID, email });
          return;
        }
        const { error } = await supabaseClient.auth.signUp({ email, password });
        if (error) {
          throw new Error(error.message);
        }
      },
      async signInWithGoogle() {
        if (AUTH_MODE === "dev" || !supabaseClient) {
          setUser(getDevUser());
          return;
        }
        const { error } = await supabaseClient.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/onboarding`,
          },
        });
        if (error) {
          throw new Error(error.message);
        }
      },
      async signOut() {
        if (AUTH_MODE !== "dev" && supabaseClient) {
          await supabaseClient.auth.signOut();
        }
        window.localStorage.removeItem("shadowtrader-access-token");
        window.localStorage.removeItem("shadowtrader-onboarding-complete");
        setIsOnboarded(false);
        setUser(AUTH_MODE === "dev" ? null : null);
      },
      completeOnboarding() {
        window.localStorage.setItem("shadowtrader-onboarding-complete", "true");
        setIsOnboarded(true);
      },
    }),
    [user, loading, isOnboarded, supabaseClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
