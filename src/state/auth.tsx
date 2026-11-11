// Signed-in customer, shared across the app. The session itself is an HttpOnly cookie set by the
// server; this context only mirrors who is signed in so the UI can react.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api, type User } from "../api/client";

interface AuthCtx {
  user: User | null;
  /** True until the first /api/auth/me check finishes. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (name: string, email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  setUser: (u: User | null) => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me().then(
      (r) => setUser(r.user),
      () => setUser(null),
    ).finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const r = await api.signIn(email, password);
    setUser(r.user);
    return r.user;
  }, []);
  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const r = await api.signUp(name, email, password);
    setUser(r.user);
    return r.user;
  }, []);
  const signOut = useCallback(async () => {
    await api.signOut().catch(() => undefined);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, signIn, signUp, signOut, setUser }), [user, loading, signIn, signUp, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside <AuthProvider>");
  return c;
}

/** Only sends people to the given path if it's a local page (prevents open redirects). */
export const safeNext = (next: string | null | undefined, fallback = "/account") => (next && next.startsWith("/") && !next.startsWith("//") ? next : fallback);

/** Admin-only pages. (The server enforces this too — this just keeps others from seeing the UI.) */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="container-page py-16 text-center text-ink-soft">Loading…</p>;
  if (!user) return <Navigate to={`/sign-in?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (!user.isAdmin)
    return (
      <div className="container-page py-20 text-center">
        <h1 className="font-display text-3xl font-medium">Admins only</h1>
        <p className="mt-2 text-ink-soft">You're signed in as {user.email}, which isn't a store admin account.</p>
      </div>
    );
  return <>{children}</>;
}

/** Wrap pages that need a signed-in customer; others are sent to sign in and brought back after. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="container-page py-16 text-center text-ink-soft">Loading…</p>;
  if (!user) return <Navigate to={`/sign-in?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <>{children}</>;
}
