"use client";

import { useEffect, useState } from "react";
import { Wallet, ChevronDown, Check, X, IndianRupee } from "lucide-react";
import { ledger, formatPaise, type Commitment, type LedgerSummary } from "@/lib/api";

type DirectionFilter = "they_owe" | "we_owe";

/**
 * The Commitment Ledger, natively in the app - not a link out to the
 * desktop /ledger page. This is KROVA's actual core feature (a digital
 * khata), so it gets its own bottom-nav tab rather than living inside
 * "More" with everything else that's fine to open on a bigger screen.
 */
export default function AppLedgerPage() {
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [direction, setDirection] = useState<DirectionFilter>("they_owe");
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [paymentRupees, setPaymentRupees] = useState("");

  useEffect(() => {
    ledger.summary().then(setSummary).catch(() => {});
  }, []);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setLoadError(null);
    ledger
      .commitments({ direction, status: "open" })
      .then((data) => {
        if (mounted) setCommitments(data);
      })
      .catch((err) => {
        if (mounted) setLoadError(err instanceof Error ? err.message : "Could not load the ledger.");
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [direction]);

  const refreshSummary = () => ledger.summary().then(setSummary).catch(() => {});

  const handleResolve = async (id: string, outcome: "met" | "missed") => {
    setActioningId(id);
    try {
      await ledger.resolve(id, outcome);
      setCommitments((prev) => prev.filter((c) => c.id !== id));
      setExpandedId(null);
      refreshSummary();
    } catch {
      /* stays in the list - retry on tap */
    } finally {
      setActioningId(null);
    }
  };

  const handleRecordPayment = async (c: Commitment) => {
    const rupees = parseFloat(paymentRupees);
    if (!rupees || rupees <= 0) return;
    setActioningId(c.id);
    try {
      const updated = await ledger.recordPayment(c.id, Math.round(rupees * 100));
      if (updated.status !== "open") {
        setCommitments((prev) => prev.filter((x) => x.id !== c.id));
        setExpandedId(null);
      } else {
        setCommitments((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
      }
      setPaymentRupees("");
      refreshSummary();
    } catch {
      /* input stays as-is - retry on tap */
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="px-4 pt-5 max-w-md mx-auto">
      <h1 className="text-lg font-semibold text-os-ink mb-1 flex items-center gap-2">
        <Wallet className="w-4 h-4 text-teal" />
        Ledger
      </h1>

      {summary && (
        <div className="grid grid-cols-2 gap-3 mt-4 mb-5">
          <div className="p-3.5 rounded-2xl bg-os-card border border-os-border">
            <p className="text-lg font-semibold text-os-ink font-mono">
              {formatPaise(summary.owed_to_us_paise)}
            </p>
            <p className="text-[10px] text-os-text-dim mt-0.5">Owed to you</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-os-card border border-os-border">
            <p className="text-lg font-semibold text-thread-bright font-mono">
              {formatPaise(summary.overdue_paise)}
            </p>
            <p className="text-[10px] text-os-text-dim mt-0.5">
              Overdue{summary.overdue_count > 0 ? ` (${summary.overdue_count})` : ""}
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-1.5 mb-4">
        {([
          ["they_owe", "They owe you"],
          ["we_owe", "You owe"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setDirection(key);
              setExpandedId(null);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              direction === key
                ? "bg-teal/15 text-teal-bright border border-teal/30"
                : "bg-os-card text-os-text-dim border border-os-border"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-os-card animate-pulse" />
          ))}
        </div>
      ) : loadError ? (
        <p className="text-center text-xs text-rose-400 py-8">{loadError}</p>
      ) : commitments.length === 0 ? (
        <p className="text-center text-xs text-os-text-dim py-12">
          {direction === "they_owe" ? "Nobody owes you right now." : "You don't owe anyone right now."}
        </p>
      ) : (
        <div className="space-y-2.5">
          {commitments.map((c) => {
            const isExpanded = expandedId === c.id;
            return (
              <div
                key={c.id}
                className={`rounded-2xl bg-os-card border overflow-hidden transition-colors ${
                  c.overdue ? "border-thread/40" : "border-os-border"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setExpandedId(isExpanded ? null : c.id);
                    setPaymentRupees("");
                  }}
                  className="w-full text-left px-4 py-3.5 flex items-center gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-os-ink truncate">
                      {c.customer_name || "Unknown customer"}
                    </p>
                    <p className="text-[11px] text-os-text-dim truncate mt-0.5">{c.description}</p>
                    {c.due_at && (
                      <p className={`text-[10px] font-mono mt-1 ${c.overdue ? "text-thread-bright" : "text-os-text-dim"}`}>
                        {c.overdue ? "Overdue since " : "Due "}
                        {new Date(c.due_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-os-ink font-mono">
                      {c.outstanding_display || (c.outstanding_paise != null ? formatPaise(c.outstanding_paise) : "—")}
                    </p>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-os-text-dim ml-auto mt-1 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-os-border space-y-3">
                    {direction === "they_owe" && (
                      <div className="flex gap-2">
                        <div className="flex-1 flex items-center px-3 py-2 rounded-lg bg-black/30 border border-os-border">
                          <IndianRupee className="w-3.5 h-3.5 text-os-text-dim mr-1 shrink-0" />
                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder="Amount received"
                            value={paymentRupees}
                            onChange={(e) => setPaymentRupees(e.target.value)}
                            className="w-full bg-transparent text-xs text-os-ink placeholder:text-os-text-dim outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={!paymentRupees || actioningId === c.id}
                          onClick={() => handleRecordPayment(c)}
                          className="px-3.5 rounded-lg text-xs font-bold text-os-bg bg-teal disabled:opacity-40"
                        >
                          Record
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={actioningId === c.id}
                        onClick={() => handleResolve(c.id, "met")}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold text-teal bg-teal/10 border border-teal/25 flex items-center justify-center gap-1.5 disabled:opacity-40"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Mark fully settled
                      </button>
                      <button
                        type="button"
                        disabled={actioningId === c.id}
                        onClick={() => handleResolve(c.id, "missed")}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold text-os-text-dim bg-white/[0.04] border border-os-border flex items-center justify-center gap-1.5 disabled:opacity-40"
                      >
                        <X className="w-3.5 h-3.5" />
                        Mark missed
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
