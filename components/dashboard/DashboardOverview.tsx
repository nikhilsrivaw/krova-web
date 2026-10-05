"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CheckCheck, CheckSquare, Clock, Layers, Radio } from "lucide-react";
import { Skeleton } from "@/components/ui/EmptyState";
import { formatPaise, type AnalyticsOverview, type Commitment, type MessageDraft } from "@/lib/api";

interface DashboardOverviewProps {
  owedToUs: number;
  overduePaise: number;
  overdueCount: number;
  pendingCount: number;
  openCount: number;
  unconfirmedCount: number;
  pendingDrafts: MessageDraft[];
  overdueCommitments: Commitment[];
  overview: AnalyticsOverview | null;
  isLoading: boolean;
  loadError: string | null;
  expiryUrgency: (expiresAt: string | null) => { label: string; className: string } | null;
  channelMeta: Record<string, { label: string; icon: React.ElementType }>;
}

const linkStyle = "inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-brass-bright transition-colors hover:text-os-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass";

function SectionHeading({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 font-mono text-[11px] text-brass/80" aria-hidden="true">{number}</span>
      <div>
        <h3 className="text-base font-semibold tracking-tight text-os-ink">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-os-text-dim">{description}</p>
      </div>
    </div>
  );
}

/** Presentation only: data fetching and all dashboard calculations remain in the page. */
export function DashboardOverview({
  owedToUs, overduePaise, overdueCount, pendingCount, openCount, unconfirmedCount,
  pendingDrafts, overdueCommitments, overview, isLoading, loadError, expiryUrgency, channelMeta,
}: DashboardOverviewProps) {
  return (
    <div className="mx-auto max-w-[1440px] space-y-8 lg:space-y-10">
      {loadError && (
        <div role="alert" className="rounded-xl border border-thread/25 bg-thread/10 px-4 py-3 text-sm text-thread-bright">
          {loadError}
        </div>
      )}

      <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141411]" aria-labelledby="dashboard-intro">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(201,151,63,0.09),transparent_60%)]" />
        <div className="relative grid lg:grid-cols-[1.15fr_1fr]">
          <div className="p-6 sm:p-8 lg:p-10">
            <p className="mb-5 flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.2em] text-brass-bright">
              <span className="h-px w-5 bg-brass" aria-hidden="true" /> Your daily overview
            </p>
            <h2 id="dashboard-intro" className="max-w-md font-serif text-3xl font-medium leading-[1.15] tracking-tight text-os-ink sm:text-4xl xl:text-[42px]">
              A clear view.<br /><span className="text-os-text-dim">A better next move.</span>
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-7 text-os-text-dim">
              Review replies, follow up on commitments, and keep your business moving.
            </p>
            <Link href="/approvals" className="mt-6 inline-flex min-h-11 items-center gap-3 rounded-lg bg-brass px-4 py-2.5 text-sm font-semibold text-[#17130C] transition-colors hover:bg-brass-bright focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass">
              Review draft replies <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="relative flex flex-col justify-center border-t border-white/[0.08] p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-os-text-dim">Owed to you</p>
              <span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-xs text-os-text-dim">
                {isLoading ? "Loading commitments…" : `${openCount} open commitments`}
              </span>
            </div>
            <div className="my-5 min-w-0 font-serif text-4xl font-medium tracking-tight text-os-ink sm:text-5xl xl:text-6xl">
              {isLoading ? <Skeleton className="h-14 w-48" /> : <span className="tabular-nums">{formatPaise(owedToUs)}</span>}
            </div>
            <p className="text-sm leading-relaxed text-os-text-dim">Receivables captured from customer commitments.</p>
            <div className="mt-6 flex items-center justify-between border-t border-white/[0.08] pt-4">
              <span className="flex items-center gap-2 text-xs text-os-text-dim"><Layers className="h-3.5 w-3.5" aria-hidden="true" /> Commitment ledger</span>
              <Link href="/ledger" className={linkStyle}>Open ledger <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Financial and review overview" className="grid gap-6 border-b border-white/[0.08] pb-8 sm:grid-cols-3 sm:gap-0">
        <div className="sm:pr-6">
          <p className="text-sm text-os-text-dim">Overdue receivables</p>
          <p className="my-2 font-serif text-3xl font-medium tracking-tight text-thread-bright">
            {isLoading ? <Skeleton className="h-9 w-28" /> : <span className="tabular-nums">{formatPaise(overduePaise)}</span>}
          </p>
          <p className="text-xs leading-5 text-os-text-dim">{overdueCount} promises past their deadline</p>
        </div>
        <div className="sm:border-l sm:border-white/[0.08] sm:px-6 lg:px-8">
          <p className="text-sm text-os-text-dim">Drafts to review</p>
          <p className="my-2 font-serif text-3xl font-medium tracking-tight text-os-ink">
            {isLoading ? <Skeleton className="h-9 w-12" /> : pendingCount}
          </p>
          <p className="text-xs leading-5 text-os-text-dim">Replies in your dashboard preview</p>
        </div>
        <div className="sm:border-l sm:border-white/[0.08] sm:pl-6 lg:pl-8">
          <p className="text-sm text-os-text-dim">Promises to confirm</p>
          <p className="my-2 font-serif text-3xl font-medium tracking-tight text-brass-bright">
            {isLoading ? <Skeleton className="h-9 w-12" /> : unconfirmedCount}
          </p>
          <p className="text-xs leading-5 text-os-text-dim">Extracted commitments awaiting review</p>
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section aria-labelledby="drafts-heading" className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#131312]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] p-5 sm:p-6">
            <div id="drafts-heading"><SectionHeading number="01" title="Ready for your review" description="AI-drafted replies. You make the final call." /></div>
            <Link href="/approvals" className={linkStyle}>View all <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>

          {isLoading ? (
            <div className="space-y-5 p-6" aria-label="Loading draft replies"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
          ) : pendingDrafts.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <CheckCheck className="mx-auto mb-3 h-6 w-6 text-os-text-dim" aria-hidden="true" />
              <p className="text-sm text-os-ink">No draft replies to display</p>
              <p className="mt-2 text-xs leading-5 text-os-text-dim">Drafts appear here when they are ready for review.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {pendingDrafts.map((d) => {
                const urgency = expiryUrgency(d.expires_at);
                return (
                  <div key={d.id} className="p-5 transition-colors hover:bg-white/[0.015] sm:px-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-os-ink">{d.customer_name || "Customer"}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-os-text-dim">
                          <span className="capitalize">{d.channel}</span><span aria-hidden="true">·</span><span>{Math.round(d.confidence * 100)}% match</span>
                        </p>
                      </div>
                      <Link href="/approvals" aria-label={`Review reply for ${d.customer_name || "Customer"}`} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.1] px-3 py-1.5 text-xs font-medium text-os-ink transition-colors hover:border-brass/40 hover:text-brass-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass">
                        Review <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-os-text-dim">{d.body}</p>
                    {urgency && (
                      <span className={`mt-3 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] motion-reduce:animate-none ${urgency.className}`}>
                        <Clock className="h-3 w-3" aria-hidden="true" />{urgency.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] bg-white/[0.015] px-5 py-4 sm:px-6">
            <span className="flex items-center gap-2 text-xs text-os-text-dim"><CheckSquare className="h-3.5 w-3.5" aria-hidden="true" /> Review before sending</span>
            <Link href="/settings" className="rounded text-xs text-os-text-dim transition-colors hover:text-os-ink focus-visible:outline-2 focus-visible:outline-brass">Autonomy settings →</Link>
          </div>
        </section>

        <div className="space-y-6">
          <section aria-labelledby="overdue-heading" className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#131312]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] p-5 sm:p-6">
              <div id="overdue-heading"><SectionHeading number="02" title="Follow up on payments" description="Overdue customer commitments." /></div>
              <Link href="/ledger?filter=overdue" className={linkStyle}>View all ({overdueCount}) <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
            </div>
            {isLoading ? (
              <div className="space-y-4 p-6" aria-label="Loading overdue commitments"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
            ) : overdueCommitments.length === 0 ? (
              <div className="px-6 py-12 text-center"><p className="text-sm text-os-ink">No overdue commitments to display</p><p className="mt-2 text-xs text-os-text-dim">Payment follow-ups will appear here.</p></div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {overdueCommitments.map((c) => (
                  <div key={c.id} className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-os-ink">{c.customer_name || "Client"}</p>
                      <p className="mt-1.5 line-clamp-1 text-xs leading-5 text-os-text-dim">{c.description || c.source_quote || "Payment promised"}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-sm font-medium text-os-ink">{c.amount_display || formatPaise(c.amount_paise)}</p>
                      <p className="mt-1.5 text-[11px] text-thread-bright">Due {c.due_at ? new Date(c.due_at).toLocaleDateString("en-IN") : "Past"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t border-white/[0.07] bg-white/[0.015] px-5 py-4 sm:px-6">
              <Link href="/campaigns" className={linkStyle}>Send reminder broadcast <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
            </div>
          </section>

          <section aria-labelledby="performance-heading" className="rounded-2xl border border-white/[0.08] bg-[#131312] p-5 sm:p-6">
            <p id="performance-heading" className="text-[11px] font-medium uppercase tracking-[0.16em] text-os-text-dim">The bigger picture</p>
            <div className="mt-5 grid grid-cols-2 gap-5">
              <div>
                <p className="font-serif text-3xl font-medium tracking-tight text-os-ink">{overview?.promises_kept != null ? `${Math.round(overview.promises_kept * 100)}%` : "—"}</p>
                <p className="mt-2 text-xs text-os-text-dim">Promises kept</p>
              </div>
              <div className="border-l border-white/[0.08] pl-5">
                <p className="font-serif text-3xl font-medium tracking-tight text-os-ink">{overview?.agent.drafted != null ? overview.agent.drafted.toLocaleString("en-IN") : "—"}</p>
                <p className="mt-2 text-xs text-os-text-dim">Replies drafted by AI</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section aria-labelledby="channels-heading" className="pb-3">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div><h3 id="channels-heading" className="text-base font-semibold tracking-tight text-os-ink">Across your channels</h3><p className="mt-1 text-sm text-os-text-dim">Conversation activity over the last 30 days.</p></div>
          <Link href="/settings" className={linkStyle}>Connect a channel <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-3" aria-label="Loading channel activity"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
        ) : !overview || overview.channels.length === 0 ? (
          <p className="rounded-xl border border-white/[0.08] px-5 py-6 text-sm leading-6 text-os-text-dim">No conversations to display for the last 30 days.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {overview.channels.map((c) => {
              const meta = channelMeta[c.channel] || { label: "Other", icon: Radio };
              const Icon = meta.icon;
              return (
                <div key={c.channel} className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-white/[0.015] px-5 py-4">
                  <Icon className="h-5 w-5 shrink-0 text-os-text-dim" aria-hidden="true" />
                  <div className="min-w-0"><p className="text-sm font-medium text-os-ink">{meta.label}</p><p className="mt-1 text-xs leading-5 text-os-text-dim">{c.inbound + c.outbound} messages · {c.customers} customer{c.customers === 1 ? "" : "s"}</p></div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
