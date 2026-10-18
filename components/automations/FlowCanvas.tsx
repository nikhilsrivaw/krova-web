"use client";

/**
 * The automations builder's canvas, laid out the way Zapier, HubSpot workflows and GoHighLevel do it: one column of
 * cards top to bottom on a dotted, pannable surface, a "Wait 2 days" pill on the line before a step that waits, a "+"
 * on every line to insert, and an End marker. Clicking a card opens its form in a side panel (below the canvas on a
 * phone) instead of squeezing the form into the card itself.
 *
 * Built on @xyflow/react for pan/zoom/fit. The engine only runs a strict linear chain (no branching - see
 * shared/db/models/integrations.py::AutomationStep on the backend), so this is a single column, not a free graph, and
 * node positions come from step order (which is also execution order); dragging is off.
 *
 * Every node, button and input below carries `!pointer-events-auto`: with nodesDraggable/nodesConnectable/
 * elementsSelectable all false, React Flow sets `pointer-events: none` on node wrappers, which silently eats clicks on
 * custom node content (found by driving the canvas with Playwright, not guessed).
 */

import React, { useEffect, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  MarkerType,
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  useReactFlow,
  useStore,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowDown, ArrowUp, Clock, Filter, Pencil, Plus, Trash2, X, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  AutomationAction,
  AutomationChannel,
  AutomationOperator,
  AutomationStepConfig,
  AutomationTrigger,
} from "@/lib/api";

const NODE_W = 300;
// Vertical distance between card tops - room for the tallest collapsed card plus the line's wait pill and "+".
const SLOT_H = 176;

// Card accent per kind of action, so a chain reads at a glance: talking to the customer, calling, the team, the record.
const ACTION_TONE: Record<AutomationAction, string> = {
  whatsapp_followup: "emerald", send_sms: "emerald", send_email: "emerald", instagram_followup: "emerald",
  instagram_comment_reply: "emerald", send_flow: "emerald", send_carousel: "emerald",
  place_call: "violet",
  notify_team: "amber", create_escalation_task: "amber", assign_to_agent: "amber",
  add_tag: "sky", set_stage: "sky",
  send_payment_link: "pink",
};
const TONE_TILE: Record<string, string> = {
  emerald: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
  violet: "bg-violet-500/15 border-violet-500/30 text-violet-300",
  amber: "bg-amber-500/15 border-amber-500/30 text-amber-300",
  sky: "bg-sky-500/15 border-sky-500/30 text-sky-300",
  pink: "bg-pink-500/15 border-pink-500/30 text-pink-300",
};

// `group` puts the trigger under a heading in the picker (Messages, Bookings & queue, ...). Groups keep the order
// they first appear in; options without one go last, ungrouped.
export type TriggerOption = { value: AutomationTrigger; label: string; group?: string };

function groupOptions(options: TriggerOption[]): [string | null, TriggerOption[]][] {
  const out = new Map<string | null, TriggerOption[]>();
  for (const o of options) {
    const key = o.group ?? null;
    if (!out.has(key)) out.set(key, []);
    out.get(key)!.push(o);
  }
  const entries = [...out.entries()];
  return [...entries.filter(([g]) => g !== null), ...entries.filter(([g]) => g === null)];
}

const hidden = { opacity: 0, pointerEvents: "none" as const };

// ── Trigger card ─────────────────────────────────────────────────────────

type TriggerNodeData = {
  ruleName: string;
  label: string;
  needsChannel: boolean;
  selected: boolean;
  locked: boolean;
  onOpen: () => void;
};

