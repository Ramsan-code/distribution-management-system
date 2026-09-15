"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { onIdTokenChanged, signOut, type User } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase-client";
import { api, errorMessage } from "@/lib/api-client";
const AuthContext = createContext<{ user: User | null; loading: boolean; error: string }>({ user: null, loading: true, error: "" });
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState({ user: null as User | null, loading: true, error: "" });
  useEffect(() => {
    let version = 0;
    const unsubscribe = onIdTokenChanged(auth, async user => {
      const current = ++version;
      if (!user) { setState({ user: null, loading: false, error: "" }); return; }
      setState({ user: null, loading: true, error: "" });
      try {
        await api("/api/shops");
        if (current === version) setState({ user, loading: false, error: "" });
      } catch (error) {
        if (current === version) setState({ user: null, loading: false, error: errorMessage(error) });
      }
    });
    return () => { version++; unsubscribe(); };
  }, []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, error } = useAuth();
  const path = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user && path !== "/login") router.replace("/login");
  }, [loading, user, path, router]);
  if (path === "/login") return children;
  if (loading) return <main className="shell"><p role="status">Checking your session…</p></main>;
  if (!user) return <main className="shell"><p role="alert">{error || "Redirecting to sign in…"}</p></main>;
  return children;
}
export async function logout() { await signOut(auth); }
