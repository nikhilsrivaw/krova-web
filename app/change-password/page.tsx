"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, KeyRound } from "lucide-react";
import { changePassword, isSignedIn } from "@/lib/auth";
import { AuthShell } from "@/components/spectrum/auth-shell";

/**
 * The step a teammate lands on after their first sign in: the password the
 * owner handed over is only good for choosing their own.
 */
export default function ChangePasswordPage() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn()) router.replace("/team-login");
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next !== again) {
      setError("The two new passwords are not the same.");
      return;
    }
    setLoading(true);
    try {
      await changePassword(current, next);
      router.replace("/conversations");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the password");
      setLoading(false);
    }
  };

  const field = "w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-os-border-bright transition-colors font-mono";
  const label = "text-[10px] font-bold uppercase tracking-widest text-os-text-dim";

  return (
    <AuthShell>
      <div className="relative os-window overflow-visible">
        <div className="relative overflow-hidden rounded-[inherit]">
          <div className="p-8 pb-0 space-y-2">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <KeyRound size={20} className="text-teal-bright" /> Choose your password
            </h1>
            <p className="text-xs text-os-text-dim">
              The password you were given is temporary. Pick one only you know - at least 10 characters.
            </p>
          </div>

          <form onSubmit={submit} className="p-8 pt-5 space-y-5">
            {error && (
              <div role="alert" className="flex items-center gap-2 p-3 rounded-lg bg-thread/10 border border-thread/20">
                <AlertCircle size={12} className="text-thread-bright shrink-0" />
                <p className="text-[11px] text-thread-bright">{error}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <label htmlFor="cp-current" className={label}>Password you were given</label>
              <input id="cp-current" type="password" autoComplete="current-password" value={current}
                onChange={(e) => setCurrent(e.target.value)} required className={field} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="cp-new" className={label}>New password</label>
              <input id="cp-new" type="password" autoComplete="new-password" minLength={10} value={next}
                onChange={(e) => setNext(e.target.value)} required className={field} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="cp-again" className={label}>New password again</label>
              <input id="cp-again" type="password" autoComplete="new-password" minLength={10} value={again}
                onChange={(e) => setAgain(e.target.value)} required className={field} />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="os-button os-button-cta w-full justify-center py-2.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Save and continue"}
            </button>
          </form>
        </div>
      </div>
    </AuthShell>
  );
}
