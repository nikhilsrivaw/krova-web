"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Check, Copy, KeyRound, MessageCircle, Plus, Trash2, UserPlus } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/EmptyState";
import { account, team, teamSettings, type TeamCredentials, type TeamMember, type TeamSettings } from "@/lib/api";
import { getUserId } from "@/lib/auth";

function relative(iso: string | null | undefined): string {
  if (!iso) return "never";
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  return `${Math.floor(seconds / 86400)} d ago`;
}

function handleFrom(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "").slice(0, 30);
}

/** The message the owner sends the teammate: where to sign in, the ID, the temporary password. */
function shareText(c: TeamCredentials, businessName: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return [
    `Hi ${c.full_name ?? ""}, you have been added to ${businessName} on KROVA.`,
    ``,
    `Sign in: ${origin}/team-login`,
    `Team ID: ${c.team_id}`,
    `Password: ${c.password}`,
    ``,
    `You will be asked to choose your own password the first time.`,
  ].join("\n");
}

/**
 * The people on the team, with the owner's tools: add someone (Team ID +
 * password to hand over), reset a password, change a role, remove. The rules
 * about who may do what are enforced by the server; the buttons here only hide
 * what would be refused.
 */
export function MembersCard() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("your business");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<TeamSettings | null>(null);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [handleEdited, setHandleEdited] = useState(false);
  const [role, setRole] = useState<"admin" | "agent">("agent");
  const [busy, setBusy] = useState(false);

  const [credentials, setCredentials] = useState<TeamCredentials | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: "reset" | "remove"; member: TeamMember } | null>(null);

  const me = getUserId();
  const isOwner = myRole === "owner";

  const load = useCallback(async () => {
    setError(null);
    try {
      const [list, profile] = await Promise.all([team.list(), account.profile()]);
      setMembers(list);
      setMyRole(profile.role);
      teamSettings.get().then(setPrefs).catch(() => {});
      if (profile.business_name) setBusinessName(profile.business_name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the team.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const canManage = (m: TeamMember) =>
    m.user_id !== me && m.role !== "owner" && (isOwner || (myRole === "admin" && m.role === "agent"));

  const openAdd = () => {
    setName(""); setHandle(""); setHandleEdited(false); setRole("agent"); setError(null);
    setAdding(true);
  };

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const made = await team.add({ full_name: name.trim(), handle: handle.trim(), role });
      setAdding(false);
      setCopied(false);
      setCredentials(made);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add this person.");
    } finally {
      setBusy(false);
    }
  };

  const runConfirmed = async () => {
    if (!confirm) return;
    setBusy(true);
    setError(null);
    try {
      if (confirm.kind === "reset") {
        const fresh = await team.resetPassword(confirm.member.user_id);
        setCopied(false);
        setCredentials(fresh);
      } else {
        await team.remove(confirm.member.user_id);
      }
      setConfirm(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work.");
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (m: TeamMember, next: "admin" | "agent") => {
    setError(null);
    try {
      await team.setRole(m.user_id, next);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the role.");
    }
  };

  const savePrefs = async (next: TeamSettings) => {
    setPrefs(next);
    try {
      setPrefs(await teamSettings.save(next));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
      teamSettings.get().then(setPrefs).catch(() => {});
    }
  };

  const copyCredentials = async () => {
    if (!credentials) return;
    try {
      await navigator.clipboard.writeText(shareText(credentials, businessName));
      setCopied(true);
    } catch {
      setError("Could not copy - select the text and copy it by hand.");
    }
  };

  const input = "w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-sm text-white focus:border-teal focus:outline-none";

  return (
    <section aria-label="Team members">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-teal-bright" />
          <h2 className="text-sm font-bold text-white">People on your team</h2>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal/15 border border-teal/40 text-xs font-semibold text-white cursor-pointer hover:bg-teal/25"
        >
          <Plus className="w-3.5 h-3.5" /> Add a team member
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>
      )}

      {loading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <GlassCard className="divide-y divide-white/[0.05]">
          {members.map((m) => (
            <div key={m.user_id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {m.full_name || m.email || "Unnamed"}
                  {m.user_id === me && <span className="ml-2 text-[10px] font-mono text-os-text-dim">you</span>}
                </p>
                <p className="text-[11px] text-os-text-dim font-mono truncate">
                  {m.team_id ? `ID ${m.team_id}` : m.email}
                  {" - signed in "}{relative(m.last_login_at)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {m.locked && <Badge variant="rose" size="sm">Locked - reset password</Badge>}
                {m.must_change_password && !m.locked && <Badge variant="amber" size="sm">Hasn&apos;t set own password</Badge>}
                {isOwner && canManage(m) ? (
                  <select
                    value={m.role}
                    onChange={(e) => changeRole(m, e.target.value as "admin" | "agent")}
                    aria-label={`Role of ${m.full_name ?? m.email ?? "member"}`}
                    className="px-2 py-1 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-teal focus:outline-none"
                  >
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                  </select>
                ) : (
                  <Badge variant="cyan" size="sm">{m.role}</Badge>
                )}
                {canManage(m) && (
                  <>
                    {m.team_id && (
                      <button
                        type="button"
                        onClick={() => setConfirm({ kind: "reset", member: m })}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.1] text-[11px] text-os-text-dim hover:text-white cursor-pointer"
                      >
                        <KeyRound className="w-3 h-3" /> Reset password
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setConfirm({ kind: "remove", member: m })}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.1] text-[11px] text-rose-300 hover:bg-rose-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </GlassCard>
      )}
      {prefs && (isOwner || myRole === "admin") && (
        <GlassCard className="mt-3 p-4 space-y-3">
          <label className="flex items-start gap-2.5 text-xs text-white cursor-pointer">
            <input
              type="checkbox" className="mt-0.5 accent-teal" checked={prefs.auto_assign_on_reply}
              onChange={(e) => savePrefs({ ...prefs, auto_assign_on_reply: e.target.checked })}
            />
            <span>
              The first agent to reply owns the chat
              <span className="block text-[11px] text-os-text-dim">Other agents must take it over to answer. Turn off if you assign chats by hand only.</span>
            </span>
          </label>
          <label className="flex items-center justify-between gap-3 text-xs text-white">
            <span>
              What agents can see
              <span className="block text-[11px] text-os-text-dim">Owners and admins always see every chat.</span>
            </span>
            <select
              value={prefs.agent_visibility}
              onChange={(e) => savePrefs({ ...prefs, agent_visibility: e.target.value as "all" | "assigned" })}
              className="px-2 py-1 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-teal focus:outline-none"
            >
              <option value="all">Every chat</option>
              <option value="assigned">Their own and unowned chats</option>
            </select>
          </label>
        </GlassCard>
      )}
      <p className="mt-2 text-[11px] text-os-text-dim">
        Agents work the inbox, approvals and escalations. Admins can also run campaigns, automations and settings.
        Only the owner can add admins or change roles.
      </p>

      <Modal isOpen={adding} onClose={() => setAdding(false)} title="Add a team member" subtitle="You will get a Team ID and password to hand over">
        <form onSubmit={submitAdd} className="space-y-4">
          <div>
            <label htmlFor="tm-name" className="block text-[11px] font-mono uppercase tracking-wide text-os-text-dim mb-1.5">Name</label>
            <input
              id="tm-name" value={name} required maxLength={255} className={input} placeholder="Rahul Sharma"
              onChange={(e) => {
                setName(e.target.value);
                if (!handleEdited) setHandle(handleFrom(e.target.value));
              }}
            />
          </div>
          <div>
            <label htmlFor="tm-handle" className="block text-[11px] font-mono uppercase tracking-wide text-os-text-dim mb-1.5">Team ID</label>
            <input
              id="tm-handle" value={handle} required minLength={2} maxLength={30} className={`${input} font-mono`}
              autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="rahul"
              onChange={(e) => { setHandle(e.target.value); setHandleEdited(true); }}
            />
            <p className="mt-1 text-[11px] text-os-text-dim">Letters, numbers, dots and dashes. Your business name is added after the @.</p>
          </div>
          <div>
            <span className="block text-[11px] font-mono uppercase tracking-wide text-os-text-dim mb-1.5">Role</span>
            <div className="flex gap-2">
              {(["agent", ...(isOwner ? ["admin"] : [])] as ("agent" | "admin")[]).map((r) => (
                <button
                  key={r} type="button" onClick={() => setRole(r)} aria-pressed={role === r}
                  className={`flex-1 px-3 py-2 rounded-lg border text-xs text-left cursor-pointer ${role === r ? "bg-teal/15 border-teal/40 text-white" : "bg-white/[0.02] border-white/[0.08] text-os-text-dim"}`}
                >
                  <span className="block font-semibold capitalize">{r}</span>
                  <span className="block text-[10px] mt-0.5">
                    {r === "agent" ? "Replies, approvals, escalations, CRM" : "Plus campaigns, automations, settings"}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit" disabled={busy}
            className="w-full px-4 py-2.5 rounded-xl bg-teal hover:bg-teal-dim disabled:opacity-50 text-os-bg text-sm font-bold cursor-pointer"
          >
            {busy ? "Creating..." : "Create"}
          </button>
        </form>
      </Modal>

      <Modal isOpen={credentials !== null} onClose={() => setCredentials(null)} title="Hand this over" subtitle="The password is shown only now">
        {credentials && (
          <div className="space-y-4">
            <dl className="rounded-xl bg-black/40 border border-white/[0.1] p-4 space-y-2 font-mono text-sm">
              <div className="flex justify-between gap-3"><dt className="text-os-text-dim">Team ID</dt><dd className="text-white break-all select-all">{credentials.team_id}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-os-text-dim">Password</dt><dd className="text-white select-all">{credentials.password}</dd></div>
            </dl>
            <p className="text-[11px] text-os-text-dim leading-relaxed">
              They sign in at <span className="font-mono text-white">/team-login</span> (or in the phone app) and will be asked to choose their own
              password. If you lose this, reset the password and a new one is made.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button" onClick={copyCredentials}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/[0.06] border border-white/[0.12] text-xs font-semibold text-white cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy message"}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText(credentials, businessName))}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-xs font-semibold text-white"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Send on WhatsApp
              </a>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={confirm !== null} onClose={() => setConfirm(null)}
        title={confirm?.kind === "remove" ? "Remove from the team?" : "Reset this password?"}
      >
        {confirm && (
          <div className="space-y-4">
            <p className="text-sm text-os-text-dim leading-relaxed">
              {confirm.kind === "remove"
                ? `${confirm.member.full_name ?? "This person"} loses access straight away and is signed out everywhere. Chats and escalations they were holding go back to the team. What they did stays in the activity log.`
                : `${confirm.member.full_name ?? "This person"} is signed out everywhere and gets a new temporary password, which you then hand over.`}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirm(null)} className="flex-1 px-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-sm text-white cursor-pointer">Cancel</button>
              <button
                type="button" onClick={runConfirmed} disabled={busy}
                className={`flex-1 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 cursor-pointer ${confirm.kind === "remove" ? "bg-rose-500 text-white" : "bg-teal text-os-bg"}`}
              >
                {confirm.kind === "remove" ? "Remove" : "Reset"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
