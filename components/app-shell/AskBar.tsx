"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Sparkles } from "lucide-react";
import { appPath } from "@/lib/app-nav";
import { account } from "@/lib/api";

const QUICK = ["Aaj kya pending hai?", "Pichhle mahine kya hua?", "Kaun reply ka wait kar raha hai?"];

/**
 * Ask KROVA at the top of Today - owner and admins only (the parent decides). A question typed or tapped here opens
 * the Ask screen, which sends it straight away.
 */
export function AskBar() {
  const router = useRouter();
  const [text, setText] = useState("");
  // Hidden on a plan without Ask KROVA (Solo - shared/billing/features.py).
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    account.profile().then((p) => setLocked((p.locked_features ?? []).includes("ask_krova"))).catch(() => {});
  }, []);
  const go = (q: string) => {
    const question = q.trim();
    if (question) router.push(`${appPath("/ask")}?q=${encodeURIComponent(question)}`);
  };

  if (locked) return null;
  return (
    <div className="rounded-2xl bg-os-card border border-teal/30 p-3 space-y-2.5">
      <form
        onSubmit={(e) => { e.preventDefault(); go(text); }}
        className="flex items-center gap-2"
      >
        <Sparkles className="w-4 h-4 text-teal shrink-0" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="KROVA se kuch bhi poochho..."
          aria-label="Ask KROVA"
          className="flex-1 min-w-0 bg-transparent text-sm text-os-ink placeholder:text-os-text-dim focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="Ask"
          className="shrink-0 w-8 h-8 rounded-full bg-teal flex items-center justify-center disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5 text-os-bg" />
        </button>
      </form>
      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-0.5">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => go(q)}
            className="shrink-0 px-3 py-1.5 rounded-full bg-white/[0.04] border border-os-border text-[11px] text-os-ink whitespace-nowrap"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
