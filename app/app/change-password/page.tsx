"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { changePassword, isSignedIn } from "@/lib/auth";
import { appPath } from "@/lib/app-nav";

/** The first-sign-in step in the phone app: replace the temporary password. */
export default function AppChangePasswordPage() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn()) router.replace(appPath("/login"));
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
      router.replace(appPath("/today"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the password.");
      setLoading(false);
    }
  };

  const input = "w-full px-4 py-3 rounded-xl bg-os-card border border-os-border text-os-ink text-sm focus:border-teal focus:outline-none";
  const label = "block text-[11px] font-mono uppercase tracking-wide text-os-text-dim mb-1.5";

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12 max-w-sm mx-auto">
      <div className="flex flex-col items-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-bright via-teal to-teal-dim flex items-center justify-center shadow-lg shadow-teal/20 mb-4">
          <KeyRound className="w-7 h-7 text-os-bg" />
        </div>
        <h1 className="text-xl font-semibold text-os-ink">Choose your password</h1>
        <p className="text-xs text-os-text-dim mt-1 text-center">
          The one you were given is temporary. Pick one only you know - at least 10 characters.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="cp-current" className={label}>Password you were given</label>
          <input id="cp-current" type="password" required autoComplete="current-password" value={current}
            onChange={(e) => setCurrent(e.target.value)} className={input} />
        </div>
        <div>
          <label htmlFor="cp-new" className={label}>New password</label>
          <input id="cp-new" type="password" required minLength={10} autoComplete="new-password" value={next}
            onChange={(e) => setNext(e.target.value)} className={input} />
        </div>
        <div>
          <label htmlFor="cp-again" className={label}>New password again</label>
          <input id="cp-again" type="password" required minLength={10} autoComplete="new-password" value={again}
            onChange={(e) => setAgain(e.target.value)} className={input} />
        </div>

        {error && (
          <div role="alert" className="px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-teal hover:bg-teal-dim text-os-bg text-sm font-bold transition-all disabled:opacity-50 active:scale-[0.98]"
        >
          {loading ? "Saving..." : "Save and continue"}
        </button>
      </form>
    </div>
  );
}
