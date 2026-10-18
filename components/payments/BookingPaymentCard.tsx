"use client";

import React, { useEffect, useState } from "react";
import { payments, type PaymentAuto } from "@/lib/api";

type Mode = "counter" | "advance" | "full";

const input = "w-24 px-2 py-1 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none";

function modeOf(a: PaymentAuto): Mode {
  if (!a.tokens && !a.appointments) return "counter";
  return a.advance_paise ? "advance" : "full";
}

/**
 * One choice: how money is taken when a token or appointment is booked. Counter (the default) needs nothing set up;
 * the two online choices send a Razorpay link right after the booking - from the AI, an automation, or the QR.
 */
export function BookingPaymentCard({ canEdit, onSaved }: { canEdit: boolean; onSaved?: () => void }) {
  const [mode, setMode] = useState<Mode>("counter");
  const [fee, setFee] = useState("");
  const [advance, setAdvance] = useState("");
  const [gatewayOn, setGatewayOn] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    payments.auto().then((a) => {
      setMode(modeOf(a));
      setFee(a.default_fee_paise ? String(a.default_fee_paise / 100) : "");
      setAdvance(a.advance_paise ? String(a.advance_paise / 100) : "");
    }).catch(() => {});
    payments.gateway().then((g) => setGatewayOn(g.connected)).catch(() => {});
  }, []);

  const paise = (rupees: string) => {
    const n = Math.round(Number(rupees) * 100);
    return rupees.trim() && n >= 100 ? n : null;
  };

  const save = async () => {
    setError(null); setSaved(false);
    if (mode === "advance" && !paise(advance)) { setError("Enter the advance amount (at least Rs 1)."); return; }
    const online = mode !== "counter";
    try {
      await payments.setAuto({
        tokens: online, appointments: online,
        default_fee_paise: paise(fee),
        advance_paise: mode === "advance" ? paise(advance) : null,
      });
      setSaved(true);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    }
  };

  const option = (value: Mode, title: string, hint: string, disabled = false) => (
    <label className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer ${
      mode === value ? "border-brass/50 bg-brass/10" : "border-white/[0.06] bg-white/[0.02]"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
      <input type="radio" name="booking-payment" className="mt-0.5" checked={mode === value} disabled={disabled || !canEdit}
        onChange={() => { setMode(value); setSaved(false); }} />
      <span>
        <span className="block text-xs font-semibold text-white">{title}</span>
        <span className="block text-[11px] text-os-text-dim">{hint}</span>
      </span>
    </label>
  );

  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
      <div>
        <h4 className="text-xs font-bold text-white">Payment with a booking</h4>
        <p className="text-[11px] text-os-text-dim">How you take the fee when someone gets a token or books an appointment - on WhatsApp, at the kiosk or by your team.</p>
      </div>
      <div className="space-y-2">
        {option("counter", "Only the token - fee at the counter", "Nothing is paid online. The token message tells the patient the fee to pay at the counter.")}
        {option("advance", "Advance online, the rest at the counter", "A Razorpay link for the advance right after booking. The rest shows as the balance to collect at the counter.", !gatewayOn)}
        {mode === "advance" && (
          <div className="flex items-center gap-2 pl-8 text-[11px] text-os-text-dim">
            Advance ₹ <input type="number" min="1" value={advance} onChange={(e) => setAdvance(e.target.value)} disabled={!canEdit} className={input} />
          </div>
        )}
        {option("full", "Full fee online", "A Razorpay link for the whole fee right after booking.", !gatewayOn)}
      </div>
      {!gatewayOn && <p className="text-[11px] text-amber-300">To take money online, connect Razorpay below first.</p>}
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-os-text-dim">
        Fee, when the doctor has none set: ₹
        <input type="number" min="1" value={fee} onChange={(e) => setFee(e.target.value)} disabled={!canEdit} className={input} />
        <span>(a token has no doctor yet, so this fee is used)</span>
      </div>
      <p className="text-[11px] text-os-text-dim">
        Cancellation and refund rules belong in your Business card (Knowledge), so the AI answers them the same way every
        time. Refunds are made from your Razorpay dashboard.
      </p>
      {canEdit && (
        <div className="flex items-center gap-3">
          <button type="button" onClick={save} className="px-4 py-1.5 rounded-lg bg-brass hover:bg-brass-dim text-white text-xs font-bold cursor-pointer">Save</button>
          {saved && <span className="text-[11px] text-emerald-300">Saved</span>}
          {error && <span className="text-[11px] text-red-400">{error}</span>}
        </div>
      )}
    </div>
  );
}
