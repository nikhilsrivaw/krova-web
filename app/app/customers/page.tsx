"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Search, UserPlus } from "lucide-react";
import { account, ledger, type CustomerSummary } from "@/lib/api";
import { appPath } from "@/lib/app-nav";
import { Sheet } from "@/components/app-shell/Sheet";

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
 * Customers, natively in the app. Search runs on the server, so it finds anyone - not only the most recent page.
 * Tapping one opens their screen in the app (profile, notes, tags, chat) - nothing bounces to the desktop site.
 * Owner and admins can add a contact by phone.
 */
export default function AppCustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [canAdd, setCanAdd] = useState(false);

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    account.profile().then((p) => setCanAdd(p.role === "owner" || p.role === "admin")).catch(() => {});
  }, []);

  // Typing waits a moment before asking, so each key press is not a request.
  useEffect(() => {
    let live = true;
    const q = query.trim();
    const timer = setTimeout(() => {
      setIsLoading(true);
      ledger
        .customers(q ? { q, limit: 100 } : { limit: 100 })
        .then((rows) => { if (live) { setCustomers(rows); setLoadError(null); } })
        .catch((err) => { if (live) setLoadError(err instanceof Error ? err.message : "Could not load customers."); })
        .finally(() => { if (live) setIsLoading(false); });
    }, q ? 300 : 0);
    return () => { live = false; clearTimeout(timer); };
  }, [query]);

  const addContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddBusy(true);
    setAddError(null);
    try {
      const result = await ledger.importCustomers([{ phone: newPhone.trim(), name: newName.trim() || null }]);
      const row = result.rows[0];
      if (!row || row.outcome === "invalid" || !row.customer_id) {
        setAddError(row?.reason || "That phone number doesn't look right. Use the full number, e.g. +91 98765 43210.");
        return;
      }
      router.push(appPath(`/customers/${row.customer_id}`));
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Could not add this contact.");
    } finally {
      setAddBusy(false);
    }
  };

  return (
    <div className="px-4 pt-5 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-os-ink flex items-center gap-2">
          <Users className="w-4 h-4 text-teal" />
          Customers
        </h1>
        {canAdd && (
          <button
            type="button"
            onClick={() => { setAdding(true); setAddError(null); }}
            className="px-3 py-1.5 rounded-lg bg-teal/10 border border-teal/25 text-[11px] font-semibold text-teal flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" /> Add contact
          </button>
        )}
      </div>

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

      {isLoading && customers.length === 0 ? (
        <div className="space-y-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-os-card animate-pulse" />
          ))}
        </div>
      ) : loadError ? (
        <p className="text-center text-xs text-rose-400 py-8">{loadError}</p>
      ) : customers.length === 0 ? (
        <p className="text-center text-xs text-os-text-dim py-12">
          {query.trim() ? "No customer matches that search." : "No customers yet."}
        </p>
      ) : (
        <div className={`space-y-2 ${isLoading ? "opacity-60" : ""}`}>
          {customers.map((c) => (
            <a
              key={c.id}
              href={appPath(`/customers/${c.id}`)}
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
                  {c.stage ? ` · ${c.stage}` : ""}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}

      <Sheet open={adding} title="Add a contact" onClose={() => setAdding(false)}>
        <form onSubmit={addContact} className="space-y-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name (optional)"
            maxLength={120}
            className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-os-border text-sm text-os-ink focus:border-teal focus:outline-none"
          />
          <input
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="Phone, e.g. +91 98765 43210"
            inputMode="tel"
            required
            className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-os-border text-sm text-os-ink focus:border-teal focus:outline-none"
          />
          <p className="text-[11px] text-os-text-dim">
            Adding someone doesn&apos;t message them. Only send offers to people who agreed to hear from you.
          </p>
          {addError && <p className="text-xs text-rose-400">{addError}</p>}
          <button
            type="submit"
            disabled={addBusy || !newPhone.trim()}
            className="w-full py-2.5 rounded-xl bg-teal text-os-bg text-xs font-bold disabled:opacity-40"
          >
            {addBusy ? "Adding…" : "Add contact"}
          </button>
        </form>
      </Sheet>
    </div>
  );
}
