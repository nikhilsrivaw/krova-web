"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, Search } from "lucide-react";
import { ledger, type CustomerSummary } from "@/lib/api";
import { appPath } from "@/lib/app-nav";

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/**
 * Customers, natively in the app. Tapping one opens its conversation in
 * the app's own thread view - same rule as Inbox: nothing bounces to the
 * desktop site.
 */
export default function AppCustomersPage() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    ledger
      .customers()
      .then(setCustomers)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Could not load customers."))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(q) ||
        c.identities.some((i) => i.value.toLowerCase().includes(q)),
    );
  }, [customers, query]);

  return (
    <div className="px-4 pt-5 max-w-md mx-auto">
      <h1 className="text-lg font-semibold text-os-ink mb-4 flex items-center gap-2">
        <Users className="w-4 h-4 text-teal" />
        Customers
      </h1>

      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-os-card border border-os-border mb-4">
        <Search className="w-3.5 h-3.5 text-os-text-dim shrink-0" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name or phone"
          className="w-full bg-transparent text-xs text-os-ink placeholder:text-os-text-dim outline-none"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-os-card animate-pulse" />
          ))}
        </div>
      ) : loadError ? (
        <p className="text-center text-xs text-rose-400 py-8">{loadError}</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-xs text-os-text-dim py-12">
          {customers.length === 0 ? "No customers yet." : "No customer matches that search."}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <a
              key={c.id}
              href={appPath(`/inbox/${c.id}`)}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-os-card border border-os-border active:bg-white/[0.03] transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-teal/10 flex items-center justify-center shrink-0 text-xs font-bold text-teal">
                {(c.name || "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-os-ink truncate">{c.name || "Unknown"}</p>
                <p className="text-[11px] text-os-text-dim truncate">
                  Last contact {timeAgo(c.last_contact_at)}
                  {c.open_commitments > 0 ? ` · ${c.open_commitments} open` : ""}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
