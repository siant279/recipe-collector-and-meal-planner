"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { APP_NAME, APP_TAGLINE } from "@/lib/labels";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    router.push("/today");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-12">
      <div className="surface fade-up p-8">
        <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
          {APP_TAGLINE}
        </p>
        <h1 className="brand-mark mt-2 text-3xl sm:text-4xl">
          {APP_NAME}
        </h1>
        <p className="mt-3 text-[var(--ink-soft)]">
          Sign in to collect recipes, plan meals, and share the shopping list.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[var(--haze)] bg-white/80 px-3 py-2.5 outline-none ring-[var(--forest)] focus:ring-2"
              autoComplete="email"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[var(--haze)] bg-white/80 px-3 py-2.5 outline-none ring-[var(--forest)] focus:ring-2"
              autoComplete="current-password"
            />
          </label>
          {error ? (
            <p className="text-sm font-semibold text-[var(--clay)]">{error}</p>
          ) : null}
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
