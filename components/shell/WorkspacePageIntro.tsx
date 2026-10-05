import React from "react";

export function WorkspacePageIntro({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="workspace-page-intro mb-7 flex flex-wrap items-end justify-between gap-5 sm:mb-8">
      <div className="min-w-0 flex-1 basis-[320px]">
        <p className="workspace-eyebrow mb-2 flex items-center gap-2 text-teal-bright"><span className="h-1.5 w-1.5 rounded-full bg-teal-bright" aria-hidden="true" /> Your workspace</p>
        <h2 className="font-serif text-[28px] font-medium leading-tight tracking-tight text-white sm:text-[34px]">{title}</h2>
        {subtitle && <p className="mt-2 max-w-2xl text-sm leading-6 text-os-text-dim">{subtitle}</p>}
      </div>
      {actions && <div className="workspace-page-actions flex max-w-full flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
