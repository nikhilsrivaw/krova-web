"use client";

import React, { useEffect, useId, useRef } from "react";

/** Adds responsive table labels and form associations without changing handlers. */
export function WorkspaceContent({ children, route }: { children: React.ReactNode; route: string }) {
  const root = useRef<HTMLDivElement>(null);
  const id = useId().replace(/:/g, "");

  useEffect(() => {
    const container = root.current;
    if (!container) return;
    let nextControlId = 0;
    const prepareTables = () => {
      container.querySelectorAll<HTMLLabelElement>("label").forEach((label) => {
        if (label.htmlFor || label.querySelector("input, select, textarea")) return;
        const parent = label.parentElement;
        if (!parent || parent.querySelectorAll("label").length !== 1) return;
        const controls = parent.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea");
        if (controls.length !== 1) return;
        const control = controls[0];
        if (!control.id) control.id = `${id}-field-${nextControlId++}`;
        label.htmlFor = control.id;
      });
      container.querySelectorAll<HTMLTableElement>("table").forEach((table, tableIndex) => {
        const headings = Array.from(table.querySelectorAll<HTMLTableCellElement>("thead tr:last-child th"));
        if (!headings.length) return;
        table.classList.add("workspace-table");
        if (table.tHead?.querySelector('input[type="checkbox"]')) table.dataset.mobileHeader = "controls";
        headings.forEach((heading, index) => {
          if (!heading.id) heading.id = `${id}-table-${tableIndex}-column-${index}`;
        });
        Array.from(table.tBodies).forEach((body) => Array.from(body.rows).forEach((row) => {
          Array.from(row.cells).forEach((cell, index) => {
            if (cell.colSpan > 1) { cell.dataset.cellSpan = "full"; return; }
            const heading = headings[index];
            if (!heading) return;
            const label = heading.textContent?.trim() || (heading.querySelector('input[type="checkbox"]') ? "Select" : "Actions");
            cell.dataset.cellLabel = label;
            if (!cell.headers) cell.headers = heading.id;
          });
        }));
      });
    };
    prepareTables();
    const observer = new MutationObserver(prepareTables);
    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [id]);

  return <div ref={root} data-workspace-route={route} className="workspace-content min-w-0">{children}</div>;
}
