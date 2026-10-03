"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { googleExchange } from "@/lib/auth";
import { appPath } from "@/lib/app-nav";

/**
 * Google sign-in from the app lands here (app.krova.space/auth/google/complete,
 * rewritten to this route by middleware.ts). The handoff code is single-use,
 * so the exchange runs exactly once per mount.
 */
export default function AppGoogleCompletePage() {
  return (
    <Suspense fallback={null}>
      <AppGoogleComplete />
    </Suspense>
  );
}

function AppGoogleComplete() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setError("Missing sign-in code. Please try again.");
      return;
    }
    googleExchange(code)
      .then((session) => {
        if (session.business_id) {
          router.replace(appPath("/today"));
        } else {
          setError("This Google account has no KROVA business yet. Sign up on krova.space first.");
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not complete Google sign-in.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      {error ? (
        <>
          <p className="text-sm text-rose-400 mb-4">{error}</p>
          <a href={appPath("/login")} className="text-xs font-semibold text-teal">
            Back to sign in
          </a>
        </>
      ) : (
        <div className="h-7 w-7 rounded-full border-2 border-os-border border-t-teal animate-spin" />
      )}
    </div>
  );
}
