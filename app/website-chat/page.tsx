"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Check, CheckCircle2, Copy, Globe, MessageCircle, Pencil, Phone, Play, Plus, Trash2, TriangleAlert, UserRound, X,
} from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { OwnerAdminOnly } from "@/components/shell/OwnerAdminOnly";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { API_BASE } from "@/lib/auth";
import {
  webChat, type WebChatDetail, type WebChatRow, type WebChatSite, type WebChatSiteInput, type WebChatStats,
} from "@/lib/api";

const input = "w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-teal focus:outline-none";
const label = "block text-[11px] font-semibold text-os-text-dim mb-1";
const COLOURS = ["#d4a24c", "#14b8a6", "#2563eb", "#7c3aed", "#e11d48", "#16a34a", "#f97316", "#111827"];
const DEFAULT_TITLE = "Chat with us";
const DEFAULT_GREETING = { en: "Hi! How can I help you today?", hi: "नमस्ते! बताइए, मैं आपकी क्या मदद कर सकता हूँ?" };

const snippetFor = (site: WebChatSite) =>
  `<script src="${API_BASE}/widget.js" data-site-key="${site.site_key}" data-api-base="${API_BASE}" async></script>`;

function ago(iso: string | null): string {
  if (!iso) return "";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h ago`;
  return `${Math.round(minutes / (60 * 24))} d ago`;
}

const pathOf = (url: string | null) => {
  if (!url) return null;
  try { return new URL(url).pathname || "/"; } catch { return url; }
};

// Where to paste the code on the builders most small businesses use. Menu names change now and then; the idea -
// "custom code before </body> on every page" - does not.
const INSTALL: { key: string; label: string; steps: string[] }[] = [
  { key: "any", label: "Any website", steps: [
    "Open your website's code or your site builder's settings.",
    "Paste the code just before </body>, on every page (most builders have a \"footer code\" or \"custom code\" box that does this for all pages).",
    "Save and publish, then open your website - the chat button shows at the bottom.",
  ] },
  { key: "wordpress", label: "WordPress", steps: [
    "Plugins → Add New → install \"WPCode\" (Insert Headers and Footers) and activate it.",
    "Code Snippets → Header & Footer → paste the code in the Footer box → Save.",
    "Without a plugin: Appearance → Theme File Editor → footer.php → paste just above </body>.",
  ] },
  { key: "wix", label: "Wix", steps: [
    "Site dashboard → Settings → Custom code (needs a premium plan and your own domain).",
    "+ Add custom code → paste the code → choose All pages → Place code in: Body - end → Apply.",
  ] },
  { key: "shopify", label: "Shopify", steps: [
    "Online Store → Themes → … next to your theme → Edit code.",
    "Open layout/theme.liquid → paste the code just above </body> → Save.",
  ] },
];

/**
 * Website chat: KROVA's AI on the business's own website. Add the site, paste one line, and the AI answers visitors
 * from Knowledge. A visitor who leaves a number shows up in the Inbox, and the team's reply appears in their chat
 * window. Backend: services/api/routers/web_chat.py (this page) and widget.py (the visitor side).
 */
function WebsiteChat() {
  const [sites, setSites] = useState<WebChatSite[] | null>(null);
  const [stats, setStats] = useState<WebChatStats | null>(null);
  const [chats, setChats] = useState<WebChatRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<WebChatSite | "new" | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [trying, setTrying] = useState<string | null>(null);
  const [install, setInstall] = useState<Record<string, string>>({});
  const [openChat, setOpenChat] = useState<string | null>(null);

  const load = useCallback(() => {
    webChat.sites().then(setSites).catch((e) => setError(e instanceof Error ? e.message : "Could not load your websites."));
    webChat.stats().then(setStats).catch(() => setStats(null));
    webChat.chats().then(setChats).catch(() => setChats([]));
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
      setError("The chat is already open on this page. Reload the page to try another website or new settings.");
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
        {stats && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Chats", value: stats.chats, hint: `last ${stats.days} days` },
              { label: "Left a number", value: stats.with_number, hint: "now in your Inbox" },
              { label: "Needed a person", value: stats.needed_person, hint: "the AI asked for help" },
            ].map((s) => (
              <GlassCard key={s.label} className="p-4">
                <p className="text-[11px] text-os-text-dim">{s.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{s.value}</p>
                <p className="text-[10px] text-os-text-dim mt-0.5">{s.hint}</p>
              </GlassCard>
            ))}
          </div>
        )}

        <GlassCard className="p-5">
          <div className="flex items-start gap-3">
            <MessageCircle className="w-5 h-5 text-teal mt-0.5 shrink-0" />
            <div className="space-y-2 text-[12px] text-os-text-dim leading-relaxed">
              <p className="text-sm font-bold text-white">How it works</p>
              <p>
                Add your website, paste its code once, and a chat button appears on every page. The AI answers visitors from your
                Knowledge, can book appointments, and the chat carries on as they move between pages. When the AI cannot help or a
                visitor asks for a person, it asks for their name and number - the chat then shows in your Inbox, goes to your team
                (Team page rules), and your reply appears in the visitor&apos;s chat window. While a person is replying, the AI stays quiet.
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
          sites.map((site) => {
            const tab = install[site.id] ?? "any";
            const steps = INSTALL.find((i) => i.key === tab) ?? INSTALL[0];
            return (
              <GlassCard key={site.id} className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: site.accent ?? COLOURS[0] }} />
                      {site.domain}
                      {site.active ? <Badge variant="emerald" size="sm">On</Badge> : <Badge variant="outline" size="sm">Off</Badge>}
                    </p>
                    <p className={`text-[11px] mt-1 flex items-center gap-1 ${site.working ? "text-emerald-400" : "text-amber-300"}`}>
                      {site.working
                        ? <><CheckCircle2 className="w-3.5 h-3.5" /> Working on your website · last seen {ago(site.last_loaded_at)}</>
                        : <><TriangleAlert className="w-3.5 h-3.5" /> {site.last_loaded_at ? `Not seen on your website since ${ago(site.last_loaded_at)}` : "Not seen on your website yet - paste the code below"}</>}
                    </p>
                    <p className="text-[11px] text-os-text-dim mt-0.5">
                      Also works on www.{site.domain} · &quot;{site.title || DEFAULT_TITLE}&quot;
                      {site.ask_contact === "before_chat" ? " · asks name and number first" : ""}
                      {site.language === "hi" ? " · Hindi" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => tryHere(site)} disabled={!site.active} className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs text-white flex items-center gap-1 cursor-pointer disabled:opacity-40">
                      <Play className="w-3.5 h-3.5" /> {trying === site.id ? "Open on this page" : "Try it here"}
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
                <div>
                  <div className="flex gap-1.5 flex-wrap">
                    {INSTALL.map((i) => (
                      <button key={i.key} type="button" onClick={() => setInstall({ ...install, [site.id]: i.key })}
                        className={`px-2.5 py-1 rounded-md text-[11px] cursor-pointer ${tab === i.key ? "bg-teal/20 text-teal" : "bg-white/[0.04] text-os-text-dim hover:text-white"}`}>
                        {i.label}
                      </button>
                    ))}
                  </div>
                  <ol className="list-decimal pl-4 mt-2 space-y-1 text-[11px] text-os-text-dim">
                    {steps.steps.map((s) => <li key={s}>{s}</li>)}
                  </ol>
                </div>
              </GlassCard>
            );
          })
        )}

        <GlassCard className="p-5 space-y-3">
          <div>
            <p className="text-sm font-bold text-white">Recent website chats</p>
            <p className="text-[11px] text-os-text-dim">Every chat, including visitors who never left a number (those do not reach the Inbox).</p>
          </div>
          {!chats ? <Skeleton className="h-20 w-full" /> : chats.length === 0 ? (
            <p className="text-[11px] text-os-text-dim">No chats yet.</p>
          ) : (
            <div className="rounded-xl border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
              {chats.map((c) => (
                <button key={c.id} type="button" onClick={() => setOpenChat(c.id)} className="w-full text-left px-3 py-2.5 hover:bg-white/[0.03] cursor-pointer flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 text-os-text-dim">{c.customer_id ? <Phone className="w-3.5 h-3.5 text-teal" /> : <UserRound className="w-3.5 h-3.5" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-white truncate">{c.first_message || "(no message)"}</span>
                    <span className="block text-[10px] text-os-text-dim truncate">
                      {c.customer_name || (c.customer_id ? "Left a number" : "Anonymous visitor")}
                      {c.site ? ` · ${c.site}` : ""}{pathOf(c.page_url) ? `${pathOf(c.page_url)}` : ""} · {c.turns} message{c.turns === 1 ? "" : "s"} · {ago(c.last_seen_at)}
                    </span>
                  </span>
                  {c.needed_person && <Badge variant="amber" size="sm">Needed a person</Badge>}
                </button>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {edit && (
        <SiteModal site={edit === "new" ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />
      )}
      {openChat && <ChatModal id={openChat} onClose={() => setOpenChat(null)} />}
    </AppLayout>
  );
}

function ChatModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [chat, setChat] = useState<WebChatDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    webChat.chat(id).then(setChat).catch((e) => setError(e instanceof Error ? e.message : "Could not load this chat."));
  }, [id]);
  return (
    <Modal isOpen onClose={onClose} title="Website chat" subtitle={chat?.page_url ?? undefined} maxWidth="md">
      <div className="space-y-3">
        {error && <p className="text-xs text-red-400">{error}</p>}
        {!chat && !error && <Skeleton className="h-40 w-full" />}
        {chat && (
          <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
            {chat.messages.map((m, i) => (
              <div key={i} className={`max-w-[85%] px-3 py-2 rounded-xl text-xs whitespace-pre-wrap ${m.role === "user" ? "ml-auto bg-teal/20 text-white" : "bg-white/[0.06] text-white"}`}>
                {m.role === "team" && <span className="block text-[10px] text-teal mb-0.5">Team</span>}
                {m.text}
              </div>
            ))}
          </div>
        )}
        {chat?.customer_id && (
          <Link href={`/app/inbox/${chat.customer_id}`} className="inline-flex px-3 py-2 rounded-lg bg-teal text-[#14151F] text-xs font-bold">
            Open in Inbox to reply
          </Link>
        )}
        {chat && !chat.customer_id && (
          <p className="text-[11px] text-os-text-dim">This visitor did not leave a number, so nobody can reply. Questions the AI could not answer also show under Knowledge → gaps.</p>
        )}
      </div>
    </Modal>
  );
}

function Preview({ draft }: { draft: WebChatSiteInput }) {
  const accent = draft.accent ?? COLOURS[0];
  const light = draft.theme === "light";
  const bg = light ? "#ffffff" : "#0f1117";
  const fg = light ? "#14151f" : "#f4f4f5";
  const soft = light ? "rgba(0,0,0,.06)" : "rgba(255,255,255,.08)";
  const greeting = draft.greeting || DEFAULT_GREETING[draft.language];
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
      <p className={label}>Preview</p>
      <div className={`flex flex-col gap-2 ${draft.position === "left" ? "items-start" : "items-end"}`}>
        <div className="w-full max-w-[260px] rounded-xl overflow-hidden border border-white/[0.1]" style={{ background: bg, color: fg }}>
          <div className="px-3 py-2 text-xs font-bold flex items-center justify-between" style={{ background: accent, color: "#14151F" }}>
            <span className="truncate">{draft.title || DEFAULT_TITLE}</span>
            {draft.whatsapp_button && <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/15">WhatsApp</span>}
          </div>
          <div className="p-2.5 space-y-2">
            <div className="text-[11px] px-2.5 py-1.5 rounded-lg w-fit max-w-[90%]" style={{ background: soft }}>{greeting}</div>
            {draft.starters.filter(Boolean).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {draft.starters.filter(Boolean).map((q) => (
                  <span key={q} className="text-[10px] px-2 py-1 rounded-full border" style={{ borderColor: accent }}>{q}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className={`flex items-center gap-2 ${draft.position === "left" ? "flex-row-reverse" : ""}`}>
          {draft.launcher_text && <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold" style={{ background: bg, color: fg }}>{draft.launcher_text}</span>}
          <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: accent }}>
            <MessageCircle className="w-4 h-4 text-[#14151F]" />
          </span>
        </div>
      </div>
    </div>
  );
}

function Choice<T extends string>({ value, options, onChange }: { value: T; options: { key: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map((o) => (
        <button key={o.key} type="button" onClick={() => onChange(o.key)}
          className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer border ${value === o.key ? "border-teal bg-teal/15 text-white" : "border-white/[0.1] text-os-text-dim hover:text-white"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SiteModal({ site, onClose, onSaved }: { site: WebChatSite | null; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<WebChatSiteInput>(site
    ? {
      domain: site.domain, title: site.title, greeting: site.greeting, accent: site.accent, active: site.active,
      position: site.position, launcher_text: site.launcher_text, teaser: site.teaser, starters: site.starters,
      ask_contact: site.ask_contact, language: site.language, theme: site.theme, whatsapp_button: site.whatsapp_button,
    }
    : {
      domain: "", title: null, greeting: null, accent: COLOURS[0], active: true, position: "right", launcher_text: null,
      teaser: null, starters: [], ask_contact: "when_needed", language: "en", theme: "dark", whatsapp_button: false,
    });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<WebChatSiteInput>) => setDraft({ ...draft, ...patch });
  const starters = [...draft.starters, "", "", "", ""].slice(0, 4);

  const save = async () => {
    setBusy(true); setError(null);
    const body = { ...draft, starters: draft.starters.map((s) => s.trim()).filter(Boolean) };
    try {
      if (site) await webChat.updateSite(site.id, body); else await webChat.addSite(body);
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save."); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!site) return;
    setBusy(true);
    try { await webChat.removeSite(site.id); onSaved(); } catch (e) { setError(e instanceof Error ? e.message : "Could not remove."); setBusy(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={site ? "Edit website" : "Add website"} subtitle="The chat button only works on this website." maxWidth="lg">
      <div className="space-y-4">
        <label className="block">
          <span className={label}>Website address</span>
          <input value={draft.domain} onChange={(e) => set({ domain: e.target.value })} placeholder="e.g. myshop.in" className={input} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <label className="block">
              <span className={label}>Chat title</span>
              <input value={draft.title ?? ""} maxLength={60} onChange={(e) => set({ title: e.target.value })} placeholder={DEFAULT_TITLE} className={input} />
            </label>
            <label className="block">
              <span className={label}>First message</span>
              <textarea value={draft.greeting ?? ""} maxLength={300} rows={2} onChange={(e) => set({ greeting: e.target.value })} placeholder={DEFAULT_GREETING[draft.language]} className={input} />
            </label>
            <div>
              <span className={label}>Colour</span>
              <div className="flex items-center gap-2 flex-wrap">
                {COLOURS.map((c) => (
                  <button key={c} type="button" onClick={() => set({ accent: c })} aria-label={`Colour ${c}`}
                    className={`w-11 h-11 shrink-0 rounded-full border-2 cursor-pointer ${draft.accent === c ? "border-white" : "border-transparent"}`} style={{ background: c }} />
                ))}
                <input type="color" value={draft.accent ?? COLOURS[0]} onChange={(e) => set({ accent: e.target.value })} aria-label="Pick any colour" className="w-11 h-11 rounded bg-transparent cursor-pointer" />
              </div>
            </div>
          </div>
          <Preview draft={draft} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className={label}>Button side</span>
            <Choice value={draft.position} onChange={(v) => set({ position: v })} options={[{ key: "right", label: "Right" }, { key: "left", label: "Left" }]} />
          </div>
          <div>
            <span className={label}>Theme</span>
            <Choice value={draft.theme} onChange={(v) => set({ theme: v })} options={[{ key: "dark", label: "Dark" }, { key: "light", label: "Light" }]} />
          </div>
          <div>
            <span className={label}>Chat window language</span>
            <Choice value={draft.language} onChange={(v) => set({ language: v })} options={[{ key: "en", label: "English" }, { key: "hi", label: "हिंदी" }]} />
            <span className="block text-[10px] text-os-text-dim mt-1">The buttons and notices. The AI replies in whatever language the visitor writes.</span>
          </div>
          <label className="block">
            <span className={label}>Label beside the button (optional)</span>
            <input value={draft.launcher_text ?? ""} maxLength={30} onChange={(e) => set({ launcher_text: e.target.value })} placeholder="e.g. Need help? Chat with us" className={input} />
          </label>
        </div>

        <label className="block">
          <span className={label}>Pop-up message (optional)</span>
          <input value={draft.teaser ?? ""} maxLength={140} onChange={(e) => set({ teaser: e.target.value })} placeholder="e.g. Looking for a price? Ask me - I reply in seconds." className={input} />
          <span className="block text-[10px] text-os-text-dim mt-1">Shows next to the button a few seconds after a visitor arrives, once a day.</span>
        </label>

        <div>
          <span className={label}>Ready questions (optional, up to 4)</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {starters.map((q, i) => (
              <input key={i} value={q} maxLength={80} placeholder={["What are your prices?", "Where are you located?", "Book an appointment", "Talk to a person"][i]}
                onChange={(e) => { const next = [...starters]; next[i] = e.target.value; set({ starters: next }); }} className={input} />
            ))}
          </div>
          <span className="block text-[10px] text-os-text-dim mt-1">Shown as buttons before the visitor types anything.</span>
        </div>

        <div>
          <span className={label}>Name and phone number</span>
          <Choice value={draft.ask_contact} onChange={(v) => set({ ask_contact: v })} options={[
            { key: "when_needed", label: "Only when needed" }, { key: "before_chat", label: "Ask before the chat starts" },
          ]} />
          <span className="block text-[10px] text-os-text-dim mt-1">
            {draft.ask_contact === "before_chat"
              ? "Every visitor who chats becomes a lead in your Inbox. Some visitors leave instead of sharing their number."
              : "Visitors can ask freely. The AI asks for their number only when a person or a booking needs it."}
          </span>
        </div>

        <label className="flex items-start gap-2 text-xs text-white cursor-pointer">
          <input type="checkbox" className="mt-0.5 accent-teal" checked={draft.whatsapp_button} onChange={(e) => set({ whatsapp_button: e.target.checked })} />
          <span>
            Show a WhatsApp button in the chat
            <span className="block text-[11px] text-os-text-dim">Visitors can move to your WhatsApp number in one tap (needs WhatsApp connected).</span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-xs text-white cursor-pointer">
          <input type="checkbox" className="mt-0.5 accent-teal" checked={draft.active} onChange={(e) => set({ active: e.target.checked })} />
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
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg text-xs text-os-text-dim hover:text-white cursor-pointer flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancel</button>
            <button type="button" disabled={busy || !draft.domain.trim()} onClick={save} className="px-4 py-2 rounded-lg bg-teal text-[#14151F] text-xs font-bold disabled:opacity-50 cursor-pointer">
              {busy ? "Saving..." : "Save"}
            </button>
          </div>
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
