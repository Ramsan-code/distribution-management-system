"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { browserSessionPersistence, setPersistence, signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase-client";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export default function LoginPage() {
  const { user, loading, error: accessError } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const router = useRouter();
  useEffect(() => { if (user) router.replace("/dashboard"); }, [user, router]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (submitting.current) return;
    const data = new FormData(event.currentTarget);
    submitting.current = true; setBusy(true); setError("");
    try {
      await setPersistence(auth, browserSessionPersistence);
      await signInWithEmailAndPassword(auth, String(data.get("email")).trim(), String(data.get("password")));
    } catch {
      setError("Sign-in failed. Check your email and password, network connection, and Firebase email/password configuration.");
    } finally { submitting.current = false; setBusy(false); }
  }
  return <main className="flex flex-1 items-center justify-center p-5 py-16"><section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
    <p className="eyebrow">ROUTEBOOK / ADMIN</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Welcome back</h1><p className="mb-8 mt-3 text-slate-500">Sign in to manage your shops, deliveries, and collections.</p>
    <form onSubmit={submit} className="space-y-5"><fieldset disabled={busy || loading} className="space-y-5">
      <label className="field">Email<Input name="email" type="email" autoComplete="username" required /></label>
      <label className="field">Password<Input name="password" type="password" autoComplete="current-password" required /></label>
      {(error || accessError) && <p role="alert" className="error">{error || accessError}</p>}
      <Button type="submit" className="w-full">{busy || loading ? "Checking account…" : "Sign in"}</Button>
    </fieldset></form><p className="mt-6 text-xs text-slate-500">Access is restricted to the designated administrator.</p>
  </section></main>;
}
