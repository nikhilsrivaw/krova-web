"use client";

/**
 * Account creation - two ways in, picked with the toggle at the top:
 *
 *   Google          business name + type, then Continue with Google
 *   Email / phone   business name + type, then the email or phone number,
 *                   a password, and a code proving the number is theirs
 *
 * Business name and business type are asked in BOTH, in the same place and
 * the same order, because both need them: googleStart carries them through
 * its OAuth round trip, and the email/phone path sends them with the code.
 * Switching between the two keeps what was typed (one piece of state, not
 * two). No full-name field - Google supplies a name itself, and for the
 * email/phone path it is one more thing between someone and a working
 * account; it can be set later in Settings.
 *
 * Once a code is sent, the form collapses to a one-line summary and only
 * the code input remains: every other field is noise by then, and leaving
 * them live would let someone change the business name out from under a
 * code already on its way.
 */

import { Suspense, useEffect, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, AlertCircle, Mail, PhoneCall, Pencil } from "lucide-react";
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

const FIELD_CLASS =
  "w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono";

type Method = "google" | "otp";
type OtpChannel = "email" | "call";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">
      {children}
    </label>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [method, setMethod] = useState<Method>("google");

  // Asked in both methods.
  const [businessName, setBusinessName] = useState("");
  const [vertical, setVertical] = useState("general");
  const [verticals, setVerticals] = useState<Vertical[]>([]);

  // Email / phone only.
  const [channel, setChannel] = useState<OtpChannel>("email");
  const [destination, setDestination] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");

  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Server-driven so adding a vertical stays a config change rather than a
  // frontend release.
  useEffect(() => {
    fetchVerticals().then(setVerticals).catch(() => setVerticals([]));
  }, []);

  useEffect(() => {
    const errorCode = searchParams.get("error");
    if (errorCode) setError(GOOGLE_ERROR_MESSAGES[errorCode] || "Could not sign up with Google.");
  }, [searchParams]);

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

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }
    setSending(true);
    try {
      await requestOtp(destination.trim(), channel);
      setCodeSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the code");
    } finally {
      setSending(false);
    }
  };

  const handleVerifyAndCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await otpRegister({
        channel,
        destination: destination.trim(),
        code: code.trim(),
        password,
        business_name: businessName,
        vertical,
      });
      router.push("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account");
      setCreating(false);
    }
  };

  const verticalLabel =
    verticals.find((v) => v.key === vertical)?.label || "General business";

  // The same two fields, rendered inside whichever method is showing.
  const businessFields = (
    <>
      <div className="space-y-1.5">
        <FieldLabel>Business name</FieldLabel>
        <input
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Sharma Dental"
          required
          className={FIELD_CLASS}
        />
      </div>

      <div className="space-y-1.5">
        <FieldLabel>What kind of business</FieldLabel>
        <select
          value={vertical}
          onChange={(e) => setVertical(e.target.value)}
          className={FIELD_CLASS}
        >
          {verticals.length === 0 && <option value="general">General business</option>}
          {verticals.map((v) => (
            <option key={v.key} value={v.key}>
              {v.label}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-os-text-dim">
          Krova uses this to set up your agent before your first conversation. You can change
          it later.
        </p>
      </div>
    </>
  );

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

          <div className="p-8 pb-0 relative">
            <h1 className="text-2xl font-bold tracking-tight mb-1">
              Create your <AuroraText>workspace.</AuroraText>
            </h1>
            <p className="text-xs text-os-text-dim">
              14-day free trial. No credit card required.
            </p>
          </div>

          {error && (
            <div className="mx-8 mt-5 flex items-center gap-2 p-3 rounded-lg bg-thread/10 border border-thread/20 relative">
              <AlertCircle size={12} className="text-thread-bright shrink-0" />
              <p className="text-[11px] text-thread-bright">{error}</p>
            </div>
          )}

          {codeSent ? (
            /* ── Verification step: everything else collapses to a summary ── */
            <form onSubmit={handleVerifyAndCreate} className="p-8 space-y-5 relative">
              <div className="rounded-lg border border-os-border bg-os-bg/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs font-bold text-white font-mono truncate">{destination}</p>
                    <p className="text-[11px] text-os-text-dim truncate">
                      {businessName} · {verticalLabel}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setCodeSent(false); setCode(""); setError(null); }}
                    className="shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-os-text-dim hover:text-white transition-colors"
                  >
                    <Pencil size={10} /> Edit
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <FieldLabel>Verification code</FieldLabel>
                <input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  required
                  autoFocus
                  className={`${FIELD_CLASS} tracking-[0.3em] text-center`}
                />
                <p className="text-[11px] text-os-text-dim">
                  {channel === "email"
                    ? "Check your inbox — the code expires in 10 minutes."
                    : "We're calling you now and will read the code out twice."}
                </p>
              </div>

              <motion.button
                type="submit"
                disabled={creating}
                whileHover={{ scale: creating ? 1 : 1.02 }}
                whileTap={{ scale: creating ? 1 : 0.98 }}
                className="os-button os-button-cta w-full justify-center py-2.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed gap-2"
              >
                {creating ? (
                  "Creating workspace..."
                ) : (
                  <>
                    Verify &amp; Create Account <ArrowRight size={16} />
                  </>
                )}
              </motion.button>
            </form>
          ) : (
            <div className="p-8 space-y-5 relative">
              <div className="flex rounded-lg border border-os-border p-0.5">
                <button
                  type="button"
                  onClick={() => { setMethod("google"); setError(null); }}
                  className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-colors ${method === "google" ? "bg-os-border-bright text-white" : "text-os-text-dim hover:text-white"}`}
                >
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => { setMethod("otp"); setError(null); }}
                  className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-colors ${method === "otp" ? "bg-os-border-bright text-white" : "text-os-text-dim hover:text-white"}`}
                >
                  Email / Phone
                </button>
              </div>

              {method === "google" ? (
                <div className="space-y-5">
                  {businessFields}

                  <button
                    type="button"
                    onClick={handleGoogleSignup}
                    disabled={googleLoading}
                    className="os-button os-button-cta w-full justify-center py-2.5 text-sm font-bold gap-3 disabled:opacity-60"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M15.68 8.18c0-.57-.05-1.12-.14-1.64H8v3.1h4.3a3.67 3.67 0 01-1.59 2.41v2h2.57c1.5-1.38 2.4-3.42 2.4-5.87z" fill="#4285F4" />
                      <path d="M8 16c2.16 0 3.97-.72 5.29-1.94l-2.57-2a4.8 4.8 0 01-7.15-2.52H.96v2.07A8 8 0 008 16z" fill="#34A853" />
                      <path d="M3.57 9.54A4.8 4.8 0 013.32 8c0-.54.09-1.06.25-1.54V4.39H.96A8 8 0 000 8c0 1.29.31 2.51.96 3.61l2.61-2.07z" fill="#FBBC05" />
                      <path d="M8 3.2c1.22 0 2.31.42 3.17 1.24l2.37-2.37A8 8 0 00.96 4.39L3.57 6.46A4.77 4.77 0 018 3.2z" fill="#EA4335" />
                    </svg>
                    {googleLoading ? "Redirecting..." : "Continue with Google"}
                  </button>
                  <p className="text-[11px] text-os-text-dim text-center -mt-2">
                    Google confirms your email, so there is no password or code to set up.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSendCode} className="space-y-5">
                  {businessFields}

                  <div className="space-y-1.5">
                    <FieldLabel>Verify with</FieldLabel>
                    <div className="flex rounded-lg border border-os-border p-0.5">
                      <button
                        type="button"
                        onClick={() => { setChannel("email"); setDestination(""); setError(null); }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-bold transition-colors ${channel === "email" ? "bg-os-border-bright text-white" : "text-os-text-dim hover:text-white"}`}
                      >
                        <Mail size={12} /> Email
                      </button>
                      <button
                        type="button"
                        onClick={() => { setChannel("call"); setDestination(""); setError(null); }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-bold transition-colors ${channel === "call" ? "bg-os-border-bright text-white" : "text-os-text-dim hover:text-white"}`}
                      >
                        <PhoneCall size={12} /> Phone call
                      </button>
                    </div>
                    <input
                      type={channel === "email" ? "email" : "tel"}
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder={channel === "email" ? "you@example.com" : "+91 98765 43210"}
                      required
                      className={FIELD_CLASS}
                    />
                    <p className="text-[11px] text-os-text-dim">
                      {channel === "email"
                        ? "We'll email a 6-digit code to confirm this address."
                        : "We'll call and read out a 6-digit code — no SMS."}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel>Password</FieldLabel>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 10 characters"
                        required
                        className={`${FIELD_CLASS} pr-10`}
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
                    disabled={sending}
                    whileHover={{ scale: sending ? 1 : 1.02 }}
                    whileTap={{ scale: sending ? 1 : 0.98 }}
                    className="os-button os-button-cta w-full justify-center py-2.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed gap-2"
                  >
                    {sending
                      ? "Sending code..."
                      : channel === "email"
                      ? "Email me a code"
                      : "Call me with a code"}
                  </motion.button>
                </form>
              )}

              <p className="text-[10px] text-os-text-dim text-center leading-relaxed">
                By signing up you agree to our{" "}
                <span className="text-white cursor-pointer hover:underline">Terms</span> and{" "}
                <span className="text-white cursor-pointer hover:underline">Privacy Policy</span>
              </p>
            </div>
          )}

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
