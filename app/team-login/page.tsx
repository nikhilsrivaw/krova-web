"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";
import { teamSignIn } from "@/lib/auth";
import { AuthShell } from "@/components/spectrum/auth-shell";

/**
 * Where a teammate signs in with the Team ID and password their owner gave
 * them. No email, no codes. The first time, they are sent to choose their own
 * password before anything else.
 */
export default function TeamLoginPage() {
  const router = useRouter();
  const [teamId, setTeamId] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await teamSignIn(teamId.trim(), password);
      router.push(session.must_change_password ? "/change-password" : "/conversations");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="relative os-window overflow-visible">
        <div className="relative overflow-hidden rounded-[inherit]">
          <div className="p-8 pb-0 space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Team sign in</h1>
            <p className="text-xs text-os-text-dim">
              Use the Team ID and password your owner gave you.
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
              <label htmlFor="team-id" className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
                Team ID
              </label>
              <input
                id="team-id"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                placeholder="rahul@yourshop"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="team-password" className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
                Password
              </label>
              <div className="relative">
                <input
                  id="team-password"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-os-border-bright transition-colors font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-os-text-dim hover:text-white transition-colors"
                >
                  {show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="os-button os-button-cta w-full justify-center py-2.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed gap-2"
            >
              {loading ? "Signing in..." : (<>Sign in <ArrowRight size={16} /></>)}
            </button>
          </form>

          <div className="px-8 pb-6 text-center">
            <p className="text-[11px] text-os-text-dim">
              Own the business?{" "}
              <Link href="/login" className="text-white hover:underline font-bold">Sign in here</Link>
            </p>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
