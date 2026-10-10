"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { History, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import {
  teamActivity,
  type ActivityItem,
  type MemberActivity,
} from "@/lib/api";

const WINDOWS = [
  { label: "Today", days: 1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
] as const;

const KINDS = [
  { key: "all", label: "Everything" },
  { key: "work", label: "Customer work" },
  { key: "config", label: "Settings & campaigns" },
  { key: "security", label: "Access & data" },
] as const;

const KIND_BADGE: Record<ActivityItem["kind"], "emerald" | "amber" | "rose"> = {
  work: "emerald",
  config: "amber",
  security: "rose",
};

function relative(iso: string | null): string {
  if (!iso) return "no activity";
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  return `${Math.floor(seconds / 86400)} d ago`;
}

function deviceOf(userAgent: string | null): string {
  if (!userAgent) return "";
  const ua = userAgent.toLowerCase();
  const os = /android/.test(ua) ? "Android" : /iphone|ipad/.test(ua) ? "iPhone" : /windows/.test(ua)
    ? "Windows" : /mac os/.test(ua) ? "Mac" : /linux/.test(ua) ? "Linux" : "";
  const browser = /edg\//.test(ua) ? "Edge" : /chrome\//.test(ua) ? "Chrome" : /firefox\//.test(ua)
    ? "Firefox" : /safari\//.test(ua) ? "Safari" : "";
  return [browser, os].filter(Boolean).join(" on ") || userAgent.slice(0, 40);
}

// Ids and counts, in words. Anything else the server noted is shown as it is.
const DETAIL_LABEL: Record<string, string> = {
  to: "to",
  recipients: "recipients",
  sent: "sent",
  failed: "failed",
  held_for_tomorrow: "held for tomorrow",
  skipped: "skipped",
  edited: "edited first",
  with_carousel: "with carousel",
  assigned_to: "assigned to",
  template: "template",
  purpose: "purpose",
  channel: "channel",
};
const HIDDEN_DETAIL = new Set(["customer_id", "campaign_id", "draft_id", "rule_id", "form_id", "key_id", "webhook_id", "template_id", "flow_id", "script_id", "item_id", "escalation_id", "carousel_id", "request_id", "step_id"]);

function detailChips(detail: Record<string, string>): string[] {
  return Object.entries(detail)
    .filter(([key, value]) => !HIDDEN_DETAIL.has(key) && value !== "" && value !== "false")
    .map(([key, value]) => {
      const label = DETAIL_LABEL[key] ?? key.replace(/_/g, " ");
      return value === "true" ? label : `${label}: ${value}`;
    });
}

export default function TeamPage() {
  const [days, setDays] = useState<number>(7);
  const [members, setMembers] = useState<MemberActivity[]>([]);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [personFilter, setPersonFilter] = useState<string>("");
  const [kindFilter, setKindFilter] = useState<(typeof KINDS)[number]["key"]>("all");
  const [onlyRefused, setOnlyRefused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const since = useMemo(() => new Date(Date.now() - days * 86400000).toISOString(), [days]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [summary, page] = await Promise.all([
        teamActivity.summary(days),
        teamActivity.feed({
          user_id: personFilter || undefined,
          kind: kindFilter === "all" ? undefined : kindFilter,
          outcome: onlyRefused ? "denied" : undefined,
          since,
          limit: 50,
        }),
      ]);
      setMembers(summary.members);
      setItems(page.items);
      setNextBefore(page.next_before);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the team's activity.");
    } finally {
      setIsLoading(false);
    }
  }, [days, personFilter, kindFilter, onlyRefused, since]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = async () => {
    if (!nextBefore) return;
    setIsLoadingMore(true);
    try {
      const page = await teamActivity.feed({
        user_id: personFilter || undefined,
        kind: kindFilter === "all" ? undefined : kindFilter,
        outcome: onlyRefused ? "denied" : undefined,
        since,
        before: nextBefore,
        limit: 50,
      });
      setItems((prev) => [...prev, ...page.items]);
      setNextBefore(page.next_before);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load more.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <AppLayout title="Team" subtitle="Who on your team did what - every change, every refused attempt, every sign-in">
      <div className="space-y-6">
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {WINDOWS.map((w) => (
            <button
              key={w.days}
              type="button"
              onClick={() => setDays(w.days)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${
                days === w.days
                  ? "bg-teal/15 border-teal/40 text-white"
                  : "bg-white/[0.02] border-white/[0.08] text-os-text-dim hover:text-white"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>

        {/* Per-person summary */}
        <section aria-label="Each person">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-teal-bright" />
            <h2 className="text-sm font-bold text-white">Each person, last {days === 1 ? "day" : `${days} days`}</h2>
          </div>
          {isLoading && members.length === 0 ? (
            <Skeleton className="h-28 w-full" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {members.map((m) => (
                <GlassCard key={m.user_id ?? m.name} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{m.name}</p>
                      <p className="text-[11px] text-os-text-dim font-mono">Last active: {relative(m.last_active_at)}</p>
                    </div>
                    <Badge variant="cyan" size="sm">{m.role ?? "member"}</Badge>
                  </div>
                  <dl className="grid grid-cols-3 gap-2 text-center">
                    {[
                      ["Messages", m.messages_sent],
                      ["AI replies approved", m.drafts_approved],
                      ["Escalations", m.escalations_handled],
                    ].map(([label, value]) => (
                      <div key={label as string} className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-2 py-1.5">
                        <dd className="text-base font-bold text-white tabular-nums">{value}</dd>
                        <dt className="text-[10px] text-os-text-dim leading-tight">{label}</dt>
                      </div>
                    ))}
                  </dl>
                  <p className="text-[11px] text-os-text-dim font-mono flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>{m.config_changes} settings changes</span>
                    <span>{m.data_exports} downloads</span>
                    <span>{m.sign_ins} sign-ins</span>
                    {m.refused_attempts > 0 && (
                      <button
                        type="button"
                        onClick={() => { setPersonFilter(m.user_id ?? ""); setOnlyRefused(true); }}
                        className="text-rose-300 underline cursor-pointer"
                      >
                        {m.refused_attempts} refused {m.refused_attempts === 1 ? "attempt" : "attempts"}
                      </button>
                    )}
                  </p>
                </GlassCard>
              ))}
            </div>
          )}
        </section>

        {/* The feed */}
        <section aria-label="Activity feed">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-teal-bright" />
              <h2 className="text-sm font-bold text-white">Activity</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={personFilter}
                onChange={(e) => setPersonFilter(e.target.value)}
                aria-label="Filter by person"
                className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-teal focus:outline-none"
              >
                <option value="">Everyone</option>
                {members.filter((m) => m.user_id).map((m) => (
                  <option key={m.user_id as string} value={m.user_id as string}>{m.name}</option>
                ))}
              </select>
              {KINDS.map((k) => (
                <button
                  key={k.key}
                  type="button"
                  onClick={() => setKindFilter(k.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${
                    kindFilter === k.key
                      ? "bg-teal/15 border-teal/40 text-white"
                      : "bg-white/[0.02] border-white/[0.08] text-os-text-dim hover:text-white"
                  }`}
                >
                  {k.label}
                </button>
              ))}
              <label className="flex items-center gap-1.5 text-xs text-os-text-dim cursor-pointer select-none">
                <input type="checkbox" checked={onlyRefused} onChange={(e) => setOnlyRefused(e.target.checked)} className="accent-rose-400" />
                Only refused attempts
              </label>
            </div>
          </div>

          {isLoading && items.length === 0 ? (
            <Skeleton className="h-64 w-full" />
          ) : items.length === 0 ? (
            <EmptyState
              icon={History}
              title="Nothing here yet"
              description="Everything your team does - sending messages, approving replies, changing settings, downloading data, signing in - will be listed here."
            />
          ) : (
            <GlassCard className="divide-y divide-white/[0.05]">
              {items.map((item) => {
                const chips = detailChips(item.detail);
                const open = expanded === item.id;
                return (
                  <div key={item.id} className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : item.id)}
                      aria-expanded={open}
                      className="w-full text-left cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-white">
                            <span className="font-bold">{item.user_label || "Someone"}</span>
                            {item.role && <span className="ml-1.5 text-[10px] font-mono text-os-text-dim">{item.role}</span>}
                            <span className="text-os-text-dim"> - </span>
                            {item.summary}
                          </p>
                          {chips.length > 0 && (
                            <p className="mt-1 flex flex-wrap gap-1.5">
                              {chips.map((c) => (
                                <span key={c} className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.07] text-[10px] font-mono text-os-text-dim">{c}</span>
                              ))}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {item.outcome === "denied" && (
                            <Badge variant="rose" size="sm"><ShieldAlert className="w-3 h-3 inline mr-1" />Refused</Badge>
                          )}
                          {item.outcome === "failed" && <Badge variant="amber" size="sm">Failed</Badge>}
                          {item.outcome === "ok" && item.kind === "security" && (
                            <ShieldCheck className="w-3.5 h-3.5 text-os-text-dim" aria-label="Access or data" />
                          )}
                          <Badge variant={KIND_BADGE[item.kind]} size="sm">{item.kind === "work" ? "work" : item.kind === "config" ? "settings" : "access"}</Badge>
                          <time dateTime={item.occurred_at} className="text-[11px] text-os-text-dim font-mono whitespace-nowrap">
                            {relative(item.occurred_at)}
                          </time>
                        </div>
                      </div>
                    </button>
                    {open && (
                      <dl className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono text-os-text-dim">
                        <div><dt className="text-white/60">When</dt><dd>{new Date(item.occurred_at).toLocaleString()}</dd></div>
                        <div><dt className="text-white/60">From</dt><dd>{item.ip || "unknown"}{deviceOf(item.user_agent) ? ` - ${deviceOf(item.user_agent)}` : ""}</dd></div>
                        <div><dt className="text-white/60">Action</dt><dd>{item.action}</dd></div>
                      </dl>
                    )}
                  </div>
                );
              })}
            </GlassCard>
          )}

          {nextBefore && (
            <div className="flex justify-center pt-3">
              <button
                type="button"
                onClick={loadMore}
                disabled={isLoadingMore}
                className="px-5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 text-white text-xs font-semibold border border-white/[0.1] cursor-pointer"
              >
                {isLoadingMore ? "Loading…" : "Load older"}
              </button>
            </div>
          )}
        </section>

        <p className="text-[11px] text-os-text-dim leading-relaxed">
          This list records who did what and when - never what a message said or a customer's details. Rows can't be
          edited or deleted from the app.
        </p>
      </div>
    </AppLayout>
  );
}
