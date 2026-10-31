"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Check, Copy, Globe, MessageCircle, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { OwnerAdminOnly } from "@/components/shell/OwnerAdminOnly";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { API_BASE } from "@/lib/auth";
import { webChat, type WebChatSite, type WebChatSiteInput } from "@/lib/api";

const input = "w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-teal focus:outline-none";
const label = "block text-[11px] font-semibold text-os-text-dim mb-1";
const COLOURS = ["#d4a24c", "#14b8a6", "#2563eb", "#7c3aed", "#e11d48", "#16a34a", "#f97316", "#111827"];
const DEFAULT_TITLE = "Chat with us";
const DEFAULT_GREETING = "Hi! How can I help you today?";

const snippetFor = (site: WebChatSite) =>
  `<script src="${API_BASE}/widget.js" data-site-key="${site.site_key}" data-api-base="${API_BASE}" async></script>`;

/**
 * Website chat: KROVA's AI on the business's own website. Add the site, paste one line before </body>, and the AI
 * answers visitors from Knowledge. A visitor who leaves a number shows up in the Inbox, and the team can reply
 * from there - the reply appears in the visitor's chat window. Backend: services/api/routers/web_chat.py, widget.py.
 */
function WebsiteChat() {
  const [sites, setSites] = useState<WebChatSite[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<WebChatSite | "new" | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [trying, setTrying] = useState<string | null>(null);

  const load = useCallback(() => {
    webChat.sites().then(setSites).catch((e) => setError(e instanceof Error ? e.message : "Could not load your websites."));
  }, []);
  useEffect(load, [load]);

  const copy = async (site: WebChatSite) => {
    try {
      await navigator.clipboard.writeText(snippetFor(site));
      setCopied(site.id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Could not copy - select the code and copy it by hand.");
    }
  };

  // The real widget, on this page - KROVA's own address is allowed for every site key, so it can be tried here.
  const tryHere = (site: WebChatSite) => {
    if (document.getElementById("krova-widget-host")) {
      setError("The chat is already open on this page (bottom right). Reload the page to try another website or new settings.");
      return;
    }
    const script = document.createElement("script");
    script.src = `${API_BASE}/widget.js`;
    script.async = true;
    script.dataset.siteKey = site.site_key;
    script.dataset.apiBase = API_BASE;
    document.body.appendChild(script);
    setTrying(site.id);
  };

  return (
    <AppLayout
      title="Website chat"
      subtitle="KROVA's AI on your own website"
      actions={
        <button type="button" onClick={() => setEdit("new")} className="px-3 py-2 rounded-lg bg-teal text-[#14151F] text-xs font-bold flex items-center gap-1.5 cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Add website
        </button>
      }
    >
      <div className="space-y-5">
        <GlassCard className="p-5">
          <div className="flex items-start gap-3">
            <MessageCircle className="w-5 h-5 text-teal mt-0.5 shrink-0" />
            <div className="space-y-2 text-[12px] text-os-text-dim leading-relaxed">
              <p className="text-sm font-bold text-white">How it works</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Add your website and copy its code.</li>
                <li>Paste the code just before <code className="text-white">&lt;/body&gt;</code> on your site. WordPress, Wix, Shopify and most website builders have a &quot;custom code&quot; or &quot;footer scripts&quot; box for this.</li>
                <li>A chat button appears at the bottom right. The AI answers visitors from your Knowledge and can book appointments.</li>
              </ol>
              <p>
                Visitors first see a short notice and press Start Chat. When the AI cannot help, or a visitor asks for a person, it asks for
                their name and phone number. The chat then shows in your Inbox, goes to your team (Team page rules), and your reply
                appears in the visitor&apos;s chat window. While a person is replying, the AI stays quiet.
              </p>
            </div>
          </div>
        </GlassCard>

        {error && <p className="text-xs text-red-400">{error}</p>}

        {!sites ? (
          <Skeleton className="h-32 w-full" />
        ) : sites.length === 0 ? (
          <GlassCard className="p-5">
            <EmptyState icon={Globe} title="No website yet" description="Add your website to get the code for the chat button." />
          </GlassCard>
        ) : (
          sites.map((site) => (
            <GlassCard key={site.id} className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: site.accent ?? COLOURS[0] }} />
                    {site.domain}
                    {site.active ? <Badge variant="emerald" size="sm">On</Badge> : <Badge variant="outline" size="sm">Off</Badge>}
                  </p>
                  <p className="text-[11px] text-os-text-dim mt-0.5">
                    Also works on www.{site.domain} · &quot;{site.title || DEFAULT_TITLE}&quot;
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => tryHere(site)} disabled={!site.active} className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs text-white flex items-center gap-1 cursor-pointer disabled:opacity-40">
                    <Play className="w-3.5 h-3.5" /> {trying === site.id ? "Open bottom right" : "Try it here"}
                  </button>
                  <button type="button" onClick={() => setEdit(site)} aria-label="Edit website" className="p-1.5 text-os-text-dim hover:text-white cursor-pointer">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="rounded-lg bg-black/40 border border-white/[0.08] p-3 flex items-start gap-2">
                <code className="flex-1 min-w-0 text-[11px] text-white break-all font-mono">{snippetFor(site)}</code>
                <button type="button" onClick={() => copy(site)} className="px-2.5 py-1.5 rounded-md bg-white/[0.08] hover:bg-white/[0.14] text-[11px] text-white flex items-center gap-1 shrink-0 cursor-pointer">
                  {copied === site.id ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                </button>
              </div>
            </GlassCard>
          ))
        )}
      </div>

      {edit && (
        <SiteModal site={edit === "new" ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />
      )}
    </AppLayout>
  );
}

function SiteModal({ site, onClose, onSaved }: { site: WebChatSite | null; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<WebChatSiteInput>(site
    ? { domain: site.domain, title: site.title, greeting: site.greeting, accent: site.accent, active: site.active }
    : { domain: "", title: null, greeting: null, accent: COLOURS[0], active: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true); setError(null);
    try {
      if (site) await webChat.updateSite(site.id, draft); else await webChat.addSite(draft);
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save."); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!site) return;
    setBusy(true);
    try { await webChat.removeSite(site.id); onSaved(); } catch (e) { setError(e instanceof Error ? e.message : "Could not remove."); setBusy(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={site ? "Edit website" : "Add website"} subtitle="The chat button only works on this website." maxWidth="md">
      <div className="space-y-4">
        <label className="block">
          <span className={label}>Website address</span>
          <input value={draft.domain} onChange={(e) => setDraft({ ...draft, domain: e.target.value })} placeholder="e.g. myshop.in" className={input} />
        </label>
        <label className="block">
          <span className={label}>Chat title</span>
          <input value={draft.title ?? ""} maxLength={60} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={DEFAULT_TITLE} className={input} />
        </label>
        <label className="block">
          <span className={label}>First message</span>
          <textarea value={draft.greeting ?? ""} maxLength={300} rows={2} onChange={(e) => setDraft({ ...draft, greeting: e.target.value })} placeholder={DEFAULT_GREETING} className={input} />
        </label>
        <div>
          <span className={label}>Colour</span>
          <div className="flex items-center gap-2 flex-wrap">
            {COLOURS.map((c) => (
              <button key={c} type="button" onClick={() => setDraft({ ...draft, accent: c })} aria-label={`Colour ${c}`}
                className={`w-11 h-11 shrink-0 rounded-full border-2 cursor-pointer ${draft.accent === c ? "border-white" : "border-transparent"}`} style={{ background: c }} />
            ))}
            <input type="color" value={draft.accent ?? COLOURS[0]} onChange={(e) => setDraft({ ...draft, accent: e.target.value })} aria-label="Pick any colour" className="w-11 h-11 rounded bg-transparent cursor-pointer" />
          </div>
        </div>
        <label className="flex items-start gap-2 text-xs text-white cursor-pointer">
          <input type="checkbox" className="mt-0.5 accent-teal" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
          <span>
            Chat is on
            <span className="block text-[11px] text-os-text-dim">Turn off to hide the chat button on your website without removing the code.</span>
          </span>
        </label>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex items-center justify-between gap-3">
          {site ? (
            <button type="button" disabled={busy} onClick={remove} className="text-xs text-red-300 hover:text-red-200 flex items-center gap-1 cursor-pointer">
              <Trash2 className="w-3.5 h-3.5" /> Remove website
            </button>
          ) : <span />}
          <button type="button" disabled={busy || !draft.domain.trim()} onClick={save} className="px-4 py-2 rounded-lg bg-teal text-[#14151F] text-xs font-bold disabled:opacity-50 cursor-pointer">
            {busy ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function WebsiteChatPage() {
  return (
    <OwnerAdminOnly title="Website chat" unlock="website-chat">
      <WebsiteChat />
    </OwnerAdminOnly>
  );
}
