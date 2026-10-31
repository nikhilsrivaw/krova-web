"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, FlaskConical, Pencil, Plus, Route, Trash2, Users } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/EmptyState";
import {
  routing, team as teamApi, voice,
  type RoutingConditions, type RoutingRule, type RoutingRuleInput, type RoutingTeam, type RoutingTeamInput,
  type TeamMember, type VoiceNumberInfo,
} from "@/lib/api";

const input = "w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-teal focus:outline-none";
const pick = "px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-teal focus:outline-none";
const label = "block text-[11px] font-semibold text-os-text-dim mb-1";
const CHANNELS = [
  { key: "whatsapp", label: "WhatsApp" }, { key: "instagram", label: "Instagram" },
  { key: "voice", label: "Calls" }, { key: "web", label: "Website chat" },
];
const LEAD_SOURCES = [
  { key: "justdial", label: "Justdial" }, { key: "indiamart", label: "IndiaMART" }, { key: "magicbricks", label: "MagicBricks" },
  { key: "99acres", label: "99acres" }, { key: "housing", label: "Housing.com" }, { key: "form", label: "KROVA forms" },
  { key: "other", label: "Other uploads" },
];
const LANGUAGES = [
  { key: "english", label: "English" }, { key: "hinglish", label: "Hinglish" }, { key: "hindi", label: "Hindi / Marathi (Devanagari)" },
  { key: "tamil", label: "Tamil" }, { key: "telugu", label: "Telugu" }, { key: "bengali", label: "Bengali" },
  { key: "gujarati", label: "Gujarati" }, { key: "kannada", label: "Kannada" }, { key: "malayalam", label: "Malayalam" },
  { key: "punjabi", label: "Punjabi" }, { key: "odia", label: "Odia" },
];
const COMPLAINT_WORDS = "complaint, shikayat, problem, issue, kharab, bekar, refund, return, damaged, broken, not received, nahi aaya, wrong";

const words = (text: string) => text.split(",").map((w) => w.trim()).filter(Boolean);

/**
 * Teams and routing rules: make teams (Complaints, Sales, a branch) and say which conversations and leads go to
 * which one. The first rule that matches wins; inside a team a chat goes round-robin or waits in the team's queue.
 */
