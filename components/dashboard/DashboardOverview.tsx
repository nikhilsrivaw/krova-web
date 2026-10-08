"use client";

import React from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowDownLeft, ArrowRight, ArrowUpRight, CheckCheck, CheckSquare,
  ChevronDown, Clock, Layers, MessageSquare, Radio, ShieldCheck, Sparkles,
} from "lucide-react";
import { Skeleton } from "@/components/ui/EmptyState";
import { formatPaise, type AnalyticsOverview, type Commitment, type MessageDraft, type WhatsAppReadiness } from "@/lib/api";

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
  // null until loaded, or for a business with no WhatsApp connection yet
  // (the backend 409s - that's a normal state, not an error, see
  // app/dashboard/page.tsx's own comment on why this is excluded from
  // loadError's failure group).
  waReadiness: WhatsAppReadiness | null;
  isLoading: boolean;
  loadError: string | null;
  expiryUrgency: (expiresAt: string | null) => { label: string; className: string } | null;
  channelMeta: Record<string, { label: string; icon: React.ElementType }>;
}

/** Unmissable, top-of-page - a business finishing WhatsApp onboarding with
 * every other tick green still cannot send a single message without this,
 * and Meta gives no other signal than this one blocker description (see
 * shared/channels/whatsapp/account.py's Readiness.needs_payment_method
 * docstring). Shown on every dashboard visit until it's actually fixed,
 * rather than only on a Settings page the owner might not think to open. */
