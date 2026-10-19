"use client";

import { useEffect, useState } from "react";
import { BarChart3, ExternalLink } from "lucide-react";
import {
  account, analytics, billing, team,
  type AnalyticsOverview, type ResponseSpeed, type TeamMember,
} from "@/lib/api";
import { desktopUrl } from "@/lib/app-nav";

const card = "rounded-2xl bg-os-card border border-os-border p-4 space-y-2";
const heading = "text-[10px] font-mono uppercase tracking-wide text-os-text-dim";
const pct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 100)}%`);
const dur = (s: number | null) => {
  if (s == null) return "—";
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)} min`;
  return `${(s / 3600).toFixed(1)} h`;
};

/**
 * The business at a glance, for the owner on the move: money, how fast customers get an answer, how the AI is
 * doing, who on the team is available, and the wallet. Every number comes from the same endpoints as the desktop
 * Analytics and Billing pages; the deeper views stay there.
 */
export default function AppBusinessPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [o, setO] = useState<AnalyticsOverview | null>(null);
  const [speed, setSpeed] = useState<ResponseSpeed | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [wallet, setWallet] = useState<{ balance: string; low: boolean; rent: string } | null>(null);

  useEffect(() => {
    account.profile().then((p) => {
      const boss = p.role === "owner" || p.role === "admin";
      setAllowed(boss);
      if (!boss) return;
      analytics.overview().then(setO).catch(() => {});
      analytics.responseSpeed(7).then(setSpeed).catch(() => {});
      team.list().then(setMembers).catch(() => {});
      billing.overview().then((b) => {
        if (b.wallet_balance != null) setWallet({ balance: b.wallet_balance, low: b.low_balance, rent: b.number_rent });
      }).catch(() => {});
    }).catch(() => setAllowed(false));
  }, []);

  if (allowed === false) return <p className="px-4 pt-10 text-center text-xs text-os-text-dim">This is for the owner and admins.</p>;

  const away = members.filter((m) => m.available === false);
  const here = members.filter((m) => m.available !== false);

  return (
    <div className="px-4 pt-5 pb-6 max-w-md mx-auto space-y-3">
      <h1 className="text-lg font-semibold text-os-ink flex items-center gap-2"><BarChart3 className="w-4 h-4 text-teal" /> Business at a glance</h1>

      {wallet && (
        <div className={`${card} ${wallet.low ? "!border-amber-400/30 !bg-amber-500/10" : ""}`}>
          <p className={heading}>Wallet for calls</p>
          <p className="text-xl font-semibold text-os-ink font-mono">{wallet.balance}</p>
          <p className="text-[11px] text-os-text-dim">{wallet.low ? "Running low - calls stop at zero." : "Calls and number rent come out of this."}</p>
          <a href={desktopUrl("/billing")} className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-bright">
            Add money <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {o && (
        <div className={card}>
          <p className={heading}>Money</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-base font-semibold text-os-ink font-mono">{o.owed_to_you}</p>
              <p className="text-[10px] text-os-text-dim">Owed to you{o.oldest_debt_days ? ` · oldest ${o.oldest_debt_days} days` : ""}</p>
            </div>
            <div>
              <p className="text-base font-semibold text-os-ink font-mono">{pct(o.promises_kept)}</p>
              <p className="text-[10px] text-os-text-dim">Promises kept</p>
            </div>
          </div>
          {o.biggest_debtor && (
            <p className="text-[11px] text-os-text-dim">Biggest: {o.biggest_debtor.name || "a customer"} · {o.biggest_debtor.amount}</p>
          )}
        </div>
      )}

      {speed && (
        <div className={card}>
          <p className={heading}>Replies · last 7 days</p>
          <div className="grid grid-cols-3 gap-2">
            <div><p className="text-base font-semibold text-os-ink font-mono">{dur(speed.median_seconds)}</p><p className="text-[10px] text-os-text-dim">Usual reply</p></div>
            <div><p className="text-base font-semibold text-os-ink font-mono">{dur(speed.p90_seconds)}</p><p className="text-[10px] text-os-text-dim">Slowest 10%</p></div>
            <div><p className={`text-base font-semibold font-mono ${speed.unanswered ? "text-amber-300" : "text-os-ink"}`}>{speed.unanswered}</p><p className="text-[10px] text-os-text-dim">Never answered</p></div>
          </div>
        </div>
      )}

      {o && (
        <div className={card}>
          <p className={heading}>The AI</p>
          <p className="text-xs text-os-ink">{o.agent.drafted} replies drafted · {pct(o.agent.approval_rate)} approved as written</p>
          {o.agent.top_gaps.length > 0 && (
            <div className="space-y-0.5">
              <p className="text-[11px] text-os-text-dim">It got stuck most on:</p>
              {o.agent.top_gaps.slice(0, 3).map((g) => <p key={g.gap} className="text-[11px] text-os-ink">• {g.gap} ({g.times}×)</p>)}
              <p className="text-[10px] text-os-text-dim pt-1">Add these answers in Knowledge &amp; Gaps on a computer.</p>
            </div>
          )}
        </div>
      )}

      {members.length > 0 && (
        <div className={card}>
          <p className={heading}>Team</p>
          <p className="text-xs text-os-ink">{here.length} available{away.length ? ` · ${away.length} away` : ""}</p>
          {members.map((m) => (
            <p key={m.user_id} className="text-[11px] flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${m.available === false ? "bg-amber-400" : "bg-emerald-400"}`} />
              <span className="text-os-ink">{m.full_name || m.email || "Teammate"}</span>
              <span className="text-os-text-dim">{m.role}</span>
            </p>
          ))}
        </div>
      )}

      {allowed && !o && !speed && <div className="h-24 rounded-2xl bg-os-card animate-pulse" />}
    </div>
  );
}
