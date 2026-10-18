"use client";

import React, { useCallback, useEffect, useState } from "react";
import { IndianRupee } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { payments, type PaymentAuto } from "@/lib/api";
import { useRole } from "@/lib/useRole";
import { BookingPaymentCard } from "./BookingPaymentCard";

function rupees(paise: number | null) {
  return paise ? `₹${(paise / 100).toLocaleString("en-IN")}` : null;
}

function describe(a: PaymentAuto): string {
  const fee = rupees(a.default_fee_paise);
  if (!a.tokens && !a.appointments) return `Only the token - fee at the counter${fee ? ` (${fee})` : ""}`;
  if (a.advance_paise) return `Advance ${rupees(a.advance_paise)} online, the rest at the counter`;
  return `Full fee online${fee ? ` (${fee} when the doctor has none set)` : ""}`;
}

/**
 * The booking-payment choice, kept in sight where the desk works (Queue, Scheduling). One line saying what happens
 * now, and Change opening the same setting as in Settings - one setting, shown in three places.
 */
export function BookingPaymentStrip() {
  const { supervisor } = useRole();
  const [auto, setAuto] = useState<PaymentAuto | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    payments.auto().then(setAuto).catch(() => setAuto(null));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!auto) return null;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl border border-brass/25 bg-brass/[0.07]">
        <span className="flex items-center gap-2 text-xs text-white">
          <IndianRupee className="w-3.5 h-3.5 text-brass" />
          <span className="text-os-text-dim">Payment with a booking:</span>
          <span className="font-semibold">{describe(auto)}</span>
        </span>
        {supervisor && (
          <button type="button" onClick={() => setOpen(true)} className="px-3 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-semibold cursor-pointer">
            Change
          </button>
        )}
      </div>
      <Modal isOpen={open} onClose={() => { setOpen(false); load(); }} title="Payment with a booking" maxWidth="lg">
        <BookingPaymentCard canEdit={supervisor} onSaved={() => { load(); setOpen(false); }} />
      </Modal>
    </>
  );
}
