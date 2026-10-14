"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, KeyRound, Mail, PhoneCall } from "lucide-react";
import { requestPasswordReset, confirmPasswordReset } from "@/lib/auth";
import { AuthShell } from "@/components/spectrum/auth-shell";

type Channel = "email" | "call";
type Step = "who" | "code" | "done";

/**
 * Forgot password. Prove the email or phone number with a code (emailed, or read aloud on a phone call), then
 * choose a new password. Every other device is signed out when it changes.
 */
export default function ForgotPasswordPage() {
  const [channel, setChannel] = useState<Channel>("email");
  const [step, setStep] = useState<Step>("who");
  const [destination, setDestination] = useState("");
  const [code, setCode] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const field = "w-full bg-os-bg border border-os-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-os-border-bright transition-colors font-mono";
  const label = "text-[10px] font-bold uppercase tracking-widest text-os-text-dim";
  const cta = "os-button os-button-cta w-full justify-center py-2.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed";

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await requestPasswordReset(destination.trim(), channel);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the code");
    } finally {
      setLoading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next !== again) {
      setError("The two new passwords are not the same.");
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset({ destination: destination.trim(), channel, code: code.trim(), new_password: next });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the password");
    } finally {
      setLoading(false);
    }
  };

  const tab = (c: Channel) =>
    `flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-bold transition-colors ${
      channel === c ? "bg-os-border-bright text-white" : "text-os-text-dim hover:text-white"
    }`;

  return (
    <AuthShell>
      <div className="relative os-window overflow-visible">
        <div className="relative overflow-hidden rounded-[inherit]">
          <div className="p-8 pb-0 space-y-2">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <KeyRound size={20} className="text-teal-bright" /> Reset your password
            </h1>
            <p className="text-xs text-os-text-dim">
              {step === "who" && "We will send a code to your email, or read it to you on a phone call, to make sure it is you."}
              {step === "code" && (channel === "email" ? `We sent a 6-digit code to ${destination}.` : `We are calling ${destination} to read you a 6-digit code.`)}
              {step === "done" && "Your password is changed."}
            </p>
          </div>

          {step === "done" ? (
            <div className="p-8 pt-5 space-y-5">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-seal/10 border border-seal/30">
                <CheckCircle2 size={14} className="text-seal-bright shrink-0" />
                <p className="text-[11px] text-seal-bright">You were signed out everywhere. Sign in with your new password.</p>
              </div>
              <Link href="/login" className={`${cta} flex`}>Go to sign in</Link>
            </div>
          ) : (
            <form onSubmit={step === "who" ? sendCode : save} className="p-8 pt-5 space-y-5">
              {error && (
                <div role="alert" className="flex items-center gap-2 p-3 rounded-lg bg-thread/10 border border-thread/20">
                  <AlertCircle size={12} className="text-thread-bright shrink-0" />
                  <p className="text-[11px] text-thread-bright">{error}</p>
                </div>
              )}

              {step === "who" ? (
                <>
                  <div className="flex gap-1 p-1 rounded-lg bg-os-bg border border-os-border">
                    <button type="button" onClick={() => { setChannel("email"); setDestination(""); setError(null); }} className={tab("email")}>
                      <Mail size={12} /> Email
                    </button>
                    <button type="button" onClick={() => { setChannel("call"); setDestination(""); setError(null); }} className={tab("call")}>
                      <PhoneCall size={12} /> Phone call
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="fp-dest" className={label}>{channel === "email" ? "Your email" : "Your phone number"}</label>
                    <input
                      id="fp-dest" required value={destination} onChange={(e) => setDestination(e.target.value)}
                      type={channel === "email" ? "email" : "tel"} autoComplete={channel === "email" ? "email" : "tel"}
                      placeholder={channel === "email" ? "you@example.com" : "+91 98765 43210"} className={field}
                    />
                    {channel === "call" && (
                      <p className="text-[10px] text-os-text-dim">A call from our number reads the code out loud. Pick up and listen to the end.</p>
                    )}
                  </div>
                  <button type="submit" disabled={loading} className={cta}>
                    {loading ? "Sending..." : channel === "email" ? "Email me a code" : "Call me with a code"}
                  </button>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label htmlFor="fp-code" className={label}>6-digit code</label>
                    <input
                      id="fp-code" required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                      inputMode="numeric" autoComplete="one-time-code" maxLength={8} placeholder="123456" className={field}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="fp-new" className={label}>New password (at least 10 characters)</label>
                    <input id="fp-new" type="password" autoComplete="new-password" minLength={10} required value={next}
                      onChange={(e) => setNext(e.target.value)} className={field} />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="fp-again" className={label}>New password again</label>
                    <input id="fp-again" type="password" autoComplete="new-password" minLength={10} required value={again}
                      onChange={(e) => setAgain(e.target.value)} className={field} />
                  </div>
                  <button type="submit" disabled={loading} className={cta}>{loading ? "Saving..." : "Change password"}</button>
                  <button type="button" onClick={() => { setStep("who"); setCode(""); setError(null); }}
                    className="w-full text-center text-[11px] text-os-text-dim hover:text-white">
                    Did not get a code? Go back and try again
                  </button>
                </>
              )}
            </form>
          )}

          {step !== "done" && (
            <p className="px-8 pb-8 text-center text-[11px] text-os-text-dim">
              <Link href="/login" className="hover:text-white underline underline-offset-2">Back to sign in</Link>
            </p>
          )}
        </div>
      </div>
    </AuthShell>
  );
}
