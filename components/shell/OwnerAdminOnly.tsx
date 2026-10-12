"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, RefreshCw } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { account } from "@/lib/api";
import { usePlan } from "@/lib/usePlan";

/**
 * Keeps a page that links channels or spends the business's money (WhatsApp, Instagram, the
 * voice line) to the owner and admins. A team member does not see it in the menu, and if they
 * open the address anyway they get this instead - and none of the page's own requests run.
 *
 * For the owner of a business that has not chosen a plan, `unlock` names the channel: the page is
 * locked and they are taken to the pricing for it. The API refuses regardless; this only stops a
 * screen full of errors.
 */
type Check = { kind: "loading" } | { kind: "allowed" } | { kind: "denied"; role: string | null } | { kind: "failed" };

export function OwnerAdminOnly({
  title,
  unlock,
  children,
}: {
  title: string;
  /** Slug of the channel this page is (whatsapp | instagram | voice), for the pricing screen. */
  unlock?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const plan = usePlan();
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

  const locked = check.kind === "allowed" && plan.ready && plan.channelsLocked && !!unlock;
  useEffect(() => {
    if (locked) router.replace(`/billing?unlock=${unlock}`);
  }, [locked, router, unlock]);

  if (check.kind === "allowed" && plan.ready && !locked) return <>{children}</>;

  return (
    <AppLayout title={title}>
      {check.kind === "loading" || (check.kind === "allowed" && (!plan.ready || locked)) ? (
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
              check.kind === "denied" && check.role === "agent" ? "a team member" : "someone without owner access"
            }. Ask the owner if something needs changing.`}
          />
        </GlassCard>
      )}
    </AppLayout>
  );
}
