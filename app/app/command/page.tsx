"use client";

import { useState } from "react";
import { Terminal, Send } from "lucide-react";
import { commands, commandBar, type CommandRecord } from "@/lib/api";
import { ConfirmCard } from "@/components/commands/ConfirmCard";

const EXAMPLES = [
  "kal 2 se 4 band karo",
  "cancellation 6 ghante ki kar do",
  "aaj ki bookings batao",
  "waitlist mein kitne log hain",
  "ledger ka total kya hai",
];

/**
 * Command bar: say what you want in plain words. The reply is always shown
 * as a preview first. Reads show their answer straight away; changes wait for
 * a Confirm, the same as every other command.
 */
export default function CommandPage() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [record, setRecord] = useState<CommandRecord | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (raw: string) => {
    const input = raw.trim();
    if (!input || busy) return;
    setBusy(true);
    setNotice(null);
    setRecord(null);
    try {
      const understood = await commandBar.understand(input);
      if (understood.source === "unavailable" || !understood.tool) {
        setNotice(understood.message || "Ye command samajh nahi aayi.");
        return;
      }
      const created = await commands.preview(understood.tool, understood.args);
      setRecord(created);
      setText("");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Kuch galat ho gaya.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-4 pt-5 max-w-md mx-auto space-y-5">
      <h1 className="text-lg font-semibold text-os-ink flex items-center gap-2">
        <Terminal className="w-4 h-4 text-teal" />
        Command
      </h1>
      <p className="text-xs text-os-text-dim">Seedhi bhasha mein likhein. Kaam hone se pehle preview dikhega.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(text);
        }}
        className="flex items-end gap-2"
      >
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Jaise: kal 2 se 4 band karo"
          className="flex-1 px-3.5 py-2.5 rounded-2xl bg-os-card border border-os-border text-xs text-os-ink placeholder:text-os-text-dim focus:border-teal focus:outline-none resize-none"
        />
        <button
          type="submit"
          disabled={!text.trim() || busy}
          className="shrink-0 w-10 h-10 rounded-full bg-teal flex items-center justify-center disabled:opacity-40"
        >
          <Send className="w-4 h-4 text-os-bg" />
        </button>
      </form>

      {notice && <p className="text-xs text-rose-400">{notice}</p>}

      {record && record.status === "done" && record.tool === "report" && (
        <div className="rounded-2xl bg-os-card border border-os-border p-4 space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-wide text-os-text-dim">Jawab</p>
          <pre className="text-xs text-os-ink whitespace-pre-wrap">{JSON.stringify(record.result, null, 2)}</pre>
        </div>
      )}

      {record && record.tool !== "report" && record.tool !== "find" && (
        <ConfirmCard command={record} onDecided={(updated) => setRecord(updated)} />
      )}

      {record && record.status === "failed" && record.error && (
        <p className="text-xs text-rose-400">{record.error}</p>
      )}

      <div className="space-y-2">
        <p className="text-[11px] font-mono uppercase tracking-wide text-os-text-dim">Try karein</p>
        {EXAMPLES.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => run(e)}
            className="w-full text-left px-3.5 py-2.5 rounded-xl bg-os-card border border-os-border text-xs text-os-ink active:bg-white/[0.03]"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
