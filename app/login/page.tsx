"use client";

import { Suspense, useEffect, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, AlertCircle, Mail, PhoneCall } from "lucide-react";
import { googleStart, signIn, requestOtp, otpLogin } from "@/lib/auth";

import { AuroraText } from "@/components/magicui/aurora-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import { AuthShell } from "@/components/spectrum/auth-shell";

// Mirrors services/api/routers/auth.py's google_callback redirect codes.
const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_denied: "Google sign-in was cancelled.",
  google_expired: "That sign-in attempt expired — please try again.",
  google_failed: "Google sign-in failed — please try again.",
  google_unverified_email: "That Google account's email isn't verified.",
  account_disabled: "This account has been disabled.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

type Mode = "password" | "otp";
type OtpChannel = "email" | "call";
type OtpStep = "destination" | "code";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>("password");
  const [otpChannel, setOtpChannel] = useState<OtpChannel>("email");
  const [otpStep, setOtpStep] = useState<OtpStep>("destination");
  const [otpDestination, setOtpDestination] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);

  useEffect(() => {
    const code = searchParams.get("error");
    if (code) setError(GOOGLE_ERROR_MESSAGES[code] || "Could not sign in with Google.");
  }, [searchParams]);

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
    setError(null);
    setGoogleLoading(true);
    try {
      window.location.href = await googleStart();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start Google sign-in");
      setGoogleLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOtpSending(true);
    try {
      await requestOtp(otpDestination.trim(), otpChannel);
      setOtpStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the code");
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOtpVerifying(true);
    try {
      await otpLogin(otpDestination.trim(), otpChannel, otpCode.trim());
      router.push("/ledger");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setOtpVerifying(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setOtpStep("destination");
    setOtpCode("");
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

          <div className="p-8 pb-0 space-y-5 relative">
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
              disabled={googleLoading}
              className="os-button os-button-secondary w-full justify-center text-xs py-2.5 gap-3 relative disabled:opacity-60"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M15.68 8.18c0-.57-.05-1.12-.14-1.64H8v3.1h4.3a3.67 3.67 0 01-1.59 2.41v2h2.57c1.5-1.38 2.4-3.42 2.4-5.87z" fill="#4285F4" />
                <path d="M8 16c2.16 0 3.97-.72 5.29-1.94l-2.57-2a4.8 4.8 0 01-7.15-2.52H.96v2.07A8 8 0 008 16z" fill="#34A853" />
                <path d="M3.57 9.54A4.8 4.8 0 013.32 8c0-.54.09-1.06.25-1.54V4.39H.96A8 8 0 000 8c0 1.29.31 2.51.96 3.61l2.61-2.07z" fill="#FBBC05" />
                <path d="M8 3.2c1.22 0 2.31.42 3.17 1.24l2.37-2.37A8 8 0 00.96 4.39L3.57 6.46A4.77 4.77 0 018 3.2z" fill="#EA4335" />
              </svg>
              {googleLoading ? "Redirecting..." : "Continue with Google"}
            </button>

            <div className="flex items-center gap-3 relative">
              <div className="flex-1 h-px bg-os-border" />
              <span className="text-[10px] text-os-text-dim uppercase tracking-widest">or</span>
              <div className="flex-1 h-px bg-os-border" />
            </div>

            <div className="flex rounded-lg border border-os-border p-0.5 relative">
              <button
                type="button"
                onClick={() => switchMode("password")}
                className={`flex-1 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-widest transition-colors ${mode === "password" ? "bg-os-border-bright text-white" : "text-os-text-dim hover:text-white"}`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => switchMode("otp")}
                className={`flex-1 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-widest transition-colors ${mode === "otp" ? "bg-os-border-bright text-white" : "text-os-text-dim hover:text-white"}`}
              >
                Code
              </button>
            </div>
          </div>

          {mode === "password" ? (
            <form onSubmit={handleEmailLogin} className="p-8 pt-5 space-y-5 relative">
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
          ) : (
            <div className="p-8 pt-5 space-y-5 relative">
              <div className="flex rounded-lg border border-os-border p-0.5">
                <button
                  type="button"
                  onClick={() => { setOtpChannel("email"); setOtpStep("destination"); setOtpDestination(""); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-bold transition-colors ${otpChannel === "email" ? "bg-os-border-bright text-white" : "text-os-text-dim hover:text-white"}`}
                >
                  <Mail size={12} /> Email
                </button>
                <button
                  type="button"
                  onClick={() => { setOtpChannel("call"); setOtpStep("destination"); setOtpDestination(""); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-bold transition-colors ${otpChannel === "call" ? "bg-os-border-bright text-white" : "text-os-text-dim hover:text-white"}`}
                >
                  <PhoneCall size={12} /> Phone call
                </button>
              </div>

              {otpStep === "destination" ? (
                <form onSubmit={handleSendOtp} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
                      {otpChannel === "email" ? "Email" : "Phone number"}
                    </label>
                    <input
                      type={otpChannel === "email" ? "email" : "tel"}
                      value={otpDestination}
                      onChange={(e) => setOtpDestination(e.target.value)}
                      placeholder={otpChannel === "email" ? "you@example.com" : "+91 98765 43210"}
                      required
                      className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono"
                    />
                    {otpChannel === "call" && (
                      <p className="text-[10px] text-os-text-dim">
                        No account yet? <Link href="/signup" className="text-white hover:underline">Sign up</Link> instead.
                      </p>
                    )}
                  </div>
                  <motion.button
                    type="submit"
                    disabled={otpSending}
                    whileHover={{ scale: otpSending ? 1 : 1.02 }}
                    whileTap={{ scale: otpSending ? 1 : 0.98 }}
                    className="os-button os-button-cta w-full justify-center py-2.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed gap-2"
                  >
                    {otpSending ? "Sending..." : otpChannel === "email" ? "Email me a code" : "Call me with a code"}
                  </motion.button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
                        Verification code
                      </label>
                      <button
                        type="button"
                        onClick={() => setOtpStep("destination")}
                        className="text-[10px] text-os-text-dim hover:text-white transition-colors uppercase tracking-widest"
                      >
                        Change
                      </button>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      required
                      autoFocus
                      className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono tracking-[0.3em] text-center"
                    />
                    <p className="text-[10px] text-os-text-dim">
                      {otpChannel === "email" ? `Sent to ${otpDestination}` : `Read aloud on a call to ${otpDestination}`}
                    </p>
                  </div>
                  <motion.button
                    type="submit"
                    disabled={otpVerifying}
                    whileHover={{ scale: otpVerifying ? 1 : 1.02 }}
                    whileTap={{ scale: otpVerifying ? 1 : 0.98 }}
                    className="os-button os-button-cta w-full justify-center py-2.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed gap-2"
                  >
                    {otpVerifying ? "Verifying..." : "Verify & sign in"}
                  </motion.button>
                </form>
              )}
            </div>
          )}

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
