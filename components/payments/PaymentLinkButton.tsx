"use client";

import React, { useEffect, useState } from "react";
import { Check, Copy, Link2, RefreshCw } from "lucide-react";
import { payments, templates as templatesApi, type PaymentLink, type PaymentLinkSend } from "@/lib/api";
import { useRole } from "@/lib/useRole";

type Target =
  | { kind: "commitment"; id: string }
  | { kind: "token"; id: string }
  | { kind: "appointment"; id: string };

const input = "px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none";

/**
 * Send a payment link from the business's own Razorpay on WhatsApp, and show whether it has been paid.
 * When the customer has not written in 24 hours, WhatsApp needs an approved template (amount, link) - it asks for one.
 */
export function PaymentLinkButton({
  target, askAmount = false, compact = false, onPaid,
}: { target: Target; askAmount?: boolean; compact?: boolean; onPaid?: () => void }) {
  const [open, setOpen] = useState(false);
  const [rupees, setRupees] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsTemplate, setNeedsTemplate] = useState(false);
  const [templateNames, setTemplateNames] = useState<string[]>([]);
  const [template, setTemplate] = useState("");
  const [result, setResult] = useState<PaymentLinkSend | null>(null);
  const [link, setLink] = useState<PaymentLink | null>(null);
  const [copied, setCopied] = useState(false);
  // The owner can keep payments to the owner and admins (Team page).
  const { allowed } = useRole();

  useEffect(() => {
    if (!needsTemplate) return;
    templatesApi.list().then((all) => {
      const names = all.filter((t) => t.status === "approved").map((t) => t.name);
      setTemplateNames(names);
      if (names.length) setTemplate(names[0]);
    }).catch(() => setTemplateNames([]));
  }, [needsTemplate]);

  const send = async () => {
    setBusy(true); setError(null);
    const amount = askAmount && rupees ? Math.round(Number(rupees) * 100) : undefined;
    const t = needsTemplate && template ? { template_name: template } : {};
    try {
      const out = target.kind === "commitment"
        ? await payments.sendForCommitment(target.id, t)
        : target.kind === "token"
          ? await payments.sendForToken(target.id, amount, t)
          : await payments.sendForAppointment(target.id, amount, t);
      setResult(out); setLink(out.link); setNeedsTemplate(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not send the link.";
      if (message.includes("24 hours")) setNeedsTemplate(true);
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const check = async () => {
    if (!link) return;
    setBusy(true);
    try {
      const fresh = await payments.check(link.id);
      setLink(fresh);
      if (fresh.status === "paid") onPaid?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not check.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    try { await navigator.clipboard.writeText(link.short_url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  };

  if (!allowed.take_payments) return null;

  if (!open && !link) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className={`rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white font-semibold flex items-center gap-1.5 cursor-pointer ${compact ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-2 text-xs"}`}>
        <Link2 className="w-3.5 h-3.5" /> Payment link
      </button>
    );
  }

  if (link) {
    const paid = link.status === "paid";
    return (
      <div className="space-y-1.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2 py-0.5 rounded-md font-semibold ${paid ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>
            {paid ? "Paid" : link.status === "partially_paid" ? "Part paid" : link.status === "expired" ? "Expired" : "Waiting for payment"}
            {" "}₹{(link.amount_paise / 100).toLocaleString("en-IN")}
          </span>
          {!paid && (
            <button type="button" onClick={check} disabled={busy} className="text-os-text-dim hover:text-white flex items-center gap-1 cursor-pointer">
              <RefreshCw className="w-3 h-3" /> Check
            </button>
          )}
          <button type="button" onClick={copy} className="text-os-text-dim hover:text-white flex items-center gap-1 cursor-pointer">
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied ? "Copied" : "Copy link"}
          </button>
        </div>
        {result && !result.sent && <p className="text-[11px] text-amber-300">Not sent on WhatsApp: {result.reason} Copy the link and share it.</p>}
        {result?.sent && !paid && <p className="text-[11px] text-os-text-dim">Sent on WhatsApp. It is marked paid by itself once Razorpay confirms.</p>}
        {error && <p className="text-[11px] text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        {askAmount && (
          <input type="number" min="1" value={rupees} onChange={(e) => setRupees(e.target.value)}
            placeholder={target.kind === "commitment" ? "" : "₹ amount (blank = doctor's fee)"} className={`${input} w-44`} />
        )}
        {needsTemplate && (
          templateNames.length ? (
            <select value={template} onChange={(e) => setTemplate(e.target.value)} className={input}>
              {templateNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          ) : <span className="text-[11px] text-amber-300">No approved template yet.</span>
        )}
        <button type="button" onClick={send} disabled={busy || (needsTemplate && !template)}
          className="px-3 py-1.5 rounded-lg bg-brass hover:bg-brass-dim text-white font-bold cursor-pointer disabled:opacity-50">
          {busy ? "Sending..." : "Send on WhatsApp"}
        </button>
        <button type="button" onClick={() => { setOpen(false); setError(null); setNeedsTemplate(false); }} className="text-os-text-dim hover:text-white cursor-pointer">Cancel</button>
      </div>
      {needsTemplate && (
        <p className="text-[11px] text-os-text-dim">Pick an approved template whose two variables are the amount and the link.</p>
      )}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
