"use client";

import { useEffect, useState } from "react";
import { team } from "@/lib/api";
import { getUserId } from "@/lib/auth";
import { PhoneField } from "@/components/team/PhoneField";

/** Where calls for the signed-in person ring - customers put through to them, and their click-to-call. */
export function MyPhoneCard() {
  const [phone, setPhone] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    team.list().then((list) => {
      const me = list.find((m) => m.user_id === getUserId());
      setPhone(me ? me.phone ?? null : null);
    }).catch(() => setPhone(null));
  }, []);

  if (phone === undefined) return null;
  return (
    <section className="space-y-2.5">
      <p className="text-[11px] font-mono uppercase tracking-wide text-os-text-dim">Your phone</p>
      <div className="rounded-2xl border border-os-border bg-os-card p-3.5">
        <PhoneField
          tone="light"
          value={phone}
          label="Calls for you ring on"
          onSave={async (next) => {
            const res = await team.setMyPhone(next);
            setPhone(res.phone);
            return res.phone;
          }}
        />
      </div>
    </section>
  );
}