function TriggerNode({ data }: NodeProps) {
  const d = data as unknown as TriggerNodeData;
  return (
    <button
      type="button"
      onClick={d.onOpen}
      disabled={d.locked}
      style={{ width: NODE_W }}
      className={`!pointer-events-auto text-left p-3.5 rounded-2xl bg-[#141414] border shadow-lg shadow-black/40 transition-all cursor-pointer disabled:cursor-default nodrag ${
        d.selected ? "border-cyan-400 ring-2 ring-cyan-500/30" : "border-cyan-500/30 hover:border-cyan-400/70"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shrink-0">
          <Zap className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400/80">When this happens</p>
          <p className="text-xs font-semibold text-white leading-snug line-clamp-2">{d.label}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-[10px] text-os-text-dim truncate">{d.ruleName || "Untitled rule"}</p>
        {d.needsChannel && <span className="text-[10px] text-amber-300 shrink-0">Choose channel</span>}
      </div>
      <Handle type="source" position={Position.Bottom} style={hidden} />
    </button>
  );
}

// ── Step card ────────────────────────────────────────────────────────────

type StepNodeData = {
  isNew: boolean;
  step?: AutomationStepConfig;
  index: number;
  selected: boolean;
  locked: boolean;
  actionLabel: Record<AutomationAction, string>;
  actionIcon: Record<AutomationAction, LucideIcon>;
  fieldLabel: Record<string, string>;
  operatorLabel: Record<AutomationOperator, string>;
  summary: string;
  onOpen: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
};

function StepNode({ data }: NodeProps) {
  const d = data as unknown as StepNodeData;

  if (d.isNew || !d.step) {
    return (
      <div style={{ width: NODE_W }} className="!pointer-events-auto p-3.5 rounded-2xl bg-cyan-500/[0.06] border-2 border-dashed border-cyan-400/60 nodrag">
        <p className="text-xs font-semibold text-cyan-200">New step {d.index + 1}</p>
        <p className="text-[11px] text-os-text-dim mt-0.5">Set it up in the panel.</p>
        <Handle type="target" position={Position.Top} style={hidden} />
        <Handle type="source" position={Position.Bottom} style={hidden} />
      </div>
    );
  }

  const Icon = d.actionIcon[d.step.action_type] ?? Zap;
  const tone = TONE_TILE[ACTION_TONE[d.step.action_type] ?? "sky"];
  const conditions = d.step.conditions ?? [];
  const iconBtn = "!pointer-events-auto p-1 rounded-md text-os-text-dim hover:text-white hover:bg-white/[0.08] disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer";

  return (
    <div
      style={{ width: NODE_W }}
      className={`group !pointer-events-auto relative p-3.5 rounded-2xl bg-[#141414] border shadow-lg shadow-black/40 transition-all nodrag ${
        d.selected ? "border-cyan-400 ring-2 ring-cyan-500/30" : "border-white/[0.12] hover:border-white/[0.25]"
      }`}
    >
      <button
        type="button"
        onClick={d.onOpen}
        disabled={d.locked}
        className="!pointer-events-auto block w-full text-left cursor-pointer disabled:cursor-default"
      >
        <div className="flex items-center gap-2.5 pr-16">
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${tone}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-os-text-dim">Step {d.index + 1}</p>
            <p className="text-xs font-semibold text-white truncate">{d.actionLabel[d.step.action_type]}</p>
          </div>
        </div>
        {d.summary && <p className="text-[11px] text-os-text-dim truncate mt-2">{d.summary}</p>}
        {conditions.length > 0 && (
          <p className="mt-1.5 inline-flex max-w-full items-center gap-1 px-1.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 text-[10px]">
            <Filter className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">
              Only if {d.fieldLabel[conditions[0].field] ?? conditions[0].field} {d.operatorLabel[conditions[0].operator]} &quot;{String(conditions[0].value)}&quot;
              {conditions.length > 1 && ` +${conditions.length - 1} more`}
            </span>
          </p>
        )}
      </button>
      {!d.locked && (
        <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
          <button type="button" onClick={d.onMoveUp} disabled={!d.canMoveUp} aria-label="Move step earlier" className={iconBtn}>
            <ArrowUp className="w-3 h-3" />
          </button>
          <button type="button" onClick={d.onMoveDown} disabled={!d.canMoveDown} aria-label="Move step later" className={iconBtn}>
            <ArrowDown className="w-3 h-3" />
          </button>
          <button type="button" onClick={d.onRemove} aria-label="Remove step" className={`${iconBtn} hover:!text-red-400 hover:!bg-red-500/10`}>
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
      <Handle type="target" position={Position.Top} style={hidden} />
      <Handle type="source" position={Position.Bottom} style={hidden} />
    </div>
  );
}

// ── End marker ───────────────────────────────────────────────────────────

function EndNode() {
  return (
    <div style={{ width: NODE_W }} className="flex justify-center nodrag">
      <span className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.1] text-[10px] font-semibold uppercase tracking-wider text-os-text-dim">
        End
      </span>
      <Handle type="target" position={Position.Top} style={hidden} />
    </div>
  );
}

// ── The line between cards: wait pill and "+" ────────────────────────────

type LineData = { insertable: boolean; isLast: boolean; waitText: string; onInsert: () => void };

function LineEdge({ id, sourceX, sourceY, targetX, targetY, markerEnd, data }: EdgeProps) {
  const [path, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  const d = data as unknown as LineData | undefined;
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={{ stroke: "rgba(255,255,255,0.18)", strokeWidth: 1.5 }} />
      {d && (d.insertable || d.waitText) && (
        <EdgeLabelRenderer>
          <div
            style={{ position: "absolute", transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: "all" }}
            className="nodrag nopan flex flex-col items-center gap-1.5"
          >
            {d.waitText && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1a1408] border border-amber-500/30 text-amber-300 text-[10px] font-semibold whitespace-nowrap">
                <Clock className="w-2.5 h-2.5" /> {d.waitText}
              </span>
            )}
            {d.insertable && (
              d.isLast ? (
                <button
                  type="button"
                  onClick={d.onInsert}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/40 hover:bg-cyan-500/25 text-cyan-300 text-[11px] font-semibold whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add step
                </button>
              ) : (
                <button
                  type="button"
                  onClick={d.onInsert}
                  title="Insert a step here"
                  aria-label="Insert a step here"
                  className="w-6 h-6 rounded-full bg-[#141414] border border-white/20 hover:border-cyan-400 hover:bg-cyan-500/20 text-os-text-dim hover:text-cyan-300 flex items-center justify-center cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const nodeTypes = { trigger: TriggerNode, step: StepNode, end: EndNode };
const edgeTypes = { line: LineEdge };

// ── Public props ─────────────────────────────────────────────────────────

export type FlowCanvasProps = {
  ruleName: string;
  onRuleNameChange: (name: string) => void;
  trigger: AutomationTrigger;
  channel: AutomationChannel | "";
  showChannel: boolean;
  channelTouched: boolean;
  triggerOptions: TriggerOption[];
  channelOptions: { value: AutomationChannel; label: string }[];
  onTriggerChange: (t: AutomationTrigger) => void;
  onChannelChange: (c: AutomationChannel | "") => void;

  steps: AutomationStepConfig[];
  openIndex: number | null;
  isNewStep: boolean;
  locked: boolean;
  renderStepForm: () => React.ReactNode;
  stepSummary: (step: AutomationStepConfig) => string;
  formatDelay: (seconds: number) => string;
  actionLabel: Record<AutomationAction, string>;
  actionIcon: Record<AutomationAction, LucideIcon>;
  fieldLabel: Record<string, string>;
  operatorLabel: Record<AutomationOperator, string>;

  onOpenStep: (i: number) => void;
  onInsertAt: (at: number) => void;
  onRemoveStep: (i: number) => void;
  onMoveStep: (i: number, dir: -1 | 1) => void;
};

type Item =
  | { id: string; kind: "trigger" }
  | { id: string; kind: "step"; step: AutomationStepConfig; stepIndex: number }
  | { id: string; kind: "new"; atIndex: number }
  | { id: string; kind: "end" };

function CanvasInner(props: FlowCanvasProps & { triggerOpen: boolean; onOpenTrigger: () => void }) {
  const { fitView, setViewport } = useReactFlow();
  const paneW = useStore((st) => st.width);
  const paneH = useStore((st) => st.height);

  const base: Item[] = [
    { id: "trigger", kind: "trigger" },
    ...props.steps.map((step, i) => ({ id: `step-${i}`, kind: "step" as const, step, stepIndex: i })),
    { id: "end", kind: "end" },
  ];
  // Gap g sits between base[g] and base[g+1]; a new step being composed there is drawn right after base[g].
  const items: Item[] = [];
  base.forEach((item, i) => {
    items.push(item);
    if (props.isNewStep && props.openIndex === i) items.push({ id: `new-${i}`, kind: "new", atIndex: i });
  });

  const triggerLabel = props.triggerOptions.find((o) => o.value === props.trigger)?.label ?? props.trigger;

  const nodes: Node[] = items.map((item, idx) => {
    const position = { x: 0, y: idx * SLOT_H };
    if (item.kind === "trigger") {
      const data: TriggerNodeData = {
        ruleName: props.ruleName, label: triggerLabel, needsChannel: props.showChannel && !props.channelTouched,
        selected: props.triggerOpen && props.openIndex === null, locked: props.locked, onOpen: props.onOpenTrigger,
      };
      return { id: item.id, type: "trigger", position, data: data as unknown as Record<string, unknown>, draggable: false };
    }
    if (item.kind === "end") {
      return { id: item.id, type: "end", position, data: {}, draggable: false };
    }
    const isNew = item.kind === "new";
    const index = isNew ? item.atIndex : item.stepIndex;
    const data: StepNodeData = {
      isNew,
      step: isNew ? undefined : item.step,
      index,
      selected: !isNew && props.openIndex === index && !props.isNewStep,
      locked: props.locked,
      actionLabel: props.actionLabel, actionIcon: props.actionIcon,
      fieldLabel: props.fieldLabel, operatorLabel: props.operatorLabel,
      summary: isNew ? "" : props.stepSummary(item.step),
      onOpen: () => !isNew && props.onOpenStep(index),
      onRemove: () => props.onRemoveStep(index),
      onMoveUp: () => props.onMoveStep(index, -1),
      onMoveDown: () => props.onMoveStep(index, 1),
      canMoveUp: index > 0, canMoveDown: index < props.steps.length - 1,
    };
    return { id: item.id, type: "step", position, data: data as unknown as Record<string, unknown>, draggable: false };
  });

  const edges: Edge[] = [];
  for (let i = 0; i < items.length - 1; i++) {
    const a = items[i];
    const b = items[i + 1];
    const gapIndex = base.findIndex((it) => it.id === a.id);
    const delay = b.kind === "step" ? b.step.delay_seconds : null;
    const data: LineData = {
      // "+" only between two real cards, and only while nothing is open (one thing open at a time)
      insertable: !props.locked && a.kind !== "new" && b.kind !== "new",
      isLast: b.kind === "end",
      waitText: delay ? `Wait ${props.formatDelay(delay)}` : "",
      onInsert: () => props.onInsertAt(gapIndex),
    };
    edges.push({
      id: `e-${a.id}-${b.id}`, source: a.id, target: b.id, type: "line",
      markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(255,255,255,0.3)", width: 14, height: 14 },
      data: data as unknown as Record<string, unknown>,
    });
  }

  // The card being edited, so a narrow screen can keep it in view.
  const focusRow = items.findIndex((it) =>
    (it.kind === "new") || (it.kind === "step" && props.openIndex === it.stepIndex && !props.isNewStep));

  useEffect(() => {
    if (!paneW || !paneH) return;
    if (paneW < 640) {
      // Phone: the column fills the width, centred, scrolled to the open card (or the top).
      const zoom = Math.min(1, (paneW - 32) / NODE_W);
      const row = Math.max(0, focusRow);
      void setViewport({ x: (paneW - NODE_W * zoom) / 2, y: 16 - row * SLOT_H * zoom, zoom }, { duration: 200 });
    } else {
      void fitView({ padding: 0.15, duration: 200, maxZoom: 1, minZoom: 0.6 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, paneW, paneH, focusRow]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnScroll
      zoomOnScroll={false}
      proOptions={{ hideAttribution: true }}
      minZoom={0.3}
      maxZoom={1.5}
    >
      <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} color="rgba(255,255,255,0.09)" />
      <Controls showInteractive={false} className="max-sm:!hidden !bg-black/60 !border !border-white/10 [&_button]:!bg-transparent [&_button]:!border-white/10 [&_button]:!text-white/70" />
    </ReactFlow>
  );
}

// ── The side panel: the trigger's settings, or the open step's form ──────

function TriggerPanel(props: FlowCanvasProps & { onClose: () => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[10px] uppercase tracking-wide text-os-text-dim mb-1.5">Rule name</label>
        <input
          type="text"
          value={props.ruleName}
          onChange={(e) => props.onRuleNameChange(e.target.value)}
          placeholder="e.g. Chase overdue fees"
          className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white placeholder:text-os-text-dim/60 focus:border-cyan-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-wide text-os-text-dim mb-1.5">When this happens</label>
        <select
          value={props.trigger}
          onChange={(e) => props.onTriggerChange(e.target.value as AutomationTrigger)}
          className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-cyan-500 focus:outline-none"
        >
          {groupOptions(props.triggerOptions).map(([group, opts]) =>
            group ? (
              <optgroup key={group} label={group}>
                {opts.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </optgroup>
            ) : (
              opts.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)
            ),
          )}
        </select>
      </div>
      {props.showChannel && (
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-os-text-dim mb-1.5">On which channel</label>
          <select
            value={props.channel}
            onChange={(e) => props.onChannelChange(e.target.value as AutomationChannel | "")}
            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-cyan-500 focus:outline-none"
          >
            <option value="">Any channel (fires from all of them)</option>
            {props.channelOptions.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {!props.channelTouched && (
            <p className="mt-1.5 text-[11px] text-amber-300/90 leading-snug">
              This can fire from more than one channel - confirm which one(s) should start this rule before saving.
            </p>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={props.onClose}
        className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold border border-white/[0.1] cursor-pointer"
      >
        Done
      </button>
    </div>
  );
}

export function FlowCanvas(props: FlowCanvasProps) {
  // The trigger's panel starts open on a brand-new rule (nothing to look at yet), closed when editing one.
  const [triggerOpen, setTriggerOpen] = useState(props.steps.length === 0);
  const stepOpen = props.openIndex !== null;
  useEffect(() => {
    if (stepOpen) setTriggerOpen(false);
  }, [stepOpen]);

  const panelOpen = stepOpen || triggerOpen;
  const stepTitle = stepOpen
    ? props.isNewStep ? `New step ${props.openIndex! + 1}` : `Edit step ${props.openIndex! + 1}`
    : "Trigger";

  return (
    <div className="flex flex-col lg:flex-row gap-3">
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="workspace-flow-canvas h-[460px] lg:h-[560px] rounded-xl overflow-hidden border border-white/[0.08] bg-[#0a0a0a]">
          <ReactFlowProvider>
            <CanvasInner {...props} triggerOpen={triggerOpen} onOpenTrigger={() => setTriggerOpen(true)} />
          </ReactFlowProvider>
        </div>
        <p className="text-[11px] text-os-text-dim">Click a card to edit it. Scroll or drag to move around; + adds a step there.</p>
      </div>

      {panelOpen && (
        <aside className="lg:w-[380px] shrink-0 rounded-xl border border-cyan-500/25 bg-[#101010] flex flex-col lg:max-h-[560px]">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2 min-w-0">
              {stepOpen ? <Pencil className="w-3.5 h-3.5 text-cyan-300" /> : <Zap className="w-3.5 h-3.5 text-cyan-300" />}
              <p className="text-xs font-bold text-white truncate">{stepTitle}</p>
            </div>
            {!stepOpen && (
              <button type="button" onClick={() => setTriggerOpen(false)} aria-label="Close" className="p-1 rounded-md text-os-text-dim hover:text-white hover:bg-white/[0.08] cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="p-4 overflow-y-auto overscroll-contain">
            {stepOpen ? props.renderStepForm() : <TriggerPanel {...props} onClose={() => setTriggerOpen(false)} />}
          </div>
        </aside>
      )}
    </div>
  );
}
