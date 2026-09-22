"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { googleExchange } from "@/lib/auth";
import { AuthShell } from "@/components/spectrum/auth-shell";

/**
 * Where services/api/routers/auth.py's /auth/google/callback lands the
 * browser after a successful Google sign-in/sign-up: a short-lived handoff
 * code in the URL (never the real tokens, see create_google_handoff's own
 * comment), traded in here for the actual session.
 */
export default function GoogleCompletePage() {
  return (
    <Suspense fallback={null}>
      <GoogleComplete />
    </Suspense>
  );
}

function GoogleComplete() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setError("Missing sign-in code.");
      return;
    }
    googleExchange(code)
      .then((session) => {
        router.push(session.business_id ? "/ledger" : "/onboarding");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not complete Google sign-in");
      });
    // Only ever run once per mount - the handoff code is single-use, so a
    // re-render must not fire a second exchange against an already-spent code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthShell>
      <div className="relative os-window overflow-visible">
        <div className="relative overflow-hidden rounded-[inherit] p-10 text-center">
          {error ? (
            <>
              <AlertCircle size={24} className="text-thread-bright mx-auto mb-3" />
              <p className="text-sm text-thread-bright mb-4">{error}</p>
              <Link
                href="/login"
                className="text-[11px] font-bold uppercase tracking-widest text-os-text-dim hover:text-white transition-colors"
              >
                Back to sign in
              </Link>
            </>
          ) : (
            <>
              <Loader2 size={24} className="animate-spin mx-auto mb-3 text-teal" />
              <p className="text-sm text-os-text-dim">Finishing Google sign-in...</p>
            </>
          )}
        </div>
      </div>
    </AuthShell>
  );
}