function PaymentMethodBanner({ readiness }: { readiness: WhatsAppReadiness }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3">
      <AlertTriangle className="h-5 w-5 shrink-0 text-rose-300" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-rose-200">WhatsApp messages are not sending</p>
        <p className="mt-0.5 text-xs leading-5 text-rose-200/80">
          {readiness.action_required || "Meta requires a payment method on your WhatsApp Business account before anything can send."}
        </p>
      </div>
      {readiness.billing_url && (
        <a
          href={readiness.billing_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-rose-500 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-rose-400"
        >
          Add payment method <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}

function SectionHeading({ id, icon: Icon, title, description }: {
  id: string; icon: React.ElementType; title: string; description: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
        <Icon className="h-4 w-4 text-teal-bright" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <h3 id={id} className="text-[15px] font-semibold tracking-tight text-os-ink">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-os-text-dim">{description}</p>
      </div>
    </div>
  );
}

function DraftText({ body }: { body: string | null }) {
  return (
    <details className="group mt-3">
      <summary className="min-h-11 cursor-pointer rounded-lg text-sm leading-6 text-os-text-dim">
        <span className="line-clamp-2 break-words group-open:hidden">{body || "No reply text available."}</span>
        <span className="mt-1.5 flex w-fit items-center gap-1 text-[11px] font-medium text-teal-bright">
          <span className="group-open:hidden">Read full draft</span>
          <span className="hidden group-open:inline">Collapse draft</span>
          <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
        </span>
      </summary>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-os-ink">{body || "No reply text available."}</p>
    </details>
  );
}

/** Presentation only. Request scopes, review limits and financial calculations stay in the page. */
export function DashboardOverview({
  owedToUs, overduePaise, overdueCount, pendingCount, openCount, unconfirmedCount,
  pendingDrafts, overdueCommitments, overview, waReadiness, isLoading, loadError, expiryUrgency, channelMeta,
}: DashboardOverviewProps) {
  return (
    <div className="mx-auto max-w-[1440px] space-y-7 sm:space-y-8" aria-busy={isLoading}>
      {waReadiness?.needs_payment_method && <PaymentMethodBanner readiness={waReadiness} />}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="workspace-eyebrow mb-2 flex items-center gap-2 text-teal-bright">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-bright" aria-hidden="true" /> Workspace overview
          </p>
          <h2 className="font-serif text-[28px] font-medium leading-tight tracking-tight text-os-ink sm:text-[34px]">Your business, in focus.</h2>
          <p className="mt-2 text-sm leading-6 text-os-text-dim">The commitments, conversations, and decisions that matter.</p>
        </div>
        <Link href="/approvals" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-os-ink px-4 py-2.5 text-[13px] font-semibold text-black transition-colors hover:bg-white">
          <CheckSquare className="h-4 w-4 text-teal-dim" aria-hidden="true" /> Review draft replies <ArrowUpRight className="ml-1 h-4 w-4 text-teal-dim" aria-hidden="true" />
        </Link>
      </div>

      {loadError && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] px-4 py-3 text-sm leading-6 text-rose-300">
          <Radio className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" /><span>{loadError}</span>
        </div>
      )}

      <section aria-label="Financial and review overview" className="grid gap-3 lg:grid-cols-[1.2fr_1fr] xl:grid-cols-[1.35fr_1fr]">
        <div className="workspace-panel relative flex min-w-0 flex-col justify-between overflow-hidden p-5 sm:p-7">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,163,135,0.14),transparent_65%)]" />
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-medium text-os-text-dim"><Layers className="h-4 w-4 text-teal-bright" aria-hidden="true" /> Owed to you</p>
              <span className="rounded-full border border-teal/20 bg-teal/[0.07] px-2.5 py-1 text-[11px] text-teal-bright">
                {isLoading ? "Loading commitments…" : `${openCount} open commitments`}
              </span>
            </div>
            <p className="mt-6 break-words text-[clamp(1.8rem,4vw,3rem)] font-medium leading-tight tracking-[-0.04em] text-white tabular-nums">
              {isLoading ? <Skeleton className="h-12 w-48 max-w-full" /> : formatPaise(owedToUs)}
            </p>
            <p className="mt-2 text-xs leading-5 text-os-text-dim">Total receivables captured from customer commitments.</p>
          </div>
          <div className="relative mt-6 flex flex-wrap items-center justify-between gap-x-3 border-t border-white/[0.08] pt-2">
            <span className="text-xs text-os-text-dim">Your commitment ledger</span>
            <Link href="/ledger" className="workspace-link">Open ledger <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-3">
          <Link href="/ledger?filter=overdue" className="workspace-panel group col-span-2 flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:border-white/20 sm:px-6">
            <div className="min-w-0 max-w-full"><p className="text-xs font-medium text-os-text-dim">Overdue receivables</p><p className="mt-1.5 break-words text-2xl font-medium tracking-tight text-rose-300 tabular-nums">{isLoading ? <Skeleton className="h-8 w-28" /> : formatPaise(overduePaise)}</p></div>
            <div className="flex items-center gap-3"><span className="text-right text-xs leading-5 text-os-text-dim">{isLoading ? "Loading commitments…" : <>{overdueCount} promises<br />past their deadline</>}</span><ArrowUpRight className="h-4 w-4 text-os-text-dim transition-colors group-hover:text-teal-bright" aria-hidden="true" /></div>
          </Link>
          <Link href="/approvals" className="workspace-panel group min-w-0 p-4 transition-colors hover:border-white/20 sm:p-5">
            <div className="flex items-center justify-between gap-2"><p className="text-xs font-medium text-os-text-dim">Drafts to review</p><ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-os-text-dim group-hover:text-teal-bright" aria-hidden="true" /></div>
            <p className="mt-3 text-3xl font-medium tracking-tight text-white tabular-nums">{isLoading ? <Skeleton className="h-9 w-12" /> : pendingCount}</p>
            <p className="mt-2 text-[11px] leading-5 text-os-text-dim">Replies in this preview</p>
          </Link>
          <Link href="/ledger" className="workspace-panel group min-w-0 p-4 transition-colors hover:border-white/20 sm:p-5">
            <div className="flex items-center justify-between gap-2"><p className="text-xs font-medium text-os-text-dim">Needs confirmation</p><ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-os-text-dim group-hover:text-teal-bright" aria-hidden="true" /></div>
            <p className="mt-3 text-3xl font-medium tracking-tight text-white tabular-nums">{isLoading ? <Skeleton className="h-9 w-12" /> : unconfirmedCount}</p>
            <p className="mt-2 text-[11px] leading-5 text-os-text-dim">Promises awaiting review</p>
          </Link>
        </div>
      </section>

      <section aria-labelledby="attention-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 id="attention-heading" className="text-sm font-semibold text-os-ink">Needs your attention</h3>
          <span className="text-xs text-os-text-dim">Review. Follow up. Move forward.</span>
        </div>
        <div className="grid items-start gap-5 xl:grid-cols-[1.2fr_1fr]">
          <section aria-labelledby="drafts-heading" className="workspace-panel min-w-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-white/[0.08] px-5 py-4 sm:px-6">
              <SectionHeading id="drafts-heading" icon={MessageSquare} title="Ready for your review" description="AI-drafted replies, with you in control." />
              <Link href="/approvals" className="workspace-link">View all <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
            </div>
            {isLoading ? (
              <div className="space-y-5 p-6" aria-label="Loading draft replies"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
            ) : pendingDrafts.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]"><CheckCheck className="h-5 w-5 text-teal-bright" aria-hidden="true" /></div>
                <p className="text-sm font-medium text-os-ink">No draft replies to display</p>
                <p className="mt-2 text-xs leading-6 text-os-text-dim">Drafts appear here when they are ready for review.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.07]">
                {pendingDrafts.map((d) => {
                  const urgency = expiryUrgency(d.expires_at);
                  return (
                    <article key={d.id} aria-label={`Draft for ${d.customer_name || "Customer"}`} className="px-5 py-5 transition-colors hover:bg-white/[0.015] sm:px-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <span aria-hidden="true" className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xs font-medium text-os-ink sm:flex">{(d.customer_name || "Customer").charAt(0).toUpperCase()}</span>
                          <div className="min-w-0"><h4 className="break-words text-sm font-medium leading-5 text-os-ink">{d.customer_name || "Customer"}</h4><p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-5 text-os-text-dim"><span className="capitalize">{d.channel}</span><span aria-hidden="true">·</span><span>{Math.round(d.confidence * 100)}% confidence</span></p></div>
                        </div>
                        <Link href="/approvals" aria-label={`Review reply for ${d.customer_name || "Customer"}`} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 text-xs font-medium text-os-ink transition-colors hover:border-teal/40 hover:bg-teal/[0.06] hover:text-teal-bright">
                          Review <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      </div>
                      <div className="sm:pl-12"><DraftText body={d.body} />
                        {urgency && <span className={`mt-3 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] motion-reduce:animate-none ${urgency.className}`}><Clock className="h-3 w-3" aria-hidden="true" />{urgency.label}</span>}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-x-3 border-t border-white/[0.08] bg-white/[0.015] px-5 py-2.5 sm:px-6">
              <span className="flex items-center gap-2 text-[11px] text-os-text-dim"><ShieldCheck className="h-3.5 w-3.5 text-teal-bright" aria-hidden="true" /> Review before sending</span>
              <Link href="/settings" className="workspace-link text-xs">Autonomy settings <ArrowRight className="h-3 w-3" aria-hidden="true" /></Link>
            </div>
          </section>

          <div className="min-w-0 space-y-5">
            <section aria-labelledby="overdue-heading" className="workspace-panel overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-white/[0.08] px-5 py-4 sm:px-6">
                <SectionHeading id="overdue-heading" icon={Clock} title="Follow up on payments" description="Overdue customer commitments." />
                <Link href="/ledger?filter=overdue" className="workspace-link">View all ({overdueCount}) <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
              </div>
              {isLoading ? (
                <div className="space-y-4 p-6" aria-label="Loading overdue commitments"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
              ) : overdueCommitments.length === 0 ? (
                <div className="px-6 py-12 text-center"><p className="text-sm font-medium text-os-ink">No overdue commitments to display</p><p className="mt-2 text-xs leading-6 text-os-text-dim">Payment follow-ups will appear here.</p></div>
              ) : (
                <div className="divide-y divide-white/[0.07]">
                  {overdueCommitments.map((c) => (
                    <article key={c.id} aria-label={`Payment commitment for ${c.customer_name || "Client"}`} className="px-5 py-4 sm:px-6">
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                        <h4 className="min-w-0 flex-1 break-words text-sm font-medium leading-6 text-os-ink">{c.customer_name || "Client"}</h4>
                        <p className="max-w-full break-words text-sm font-medium leading-6 text-os-ink tabular-nums">{c.amount_display || formatPaise(c.amount_paise)}</p>
                      </div>
                      <p className="mt-1.5 break-words text-xs leading-5 text-os-text-dim">{c.description || c.source_quote || "Payment promised"}</p>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-rose-300"><span className="h-1 w-1 rounded-full bg-rose-300" aria-hidden="true" /> Overdue · Due {c.due_at ? new Date(c.due_at).toLocaleDateString("en-IN") : "Past"}</span>
                        {c.outstanding_display && <span className="text-[11px] text-os-text-dim">Outstanding {c.outstanding_display}</span>}
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-x-3 border-t border-white/[0.08] bg-white/[0.015] px-5 py-2.5 sm:px-6">
                <span className="text-[11px] text-os-text-dim">Keep follow-ups moving</span>
                <Link href="/campaigns" className="workspace-link text-xs">Send reminder broadcast <ArrowRight className="h-3 w-3" aria-hidden="true" /></Link>
              </div>
            </section>

            <section aria-labelledby="performance-heading" className="workspace-panel p-5 sm:p-6">
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-teal-bright" aria-hidden="true" /><h3 id="performance-heading" className="text-sm font-medium text-os-ink">The bigger picture</h3></div>
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div><p className="text-[28px] font-medium tracking-tight text-white tabular-nums">{overview?.promises_kept != null ? `${Math.round(overview.promises_kept * 100)}%` : "—"}</p><p className="mt-1 text-xs text-os-text-dim">Promises kept</p></div>
                <div className="min-w-0 border-l border-white/[0.08] pl-4"><p className="break-words text-[28px] font-medium tracking-tight text-white tabular-nums">{overview?.agent.drafted != null ? overview.agent.drafted.toLocaleString("en-IN") : "—"}</p><p className="mt-1 text-xs text-os-text-dim">Replies drafted by AI</p></div>
              </div>
              {overview?.promises_note && <p className="mt-4 border-t border-white/[0.08] pt-3 text-xs leading-6 text-os-text-dim">{overview.promises_note}</p>}
              {overview?.agent.note && <p className="mt-2 text-xs leading-6 text-os-text-dim">{overview.agent.note}</p>}
            </section>
          </div>
        </div>
      </section>

      <section aria-labelledby="channels-heading" className="pb-3">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div><h3 id="channels-heading" className="text-sm font-semibold text-os-ink">Across your channels</h3><p className="mt-1 text-xs leading-5 text-os-text-dim">Conversation activity · Last 30 days</p></div>
          <Link href="/settings" className="workspace-link">Connect a channel <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
        </div>
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading channel activity"><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></div>
        ) : !overview || overview.channels.length === 0 ? (
          <div className="workspace-panel flex flex-wrap items-center justify-between gap-4 p-5"><p className="text-sm leading-6 text-os-text-dim">No conversations to display for the last 30 days.</p><Link href="/settings" className="workspace-link">Channel settings <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link></div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {overview.channels.map((c) => {
              const meta = channelMeta[c.channel] || { label: "Other", icon: Radio };
              const Icon = meta.icon;
              const total = c.inbound + c.outbound;
              return (
                <article key={c.channel} aria-label={`${meta.label} activity`} className="workspace-panel min-w-0 p-5">
                  <div className="flex items-center justify-between gap-3"><h4 className="flex items-center gap-2.5 text-sm font-medium text-os-ink"><Icon className="h-4 w-4 shrink-0 text-teal-bright" aria-hidden="true" />{meta.label}</h4><span className="text-[11px] text-os-text-dim">{c.customers} customer{c.customers === 1 ? "" : "s"}</span></div>
                  <p className="mt-5 text-2xl font-medium tracking-tight text-white tabular-nums">{total.toLocaleString("en-IN")} <span className="text-xs font-normal tracking-normal text-os-text-dim">messages</span></p>
                  <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true"><span className="h-full rounded-full bg-teal" style={{ width: `${total > 0 ? c.inbound / total * 100 : 0}%` }} /></div>
                  <div className="mt-3 flex flex-wrap justify-between gap-2 text-[11px] text-os-text-dim"><span className="flex items-center gap-1"><ArrowDownLeft className="h-3 w-3 text-teal-bright" aria-hidden="true" />{c.inbound} inbound</span><span className="flex items-center gap-1"><ArrowUpRight className="h-3 w-3" aria-hidden="true" />{c.outbound} outbound</span></div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
