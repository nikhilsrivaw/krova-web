"use client";

import { useRef, useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { owner, type OwnerTurn } from "@/lib/api";

const STARTERS = [
  "Aaj kya pending hai?",
  "Kaun se customers ka paisa overdue hai?",
  "Mere ledger ka total kya hai?",
];

/**
 * Ask KROVA - ask your own ledger a question in plain language. The answer
 * is built only from the commitment ledger the owner already sees. When the
 * AI provider is not approved or its quota is off, the server says so and
 * this screen shows that plainly instead of failing silently.
 */
export default function AskPage() {
  const [turns, setTurns] = useState<OwnerTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    const history = turns.slice(-10);
    setTurns((prev) => [...prev, { role: "user", text: question }]);
    setDraft("");
    setBusy(true);
    setNotice(null);
    try {
      const res = await owner.ask(question, history);
      setTurns((prev) => [...prev, { role: "assistant", text: res.answer }]);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not get an answer.");
    } finally {
      setBusy(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  return (
    <div className="flex flex-col px-4 pt-5 max-w-md mx-auto min-h-[calc(100vh-9rem)]">
      <h1 className="text-lg font-semibold text-os-ink mb-1 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-teal" />
        Ask KROVA
      </h1>
      <p className="text-xs text-os-text-dim mb-4">Hindi, Hinglish ya English mein poochho. Jawab sirf tumhare ledger se.</p>

      <div className="flex-1 space-y-3 mb-4">
        {turns.length === 0 && (
          <div className="space-y-2">
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="w-full text-left px-3.5 py-3 rounded-xl bg-os-card border border-os-border text-xs text-os-ink active:bg-white/[0.03]"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {turns.map((t, i) => (
          <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                t.role === "user" ? "bg-teal text-os-bg font-medium rounded-tr-sm" : "bg-os-card border border-os-border text-os-ink/90 rounded-tl-sm"
              }`}
            >
              {t.text}
            </div>
          </div>
        ))}

        {busy && <p className="text-[11px] text-os-text-dim">Soch raha hoon…</p>}
        {notice && <p className="text-xs text-rose-400 px-1">{notice}</p>}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="sticky bottom-20 flex items-end gap-2 bg-os-bg/95 backdrop-blur-xl py-2"
      >
        <textarea
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Kuch bhi poochho…"
          className="flex-1 px-3.5 py-2.5 rounded-2xl bg-os-card border border-os-border text-xs text-os-ink placeholder:text-os-text-dim focus:border-teal focus:outline-none resize-none"
        />
        <button
          type="submit"
          disabled={!draft.trim() || busy}
          className="shrink-0 w-10 h-10 rounded-full bg-teal flex items-center justify-center disabled:opacity-40"
        >
          <Send className="w-4 h-4 text-os-bg" />
        </button>
      </form>
    </div>
  );
}
