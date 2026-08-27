"use client";

import React, { useEffect, useState } from "react";
import { Workflow, Plus, Send, Rocket, AlertTriangle, Copy } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import {
  flows as flowsApi,
  ledger,
  type WhatsAppFlow,
  type CustomerSummary,
} from "@/lib/api";

const CATEGORIES = [
  "SIGN_UP", "SIGN_IN", "APPOINTMENT_BOOKING", "LEAD_GENERATION",
  "CONTACT_US", "CUSTOMER_SUPPORT", "SURVEY", "OTHER",
];

const STATUS_BADGE: Record<WhatsAppFlow["status"], "amber" | "emerald" | "default"> = {
  DRAFT: "amber",
  PUBLISHED: "emerald",
  DEPRECATED: "default",
};

const EXAMPLE_FLOW_JSON = {
  version: "5.0",
  screens: [
    {
      id: "BOOK_APPOINTMENT",
      title: "Book an appointment",
      terminal: true,
      layout: {
        type: "SingleColumnLayout",
        children: [
          {
            type: "Form",
            name: "form",
            children: [
              { type: "TextInput", name: "full_name", label: "Full name", required: true },
              { type: "TextInput", name: "phone", label: "Phone number", "input-type": "phone", required: true },
              { type: "DatePicker", name: "preferred_date", label: "Preferred date", required: true },
              {
                type: "Footer",
                label: "Book",
                "on-click-action": {
                  name: "complete",
                  payload: {
                    full_name: "${form.full_name}",
                    phone: "${form.phone}",
                    preferred_date: "${form.preferred_date}",
                  },
                },
              },
            ],
          },
        ],
      },
    },
  ],
};

