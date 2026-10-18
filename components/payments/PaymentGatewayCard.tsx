"use client";

import React, { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { payments, type PaymentGateway } from "@/lib/api";

const input = "w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none";

/** Connect the business's own Razorpay, so payment links can be sent on WhatsApp and marked paid by themselves. */
export function PaymentGatewayCard() {
  const [gateway, setGateway] = useState<PaymentGateway | null>(null);
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    payments.gateway().then(setGateway).catch(() => setGateway({ connected: false, gateway: null, key_id_hint: null, connected_at: null }));
  }, []);

  const connect = async () => {
    setBusy(true); setError(null);
    try {
      setGateway(await payments.connectGateway(keyId.trim(), keySecret.trim()));
      setKeyId(""); setKeySecret("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect.");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true); setError(null);
    try {
      await payments.disconnectGateway();
      setGateway({ connected: false, gateway: null, key_id_hint: null, connected_at: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disconnect.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Payment links (Razorpay)</h4>
            <p className="text-[11px] text-os-text-dim">
              Send a payment link on WhatsApp for a fee or a balance. The money goes straight to your Razorpay account;
              KROVA marks it paid by itself once Razorpay confirms.
            </p>
          </div>
        </div>
        <Badge variant={gateway?.connected ? "emerald" : "outline"} size="sm">{gateway?.connected ? "Connected" : "Not connected"}</Badge>
      </div>

      {gateway?.connected ? (
        <div className="flex items-center justify-between gap-3 text-[11px] text-os-text-dim">
          <span>Key <span className="font-mono text-white">{gateway.key_id_hint}</span></span>
          <button type="button" onClick={disconnect} disabled={busy} className="text-os-text-dim hover:text-thread-bright cursor-pointer">Disconnect</button>
        </div>
      ) : null}

      {gateway?.connected ? null : (
        <div className="space-y-2">
          <p className="text-[11px] text-os-text-dim">
            In Razorpay: <span className="text-white">Account &amp; Settings → API Keys → Generate Key</span>. Paste both here.
            KROVA checks the key with Razorpay before saving it, and keeps the secret encrypted.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input value={keyId} onChange={(e) => setKeyId(e.target.value)} placeholder="Key ID (rzp_live_...)" className={input} autoComplete="off" />
            <input value={keySecret} onChange={(e) => setKeySecret(e.target.value)} placeholder="Key Secret" type="password" className={input} autoComplete="new-password" />
          </div>
          <button type="button" onClick={connect} disabled={busy || !keyId.trim() || !keySecret.trim()}
            className="px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold border border-white/[0.1] cursor-pointer disabled:opacity-40">
            {busy ? "Checking..." : "Connect Razorpay"}
          </button>
        </div>
      )}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
