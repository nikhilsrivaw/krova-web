"use client";

/**
 * The public voice trust page. No AppLayout, no login - a business opts
 * in (Settings -> Voice -> Public Trust Page) and shares this link.
 * Deliberately bypasses lib/api.ts's request() (which demands a Bearer
 * token and throws NotAuthenticated) and hand-rolls fetch() the same way
 * app/kiosk/[token]/page.tsx does for the same reason - see that file's
 * own comment, and the backend's services/api/routers/trust.py for the
 * auth model (opt-in flag, no login) this talks to.
 */

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PhoneCall, Loader2, ShieldCheck } from "lucide-react";
import { API_BASE } from "@/lib/auth";
import type { VoiceTrust } from "@/lib/api";

function formatSeconds(seconds: number | null): string {
  if (seconds === null) return "Not enough data yet";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

export default function VoiceTrustPage() {
  const params = useParams<{ businessId: string }>();
  const businessId = params.businessId;

  const [data, setData] = useState<VoiceTrust | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/trust/voice/${businessId}`);
        if (cancelled) return;
        if (!res.ok) {
          setError(res.status === 404 ? "This page isn't available." : "Could not load this page.");
          setLoading(false);
          return;
        }
        setData(await res.json());
      } catch {
        if (!cancelled) setError("Could not reach the server.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-20">
            <p className="text-sm text-os-text-dim">{error}</p>
          </div>
        )}

        {!loading && data && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-mono uppercase tracking-wide text-os-text-dim">
                  Voice Trust Report
                </p>
                <h1 className="text-lg font-bold text-white">{data.business_name}</h1>
              </div>
            </div>
            <p className="text-[11px] text-os-text-dim mb-6">
              Real numbers from the last {data.window_days} days, computed directly from call
              records - nothing estimated.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-black/30 border border-white/[0.06]">
                <p className="text-2xl font-bold text-white">{data.total_calls}</p>
                <p className="text-[11px] text-os-text-dim mt-1">Calls handled</p>
              </div>
              <div className="p-4 rounded-xl bg-black/30 border border-white/[0.06]">
                <p className="text-2xl font-bold text-white">
                  {formatSeconds(data.avg_ring_to_answer_seconds)}
                </p>
                <p className="text-[11px] text-os-text-dim mt-1">Average time to answer</p>
              </div>
              <div className="p-4 rounded-xl bg-black/30 border border-white/[0.06]">
                <p className="text-2xl font-bold text-white">
                  {data.escalation_rate !== null
                    ? `${Math.round((1 - data.escalation_rate) * 100)}%`
                    : "—"}
                </p>
                <p className="text-[11px] text-os-text-dim mt-1">Handled without escalation</p>
              </div>
              <div className="p-4 rounded-xl bg-black/30 border border-white/[0.06]">
                <p className="text-2xl font-bold text-white">
                  {formatSeconds(data.avg_duration_seconds)}
                </p>
                <p className="text-[11px] text-os-text-dim mt-1">Average call length</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6 pt-6 border-t border-white/[0.06]">
              <ShieldCheck className="w-3.5 h-3.5 text-os-text-dim" />
              <p className="text-[10px] text-os-text-dim font-mono">
                Powered by KROVA — computed live, not self-reported.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
