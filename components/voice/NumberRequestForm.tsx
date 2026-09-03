"use client";

import React, { useEffect, useState } from "react";
import { Send, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { numberRequests, type NumberRequest, type NumberRequestType } from "@/lib/api";

const STATUS_VARIANT: Record<NumberRequest["status"], "emerald" | "amber" | "rose" | "cyan"> = {
  requested: "amber",
  submitted_to_plivo: "cyan",
  provisioned: "emerald",
  rejected: "rose",
};

const STATUS_LABEL: Record<NumberRequest["status"], string> = {
  requested: "Requested",
  submitted_to_plivo: "Submitted to Plivo",
  provisioned: "Provisioned",
  rejected: "Rejected",
};

export function NumberRequestForm() {
  const [requests, setRequests] = useState<NumberRequest[]>([]);
  const [requestType, setRequestType] = useState<NumberRequestType>("promotional_140");
  const [justification, setJustification] = useState("");
  const [bfsiDeclaration, setBfsiDeclaration] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const load = async () => {
    try {
      setRequests(await numberRequests.listOwn());
    } catch {
      // Non-critical for this section - the form itself still works.
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      await numberRequests.create({
        request_type: requestType,
        justification,
        bfsi_declaration: requestType === "transactional_160" ? bfsiDeclaration : false,
      });
      setJustification("");
      setBfsiDeclaration(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit this request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-5">
      <div>
        <h4 className="text-sm font-bold text-white mb-1">Request a 140/160-series number</h4>
        <p className="text-xs text-os-text-dim leading-relaxed">
          These aren&apos;t available as instant inventory the way local numbers above are.
          Submitting a request adds it to our queue - we&apos;ll coordinate the actual provisioning
          with Plivo and update the status here once there&apos;s something to report.
        </p>
      </div>

      <div className="px-3.5 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-200/90 leading-relaxed">
          160-series is only for BFSI (banking/financial services/insurance) businesses. Most
          businesses on Krova will want 140-series (promotional) instead.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {(["promotional_140", "transactional_160"] as NumberRequestType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setRequestType(t)}
              className={`px-3.5 py-2.5 rounded-lg text-xs font-semibold border text-left transition-all ${
                requestType === t
                  ? "bg-cyan-500/10 border-cyan-500/50 text-white"
                  : "bg-white/[0.02] border-white/[0.06] text-os-text-dim hover:text-white"
              }`}
            >
              {t === "promotional_140" ? "140-series (Promotional)" : "160-series (BFSI Transactional)"}
            </button>
          ))}
        </div>

        {requestType === "transactional_160" && (
          <label className="flex items-start gap-2.5 text-[11px] text-os-text-dim cursor-pointer">
            <input
              type="checkbox"
              checked={bfsiDeclaration}
              onChange={(e) => setBfsiDeclaration(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              I confirm this business operates in banking, financial services, or insurance
              (BFSI) - required for a 160-series number to actually be usable.
            </span>
          </label>
        )}

        <div>
          <label className="block text-xs font-mono uppercase text-os-text-dim mb-1.5">
            Why do you need this?
          </label>
          <textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            required
            rows={2}
            maxLength={500}
            placeholder="Payment reminder calls for overdue invoices"
            className="w-full px-3.5 py-2.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-cyan-500 focus:outline-none resize-none"
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
        {success && <p className="text-xs text-seal-bright">Request submitted.</p>}

        <button
          type="submit"
          disabled={isSubmitting || !justification.trim()}
          className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-cyan-600/20 cursor-pointer flex items-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          {isSubmitting ? "Submitting..." : "Submit Request"}
        </button>
      </form>

      {requests.length > 0 && (
        <div className="pt-4 border-t border-white/[0.06] space-y-2">
          <p className="text-[10px] font-mono uppercase text-os-text-dim">Your requests</p>
          {requests.map((r) => (
            <div
              key={r.id}
              className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-xs text-white truncate">
                  {r.request_type === "promotional_140" ? "140-series" : "160-series"}
                </p>
                <p className="text-[10px] text-os-text-dim truncate">{r.justification}</p>
                {r.provisioned_number && (
                  <p className="text-[10px] font-mono text-cyan-400 mt-0.5">{r.provisioned_number}</p>
                )}
              </div>
              <Badge variant={STATUS_VARIANT[r.status]} size="sm">{STATUS_LABEL[r.status]}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
