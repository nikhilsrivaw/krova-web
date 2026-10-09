"use client";

import { Suspense, useEffect, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, AlertCircle } from "lucide-react";
import { googleStart, requestOtp, otpRegister } from "@/lib/auth";
import { fetchVerticals, type Vertical } from "@/lib/api";

import { AuroraText } from "@/components/magicui/aurora-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import { AuthShell } from "@/components/spectrum/auth-shell";

// Mirrors services/api/routers/auth.py's google_callback redirect codes.
const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_denied: "Google sign-up was cancelled.",
  google_expired: "That sign-up attempt expired — please try again.",
  google_failed: "Google sign-up failed — please try again.",
  google_unverified_email: "That Google account's email isn't verified.",
  google_no_account:
    "No Krova account uses that Google email yet — fill in your business details below and continue with Google again.",
};

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}

type OtpChannel = "email" | "call";
type OtpStep = "destination" | "code";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);

  // Always collected, regardless of how the email/phone gets verified -
  // business name, business type, full name, and a real password the
  // person chooses and signs in with afterwards (OTP below only proves
  // the email/phone is really theirs, it is not a passwordless login).
  const [businessName, setBusinessName] = useState("");
  const [vertical, setVertical] = useState("general");
  const [verticals, setVerticals] = useState<Vertical[]>([]);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const [otpChannel, setOtpChannel] = useState<OtpChannel>("email");
  const [otpDestination, setOtpDestination] = useState("");
  const [otpStep, setOtpStep] = useState<OtpStep>("destination");
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The list comes from the server so adding a vertical stays a config change
  // rather than a frontend release.
  useEffect(() => {
    fetchVerticals().then(setVerticals).catch(() => setVerticals([]));
  }, []);

  useEffect(() => {
    const code = searchParams.get("error");
    if (code) setError(GOOGLE_ERROR_MESSAGES[code] || "Could not sign up with Google.");
  }, [searchParams]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }
    if (!otpDestination.trim()) {
      setError(otpChannel === "email" ? "Enter your email first." : "Enter your phone number first.");
      return;
    }
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

  const handleVerifyAndCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await otpRegister({
        channel: otpChannel,
        destination: otpDestination.trim(),
        code: otpCode.trim(),
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
    setError(null);
    if (!businessName.trim()) {
      setError("Enter your business name first, so Krova knows what to set up.");
      return;
    }
    setGoogleLoading(true);
    try {
      window.location.href = await googleStart(businessName, vertical);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start Google sign-up");
      setGoogleLoading(false);
    }
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
              Auth / Create Account
            </span>
          </div>

          <form
            onSubmit={otpStep === "destination" ? handleSendOtp : handleVerifyAndCreate}
            className="p-8 space-y-5 relative"
          >
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
                disabled={otpStep === "code"}
                className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono disabled:opacity-60"
              />
            </div>

            <div className="space-y-1.5 relative">
              <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
                What kind of business
              </label>
              <select
                value={vertical}
                onChange={(e) => setVertical(e.target.value)}
                disabled={otpStep === "code"}
                className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono disabled:opacity-60"
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

            <button
              type="button"
              onClick={handleGoogleSignup}
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
                disabled={otpStep === "code"}
                className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono disabled:opacity-60"
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
                  disabled={otpStep === "code"}
                  className="w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono pr-10 disabled:opacity-60"
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

            <div className="flex rounded-lg border border-os-border p-0.5 relative">
              <button
                type="button"
                onClick={() => { setOtpChannel("email"); setOtpStep("destination"); setOtpDestination(""); setError(null); }}
                disabled={otpStep === "code"}
                className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-colors disabled:opacity-60 ${otpChannel === "email" ? "bg-os-border-bright text-white" : "text-os-text-dim hover:text-white"}`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => { setOtpChannel("call"); setOtpStep("destination"); setOtpDestination(""); setError(null); }}
                disabled={otpStep === "code"}
                className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-colors disabled:opacity-60 ${otpChannel === "call" ? "bg-os-border-bright text-white" : "text-os-text-dim hover:text-white"}`}
              >
                Phone call
              </button>
            </div>

            {otpStep === "destination" ? (
              <div className="space-y-1.5 relative">
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
                <p className="text-[11px] text-os-text-dim">
                  {otpChannel === "email"
                    ? "We'll email a 6-digit code to confirm this address."
                    : "We'll call this number and read out a 6-digit code - no SMS."}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 relative">
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
                <p className="text-[11px] text-os-text-dim">
                  {otpChannel === "email" ? `Sent to ${otpDestination}` : `Read aloud on a call to ${otpDestination}`}
                </p>
              </div>
            )}

            {otpStep === "destination" ? (
              <motion.button
                type="submit"
                disabled={otpSending}
                whileHover={{ scale: otpSending ? 1 : 1.02 }}
                whileTap={{ scale: otpSending ? 1 : 0.98 }}
                className="os-button os-button-cta w-full justify-center py-2.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed gap-2 relative"
              >
                {otpSending ? "Sending..." : otpChannel === "email" ? "Email me a code" : "Call me with a code"}
              </motion.button>
            ) : (
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
                    Verify & Create Account <ArrowRight size={16} />
                  </>
                )}
              </motion.button>
            )}

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
