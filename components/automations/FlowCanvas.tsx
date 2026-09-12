"use client";

/**
 * The automations builder's actual canvas - trigger and step nodes laid
 * out left-to-right, connected by curved dashed lines with arrowheads, on
 * a pannable/zoomable dotted-grid surface. Built on @xyflow/react (the
 * library n8n itself is built on) rather than CSS, after the previous
 * "vertical list with a line down the side" pass was correctly called out
 * as still just a form, not a canvas - and after checking a real reference
 * (a screenshot of AiSensy's own WhatsApp flow builder) plus how Zapier's
 * own Zap editor, n8n, and Make render this same idea.
 *
 * The engine itself only ever runs a strict linear chain (no branching -
 * see shared/db/models/integrations.py::AutomationStep's own docstring on
 * the backend), so this canvas is intentionally a single left-to-right
 * line of nodes, not a free-form graph - the same honest constraint the
 * previous CSS version had, just rendered with a real canvas engine so it
 * actually behaves like one (pan, zoom, curved connectors) instead of
 * only looking vaguely like one.
 *
 * Node dragging is deliberately off for this pass - positions are purely
 * derived from step order (which is also the real execution order), and
 * free-dragging would need a whole position-persistence layer for a
 * cosmetic effect only. Pan/zoom/fit are real and fully working.
 */

import React, { useEffect, useRef } from "react";
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
  getSmoothStepPath,
  useReactFlow,
  useUpdateNodeInternals,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus, Zap, Filter, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  AutomationAction,
  AutomationChannel,
  AutomationOperator,
  AutomationStepConfig,
  AutomationTrigger,
} from "@/lib/api";

// Wider than the widest node (the open editing form, w-80 = 320px) so an
// open step never visually overlaps the node to its right.
const NODE_SPACING_X = 360;

/**
 * Every node here has genuinely dynamic content - a select changing
 * action type, a checkbox revealing a condition/delay row, a textarea
 * wrapping. React Flow only re-measures a node's own bounding box at
 * mount by default; `useUpdateNodeInternals` plus a ResizeObserver on
 * the node's own root keeps its internal record current on every
 * content-driven resize too, not only at mount - the documented fix for
 * dynamically-sized nodes, and worth keeping even though it turned out
 * not to be this bug's actual cause (see each node's own `!pointer-
 * events-auto` class for that one - found by driving the canvas with
 * Playwright and inspecting computed styles, not guessed: with
 * nodesDraggable/nodesConnectable/elementsSelectable all false on
 * <ReactFlow>, it sets `pointer-events: none` on every node wrapper as
 * its own optimization - "nothing to interact with at the node level,
 * let clicks fall through to the pane" - which silently ate every click
 * on every button/input/select inside every node's own custom content).
 */
function useAutoResize(nodeId: string) {
  const ref = useRef<HTMLDivElement>(null);
  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => updateNodeInternals(nodeId));
    observer.observe(el);
    return () => observer.disconnect();
  }, [nodeId, updateNodeInternals]);
  return ref;
}

// ── Trigger node ─────────────────────────────────────────────────────────

type TriggerNodeData = {
  trigger: AutomationTrigger;
  channel: AutomationChannel | "";
  showChannel: boolean;
  triggerOptions: { value: AutomationTrigger; label: string }[];
  channelOptions: { value: AutomationChannel; label: string }[];
  onTriggerChange: (t: AutomationTrigger) => void;
  onChannelChange: (c: AutomationChannel | "") => void;
};

