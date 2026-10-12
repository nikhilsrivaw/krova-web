"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, CalendarClock, Clock, ListChecks, MessageSquare, Phone, StickyNote, UserRound } from "lucide-react";
import { team, type CustomerBriefingData } from "@/lib/api";

/**
 * Who this customer is and what is open with them, on one card - so a team member never
 * has to scroll a thread to find out before answering, claiming or calling.
 */

const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

const LEAD_LABEL: Record<string, string> = {
  justdial: "Justdial", indiamart: "IndiaMART", magicbricks: "MagicBricks", "99acres": "99acres",
  housing: "Housing.com", email: "Email", generic: "Website", other: "Lead form",
};

export function CustomerBriefing({
  customerId,
  tone = "dark",
  refreshKey = 0,
}: {
  customerId: string;
  tone?: "dark" | "light";
  /** Change this to reload (after a call is written up, say). */
  refreshKey?: number;
}) {
  const [data, setData] = useState<CustomerBriefingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setData(null);
    setError(null);
    team
      .briefing(customerId)
      .then((d) => { if (live) setData(d); })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : "Could not load the briefing."); });
    return () => { live = false; };
  }, [customerId, refreshKey]);

  const ink = tone === "light" ? "text-os-ink" : "text-white";
  const dim = "text-os-text-dim";
  const box = tone === "light" ? "bg-os-card border-os-border" : "bg-white/[0.03] border-white/[0.08]";

  if (error) return <p className={`text-xs ${dim}`}>{error}</p>;
  if (!data) return <div className={`h-24 animate-pulse rounded-xl border ${box}`} />;
  if (data.private) return <p className={`text-xs ${dim}`}>This is a private chat.</p>;

  const nothingOpen = !data.promises.length && !data.escalation && !data.next_visit;

  return (
    <div className="space-y-3 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        {data.owner && (
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${box} ${ink}`}>
            <UserRound className="h-3 w-3" /> With {data.owner.name ?? "a teammate"}
          </span>
        )}
        {data.stage && <span className={`rounded-full border px-2 py-0.5 text-[10px] ${box} ${ink}`}>{data.stage}</span>}
        {data.language && <span className={`rounded-full border px-2 py-0.5 text-[10px] ${box} ${dim}`}>{data.language}</span>}
        {data.tags.map((t) => (
          <span key={t} className={`rounded-full border px-2 py-0.5 text-[10px] ${box} ${dim}`}>#{t}</span>
        ))}
      </div>

      {data.lead && (
        <Section icon={<Phone className="h-3.5 w-3.5" />} title={`Came from ${LEAD_LABEL[data.lead.source] ?? data.lead.source}`} box={box} dim={dim}>
          <p className={ink}>{data.lead.query || "No enquiry text was given."}</p>
          <p className={`mt-0.5 ${dim}`}>{when(data.lead.received_at)}</p>
        </Section>
      )}

      {data.escalation && (
        <div className="flex gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-amber-100">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <p className="font-semibold">The AI asked for a person</p>
            <p className="mt-0.5">{data.escalation.reason}</p>
          </div>
        </div>
      )}

      {data.summary && (
        <Section icon={<UserRound className="h-3.5 w-3.5" />} title="What we know" box={box} dim={dim}>
          <p className={ink}>{data.summary}</p>
        </Section>
      )}

      {data.messages.length > 0 && (
        <Section icon={<MessageSquare className="h-3.5 w-3.5" />} title="Latest messages" box={box} dim={dim}>
          <ul className="space-y-1.5">
            {data.messages.map((m, i) => (
              <li key={i} className="flex gap-2">
                <span className={`w-14 shrink-0 text-[10px] uppercase ${m.who === "customer" ? "text-teal" : dim}`}>
                  {m.who === "customer" ? "Customer" : "Us"}
                </span>
                <span className={ink}>{m.text}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {data.promises.length > 0 && (
        <Section icon={<ListChecks className="h-3.5 w-3.5" />} title="Open promises" box={box} dim={dim}>
          <ul className="space-y-1.5">
            {data.promises.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-2">
                <span className={ink}>
                  <span className={dim}>{p.direction === "they_owe" ? "They: " : "We: "}</span>
                  {p.description}
                </span>
                <span className={`shrink-0 text-right ${p.overdue ? "text-rose-300" : dim}`}>
                  {p.outstanding_paise != null && <span className="block">{rupees(p.outstanding_paise)}</span>}
                  {p.due_at && <span className="block">{p.overdue ? "late " : "by "}{day(p.due_at)}</span>}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {data.next_visit && (
        <Section icon={<CalendarClock className="h-3.5 w-3.5" />} title="Next booking" box={box} dim={dim}>
          <p className={ink}>{when(data.next_visit.at)} with {data.next_visit.with}</p>
        </Section>
      )}

      {data.last_call && (
        <Section icon={<Clock className="h-3.5 w-3.5" />} title={`Last call · ${when(data.last_call.at)}`} box={box} dim={dim}>
          <p className={ink}>
            {data.last_call.summary || "No summary was written."}
            {data.last_call.by && <span className={dim}> - {data.last_call.by}</span>}
          </p>
        </Section>
      )}

      {data.notes.length > 0 && (
        <Section icon={<StickyNote className="h-3.5 w-3.5" />} title="Team notes" box={box} dim={dim}>
          <ul className="space-y-1.5">
            {data.notes.map((n, i) => <li key={i} className={ink}>{n.body}</li>)}
          </ul>
        </Section>
      )}

      {nothingOpen && !data.summary && data.messages.length === 0 && !data.lead && (
        <p className={dim}>A new customer - nothing recorded yet.</p>
      )}
    </div>
  );
}

function Section({
  icon, title, box, dim, children,
}: { icon: React.ReactNode; title: string; box: string; dim: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-xl border p-3 ${box}`}>
      <p className={`mb-1.5 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wide ${dim}`}>
        {icon} {title}
      </p>
      {children}
    </div>
  );
}
