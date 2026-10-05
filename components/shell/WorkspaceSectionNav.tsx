"use client";

import { useEffect, useRef, useState } from "react";

/** Section shortcuts for long settings forms. Every original section stays visible. */
export function WorkspaceSectionNav() {
  const ref = useRef<HTMLElement>(null);
  const [sections, setSections] = useState<{ id: string; title: string }[]>([]);
  useEffect(() => {
    const root = ref.current?.closest(".workspace-content");
    if (!root) return;
    const update = () => {
      const next = Array.from(root.querySelectorAll<HTMLHeadingElement>("h3")).map((heading, index) => {
        const title = heading.textContent?.trim() || `Section ${index + 1}`;
        if (!heading.id) heading.id = `workspace-settings-${index}`;
        heading.style.scrollMarginTop = "180px";
        return { id: heading.id, title };
      });
      setSections((previous) => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return (
    <nav ref={ref} aria-label="Settings sections" className="workspace-section-nav sticky top-[84px] z-20 flex gap-2 overflow-x-auto rounded-xl border border-white/[0.08] bg-[#101010] p-2">
      {sections.map((section) => <a key={section.id} href={`#${section.id}`} className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-xs text-os-text-dim transition-colors hover:bg-white/5 hover:text-teal-bright">{section.title}</a>)}
    </nav>
  );
}
