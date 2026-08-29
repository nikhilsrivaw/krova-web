"use client";

import { useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, AlertCircle } from "lucide-react";
import { signIn } from "@/lib/auth";

import { AuroraText } from "@/components/magicui/aurora-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import { AuthShell } from "@/components/spectrum/auth-shell";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      router.push("/ledger");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    // Google sign-in went through Supabase OAuth, which we no longer use.
    // Krova issues its own tokens now; social login needs its own flow.
    setError("Google sign-in isn't available yet — use your email and password.");
  };

  return (
    <AuthShell>
      <div className="relative os-window overflow-visible">
        <div className="relative overflow-hidden rounded-[inherit]">
          <BorderBeam size={200} duration={12} colorFrom="#5EEAD4" colorTo="#00A387" />

          <div className="h-9 border-b border-os-border flex items-center px-4 bg-os-bg/50">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-os-border" />
              <div className="w-2.5 h-2.5 rounded-full bg-os-border" />
              <div className="w-2.5 h-2.5 rounded-full bg-os-border" />
            </div>
            <span className="mx-auto text-[10px] font-mono text-os-text-dim uppercase tracking-widest">
              Auth / Sign In
            </span>
          </div>

          <form onSubmit={handleEmailLogin} className="p-8 space-y-5 relative">
            <div className="relative">
              <h1 className="text-2xl font-bold tracking-tight mb-1">
                Welcome <AuroraText>back.</AuroraText>
              </h1>
              <p className="text-xs text-os-text-dim">Sign in to your KROVA workspace</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-thread/10 border border-thread/20 relative">
                <AlertCircle size={12} className="text-thread-bright shrink-0" />
                <p className="text-[11px] text-thread-bright">{error}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="os-button os-button-secondary w-full justify-center text-xs py-2.5 gap-3 relative"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M15.68 8.18c0-.57-.05-1.12-.14-1.64H8v3.1h4.3a3.67 3.67 0 01-1.59 2.41v2h2.57c1.5-1.38 2.4-3.42 2.4-5.87z" fill="#4285F4" />
                <path d="M8 16c2.16 0 3.97-.72 5.29-1.94l-2.57-2a4.8 4.8 0 01-7.15-2.52H.96v2.07A8 8 0 008 16z" fill="#34A853" />
                <path d="M3.57 9.54A4.8 4.8 0 013.32 8c0-.54.09-1.06.25-1.54V4.39H.96A8 8 0 000 8c0 1.29.31 2.51.96 3.61l2.61-2.07z" fill="#FBBC05" />
                <path d="M8 3.2c1.22 0 2.31.42 3.17 1.24l2.37-2.37A8 8 0 00.96 4.39L3.57 6.46A4.77 4.77 0 018 3.2z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3 relative">
              <div className="flex-1 h-px bg-os-border" />
              <span className="text-[10px] text-os-text-dim uppercase tracking-widest">or</span>
              <div className="flex-1 h-px bg-os-border" />
            </div>

            <div className="space-y-1.5 relative">
              <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono"
              />
            </div>

            <div className="space-y-1.5 relative">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
                  Password
                </label>
                <button
                  type="button"
                  className="text-[10px] text-os-text-dim hover:text-white transition-colors uppercase tracking-widest"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-os-text-dim hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="os-button os-button-cta w-full justify-center py-2.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed gap-2 relative"
            >
              {loading ? (
                "Signing in..."
              ) : (
                <>
                  Sign In <ArrowRight size={16} />
                </>
              )}
            </motion.button>
          </form>

          <div className="px-8 pb-6 text-center relative">
            <p className="text-[11px] text-os-text-dim">
              No account?{" "}
              <Link href="/signup" className="text-white hover:underline font-bold">
                Create workspace
              </Link>
            </p>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
