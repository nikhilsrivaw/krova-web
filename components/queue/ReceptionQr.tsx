"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, Printer, QrCode } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { account, channels, queue as queueApi } from "@/lib/api";

const input = "w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none";
const QR_OPTIONS = { width: 600, margin: 1, color: { dark: "#111111", light: "#ffffff" } };

type Poster = { title: string; qr: string; stepsHi: string[]; stepsEn: string[] };

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

/** An A4 page to print and put at reception: the clinic's name, a big QR, and three steps in Hindi and English. */
function printPoster(business: string, p: Poster) {
  const w = window.open("", "_blank");
  if (!w) return;
  const li = (items: string[]) => items.map((s) => `<li>${escapeHtml(s)}</li>`).join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(business)} - ${escapeHtml(p.title)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: system-ui, "Noto Sans Devanagari", sans-serif; color: #111; text-align: center; margin: 0; }
  h1 { font-size: 34px; margin: 8px 0 4px; } h2 { font-size: 24px; margin: 0 0 18px; font-weight: 600; color: #333; }
  img { width: 92mm; height: 92mm; border: 6px solid #111; border-radius: 12px; padding: 6px; }
  .cols { display: flex; gap: 10mm; justify-content: center; text-align: left; margin-top: 16px; }
  ol { font-size: 18px; line-height: 1.6; margin: 0; padding-left: 22px; max-width: 80mm; }
  .note { margin-top: 18px; font-size: 14px; color: #555; }
</style></head><body>
  <h1>${escapeHtml(business)}</h1>
  <h2>${escapeHtml(p.title)}</h2>
  <img src="${p.qr}" alt="QR code" />
  <div class="cols"><ol>${li(p.stepsHi)}</ol><ol>${li(p.stepsEn)}</ol></div>
  <p class="note">Smartphone nahi hai? Reception par puchhiye. &nbsp;·&nbsp; No smartphone? Please ask at reception.</p>
  <script>window.onload = () => { window.print(); };</script>
</body></html>`);
  w.document.close();
}

/**
 * Two QR codes for the reception desk. WhatsApp: opens a chat with the clinic, the message already typed; that exact
 * message gets a token without the AI (backend: shared/scheduling/qr_token.py). Kiosk: opens the check-in page on the
 * patient's own phone. Each can be downloaded or printed as an A4 poster.
 */
export function ReceptionQr({ kioskUrl, canEdit }: { kioskUrl: string | null; canEdit: boolean }) {
  const [business, setBusiness] = useState("Our clinic");
  const [handle, setHandle] = useState<string | null>(null);
  const [phrase, setPhrase] = useState("");
  const [savedPhrase, setSavedPhrase] = useState("");
  const [waQr, setWaQr] = useState<string | null>(null);
  const [kioskQr, setKioskQr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    account.profile().then((p) => setBusiness(p.business_name || "Our clinic")).catch(() => {});
    channels.list().then((all) => setHandle(all.find((c) => c.channel === "whatsapp" && c.handle)?.handle ?? null)).catch(() => {});
    queueApi.getSettings().then((s) => { setPhrase(s.qr_phrase); setSavedPhrase(s.qr_phrase); }).catch(() => {});
  }, []);

  const waLink = handle && savedPhrase
    ? `https://wa.me/${handle.replace(/\D/g, "")}?text=${encodeURIComponent(savedPhrase)}`
    : null;

  useEffect(() => {
    if (!waLink) { setWaQr(null); return; }
    QRCode.toDataURL(waLink, QR_OPTIONS).then(setWaQr).catch(() => setWaQr(null));
  }, [waLink]);

  useEffect(() => {
    if (!kioskUrl) { setKioskQr(null); return; }
    QRCode.toDataURL(kioskUrl, QR_OPTIONS).then(setKioskQr).catch(() => setKioskQr(null));
  }, [kioskUrl]);

  const savePhrase = async () => {
    setNote(null);
    try {
      const s = await queueApi.updateSettings({ qr_phrase: phrase.trim() });
      setSavedPhrase(s.qr_phrase); setPhrase(s.qr_phrase); setNote("Saved. Print the poster again - the old QR still types the old message.");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not save.");
    }
  };

  const tile = (title: string, qr: string | null, onPrint: () => void, file: string, body: React.ReactNode) => (
    <div className="flex-1 min-w-[240px] p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
      <p className="text-xs font-bold text-white">{title}</p>
      {body}
      {qr && (
        <div className="flex items-end gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`${title} QR code`} className="w-32 h-32 rounded-lg bg-white p-1" />
          <div className="flex flex-col gap-2">
            <button type="button" onClick={onPrint} className="px-3 py-1.5 rounded-lg bg-brass hover:bg-brass-dim text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer">
              <Printer className="w-3.5 h-3.5" /> Print poster
            </button>
            <a href={qr} download={file} className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Download QR
            </a>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <GlassCard className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <QrCode className="w-4 h-4 text-brass" />
        <h4 className="text-xs font-bold text-white">Reception QR</h4>
      </div>
      <p className="text-[11px] text-os-text-dim">
        Print one and put it at reception or on the door. Patients scan it with their own phone and get a token - no app.
      </p>
      <div className="flex flex-wrap gap-3">
        {tile("Token on WhatsApp (recommended)", waQr, () => waQr && printPoster(business, {
          title: "Token ke liye scan karein · Scan for your token",
          qr: waQr,
          stepsHi: ["Phone ke camera se QR scan karein", "WhatsApp khulega, message pehle se likha hoga - Send dabayein", "Token number aur payment link WhatsApp par aa jayega"],
          stepsEn: ["Scan the QR with your phone camera", "WhatsApp opens with the message typed - tap Send", "Your token number and payment link arrive on WhatsApp"],
        }), "whatsapp-token-qr.png", (
          handle ? (
            <div className="space-y-2">
              <p className="text-[11px] text-os-text-dim">
                Opens a chat with <span className="text-white font-mono">{handle}</span> with this message typed. Exactly this
                message gets a token straight away, in the shift running now - and the reply, payment link and turn alert need
                no template.
              </p>
              <div className="flex gap-2">
                <input value={phrase} onChange={(e) => setPhrase(e.target.value)} maxLength={80} disabled={!canEdit} className={input} />
                {canEdit && (
                  <button type="button" onClick={savePhrase} disabled={!phrase.trim() || phrase.trim() === savedPhrase}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs cursor-pointer disabled:opacity-40">Save</button>
                )}
              </div>
            </div>
          ) : <p className="text-[11px] text-amber-300">Connect WhatsApp first (Settings → WhatsApp).</p>
        ))}
        {tile("Check-in page", kioskQr, () => kioskQr && printPoster(business, {
          title: "Check-in ke liye scan karein · Scan to check in",
          qr: kioskQr,
          stepsHi: ["Phone ke camera se QR scan karein", "Apna naam aur phone number bharein", "Token number screen par aur WhatsApp par milega"],
          stepsEn: ["Scan the QR with your phone camera", "Enter your name and phone number", "Your token shows on screen and on WhatsApp"],
        }), "checkin-qr.png", (
          kioskUrl
            ? <p className="text-[11px] text-os-text-dim">Opens the same check-in page as the tablet, on the patient&apos;s own phone. For patients who prefer not to use WhatsApp.</p>
            : <p className="text-[11px] text-amber-300">Turn on the self-service kiosk above to get this QR.</p>
        ))}
      </div>
      {note && <p className="text-[11px] text-emerald-300">{note}</p>}
    </GlassCard>
  );
}
