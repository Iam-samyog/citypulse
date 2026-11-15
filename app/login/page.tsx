"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to sign in.");
      router.replace("/dashboard");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#071b23] px-5 py-12 text-[#f6e6c4]">
      <section className="w-full max-w-md rounded-2xl border border-[#b98a4a]/50 bg-[#102a32] p-8 shadow-2xl">
        <p className="text-xs uppercase tracking-[.3em] text-[#e4aa56]">CITYPULSE · Ithaca</p>
        <h1 className="mt-3 font-heading text-3xl">Welcome, Operator</h1>
        <p className="mt-3 text-sm leading-6 text-[#f6e6c4]/70">Sign in to explore the city digital twin, incidents, recovery tools, and Athena.</p>
        <form onSubmit={signIn} className="mt-7 space-y-4">
          <label className="block text-sm text-[#f6e6c4]/80">Demo username
            <input autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#b98a4a]/40 bg-[#071b23] px-3 py-3 text-base text-white outline-none focus:border-[#e4aa56]" />
          </label>
          <label className="block text-sm text-[#f6e6c4]/80">Password
            <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#b98a4a]/40 bg-[#071b23] px-3 py-3 text-base text-white outline-none focus:border-[#e4aa56]" />
          </label>
          {error && <p role="alert" className="text-sm text-[#ffb5a6]">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-[#e4aa56] px-4 py-3 font-semibold text-[#071b23] transition hover:bg-[#efbd72] disabled:opacity-60">{loading ? "Opening CITYPULSE…" : "Enter the demo"}</button>
        </form>
        <div className="mt-6 rounded-lg border border-white/10 bg-black/15 p-4 text-xs leading-5 text-[#f6e6c4]/60">
          Demo city data: 38 infrastructure assets, 69 dependency links, and 4 districts. All infrastructure and incident values are simulated.
        </div>
      </section>
    </main>
  );
}
