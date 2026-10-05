"use client";

import { useEffect, useRef } from "react";
import { useReactFlow, useStore } from "@xyflow/react";

/** Keeps the current step readable when the canvas changes size. */
export function ResponsiveFlowViewport() {
  const root = useStore((state) => state.domNode);
  const editing = useStore((state) => {
    const node = Array.from(state.nodeLookup.values()).find((item) => item.data.mode === "editing");
    return node ? `${node.id}:${node.measured.width}:${node.measured.height}` : "";
  });
  const { fitView, getInternalNode, getNode, getNodes, setCenter } = useReactFlow();
  const focusedId = useRef<string | null>(null);

  useEffect(() => {
    if (!root) return;
    let timer: ReturnType<typeof setTimeout>;
    const reframe = () => {
      root.style.setProperty("--workspace-flow-node-width", `${Math.max(160, root.clientWidth - 24)}px`);
      root.style.setProperty("--workspace-flow-editor-height", `${Math.max(240, root.clientHeight - 128)}px`);
      clearTimeout(timer);
      timer = setTimeout(() => {
        const nodes = getNodes();
        const current = nodes.find((node) => node.data.mode === "editing");
        if (root.clientWidth < 480 || current) {
          const node = current
            || (focusedId.current ? getNode(focusedId.current) : undefined)
            || nodes.find((item) => item.type === "step")
            || nodes.find((item) => item.type === "trigger");
          if (!node) return;
          focusedId.current = node.id;
          const internal = getInternalNode(node.id);
          const width = internal?.measured.width ?? 256;
          const height = internal?.measured.height ?? 200;
          const position = internal?.internals.positionAbsolute ?? node.position;
          void setCenter(position.x + width / 2, position.y + height / 2, {
            zoom: Math.min(1, (root.clientWidth - 16) / width, (root.clientHeight - 32) / height),
            duration: 180,
          });
        } else {
          void fitView({ padding: 0.2, maxZoom: 1, duration: 180 });
        }
      }, 240);
    };
    reframe();
    const observer = new ResizeObserver(reframe);
    observer.observe(root);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [root, editing, fitView, getInternalNode, getNode, getNodes, setCenter]);

  return null;
}