function TriggerNode({ id, data }: NodeProps) {
  const d = data as unknown as TriggerNodeData;
  const ref = useAutoResize(id);
  return (
    <div ref={ref} className="!pointer-events-auto w-64 p-3 rounded-xl bg-[#0b0f14] border border-cyan-500/30 shadow-lg shadow-black/40 nodrag">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
          <Zap className="w-3 h-3" />
        </div>
        <span className="text-[10px] uppercase tracking-wide text-os-text-dim">Trigger - When</span>
      </div>
      <select
        value={d.trigger}
        onChange={(e) => d.onTriggerChange(e.target.value as AutomationTrigger)}
        className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-[11px] text-white font-mono focus:border-cyan-500 focus:outline-none"
      >
        {d.triggerOptions.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      {d.showChannel && (
        <select
          value={d.channel}
          onChange={(e) => d.onChannelChange(e.target.value as AutomationChannel | "")}
          className="w-full mt-2 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-[11px] text-white font-mono focus:border-cyan-500 focus:outline-none"
        >
          <option value="">Any channel</option>
          {d.channelOptions.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      )}
      <Handle type="source" position={Position.Right} className="!bg-cyan-500 !border-cyan-300" />
    </div>
  );
}

// ── Step node (collapsed card, or the open editing form in its place) ──

type StepNodeData = {
  mode: "collapsed" | "editing";
  step?: AutomationStepConfig;
  index: number;
  total: number;
  locked: boolean;
  actionLabel: Record<AutomationAction, string>;
  actionIcon: Record<AutomationAction, LucideIcon>;
  fieldLabel: Record<string, string>;
  operatorLabel: Record<AutomationOperator, string>;
  summary: string;
  delayText: string;
  onOpen: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  renderForm?: () => React.ReactNode;
  title: string;
};

function StepNode({ id, data }: NodeProps) {
  const d = data as unknown as StepNodeData;
  const ref = useAutoResize(id);

  if (d.mode === "editing") {
    return (
      <div ref={ref} className="!pointer-events-auto w-80 p-3 rounded-xl bg-[#0b0f14] border border-cyan-500/40 shadow-lg shadow-black/40 nodrag nowheel">
        <p className="text-[10px] uppercase tracking-wide text-os-text-dim mb-1.5">{d.title}</p>
        {d.renderForm?.()}
        <Handle type="target" position={Position.Left} className="!bg-cyan-500 !border-cyan-300" />
        <Handle type="source" position={Position.Right} className="!bg-cyan-500 !border-cyan-300" />
      </div>
    );
  }

  const Icon = d.step ? d.actionIcon[d.step.action_type] : Zap;
  return (
    <div ref={ref} className="!pointer-events-auto w-64 p-3 rounded-xl bg-[#0b0f14] border border-white/[0.12] shadow-lg shadow-black/40 nodrag">
      <div className="flex items-start gap-2">
        <div className="w-6 h-6 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-os-text-dim shrink-0">
          <Icon className="w-3 h-3" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-white truncate">
            {d.total > 1 && <span className="text-os-text-dim">Step {d.index + 1}: </span>}
            {d.step ? d.actionLabel[d.step.action_type] : ""}
          </p>
          {d.summary && <p className="text-[11px] text-os-text-dim truncate mt-0.5">{d.summary}</p>}
          {(d.step?.condition || d.step?.delay_seconds) && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {d.step?.condition && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px]">
                  <Filter className="w-2.5 h-2.5" />
                  {d.fieldLabel[d.step.condition.field] ?? d.step.condition.field} {d.operatorLabel[d.step.condition.operator]} &quot;{String(d.step.condition.value)}&quot;
                </span>
              )}
              {d.delayText && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px]">
                  <Clock className="w-2.5 h-2.5" /> {d.delayText}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/[0.06]">
        <button
          type="button" onClick={d.onMoveUp} disabled={d.locked || !d.canMoveUp}
          className="p-1 rounded bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed text-os-text-dim hover:text-white transition-all cursor-pointer"
        >
          ↑
        </button>
        <button
          type="button" onClick={d.onMoveDown} disabled={d.locked || !d.canMoveDown}
          className="p-1 rounded bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed text-os-text-dim hover:text-white transition-all cursor-pointer"
        >
          ↓
        </button>
        <button
          type="button" onClick={d.onOpen} disabled={d.locked}
          className="flex-1 px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed text-os-text-dim hover:text-white text-[11px] font-semibold transition-all cursor-pointer"
        >
          Edit
        </button>
        <button
          type="button" onClick={d.onRemove} disabled={d.locked}
          className="p-1 rounded bg-white/[0.04] hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed text-os-text-dim hover:text-red-400 transition-all cursor-pointer"
        >
          ✕
        </button>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-white/40 !border-white/20" />
      <Handle type="source" position={Position.Right} className="!bg-white/40 !border-white/20" />
    </div>
  );
}

// ── The invisible trailing anchor every "append after last step" edge points to ──

function EndNode() {
  return <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />;
}

// ── The connecting edge - dashed, arrowed, with a "+" at its midpoint ──

type InsertableEdgeData = { insertable: boolean; onInsert: () => void };

function InsertableEdge({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 12,
  });
  const d = data as unknown as InsertableEdgeData | undefined;
  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{ stroke: "rgba(45,212,191,0.4)", strokeWidth: 1.5, strokeDasharray: "5 4" }}
      />
      {d?.insertable && (
        <EdgeLabelRenderer>
          <div
            style={{ position: "absolute", transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: "all" }}
            className="nodrag nopan"
          >
            <button
              type="button"
              onClick={d.onInsert}
              title="Insert a step here"
              className="w-5 h-5 rounded-full bg-black/90 border border-white/20 hover:border-cyan-500 hover:bg-cyan-500/20 text-os-text-dim hover:text-cyan-400 flex items-center justify-center transition-all cursor-pointer"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const nodeTypes = { trigger: TriggerNode, step: StepNode, end: EndNode };
const edgeTypes = { insertable: InsertableEdge };

// ── Public props ─────────────────────────────────────────────────────────

export type FlowCanvasProps = {
  trigger: AutomationTrigger;
  channel: AutomationChannel | "";
  showChannel: boolean;
  triggerOptions: { value: AutomationTrigger; label: string }[];
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

function CanvasInner(props: FlowCanvasProps) {
  const { fitView } = useReactFlow();

  type BaseItem =
    | { id: string; kind: "trigger" }
    | { id: string; kind: "step"; step: AutomationStepConfig; stepIndex: number }
    | { id: string; kind: "end" };

  const baseItems: BaseItem[] = [
    { id: "trigger", kind: "trigger" },
    ...props.steps.map((step, i) => ({ id: `step-${i}`, kind: "step" as const, step, stepIndex: i })),
    { id: "end", kind: "end" },
  ];

  // Gap g sits between baseItems[g] and baseItems[g+1] - so the "new"
  // pseudo-item is pushed AFTER baseItems[g], not before it.
  const items: Array<BaseItem | { id: string; kind: "new"; atIndex: number }> = [];
  baseItems.forEach((item, i) => {
    items.push(item);
    if (props.isNewStep && props.openIndex === i) items.push({ id: `new-${i}`, kind: "new", atIndex: i });
  });

  const nodes: Node[] = items.map((item, idx) => {
    const position = { x: idx * NODE_SPACING_X, y: 0 };
    if (item.kind === "trigger") {
      const data: TriggerNodeData = {
        trigger: props.trigger, channel: props.channel, showChannel: props.showChannel,
        triggerOptions: props.triggerOptions, channelOptions: props.channelOptions,
        onTriggerChange: props.onTriggerChange, onChannelChange: props.onChannelChange,
      };
      return { id: item.id, type: "trigger", position, data: data as unknown as Record<string, unknown>, draggable: false };
    }
    if (item.kind === "end") {
      return { id: item.id, type: "end", position, data: {}, draggable: false, style: { width: 1, height: 1 } };
    }
    if (item.kind === "new") {
      const data: StepNodeData = {
        mode: "editing", index: item.atIndex, total: props.steps.length, locked: false,
        actionLabel: props.actionLabel, actionIcon: props.actionIcon,
        fieldLabel: props.fieldLabel, operatorLabel: props.operatorLabel,
        summary: "", delayText: "",
        onOpen: () => {}, onRemove: () => {}, onMoveUp: () => {}, onMoveDown: () => {},
        canMoveUp: false, canMoveDown: false,
        renderForm: props.renderStepForm, title: "New step",
      };
      return { id: item.id, type: "step", position, data: data as unknown as Record<string, unknown>, draggable: false };
    }
    // step
    const isOpenHere = props.openIndex === item.stepIndex && !props.isNewStep;
    const data: StepNodeData = {
      mode: isOpenHere ? "editing" : "collapsed",
      step: item.step, index: item.stepIndex, total: props.steps.length, locked: props.locked,
      actionLabel: props.actionLabel, actionIcon: props.actionIcon,
      fieldLabel: props.fieldLabel, operatorLabel: props.operatorLabel,
      summary: props.stepSummary(item.step),
      delayText: item.step.delay_seconds ? `waits ${props.formatDelay(item.step.delay_seconds)}` : "",
      onOpen: () => props.onOpenStep(item.stepIndex),
      onRemove: () => props.onRemoveStep(item.stepIndex),
      onMoveUp: () => props.onMoveStep(item.stepIndex, -1),
      onMoveDown: () => props.onMoveStep(item.stepIndex, 1),
      canMoveUp: item.stepIndex > 0, canMoveDown: item.stepIndex < props.steps.length - 1,
      renderForm: isOpenHere ? props.renderStepForm : undefined,
      title: `Step ${item.stepIndex + 1}`,
    };
    return { id: item.id, type: "step", position, data: data as unknown as Record<string, unknown>, draggable: false };
  });

  // "+" only makes sense between two REAL (non-"new") adjacent items, and
  // only when nothing anywhere is already open - matches the builder's
  // own "one thing open at a time" rule.
  const edges: Edge[] = [];
  for (let i = 0; i < items.length - 1; i++) {
    const a = items[i];
    const b = items[i + 1];
    const insertable = !props.locked && a.kind !== "new" && b.kind !== "new";
    // Gap index = position among the ORIGINAL trigger+steps+end sequence,
    // which only lines up with `i` when no "new" item is present (see
    // FlowCanvas's own module docstring on why that's the only time a
    // gap's "+" is ever shown).
    const gapIndex = baseItems.findIndex((it) => it.id === a.id);
    edges.push({
      id: `e-${a.id}-${b.id}`,
      source: a.id,
      target: b.id,
      type: "insertable",
      markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(45,212,191,0.5)", width: 16, height: 16 },
      data: { insertable, onInsert: () => props.onInsertAt(gapIndex) } as unknown as Record<string, unknown>,
    });
  }

  useEffect(() => {
    fitView({ padding: 0.35, duration: 200, maxZoom: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      proOptions={{ hideAttribution: true }}
      minZoom={0.4}
      maxZoom={1.5}
    >
      <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="rgba(255,255,255,0.08)" />
      <Controls showInteractive={false} className="!bg-black/60 !border !border-white/10 [&_button]:!bg-transparent [&_button]:!border-white/10 [&_button]:!text-white/70" />
    </ReactFlow>
  );
}

export function FlowCanvas(props: FlowCanvasProps) {
  return (
    <div className="h-[420px] rounded-xl overflow-hidden border border-white/[0.08] bg-[#05070a]">
      <ReactFlowProvider>
        <CanvasInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}
