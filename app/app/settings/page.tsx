"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, LogOut, Copy, Check } from "lucide-react";
import { account, approvals, type AutonomyLevel, type UserProfile } from "@/lib/api";
import { signOut } from "@/lib/auth";
import { appPath, installUrl } from "@/lib/app-nav";
import { disableNotifications, enableNotifications, notificationsEnabled, notificationsSupported } from "@/lib/push";
import { SettingsControls } from "@/components/commands/SettingsControls";

const LEVELS: { value: AutonomyLevel; label: string; detail: string }[] = [
  { value: "observe", label: "Observe", detail: "AI only reads and learns. It drafts nothing." },
  { value: "draft", label: "Draft", detail: "AI drafts every reply. You approve each one. Safest." },
  { value: "conditional", label: "Conditional", detail: "AI sends only replies that pass your rules." },
  { value: "act", label: "Act", detail: "AI sends replies on its own." },
];

/**
 * Settings, natively in the app: who you are signed in as, how much the AI
 * may do on its own (the autonomy level - the one setting worth changing
 * from a phone while away from the desk), the install link, and sign out.
 * Anything not here (vertical setup, billing, team) stays on the desktop
 * Settings page, reached from More.
 */
export default function AppSettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [autonomy, setAutonomy] = useState<AutonomyLevel | null>(null);
  const [savingLevel, setSavingLevel] = useState<AutonomyLevel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    account
      .profile()
      .then((p) => {
        setProfile(p);
        setAutonomy(p.autonomy);
      })
      .catch(() => setError("Could not load your settings."));
    setLink(installUrl());
    notificationsEnabled().then(setPushOn).catch(() => {});
  }, []);

  const togglePush = async () => {
    setPushBusy(true);
    setPushError(null);
    try {
      if (pushOn) {
        await disableNotifications();
        setPushOn(false);
      } else {
        await enableNotifications();
        setPushOn(true);
      }
    } catch (err) {
      setPushError(err instanceof Error ? err.message : "Could not change notifications.");
    } finally {
      setPushBusy(false);
    }
  };

  const chooseLevel = async (level: AutonomyLevel) => {
    if (level === autonomy || savingLevel) return;
    setSavingLevel(level);
    setError(null);
    try {
      const res = await approvals.setAutonomy(level);
      setAutonomy(res.autonomy);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the AI level.");
    } finally {
      setSavingLevel(null);
    }
  };

  const copyLink = () => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="px-4 pt-5 space-y-5 max-w-md mx-auto">
      <h1 className="text-lg font-semibold text-os-ink flex items-center gap-2">
        <Settings className="w-4 h-4 text-teal" />
        Settings
      </h1>

      {profile && (
        <div className="p-4 rounded-2xl bg-os-card border border-os-border">
          <p className="text-sm font-semibold text-os-ink">{profile.full_name || profile.email}</p>
          <p className="text-[11px] text-os-text-dim mt-0.5">
            {profile.business_name}
            {profile.vertical ? ` · ${profile.vertical}` : ""}
          </p>
        </div>
      )}

      <section className="space-y-2.5">
        <p className="text-[11px] font-mono uppercase tracking-wide text-os-text-dim">AI level</p>
        <div className="rounded-2xl bg-os-card border border-os-border overflow-hidden">
          {LEVELS.map((lvl, i) => {
            const selected = autonomy === lvl.value;
            return (
              <button
                key={lvl.value}
                type="button"
                onClick={() => chooseLevel(lvl.value)}
                disabled={savingLevel !== null}
                className={`w-full text-left px-4 py-3.5 flex items-start gap-3 active:bg-white/[0.03] disabled:opacity-60 ${
                  i !== LEVELS.length - 1 ? "border-b border-os-border" : ""
                }`}
              >
                <div
                  className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    selected ? "border-teal" : "border-os-border"
                  }`}
                >
                  {selected && <div className="w-2 h-2 rounded-full bg-teal" />}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm ${selected ? "text-teal-bright font-semibold" : "text-os-ink"}`}>
                    {lvl.label}
                    {savingLevel === lvl.value ? " …" : ""}
                  </p>
                  <p className="text-[11px] text-os-text-dim mt-0.5 leading-snug">{lvl.detail}</p>
                </div>
              </button>
            );
          })}
        </div>
        {error && <p className="text-xs text-rose-400">{error}</p>}
      </section>

      <SettingsControls canEdit={profile?.role === "owner" || profile?.role === "admin"} />

      <section className="space-y-2.5">
        <p className="text-[11px] font-mono uppercase tracking-wide text-os-text-dim">Notifications</p>
        <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-os-card border border-os-border">
          <div className="min-w-0">
            <p className="text-sm text-os-ink">Alert me when KROVA needs me</p>
            <p className="text-[11px] text-os-text-dim mt-0.5 leading-snug">
              {notificationsSupported()
                ? "On iPhone, add KROVA to your Home Screen first, then turn this on."
                : "This browser can't send notifications. Install the app to get them."}
            </p>
          </div>
          <button
            type="button"
            onClick={togglePush}
            disabled={pushBusy || !notificationsSupported()}
            className={`shrink-0 px-3.5 py-2 rounded-lg text-xs font-bold disabled:opacity-40 ${
              pushOn ? "bg-white/[0.06] text-os-ink" : "bg-teal text-os-bg"
            }`}
          >
            {pushBusy ? "…" : pushOn ? "Turn off" : "Turn on"}
          </button>
        </div>
        {pushError && <p className="text-xs text-rose-400">{pushError}</p>}
      </section>

      <section className="space-y-2.5">
        <p className="text-[11px] font-mono uppercase tracking-wide text-os-text-dim">Install on your phone</p>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-os-card border border-os-border">
          <span className="flex-1 min-w-0 truncate font-mono text-xs text-os-ink">{link || "…"}</span>
          <button
            type="button"
            onClick={copyLink}
            className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide text-os-ink bg-white/[0.06]"
          >
            {copied ? <Check className="w-3 h-3 text-teal" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </section>

      <button
        type="button"
        onClick={() => {
          signOut();
          router.replace(appPath("/login"));
        }}
        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-os-card border border-os-border text-sm font-semibold text-thread-bright active:bg-white/[0.03]"
      >
        <LogOut className="w-4 h-4" />
        Sign out
      </button>
    </div>
  );
}
