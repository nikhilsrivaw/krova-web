"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Phone, Search, UserPlus2 } from "lucide-react";
import { dialable, leads, type LeadRow } from "@/lib/api";
import { appPath } from "@/lib/app-nav";

const ago = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;
};

/**
 * New enquiries on the phone, newest first - the ones nobody has answered yet stand out, and calling or opening the
 * WhatsApp chat is one tap. Speed matters most here: a lead answered in minutes is worth far more than one answered
 * tomorrow.
 */
export default function AppLeadsPage() {
  const [rows, setRows] = useState<LeadRow[] | null>(null);
  const [q, setQ] = useState("");
  const [onlyNew, setOnlyNew] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      leads.list({ q: q.trim() || undefined, limit: 50 })
        .then((r) => { if (live) setRows(r.items); })
        .catch((err) => { if (live) setError(err instanceof Error ? err.message : "Could not load leads."); });
    }, q.trim() ? 300 : 0);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  const shown = (rows ?? []).filter((l) => !onlyNew || !l.first_touch_at);
  const untouched = (rows ?? []).filter((l) => !l.first_touch_at).length;

  return (
    <div className="px-4 pt-5 pb-6 max-w-md mx-auto space-y-4">
      <h1 className="text-lg font-semibold text-os-ink flex items-center gap-2"><UserPlus2 className="w-4 h-4 text-teal" /> Leads</h1>

      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-os-card border border-os-border">
        <Search className="w-3.5 h-3.5 text-os-text-dim shrink-0" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone or what they asked"
          className="w-full bg-transparent text-xs text-os-ink placeholder:text-os-text-dim outline-none" />
      </div>
      <div className="flex gap-2">
        {([false, true] as const).map((v) => (
          <button key={String(v)} type="button" onClick={() => setOnlyNew(v)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border ${onlyNew === v ? "bg-teal/15 border-teal/30 text-teal" : "bg-os-card border-os-border text-os-text-dim"}`}>
            {v ? `Not answered yet${untouched ? ` · ${untouched}` : ""}` : "All"}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-rose-400">{error}</p>}
      {rows === null ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-2xl bg-os-card animate-pulse" />)}</div>
      ) : shown.length === 0 ? (
        <p className="text-center text-xs text-os-text-dim py-10">{onlyNew ? "Every lead has been answered." : "No leads yet."}</p>
      ) : (
        <div className="space-y-2">
          {shown.map((l) => (
            <div key={l.id} className={`rounded-2xl border p-3.5 space-y-2 ${!l.first_touch_at ? "bg-amber-500/[0.06] border-amber-400/25" : "bg-os-card border-os-border"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-os-ink truncate">{l.name || l.phone || "Unnamed lead"}</p>
                  <p className="text-[10px] text-os-text-dim">{l.source} · {ago(l.received_at)}{l.assigned_to_name ? ` · ${l.assigned_to_name}` : ""}</p>
                </div>
                {!l.first_touch_at && <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-200">Not answered</span>}
              </div>
              {l.query && <p className="text-xs text-os-text-dim line-clamp-3">{l.query}</p>}
              <div className="flex gap-2">
                {dialable(l.phone) && (
                  <a href={`tel:${l.phone}`} className="flex-1 py-2 rounded-xl bg-white/[0.06] text-xs font-semibold text-os-ink flex items-center justify-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Call
                  </a>
                )}
                {l.customer_id && (
                  <a href={appPath(`/inbox/${l.customer_id}`)} className="flex-1 py-2 rounded-xl bg-teal text-os-bg text-xs font-bold flex items-center justify-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> Open chat
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
