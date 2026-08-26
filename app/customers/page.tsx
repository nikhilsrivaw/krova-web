"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  MessageSquare,
  Phone,
  Mail,
  Shield,
  Layers,
  ArrowRight,
  ExternalLink,
  Sparkles,
  DollarSign,
  Clock,
  Filter,
  CheckCircle2,
} from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import {
  ledger,
  formatPaise,
  type CustomerSummary,
} from "@/lib/api";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [healthFilter, setHealthFilter] = useState<"all" | "high" | "low">("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadCustomers = async () => {
      try {
        const data = await ledger.customers();
        if (mounted) setCustomers(data);
      } catch {
        // Mock fallback
        if (mounted) {
          setCustomers([
            {
              id: "cust-101",
              name: "Dr. Rajesh Sharma",
              identities: [
                { kind: "phone", value: "+91 98201 44521" },
                { kind: "email", value: "dr.rajesh@sharmaclinic.in" },
              ],
              last_contact_at: new Date().toISOString(),
              open_commitments: 1,
              is_private: false,
              health_score: 88,
              outstanding_paise: 1850000,
              summary:
                "Lead clinical ultrasound consultant. Enrolled in multiple workshop modules. Reliable payment record.",
              preferred_channel: "whatsapp",
            },
            {
              id: "cust-102",
              name: "Anita Varma (Radiance)",
              identities: [{ kind: "phone", value: "+91 91672 88910" }],
              last_contact_at: new Date(Date.now() - 86400000).toISOString(),
              open_commitments: 0,
              is_private: false,
              health_score: 92,
              outstanding_paise: 0,
              summary:
                "Corporate salon chain owner. Schedules team training sessions every quarter.",
              preferred_channel: "voice",
            },
            {
              id: "cust-103",
              name: "Vikram Malhotra",
              identities: [{ kind: "phone", value: "+91 98450 11223" }],
              last_contact_at: new Date(Date.now() - 86400000 * 4).toISOString(),
              open_commitments: 2,
              is_private: true,
              health_score: 42,
              outstanding_paise: 5000000,
              summary:
                "Promised retainer fee payment 3 times and delayed twice. Pattern extracted: Needs structured deadline reminders.",
              preferred_channel: "whatsapp",
            },
          ]);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadCustomers();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      (c.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.identities.some((i) => i.value.includes(searchQuery));
    const score = c.health_score ?? 80;
    const matchesHealth =
      healthFilter === "all" ||
      (healthFilter === "high" && score >= 75) ||
      (healthFilter === "low" && score < 75);
    return matchesSearch && matchesHealth;
  });

  return (
    <AppLayout
      title="Customer Intelligence CRM"
      subtitle="AI-built relationship graph & compressed customer profiles"
      actions={
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-os-text-dim">
            {customers.length} Tracked Profiles
          </span>
        </div>
      }
    >
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-os-card border border-white/[0.06]">
          <div className="flex items-center px-3 py-1.5 rounded-lg bg-black/40 border border-white/[0.08] w-full sm:w-80">
            <Search className="w-4 h-4 text-os-text-dim mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer name or phone..."
              className="w-full bg-transparent text-xs text-white placeholder:text-os-text-dim outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-mono text-os-text-dim">Health:</span>
            {(["all", "high", "low"] as const).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHealthFilter(h)}
                className={`px-3 py-1 rounded-lg text-xs font-mono capitalize transition-all cursor-pointer ${
                  healthFilter === h
                    ? "bg-white text-black font-bold"
                    : "bg-white/[0.04] text-os-text-dim hover:text-white"
                }`}
              >
                {h === "high" ? "Healthy (75+)" : h === "low" ? "At-Risk (<75)" : "All"}
              </button>
            ))}
          </div>
        </div>

        {/* Customer Data Table */}
        <GlassCard className="p-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No customers match your filter"
              description="Try adjusting your search query or health score filter."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.06] text-os-text-dim font-mono uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Identity / Contact</th>
                    <th className="py-3 px-3">Health Score</th>
                    <th className="py-3 px-3">Open Commitments</th>
                    <th className="py-3 px-3">Outstanding ₹</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {filteredCustomers.map((cust) => {
                    const score = cust.health_score ?? 80;
                    return (
                      <tr
                        key={cust.id}
                        className="hover:bg-white/[0.02] cursor-pointer transition-colors group"
                        onClick={() => setSelectedCustomer(cust)}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-brass/40 to-slate-800 border border-white/10 flex items-center justify-center font-bold text-xs text-white">
                              {cust.name?.charAt(0) || "C"}
                            </div>
                            <div>
                              <p className="font-bold text-white group-hover:text-brass-bright transition-colors">
                                {cust.name || "Unnamed Contact"}
                              </p>
                              <span className="text-[10px] text-os-text-dim capitalize">
                                Prefers {cust.preferred_channel || "WhatsApp"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 font-mono text-os-text-dim">
                          {cust.identities[0]?.value || "No phone"}
                        </td>

                        <td className="py-3 px-3 font-mono">
                          <Badge
                            variant={score >= 75 ? "emerald" : score >= 50 ? "amber" : "rose"}
                            size="sm"
                          >
                            {score}/100
                          </Badge>
                        </td>

                        <td className="py-3 px-3 font-mono text-white">
                          {cust.open_commitments > 0 ? (
                            <span className="text-amber-400 font-semibold">
                              {cust.open_commitments} Pending
                            </span>
                          ) : (
                            <span className="text-os-text-dim">0 Promises</span>
                          )}
                        </td>

                        <td className="py-3 px-3 font-mono font-bold text-white">
                          {cust.outstanding_paise ? (
                            formatPaise(cust.outstanding_paise)
                          ) : (
                            <span className="text-seal-bright font-normal">₹0 Settled</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCustomer(cust);
                            }}
                            className="px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-white font-semibold text-xs transition-colors"
                          >
                            Inspect 360
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>

        {/* Customer 360 Inspection Drawer */}
        <Drawer
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          title="Customer Intelligence Dossier"
          subtitle={`AI profile for ${selectedCustomer?.name || "Customer"}`}
          width="md"
        >
          {selectedCustomer && (
            <div className="space-y-6">
              {/* Health Score Gauge */}
              <GlassCard className="p-4 bg-white/[0.02]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono uppercase text-os-text-dim">
                    Relationship Health
                  </span>
                  <span className="text-base font-bold font-mono text-seal-bright">
                    {selectedCustomer.health_score ?? 85}/100
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brass to-seal-bright rounded-full"
                    style={{ width: `${selectedCustomer.health_score ?? 85}%` }}
                  />
                </div>
              </GlassCard>

              {/* AI Compressed Profile Summary */}
              <div>
                <h4 className="text-xs font-mono uppercase text-brass-bright font-semibold mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Compressed Profile
                </h4>
                <div className="p-4 rounded-xl bg-brass/10 border border-brass/20 text-xs text-white/90 leading-relaxed font-sans">
                  {selectedCustomer.summary ||
                    "Customer interacts primarily through WhatsApp. Responses indicate steady engagement with low dispute probability."}
                </div>
              </div>

              {/* Identity & Channels */}
              <div>
                <h4 className="text-xs font-mono uppercase text-os-text-dim mb-2">
                  Contact Channels
                </h4>
                <div className="space-y-2">
                  {selectedCustomer.identities.map((id, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs font-mono"
                    >
                      <span className="text-os-text-dim uppercase text-[10px]">{id.kind}</span>
                      <span className="text-white">{id.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Navigation Links */}
              <div className="pt-4 border-t border-white/[0.06] space-y-2">
                <Link
                  href={`/conversations`}
                  className="w-full py-2.5 rounded-xl bg-brass hover:bg-brass-dim text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <MessageSquare className="w-4 h-4" />
                  Open Conversation Timeline
                </Link>

                <Link
                  href={`/ledger?customer_id=${selectedCustomer.id}`}
                  className="w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Layers className="w-4 h-4" />
                  Inspect Commitment Ledger
                </Link>
              </div>
            </div>
          )}
        </Drawer>
      </div>
    </AppLayout>
  );
}
