"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Lock, RefreshCw } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { account } from "@/lib/api";

/**
 * Keeps a page that links channels or spends the business's money (WhatsApp, Instagram, the
 * voice line) to the owner and admins. A team member does not see it in the menu, and if they
 * open the address anyway they get this instead - and none of the page's own requests run.
 *
 * The API refuses them regardless; this only stops a screen full of "not allowed" errors.
 */
type Check = { kind: "loading" } | { kind: "allowed" } | { kind: "denied"; role: string | null } | { kind: "failed" };

export function OwnerAdminOnly({ title, children }: { title: string; children: React.ReactNode }) {
  const [check, setCheck] = useState<Check>({ kind: "loading" });

  const run = useCallback(() => {
    setCheck({ kind: "loading" });
    account
      .profile()
      .then((p) =>
        setCheck(p.role === "owner" || p.role === "admin" ? { kind: "allowed" } : { kind: "denied", role: p.role }),
      )
      .catch(() => setCheck({ kind: "failed" }));
  }, []);

  useEffect(run, [run]);

  if (check.kind === "allowed") return <>{children}</>;

  return (
    <AppLayout title={title}>
      {check.kind === "loading" ? (
        <Skeleton className="h-48 w-full" />
      ) : check.kind === "failed" ? (
        <GlassCard className="p-6">
          <EmptyState
            icon={RefreshCw}
            title="Could not check your access"
            description="This is a connection problem, not a restriction. Try again."
          />
          <div className="mt-4 text-center">
            <button type="button" onClick={run} className="text-xs font-semibold text-cyan-400 hover:underline cursor-pointer">
              Try again
            </button>
          </div>
        </GlassCard>
      ) : (
        <GlassCard className="p-6">
          <EmptyState
            icon={Lock}
            title="Only the owner and admins can open this"
            description={`This is where the business's channels and phone numbers are set up and paid for. You are signed in as ${
              check.role === "agent" ? "a team member" : "someone without owner access"
            }. Ask the owner if something needs changing.`}
          />
        </GlassCard>
      )}
    </AppLayout>
  );
}
