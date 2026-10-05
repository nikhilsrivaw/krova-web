"use client";

import React, { useEffect, useState } from "react";
import { MessageSquare, PhoneCall, Mail, Instagram, Globe } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import {
  ledger,
  approvals,
  analytics,
  type LedgerSummary,
  type Commitment,
  type MessageDraft,
  type AnalyticsOverview,
} from "@/lib/api";

const CHANNEL_META: Record<string, { label: string; icon: React.ElementType }> = {
  whatsapp: { label: "WhatsApp", icon: MessageSquare },
  voice: { label: "Voice", icon: PhoneCall },
  instagram: { label: "Instagram", icon: Instagram },
  email: { label: "Email", icon: Mail },
  web: { label: "Website Widget", icon: Globe },
};

/** Only surfaces anything once a draft's reply window is genuinely close to
 * closing - `expire_stale_drafts()` on the backend silently drops an
 * unapproved draft once this passes, so this is the one visible warning
 * an owner gets before that happens. */
function expiryUrgency(expiresAt: string | null): { label: string; className: string } | null {
  if (!expiresAt) return null;
  const msLeft = new Date(expiresAt).getTime() - Date.now();
  if (msLeft <= 0) {
    return { label: "Window closed", className: "bg-rose-500/20 text-rose-300 border-rose-500/40" };
  }
  const hoursLeft = msLeft / 3_600_000;
  if (hoursLeft < 2) {
    const mins = Math.round(msLeft / 60_000);
    return {
      label: `Expires in ${mins}m`,
      className: "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse",
    };
  }
  if (hoursLeft < 6) {
    return {
      label: `Expires in ${Math.round(hoursLeft)}h`,
      className: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    };
  }
  return null;
}

export default function DashboardPage() {
  const [ledgerSummary, setLedgerSummary] = useState<LedgerSummary | null>(null);
  const [pendingDrafts, setPendingDrafts] = useState<MessageDraft[]>([]);
  const [overdueCommitments, setOverdueCommitments] = useState<Commitment[]>([]);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadDashboard = async () => {
      const [sumRes, draftsRes, overdueRes, overRes] = await Promise.allSettled([
        ledger.summary(),
        approvals.list("pending"),
        ledger.commitments({ overdue_only: true, direction: "they_owe", limit: 5 }),
        analytics.overview(),
      ]);
      if (!mounted) return;

      if (sumRes.status === "fulfilled") setLedgerSummary(sumRes.value);
      if (draftsRes.status === "fulfilled") setPendingDrafts(draftsRes.value.slice(0, 5));
      if (overdueRes.status === "fulfilled") setOverdueCommitments(overdueRes.value);
      if (overRes.status === "fulfilled") setOverview(overRes.value);

      const failed = [sumRes, draftsRes, overdueRes, overRes].find(
        (r) => r.status === "rejected",
      );
      if (failed && failed.status === "rejected") {
        setLoadError(
          failed.reason instanceof Error
            ? failed.reason.message
            : "Some dashboard data could not be loaded.",
        );
      }
      setIsLoading(false);
    };

    loadDashboard();
    return () => {
      mounted = false;
    };
  }, []);

  const owedToUs = ledgerSummary?.owed_to_us_paise ?? 0;
  // Receivables stay scoped to customers owing us, rather than both directions.
  const overduePaise = ledgerSummary?.overdue_they_owe_paise ?? 0;
  const overdueCount = ledgerSummary?.overdue_they_owe_count ?? 0;
  const pendingCount = pendingDrafts.length;
  const openCount = ledgerSummary?.open_count ?? 0;
  const unconfirmedCount = ledgerSummary?.unconfirmed_count ?? 0;

  return (
    <AppLayout title="Command Center" subtitle="Your business overview" appearance="refined">
      <DashboardOverview
        owedToUs={owedToUs}
        overduePaise={overduePaise}
        overdueCount={overdueCount}
        pendingCount={pendingCount}
        openCount={openCount}
        unconfirmedCount={unconfirmedCount}
        pendingDrafts={pendingDrafts}
        overdueCommitments={overdueCommitments}
        overview={overview}
        isLoading={isLoading}
        loadError={loadError}
        expiryUrgency={expiryUrgency}
        channelMeta={CHANNEL_META}
      />
    </AppLayout>
  );
}
