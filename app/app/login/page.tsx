"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight } from "lucide-react";
import { signIn, googleStart } from "@/lib/auth";
import { appPath } from "@/lib/app-nav";

export default function AppLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);

  const continueWithGoogle = async () => {
    setGoogleBusy(true);
    setError(null);
    try {
      window.location.href = await googleStart(undefined, undefined, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start Google sign-in.");
      setGoogleBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      router.replace(appPath("/today"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12 max-w-sm mx-auto">
      <div className="flex flex-col items-center mb-10">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-bright via-teal to-teal-dim flex items-center justify-center shadow-lg shadow-teal/20 mb-4">
          <Sparkles className="w-7 h-7 text-os-bg" />
        </div>
        <h1 className="text-xl font-semibold text-os-ink">KROVA</h1>
        <p className="text-xs text-os-text-dim mt-1">Your business, in your pocket.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wide text-os-text-dim mb-1.5">
            Email
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-os-card border border-os-border text-os-ink text-sm focus:border-teal focus:outline-none"
            placeholder="you@business.com"
          />
        </div>
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wide text-os-text-dim mb-1.5">
            Password
          </label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-os-card border border-os-border text-os-ink text-sm focus:border-teal focus:outline-none"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 rounded-xl bg-teal hover:bg-teal-dim text-os-bg text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-[0.98]"
        >
          {isLoading ? "Signing in..." : "Sign in"}
          {!isLoading && <ArrowRight className="w-4 h-4" />}
        </button>
      </form>

      <div className="flex items-center gap-3 my-6">
        <div className="h-px flex-1 bg-os-border" />
        <span className="text-[10px] font-mono uppercase tracking-wide text-os-text-dim">or</span>
        <div className="h-px flex-1 bg-os-border" />
      </div>

      <button
        type="button"
        onClick={continueWithGoogle}
        disabled={googleBusy}
        className="w-full py-3.5 rounded-xl bg-os-card border border-os-border text-os-ink text-sm font-semibold flex items-center justify-center gap-2 active:bg-white/[0.03] disabled:opacity-50"
      >
        {googleBusy ? "Redirecting..." : "Continue with Google"}
      </button>

      <p className="text-center text-xs text-os-text-dim mt-8">
        This is the same KROVA account you use on the web.
      </p>
    </div>
  );
}
