"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, AlertCircle, Mail, CheckCircle2 } from "lucide-react";
import { register } from "@/lib/auth";
import { fetchVerticals, type Vertical } from "@/lib/api";

import { AuroraText } from "@/components/magicui/aurora-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import { AuthShell } from "@/components/spectrum/auth-shell";

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [vertical, setVertical] = useState("general");
  const [verticals, setVerticals] = useState<Vertical[]>([]);

  // The list comes from the server so adding a vertical stays a config change
  // rather than a frontend release.
  useEffect(() => {
    fetchVerticals().then(setVerticals).catch(() => setVerticals([]));
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }
    setLoading(true);
    try {
      await register({
        email,
        password,
        full_name: name,
        business_name: businessName,
        vertical,
      });
      router.push("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account");
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    // Google sign-up ran through Supabase OAuth, which we no longer use.
    setError("Google sign-up isn't available yet — use your email and password.");
  };

  // Confirmation screen
  if (confirmEmail) {
    return (
      <AuthShell>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full text-center"
        >
          <motion.div
            initial={{ scale: 0.5, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="relative w-20 h-20 mx-auto mb-8"
          >
            <div className="absolute inset-0 rounded-3xl bg-teal/20 blur-xl" />
            <div className="relative w-20 h-20 bg-os-card border border-os-border rounded-3xl flex items-center justify-center overflow-hidden">
              <BorderBeam size={60} duration={6} colorFrom="#5EEAD4" colorTo="#00A387" />
              <Mail size={32} className="text-teal relative z-10" />
            </div>
          </motion.div>

          <h1 className="text-3xl font-bold tracking-tight mb-3">
            Check your <AuroraText>email.</AuroraText>
          </h1>
          <p className="text-os-text-dim text-sm leading-relaxed mb-8">
            We sent a confirmation link to{" "}
            <span className="text-white font-bold font-mono">{email}</span>. Click it to activate
            your account and continue setup.
          </p>

          <div className="os-card p-4 text-left space-y-3 mb-8 relative overflow-hidden">
            <BorderBeam size={120} duration={10} colorFrom="#5EEAD4" colorTo="#00A387" />
            {[
              "Open your email inbox",
              "Click the confirmation link from KROVA",
              "You'll be taken to workspace setup",
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3 relative">
                <div className="w-6 h-6 rounded-full bg-teal/15 border border-teal/30 flex items-center justify-center text-[10px] font-bold shrink-0 text-teal">
                  {i + 1}
                </div>
                <span className="text-xs text-os-text-dim">{step}</span>
              </div>
            ))}
          </div>

          <Link
            href="/login"
            className="text-[11px] font-bold uppercase tracking-widest text-os-text-dim hover:text-white transition-colors inline-flex items-center gap-1.5"
          >
            <CheckCircle2 size={11} className="text-teal" />
            Already confirmed? Sign in →
          </Link>
        </motion.div>
      </AuthShell>
    );
  }

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
              Auth / Create Account
            </span>
          </div>

          <form onSubmit={handleSignup} className="p-8 space-y-5 relative">
            <div className="relative">
              <h1 className="text-2xl font-bold tracking-tight mb-1">
                Create your <AuroraText>workspace.</AuroraText>
              </h1>
              <p className="text-xs text-os-text-dim">
                14-day free trial. No credit card required.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-thread/10 border border-thread/20 relative">
                <AlertCircle size={12} className="text-thread-bright shrink-0" />
                <p className="text-[11px] text-thread-bright">{error}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleSignup}
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
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Deepak Mehta"
                required
                className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono"
              />
            </div>

            <div className="space-y-1.5 relative">
              <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
                Business Name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Sharma Dental"
                required
                className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono"
              />
            </div>

            <div className="space-y-1.5 relative">
              <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
                What kind of business
              </label>
              <select
                value={vertical}
                onChange={(e) => setVertical(e.target.value)}
                className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono"
              >
                {verticals.length === 0 && (
                  <option value="general">General business</option>
                )}
                {verticals.map((v) => (
                  <option key={v.key} value={v.key}>
                    {v.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-os-text-dim">
                Krova uses this to set up your agent before your first
                conversation. You can change it later.
              </p>
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
              <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 10 characters"
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
                "Creating..."
              ) : (
                <>
                  Create Account <ArrowRight size={16} />
                </>
              )}
            </motion.button>

            <p className="text-[10px] text-os-text-dim text-center leading-relaxed relative">
              By signing up you agree to our{" "}
              <span className="text-white cursor-pointer hover:underline">Terms</span> and{" "}
              <span className="text-white cursor-pointer hover:underline">Privacy Policy</span>
            </p>
          </form>

          <div className="px-8 pb-6 text-center relative">
            <p className="text-[11px] text-os-text-dim">
              Already have an account?{" "}
              <Link href="/login" className="text-white hover:underline font-bold">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
