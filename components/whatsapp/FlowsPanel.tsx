"use client";

import React, { useEffect, useState } from "react";
import { Workflow, Plus, Send, Rocket, AlertTriangle, Copy, X, ArrowUp, ArrowDown, Eye, EyeOff, Zap, Archive, RefreshCw } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import {
  flows as flowsApi,
  ledger,
  type WhatsAppFlow,
  type CustomerSummary,
  type FlowTemplate,
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

// The guided builder's own field types, each mapped to the real Meta Flow
// JSON component it compiles into - confirmed against Meta's own Flow
// component reference, the same components the vertical templates above
// already use. Deliberately narrow (the common structured-form case) -
// anything needing branching, images, or multiple screens still goes
// through "Paste JSON" (build it in Meta's own Flow Builder, paste the
// result here), not reinvented here.
type BuilderFieldType = "text" | "phone" | "email" | "number" | "paragraph" | "date" | "choose_one" | "choose_list";

const FIELD_TYPE_LABEL: Record<BuilderFieldType, string> = {
  text: "Short answer",
  phone: "Phone number",
  email: "Email",
  number: "Number",
  paragraph: "Paragraph",
  date: "Date",
  choose_one: "Choose one",
  choose_list: "Choose from a list",
};

type BuilderField = {
  key: string; // React list key only, not sent anywhere
  type: BuilderFieldType;
  label: string;
  required: boolean;
  options: string; // comma-separated, only used for choose_one/choose_list
};

/**
 * Whether this flow has any real use for the data_exchange endpoint -
 * NOT the same as "more than one screen" (case_status_live is a single
 * screen that still needs it, populated entirely from Meta's own INIT
 * call, with no data_exchange action anywhere in its JSON at all). The
 * one signal every live flow template actually shares is a screen-level
 * "data" schema declaration - a plain static flow never has one.
 */
function usesLiveData(flow: WhatsAppFlow): boolean {
  try {
    return JSON.stringify(flow.flow_json).includes('"data":');
  } catch {
    return false;
  }
}

function slug(text: string, fallback: string): string {
  const s = text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return s || fallback;
}

/** What the guided builder actually produces - real Meta Flow JSON, nothing KROVA-specific in the output. */
function compileFlowJson(screenTitle: string, footerLabel: string, fields: BuilderField[]): Record<string, unknown> {
  const screenId = slug(screenTitle, "screen").toUpperCase();
  const usedNames = new Set<string>();
  const formChildren: Record<string, unknown>[] = fields.map((f, i) => {
    let name = slug(f.label, `field_${i + 1}`);
    while (usedNames.has(name)) name = `${name}_${i + 1}`;
    usedNames.add(name);

    const base = { name, label: f.label || `Field ${i + 1}`, required: f.required };
    switch (f.type) {
      case "text":
        return { type: "TextInput", "input-type": "text", ...base };
      case "phone":
        return { type: "TextInput", "input-type": "phone", ...base };
      case "email":
        return { type: "TextInput", "input-type": "email", ...base };
      case "number":
        return { type: "TextInput", "input-type": "number", ...base };
      case "paragraph":
        return { type: "TextArea", ...base };
      case "date":
        return { type: "DatePicker", ...base };
      case "choose_one":
      case "choose_list": {
        const opts = f.options.split(",").map((o) => o.trim()).filter(Boolean);
        const dataSource = opts.length > 0
          ? opts.map((title, oi) => ({ id: `opt_${oi + 1}`, title }))
          : [{ id: "opt_1", title: "Option 1" }];
        return { type: f.type === "choose_one" ? "RadioButtonsGroup" : "Dropdown", "data-source": dataSource, ...base };
      }
    }
  });

  const payload: Record<string, string> = {};
  for (const child of formChildren) {
    const n = String(child.name);
    payload[n] = `\${form.${n}}`;
  }

  formChildren.push({
    type: "Footer",
    label: footerLabel || "Submit",
    "on-click-action": { name: "complete", payload },
  });

  return {
    version: "5.0",
    screens: [
      {
        id: screenId,
        title: screenTitle || "Screen",
        terminal: true,
        layout: { type: "SingleColumnLayout", children: [{ type: "Form", name: "form", children: formChildren }] },
      },
    ],
  };
}

/**
 * WhatsApp Flows - moved here from its own top-level page (2026-09-12):
 * a Flow is a WhatsApp-native feature (Meta's own structured in-chat
 * forms), not a separate product surface, so it lives as a tab inside the
 * WhatsApp hub rather than its own sidebar entry.
 */
export function FlowsPanel() {
  const [flowList, setFlowList] = useState<WhatsAppFlow[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [templates, setTemplates] = useState<FlowTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [flowJsonText, setFlowJsonText] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Guided builder - Meta's real Flow JSON underneath (compileFlowJson
  // above), just no need to leave KROVA or hand-write JSON for the common
  // single-screen structured-form case. "Paste JSON" stays for anything
  // this doesn't cover (branching, multiple screens, images).
  const [builderMode, setBuilderMode] = useState<"guided" | "json">("guided");
  const [builderFields, setBuilderFields] = useState<BuilderField[]>([
    { key: "f0", type: "text", label: "Full name", required: true, options: "" },
    { key: "f1", type: "phone", label: "Phone number", required: true, options: "" },
  ]);
  const [footerLabel, setFooterLabel] = useState("Submit");
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const nextFieldKey = React.useRef(2);

  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deprecatingId, setDeprecatingId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [enablingLiveDataId, setEnablingLiveDataId] = useState<string | null>(null);
  const [liveDataEnabledIds, setLiveDataEnabledIds] = useState<Set<string>>(new Set());

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
    const [flowsRes, custRes, templatesRes] = await Promise.allSettled([
      flowsApi.list(),
      ledger.customers(),
      flowsApi.templates(),
    ]);
    if (flowsRes.status === "fulfilled") setFlowList(flowsRes.value);
    if (custRes.status === "fulfilled") setCustomers(custRes.value);
    // Best-effort: a business without a vertical-specific template (or a
    // transient failure) just sees no template picker, never a page error.
    if (templatesRes.status === "fulfilled") setTemplates(templatesRes.value);
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
    setBuilderMode("guided");
    setBuilderFields([
      { key: "f0", type: "text", label: "Full name", required: true, options: "" },
      { key: "f1", type: "phone", label: "Phone number", required: true, options: "" },
    ]);
    nextFieldKey.current = 2;
    setFooterLabel("Submit");
    setShowJsonPreview(false);
    setIsCreateOpen(true);
  };

  const toggleCategory = (cat: string) => {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  const applyTemplate = (tpl: FlowTemplate) => {
    setName(tpl.name);
    setCategories(tpl.categories);
    setFlowJsonText(JSON.stringify(tpl.flow_json, null, 2));
    // A pre-built template is already-authored JSON, not guided-builder
    // fields to reverse-engineer - switches to Paste JSON so what's about
    // to be created matches what's shown.
    setBuilderMode("json");
    setCreateError(null);
  };

  const addField = (type: BuilderFieldType) => {
    const key = `f${nextFieldKey.current++}`;
    setBuilderFields((prev) => [...prev, { key, type, label: "", required: true, options: "" }]);
  };

  const updateField = (key: string, patch: Partial<BuilderField>) => {
    setBuilderFields((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)));
  };

  const removeField = (key: string) => {
    setBuilderFields((prev) => prev.filter((f) => f.key !== key));
  };

  const moveField = (index: number, direction: -1 | 1) => {
    setBuilderFields((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    let parsed: Record<string, unknown>;
    if (builderMode === "guided") {
      if (builderFields.length === 0) {
        setCreateError("Add at least one field.");
        return;
      }
      if (builderFields.some((f) => !f.label.trim())) {
        setCreateError("Every field needs a label.");
        return;
      }
      parsed = compileFlowJson(name, footerLabel, builderFields);
    } else {
      try {
        parsed = JSON.parse(flowJsonText);
      } catch {
        setCreateError("That isn't valid JSON - check for a missing comma or bracket.");
        return;
      }
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

  const handleDeprecate = async (flow: WhatsAppFlow) => {
    setActionError(null);
    setDeprecatingId(flow.id);
    try {
      const updated = await flowsApi.deprecate(flow.id);
      setFlowList((prev) => prev.map((f) => (f.id === flow.id ? updated : f)));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not retire this flow.");
    } finally {
      setDeprecatingId(null);
    }
  };

  const handleRefresh = async (flow: WhatsAppFlow) => {
    setActionError(null);
    setRefreshingId(flow.id);
    try {
      const updated = await flowsApi.refresh(flow.id);
      setFlowList((prev) => prev.map((f) => (f.id === flow.id ? updated : f)));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not refresh this flow's status.");
    } finally {
      setRefreshingId(null);
    }
  };

  const handleEnableLiveData = async (flow: WhatsAppFlow) => {
    setActionError(null);
    setEnablingLiveDataId(flow.id);
    try {
      await flowsApi.enableLiveData(flow.id);
      setLiveDataEnabledIds((prev) => new Set(prev).add(flow.id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not enable live data for this flow.");
    } finally {
      setEnablingLiveDataId(null);
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
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <p className="text-xs text-os-text-dim max-w-xl">
          Structured forms that render natively inside the chat - no link out, no app to install.
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="px-3 py-1.5 rounded-lg bg-brass hover:bg-brass-dim text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          New Flow
        </button>
      </div>

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
                  <button
                    type="button"
                    onClick={() => handleRefresh(flow)}
                    disabled={refreshingId === flow.id}
                    title="Re-check this flow's real status and validation with Meta"
                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-os-text-dim hover:text-white cursor-pointer disabled:opacity-40"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshingId === flow.id ? "animate-spin" : ""}`} />
                  </button>
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
                  {flow.status === "PUBLISHED" && (
                    <button
                      type="button"
                      onClick={() => handleDeprecate(flow)}
                      disabled={deprecatingId === flow.id}
                      title="Retire this flow - it can never be published or sent again"
                      className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-os-text-dim hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      {deprecatingId === flow.id ? "Retiring..." : "Retire"}
                    </button>
                  )}
                  {/* Beta: only flows that actually declare a dynamic
                      screen data schema have any use for the live-data
                      endpoint - a plain static flow has nothing to fetch. */}
                  {usesLiveData(flow) && (
                    <button
                      type="button"
                      onClick={() => handleEnableLiveData(flow)}
                      disabled={enablingLiveDataId === flow.id}
                      title="Point this flow at KROVA's own data endpoint, so a later screen can show real data (Beta)"
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-semibold border border-cyan-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      {enablingLiveDataId === flow.id
                        ? "Enabling..."
                        : liveDataEnabledIds.has(flow.id)
                        ? "Live data on"
                        : "Enable live data (Beta)"}
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
        subtitle="Build it here, or paste Flow JSON authored in Meta's own Flow Builder (Business Manager -> WhatsApp Manager -> Flows). Either way this creates it in DRAFT - you publish separately once it validates clean."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="flex gap-1.5 p-1 rounded-lg bg-black/30 border border-white/[0.08] w-fit">
            {(["guided", "json"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setBuilderMode(mode)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer transition-all ${
                  builderMode === mode ? "bg-brass text-[#14151F]" : "text-os-text-dim hover:text-white"
                }`}
              >
                {mode === "guided" ? "Build a form" : "Paste JSON"}
              </button>
            ))}
          </div>

          {templates.length > 0 && (
            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1.5">
                Start from a template for your business
              </label>
              <div className="flex flex-wrap gap-2">
                {templates.map((tpl) => (
                  <button
                    key={tpl.key}
                    type="button"
                    title={tpl.description}
                    onClick={() => applyTemplate(tpl)}
                    className="px-3 py-2 rounded-lg bg-brass/10 hover:bg-brass/20 border border-brass/30 text-[11px] font-semibold text-brass-bright cursor-pointer text-left"
                  >
                    {tpl.name}
                  </button>
                ))}
              </div>
            </div>
          )}
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
          {builderMode === "json" ? (
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
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1.5">Fields</label>
                <div className="space-y-2">
                  {builderFields.map((field, i) => (
                    <div key={field.key} className="p-2.5 rounded-lg bg-black/30 border border-white/[0.08] space-y-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => updateField(field.key, { label: e.target.value })}
                          placeholder="Field label, e.g. Full name"
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
                        />
                        <select
                          value={field.type}
                          onChange={(e) => updateField(field.key, { type: e.target.value as BuilderFieldType })}
                          className="px-2 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-[11px] text-white focus:border-brass focus:outline-none"
                        >
                          {(Object.keys(FIELD_TYPE_LABEL) as BuilderFieldType[]).map((t) => (
                            <option key={t} value={t}>{FIELD_TYPE_LABEL[t]}</option>
                          ))}
                        </select>
                        <button type="button" onClick={() => moveField(i, -1)} disabled={i === 0}
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-os-text-dim disabled:opacity-30 cursor-pointer">
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button type="button" onClick={() => moveField(i, 1)} disabled={i === builderFields.length - 1}
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-os-text-dim disabled:opacity-30 cursor-pointer">
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button type="button" onClick={() => removeField(field.key)}
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-red-500/10 text-os-text-dim hover:text-red-400 cursor-pointer">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-[11px] text-os-text-dim cursor-pointer">
                          <input type="checkbox" checked={field.required} onChange={(e) => updateField(field.key, { required: e.target.checked })} />
                          Required
                        </label>
                        {(field.type === "choose_one" || field.type === "choose_list") && (
                          <input
                            type="text"
                            value={field.options}
                            onChange={(e) => updateField(field.key, { options: e.target.value })}
                            placeholder="Options, comma separated"
                            className="flex-1 px-2.5 py-1 rounded-lg bg-black/40 border border-white/[0.12] text-[11px] text-white focus:border-brass focus:outline-none"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(Object.keys(FIELD_TYPE_LABEL) as BuilderFieldType[]).map((t) => (
                    <button
                      key={t} type="button" onClick={() => addField(t)}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-[11px] text-os-text-dim hover:text-white cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> {FIELD_TYPE_LABEL[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Submit button text</label>
                <input
                  type="text" maxLength={20} value={footerLabel} onChange={(e) => setFooterLabel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowJsonPreview((v) => !v)}
                className="text-[11px] text-os-text-dim hover:text-white flex items-center gap-1 cursor-pointer"
              >
                {showJsonPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showJsonPreview ? "Hide" : "Preview"} the real Flow JSON this builds
              </button>
              {showJsonPreview && (
                <pre className="w-full p-3 rounded-xl bg-black/40 border border-white/[0.12] text-[10px] font-mono text-os-text-dim overflow-x-auto max-h-64 overflow-y-auto">
                  {JSON.stringify(compileFlowJson(name, footerLabel, builderFields), null, 2)}
                </pre>
              )}
            </div>
          )}
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
  );
}