export function TeamsRoutingCard() {
  const [teams, setTeams] = useState<RoutingTeam[] | null>(null);
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [people, setPeople] = useState<TeamMember[]>([]);
  const [numbers, setNumbers] = useState<VoiceNumberInfo[]>([]);
  const [editTeam, setEditTeam] = useState<RoutingTeam | "new" | null>(null);
  const [editRule, setEditRule] = useState<RoutingRule | "new" | "complaints" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [t, r] = await Promise.all([routing.teams(), routing.rules()]);
      setTeams(t); setRules(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load teams.");
      setTeams([]);
    }
  }, []);

  useEffect(() => {
    load();
    teamApi.list().then(setPeople).catch(() => {});
    voice.myNumbers().then(setNumbers).catch(() => {});
  }, [load]);

  const nameOf = (id: string | null) => people.find((p) => p.user_id === id)?.full_name || people.find((p) => p.user_id === id)?.email || "-";
  const teamName = (id: string) => teams?.find((t) => t.id === id)?.name ?? "a removed team";

  const move = async (i: number, dir: -1 | 1) => {
    const next = [...rules];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    setRules(next);
    try { setRules(await routing.order(next.map((r) => r.id))); } catch (e) { setError(e instanceof Error ? e.message : "Could not reorder."); load(); }
  };

  const describe = (c: RoutingConditions) => {
    const parts: string[] = [];
    if (c.words?.length) parts.push(`says ${c.words.slice(0, 4).map((w) => `"${w}"`).join(" or ")}${c.words.length > 4 ? "..." : ""}`);
    if (c.languages?.length) parts.push(`in ${c.languages.map((k) => LANGUAGES.find((x) => x.key === k)?.label.split(" ")[0] ?? k).join(" or ")}`);
    if (c.channels?.length) parts.push(`on ${c.channels.map((k) => CHANNELS.find((x) => x.key === k)?.label ?? k).join(" or ")}`);
    if (c.numbers?.length) parts.push(`to ${c.numbers.map((id) => numbers.find((n) => n.connection_id === id)?.label ?? "a number").join(" or ")}`);
    if (c.lead_sources?.length) parts.push(`lead from ${c.lead_sources.map((k) => LEAD_SOURCES.find((x) => x.key === k)?.label ?? k).join(" or ")}`);
    if (c.tags?.length) parts.push(`tagged ${c.tags.join(" or ")}`);
    return parts.length ? parts.join(", ") : "anything (catch-all)";
  };

  return (
    <GlassCard className="p-5 space-y-5">
      <div className="flex items-start gap-3">
        <Route className="w-5 h-5 text-teal mt-0.5" />
        <div>
          <h3 className="text-sm font-bold text-white">Teams and routing</h3>
          <p className="text-[11px] text-os-text-dim mt-0.5">
            Make teams - Complaints, Sales, Accounts, a branch - and say which conversations and leads go to which team.
            Rules are checked top to bottom; the first one that matches wins. A chat that matches no rule goes to the
            agents as set above (round-robin, or you assign it). When the AI replies on its own, it answers first and a
            person is brought in only when needed - the AI asks for help, its reply waits for an OK, or the customer
            waits past the reply target.
          </p>
        </div>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Teams */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-white">Teams</p>
          <button type="button" onClick={() => setEditTeam("new")} className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs text-white flex items-center gap-1 cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> New team
          </button>
        </div>
        {!teams ? <Skeleton className="h-16 w-full" /> : teams.length === 0 ? (
          <p className="text-[11px] text-os-text-dim">No teams yet. Start with one, e.g. &quot;Complaints&quot; with the people who handle them.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {teams.map((t) => (
              <div key={t.id} className="p-3 rounded-xl border border-white/[0.08] bg-white/[0.02] flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-teal" /> {t.name}</p>
                  <p className="text-[11px] text-os-text-dim mt-0.5">
                    {t.member_ids.length} member{t.member_ids.length === 1 ? "" : "s"} · {t.sharing === "round_robin" ? "round-robin" : "team queue"}
                    {t.lead_user_id ? ` · lead ${nameOf(t.lead_user_id)}` : ""}
                    {t.reply_target_minutes ? ` · reply within ${t.reply_target_minutes} min` : ""}
                  </p>
                  <p className="text-[11px] text-os-text-dim">{t.open_chats} open chat{t.open_chats === 1 ? "" : "s"}</p>
                </div>
                <button type="button" onClick={() => setEditTeam(t)} aria-label={`Edit ${t.name}`} className="p-1.5 text-os-text-dim hover:text-white cursor-pointer">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rules */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-white">Routing rules</p>
          <div className="flex gap-2">
            {teams && teams.length > 0 && rules.length === 0 && (
              <button type="button" onClick={() => setEditRule("complaints")} className="px-3 py-1.5 rounded-lg bg-teal/15 border border-teal/30 text-xs text-white cursor-pointer">
                Start with a complaints rule
              </button>
            )}
            <button type="button" disabled={!teams || teams.length === 0} onClick={() => setEditRule("new")}
              className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs text-white flex items-center gap-1 cursor-pointer disabled:opacity-40">
              <Plus className="w-3.5 h-3.5" /> New rule
            </button>
          </div>
        </div>
        {teams && teams.length === 0 && <p className="text-[11px] text-os-text-dim">Make a team first.</p>}
        {rules.length > 0 && (
          <div className="rounded-xl border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
            {rules.map((r, i) => (
              <div key={r.id} className={`flex items-center gap-3 px-3 py-2.5 ${r.active ? "" : "opacity-50"}`}>
                <span className="text-[10px] font-mono text-os-text-dim w-5 text-center">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate">
                    {r.name} {!r.active && <Badge variant="outline" size="sm">Off</Badge>}
                  </p>
                  <p className="text-[11px] text-os-text-dim truncate">
                    When a conversation {describe(r.conditions)} → <span className="text-teal">{teamName(r.team_id)}</span>
                    {r.also_if_owned ? " (even if someone already has it)" : ""}
                    {r.conditions.person_now ? " · straight to a person" : ""}
                  </p>
                </div>
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up" className="p-1 text-os-text-dim hover:text-white disabled:opacity-30 cursor-pointer"><ArrowUp className="w-3.5 h-3.5" /></button>
                <button type="button" disabled={i === rules.length - 1} onClick={() => move(i, 1)} aria-label="Move down" className="p-1 text-os-text-dim hover:text-white disabled:opacity-30 cursor-pointer"><ArrowDown className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => setEditRule(r)} aria-label="Edit rule" className="p-1 text-os-text-dim hover:text-white cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {rules.length > 0 && <RuleTester numbers={numbers} />}

      {editTeam && (
        <TeamModal
          team={editTeam === "new" ? null : editTeam}
          people={people}
          onClose={() => setEditTeam(null)}
          onSaved={() => { setEditTeam(null); load(); }}
        />
      )}
      {editRule && teams && (
        <RuleModal
          rule={typeof editRule === "string" ? null : editRule}
          starter={editRule === "complaints"}
          teams={teams}
          numbers={numbers}
          onClose={() => setEditRule(null)}
          onSaved={() => { setEditRule(null); load(); }}
        />
      )}
    </GlassCard>
  );
}

function TeamModal({ team, people, onClose, onSaved }: {
  team: RoutingTeam | null; people: TeamMember[]; onClose: () => void; onSaved: () => void;
}) {
  const [draft, setDraft] = useState<RoutingTeamInput>(team
    ? { name: team.name, lead_user_id: team.lead_user_id, reply_target_minutes: team.reply_target_minutes, sharing: team.sharing, member_ids: team.member_ids }
    : { name: "", lead_user_id: null, reply_target_minutes: null, sharing: "round_robin", member_ids: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toggle = (id: string) => setDraft({ ...draft, member_ids: draft.member_ids.includes(id) ? draft.member_ids.filter((m) => m !== id) : [...draft.member_ids, id] });

  const save = async () => {
    setBusy(true); setError(null);
    try {
      if (team) await routing.updateTeam(team.id, draft); else await routing.createTeam(draft);
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save."); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!team) return;
    setBusy(true);
    try { await routing.deleteTeam(team.id); onSaved(); } catch (e) { setError(e instanceof Error ? e.message : "Could not remove."); setBusy(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={team ? `Edit ${team.name}` : "New team"} maxWidth="md">
      <div className="space-y-4">
        <div>
          <span className={label}>Name</span>
          <input value={draft.name} maxLength={60} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Complaints, Sales, Jaipur branch" className={input} />
        </div>
        <div>
          <span className={label}>Members</span>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-white/[0.08] divide-y divide-white/[0.05]">
            {people.map((p) => (
              <label key={p.user_id} className="flex items-center gap-2 px-3 py-2 text-xs text-white cursor-pointer">
                <input type="checkbox" className="accent-teal" checked={draft.member_ids.includes(p.user_id)} onChange={() => toggle(p.user_id)} />
                <span className="flex-1">{p.full_name || p.email}</span>
                <span className="text-[10px] text-os-text-dim">{p.role}{p.available === false ? " · Away" : ""}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Team lead (told when replies are late)</span>
            <select value={draft.lead_user_id ?? ""} onChange={(e) => setDraft({ ...draft, lead_user_id: e.target.value || null })} className={input}>
              <option value="">No lead</option>
              {people.map((p) => <option key={p.user_id} value={p.user_id}>{p.full_name || p.email}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={label}>Reply within</span>
            <select value={draft.reply_target_minutes ?? ""} onChange={(e) => setDraft({ ...draft, reply_target_minutes: e.target.value ? Number(e.target.value) : null })} className={input}>
              <option value="">Business target</option>
              {[5, 10, 15, 30, 60, 120, 240].map((m) => <option key={m} value={m}>{m < 60 ? `${m} minutes` : `${m / 60} hour${m === 60 ? "" : "s"}`}</option>)}
            </select>
          </label>
        </div>
        <div>
          <span className={label}>How chats are shared in the team</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {([
              ["round_robin", "Round-robin", "Straight to the next free member - Away members are skipped."],
              ["queue", "Team queue", "Waits in the team; everyone in it is told and whoever replies first takes it."],
            ] as const).map(([key, title, desc]) => (
              <button key={key} type="button" onClick={() => setDraft({ ...draft, sharing: key })}
                className={`text-left p-3 rounded-xl border cursor-pointer ${draft.sharing === key ? "border-teal/50 bg-teal/10" : "border-white/[0.08] bg-white/[0.02]"}`}>
                <p className="text-xs font-semibold text-white">{title}</p>
                <p className="text-[10px] text-os-text-dim mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex items-center justify-between gap-3">
          {team ? (
            <button type="button" disabled={busy} onClick={remove} className="text-xs text-red-300 hover:text-red-200 flex items-center gap-1 cursor-pointer">
              <Trash2 className="w-3.5 h-3.5" /> Remove team
            </button>
          ) : <span />}
          <button type="button" disabled={busy || !draft.name.trim()} onClick={save} className="px-5 py-2 rounded-lg bg-teal text-os-bg text-xs font-bold cursor-pointer disabled:opacity-40">
            {busy ? "Saving..." : "Save team"}
          </button>
        </div>
        {team && <p className="text-[10px] text-os-text-dim">Removing a team removes its rules; its chats keep whoever has them.</p>}
      </div>
    </Modal>
  );
}

function Chips({ options, value, onChange }: { options: { key: string; label: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o.key);
        return (
          <button key={o.key} type="button" onClick={() => onChange(on ? value.filter((v) => v !== o.key) : [...value, o.key])}
            className={`px-2.5 py-1 rounded-lg border text-[11px] cursor-pointer ${on ? "border-teal/50 bg-teal/10 text-white" : "border-white/[0.08] text-os-text-dim"}`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function RuleModal({ rule, starter, teams, numbers, onClose, onSaved }: {
  rule: RoutingRule | null; starter: boolean; teams: RoutingTeam[]; numbers: VoiceNumberInfo[]; onClose: () => void; onSaved: () => void;
}) {
  const complaintsTeam = teams.find((t) => /complain|shikayat|support/i.test(t.name)) ?? teams[0];
  const [draft, setDraft] = useState<RoutingRuleInput>(rule
    ? { name: rule.name, team_id: rule.team_id, conditions: rule.conditions, also_if_owned: rule.also_if_owned, active: rule.active }
    : starter
      ? { name: "Complaints", team_id: complaintsTeam.id, conditions: { words: words(COMPLAINT_WORDS), person_now: true }, also_if_owned: true, active: true }
      : { name: "", team_id: teams[0].id, conditions: {}, also_if_owned: false, active: true });
  const [wordText, setWordText] = useState((draft.conditions.words ?? []).join(", "));
  const [tagText, setTagText] = useState((draft.conditions.tags ?? []).join(", "));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setCond = (patch: Partial<RoutingConditions>) => setDraft({ ...draft, conditions: { ...draft.conditions, ...patch } });

  const save = async () => {
    setBusy(true); setError(null);
    const body = { ...draft, conditions: { ...draft.conditions, words: words(wordText), tags: words(tagText) } };
    try {
      if (rule) await routing.updateRule(rule.id, body); else await routing.createRule(body);
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save."); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!rule) return;
    setBusy(true);
    try { await routing.deleteRule(rule.id); onSaved(); } catch (e) { setError(e instanceof Error ? e.message : "Could not remove."); setBusy(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={rule ? "Edit rule" : "New routing rule"} subtitle="Leave a box empty to not check it. All the boxes you fill must match." maxWidth="lg">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Rule name</span>
            <input value={draft.name} maxLength={80} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Complaints, IndiaMART leads" className={input} />
          </label>
          <label className="block">
            <span className={label}>Send to team</span>
            <select value={draft.team_id} onChange={(e) => setDraft({ ...draft, team_id: e.target.value })} className={input}>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
        </div>
        <label className="block">
          <span className={label}>The message has any of these words (comma separated, Hindi or English)</span>
          <textarea rows={2} value={wordText} onChange={(e) => setWordText(e.target.value)} placeholder="complaint, shikayat, refund, kharab" className={`${input} resize-none`} />
        </label>
        <div>
          <span className={label}>The customer writes in</span>
          <Chips options={LANGUAGES} value={draft.conditions.languages ?? []} onChange={(v) => setCond({ languages: v })} />
          <p className="mt-1 text-[10px] text-os-text-dim">
            Indian scripts are read exactly. English and Hinglish (Hindi in English letters) are told apart by common Hindi
            words - a very short message like &quot;ok thanks&quot; counts as English. On calls, the language heard on the call is used.
          </p>
        </div>
        <div>
          <span className={label}>Came on</span>
          <Chips options={CHANNELS} value={draft.conditions.channels ?? []} onChange={(v) => setCond({ channels: v })} />
        </div>
        {numbers.length > 0 && (
          <div>
            <span className={label}>To this number</span>
            <Chips options={numbers.map((n) => ({ key: n.connection_id, label: n.label === n.number ? n.number : n.label }))}
              value={draft.conditions.numbers ?? []} onChange={(v) => setCond({ numbers: v })} />
          </div>
        )}
        <div>
          <span className={label}>A lead from</span>
          <Chips options={LEAD_SOURCES} value={draft.conditions.lead_sources ?? []} onChange={(v) => setCond({ lead_sources: v })} />
        </div>
        <label className="block">
          <span className={label}>The customer has a tag (comma separated)</span>
          <input value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="e.g. Jaipur, VIP, Dealer" className={input} />
        </label>
        <label className="flex items-start gap-2 text-xs text-white cursor-pointer">
          <input type="checkbox" className="mt-0.5 accent-teal" checked={draft.also_if_owned} onChange={(e) => setDraft({ ...draft, also_if_owned: e.target.checked })} />
          <span>
            Move it even if someone already has the chat
            <span className="block text-[11px] text-os-text-dim">Use for complaints: a complaint from a sales person&apos;s customer still reaches this team. The previous person is told.</span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-xs text-white cursor-pointer">
          <input type="checkbox" className="mt-0.5 accent-teal" checked={draft.conditions.person_now === true} onChange={(e) => setCond({ person_now: e.target.checked || undefined })} />
          <span>
            Give it to a person straight away
            <span className="block text-[11px] text-os-text-dim">Normally the AI answers first and a team member gets the chat only when needed. Turn on for chats a person must handle from the start, like complaints.</span>
          </span>
        </label>
        <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
          <input type="checkbox" className="accent-teal" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
          Rule is on
        </label>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex items-center justify-between gap-3">
          {rule ? (
            <button type="button" disabled={busy} onClick={remove} className="text-xs text-red-300 hover:text-red-200 flex items-center gap-1 cursor-pointer">
              <Trash2 className="w-3.5 h-3.5" /> Remove rule
            </button>
          ) : <span />}
          <button type="button" disabled={busy || !draft.name.trim()} onClick={save} className="px-5 py-2 rounded-lg bg-teal text-os-bg text-xs font-bold cursor-pointer disabled:opacity-40">
            {busy ? "Saving..." : "Save rule"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function RuleTester({ numbers }: { numbers: VoiceNumberInfo[] }) {
  const [text, setText] = useState("");
  const [channel, setChannel] = useState("whatsapp");
  const [number, setNumber] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const run = async () => {
    try {
      const out = await routing.test({ text, channel, number: number || undefined });
      const heard = out.language ? ` (reads as ${LANGUAGES.find((l) => l.key === out.language)?.label.split(" ")[0] ?? out.language})` : "";
      setResult((out.rule ? `Rule "${out.rule}" → ${out.team} team` : "No rule matches - handled as set above (round-robin or first reply).") + heard);
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Could not test.");
    }
  };

  return (
    <div className="p-3 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-2">
      <p className="text-xs font-semibold text-white flex items-center gap-1.5"><FlaskConical className="w-3.5 h-3.5 text-teal" /> Test a message</p>
      <div className="flex flex-wrap gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Mera order abhi tak nahi aaya, bahut bekar" className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-teal focus:outline-none" />
        <select value={channel} onChange={(e) => setChannel(e.target.value)} className={pick}>
          {CHANNELS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        {numbers.length > 0 && (
          <select value={number} onChange={(e) => setNumber(e.target.value)} className={pick}>
            <option value="">Any number</option>
            {numbers.map((n) => <option key={n.connection_id} value={n.connection_id}>{n.label === n.number ? n.number : n.label}</option>)}
          </select>
        )}
        <button type="button" onClick={run} className="px-4 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-xs font-semibold text-white cursor-pointer">Test</button>
      </div>
      {result && <p className="text-[11px] text-teal">{result}</p>}
      <p className="text-[10px] text-os-text-dim">Nothing is sent or moved - this only shows which rule would catch it.</p>
    </div>
  );
}