export default function FlowsPage() {
  const [flowList, setFlowList] = useState<WhatsAppFlow[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [flowJsonText, setFlowJsonText] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [publishingId, setPublishingId] = useState<string | null>(null);

  const [sendTarget, setSendTarget] = useState<WhatsAppFlow | null>(null);
  const [sendCustomerId, setSendCustomerId] = useState("");
  const [sendBody, setSendBody] = useState("Please fill this in:");
  const [sendScreen, setSendScreen] = useState("");
  const [sendCta, setSendCta] = useState("Open");
  const [sendDraft, setSendDraft] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendOk, setSendOk] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    const [flowsRes, custRes] = await Promise.allSettled([flowsApi.list(), ledger.customers()]);
    if (flowsRes.status === "fulfilled") setFlowList(flowsRes.value);
    if (custRes.status === "fulfilled") setCustomers(custRes.value);
    if (flowsRes.status === "rejected") {
      setLoadError(flowsRes.reason instanceof Error ? flowsRes.reason.message : "Could not load flows.");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setName("");
    setCategories([]);
    setFlowJsonText("");
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const toggleCategory = (cat: string) => {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(flowJsonText);
    } catch {
      setCreateError("That isn't valid JSON - check for a missing comma or bracket.");
      return;
    }
    setIsCreating(true);
    try {
      const created = await flowsApi.create({ name, categories, flow_json: parsed });
      setFlowList((prev) => [...prev, created]);
      setIsCreateOpen(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not create this flow.");
    } finally {
      setIsCreating(false);
    }
  };

  const handlePublish = async (flow: WhatsAppFlow) => {
    setActionError(null);
    setPublishingId(flow.id);
    try {
      const updated = await flowsApi.publish(flow.id);
      setFlowList((prev) => prev.map((f) => (f.id === flow.id ? updated : f)));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not publish this flow.");
    } finally {
      setPublishingId(null);
    }
  };

  const openSend = (flow: WhatsAppFlow) => {
    setSendTarget(flow);
    setSendCustomerId("");
    setSendBody("Please fill this in:");
    // Best-effort guess at the entry screen id from the flow's own JSON.
    const screens = (flow.flow_json as any)?.screens as { id?: string }[] | undefined;
    setSendScreen(screens?.[0]?.id || "");
    setSendCta("Open");
    setSendDraft(flow.status !== "PUBLISHED");
    setSendError(null);
    setSendOk(null);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendTarget) return;
    setSendError(null);
    setSendOk(null);
    setIsSending(true);
    try {
      const result = await flowsApi.send(sendTarget.id, {
        customer_id: sendCustomerId, body: sendBody, screen: sendScreen, cta: sendCta, draft: sendDraft,
      });
      setSendOk(`Sent - flow token ${result.flow_token.slice(0, 8)}...`);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Could not send this flow.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AppLayout
      title="WhatsApp Flows"
      subtitle="Structured forms that render natively inside the chat - no link out, no app to install."
      actions={
        <button
          type="button"
          onClick={openCreate}
          className="px-3 py-1.5 rounded-lg bg-brass hover:bg-brass-dim text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          New Flow
        </button>
      }
    >
      <div className="space-y-6 max-w-5xl mx-auto">
        {loadError && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">{loadError}</div>
        )}
        {actionError && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">{actionError}</div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : flowList.length === 0 ? (
          <EmptyState
            icon={Workflow}
            title="No flows yet"
            description="A Flow is a form a customer fills in without ever leaving WhatsApp - an appointment booking, a lead-capture form, a survey. Author the screens as Flow JSON (Meta's own format - build one visually in Meta's Flow Builder inside Business Manager, then paste the JSON here) and Krova handles creating, publishing, and sending it."
          />
        ) : (
          <div className="space-y-3">
            {flowList.map((flow) => (
              <GlassCard key={flow.id} className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-sm font-bold text-white">{flow.name}</h3>
                      <Badge variant={STATUS_BADGE[flow.status]} size="sm">{flow.status}</Badge>
                      {flow.categories.map((c) => (
                        <span key={c} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-os-text-dim">
                          {c}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] font-mono text-os-text-dim">Meta ID: {flow.meta_flow_id}</p>
                    {flow.validation_errors.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {flow.validation_errors.map((issue, i) => (
                          <p key={i} className="text-[11px] text-red-400 flex items-start gap-1">
                            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                            {issue.message}{issue.line_start ? ` (line ${issue.line_start})` : ""}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {flow.status === "DRAFT" && (
                      <button
                        type="button"
                        onClick={() => handlePublish(flow)}
                        disabled={publishingId === flow.id || flow.validation_errors.length > 0}
                        title={flow.validation_errors.length > 0 ? "Fix validation errors first" : "Publish"}
                        className="px-3 py-1.5 rounded-lg bg-seal/15 hover:bg-seal/25 text-seal-bright text-xs font-semibold border border-seal/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                      >
                        <Rocket className="w-3.5 h-3.5" />
                        {publishingId === flow.id ? "Publishing..." : "Publish"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openSend(flow)}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send
                    </button>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Create Flow Modal */}
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="New Flow"
          subtitle="Paste Flow JSON authored in Meta's Flow Builder (Business Manager -> WhatsApp Manager -> Flows). This creates it in DRAFT - you publish separately once it validates clean."
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Name</label>
              <input
                type="text" required value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Appointment Booking"
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1.5">Categories</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat} type="button" onClick={() => toggleCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border cursor-pointer ${
                      categories.includes(cat) ? "bg-brass/20 border-brass/40 text-brass-bright" : "bg-white/[0.02] border-white/[0.08] text-os-text-dim hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-mono uppercase text-os-text-dim">Flow JSON</label>
                <button
                  type="button"
                  onClick={() => setFlowJsonText(JSON.stringify(EXAMPLE_FLOW_JSON, null, 2))}
                  className="text-[11px] text-brass-bright hover:text-brass flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" /> Load example
                </button>
              </div>
              <textarea
                required rows={10} value={flowJsonText} onChange={(e) => setFlowJsonText(e.target.value)}
                placeholder="{ ... }"
                className="w-full p-3 rounded-xl bg-black/40 border border-white/[0.12] text-[11px] font-mono text-white focus:border-brass focus:outline-none"
              />
            </div>
            {createError && <p className="text-xs text-red-400">{createError}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 rounded-lg text-xs font-semibold text-os-text-dim hover:text-white">
                Cancel
              </button>
              <button
                type="submit" disabled={isCreating || categories.length === 0}
                className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-brass hover:bg-brass-dim shadow-md cursor-pointer disabled:opacity-50"
              >
                {isCreating ? "Creating..." : "Create Flow"}
              </button>
            </div>
          </form>
        </Modal>

        {/* Send Flow Modal */}
        <Modal
          isOpen={!!sendTarget}
          onClose={() => setSendTarget(null)}
          title={`Send "${sendTarget?.name || ""}"`}
          subtitle="Opens the flow inside a chat message. Only delivers if the customer has written in the last 24 hours."
        >
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Customer</label>
              <select
                required value={sendCustomerId} onChange={(e) => setSendCustomerId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
              >
                <option value="">Choose a customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name || c.identities[0]?.value || c.id.slice(0, 8)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Message body</label>
              <textarea
                required rows={2} value={sendBody} onChange={(e) => setSendBody(e.target.value)}
                className="w-full p-3 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Entry screen id</label>
                <input
                  type="text" required value={sendScreen} onChange={(e) => setSendScreen(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-brass focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Button text</label>
                <input
                  type="text" required maxLength={20} value={sendCta} onChange={(e) => setSendCta(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-os-text-dim cursor-pointer">
              <input type="checkbox" checked={sendDraft} onChange={(e) => setSendDraft(e.target.checked)} />
              Send as draft (test as an app tester - required until this flow is published)
            </label>
            {sendError && <p className="text-xs text-red-400">{sendError}</p>}
            {sendOk && <p className="text-xs text-seal-bright">{sendOk}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setSendTarget(null)} className="px-4 py-2 rounded-lg text-xs font-semibold text-os-text-dim hover:text-white">
                Close
              </button>
              <button
                type="submit" disabled={isSending}
                className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-brass hover:bg-brass-dim shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSending ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
