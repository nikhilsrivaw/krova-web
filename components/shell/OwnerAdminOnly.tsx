"use client";

import React, { useEffect, useState } from "react";
import { Lock } from "lucide-react";
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
export function OwnerAdminOnly({ title, children }: { title: string; children: React.ReactNode }) {
  const [role, setRole] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    account.profile().then((p) => setRole(p.role)).catch(() => setRole(null));
  }, []);

  if (role === "owner" || role === "admin") return <>{children}</>;

  return (
    <AppLayout title={title}>
      {role === undefined ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <GlassCard className="p-6">
          <EmptyState
            icon={Lock}
            title="Only the owner and admins can open this"
            description="This is where the business's channels and phone numbers are set up and paid for. Ask the owner if something needs changing. Your chats, leads and calls are unaffected."
          />
        </GlassCard>
      )}
    </AppLayout>
  );
}
