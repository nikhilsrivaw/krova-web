"use client";

/**
 * The public self-service check-in kiosk. No AppLayout, no login - meant
 * for a tablet sitting at a clinic's front desk. Deliberately bypasses
 * lib/api.ts's request() (which demands a Bearer token and throws
 * NotAuthenticated) and hand-rolls fetch() the same way lib/auth.ts does
 * for pre-login calls - there is no generic "public request" helper in
 * this codebase to reuse, by design (see the backend's services/api/
 * routers/kiosk.py for the auth model this talks to).
 */

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Sun, Moon, Siren, Loader2 } from "lucide-react";
import { API_BASE } from "@/lib/auth";

type Shift = "morning" | "evening" | "emergency";

const SHIFT_META: Record<Shift, { label: string; icon: typeof Sun }> = {
  morning: { label: "Morning", icon: Sun },
  evening: { label: "Evening", icon: Moon },
  emergency: { label: "Emergency", icon: Siren },
};

type OpenShift = { shift: Shift; waiting_count: number };
type StatusResponse = { business_name: string; open_shifts: OpenShift[] };
type CheckInResponse = { queue_number: number; shift: Shift; ahead_of_you: number };

const STATUS_POLL_MS = 15000;
const RESET_AFTER_MS = 8000;

type Screen = { kind: "idle" } | { kind: "form"; shift: Shift } | { kind: "confirmed"; result: CheckInResponse };

export default function KioskPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>({ kind: "idle" });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/kiosk/${token}/status`);
      if (!res.ok) {
        setStatusError(res.status === 404 ? "This kiosk link isn't active." : "Could not load status.");
        return;
      }
      setStatus(await res.json());
      setStatusError(null);
    } catch {
      setStatusError("Could not reach the server.");
    }
  }, [token]);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, STATUS_POLL_MS);
    return () => clearInterval(interval);
  }, [loadStatus]);

  useEffect(() => {
    if (screen.kind !== "confirmed") return;
    const timeout = setTimeout(() => {
      setScreen({ kind: "idle" });
      setName("");
      setPhone("");
      loadStatus();
    }, RESET_AFTER_MS);
    return () => clearTimeout(timeout);
  }, [screen, loadStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (screen.kind !== "form") return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/kiosk/${token}/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, shift: screen.shift }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(body.detail || "Could not check you in - please see the front desk.");
        return;
      }
      setScreen({ kind: "confirmed", result: body as CheckInResponse });
    } catch {
      setSubmitError("Could not reach the server - please see the front desk.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0A0E17", color: "white", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      {statusError ? (
        <p style={{ fontSize: "1.25rem", opacity: 0.7 }}>{statusError}</p>
      ) : !status ? (
        <Loader2 className="animate-spin" style={{ width: 40, height: 40, opacity: 0.5 }} />
      ) : screen.kind === "idle" ? (
        <div style={{ textAlign: "center", width: "100%", maxWidth: 480 }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>{status.business_name}</h1>
          <p style={{ opacity: 0.6, marginBottom: "2rem" }}>Tap a shift to get your token</p>
          {status.open_shifts.length === 0 ? (
            <p style={{ fontSize: "1.1rem", opacity: 0.7 }}>No shift is open right now - please check with the front desk.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {status.open_shifts.map((s) => {
                const Icon = SHIFT_META[s.shift].icon;
                return (
                  <button
                    key={s.shift}
                    onClick={() => setScreen({ kind: "form", shift: s.shift })}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "1.5rem", borderRadius: "1rem", background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)", color: "white", cursor: "pointer", fontSize: "1.1rem",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <Icon style={{ width: 24, height: 24 }} />
                      {SHIFT_META[s.shift].label}
                    </span>
                    <span style={{ opacity: 0.6, fontSize: "0.9rem" }}>{s.waiting_count} waiting</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : screen.kind === "form" ? (
        <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, textAlign: "center", marginBottom: "0.5rem" }}>
            {SHIFT_META[screen.shift].label} check-in
          </h2>
          {submitError && (
            <p style={{ color: "#f87171", fontSize: "0.9rem", textAlign: "center" }}>{submitError}</p>
          )}
          <input
            autoFocus
            required
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ padding: "1rem", borderRadius: "0.75rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "white", fontSize: "1.1rem" }}
          />
          <input
            required
            type="tel"
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{ padding: "1rem", borderRadius: "0.75rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "white", fontSize: "1.1rem" }}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            style={{ padding: "1rem", borderRadius: "0.75rem", background: "#d4a24c", color: "#14151F", fontWeight: 700, fontSize: "1.1rem", border: "none", cursor: "pointer" }}
          >
            {isSubmitting ? "Getting your token..." : "Get My Token"}
          </button>
          <button
            type="button"
            onClick={() => setScreen({ kind: "idle" })}
            style={{ padding: "0.75rem", background: "transparent", color: "rgba(255,255,255,0.5)", border: "none", cursor: "pointer" }}
          >
            Cancel
          </button>
        </form>
      ) : (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "1.1rem", opacity: 0.6, marginBottom: "0.5rem" }}>
            {SHIFT_META[screen.result.shift].label} token
          </p>
          <p style={{ fontSize: "6rem", fontWeight: 800, lineHeight: 1, marginBottom: "1rem" }}>
            #{screen.result.queue_number}
          </p>
          <p style={{ fontSize: "1.1rem", opacity: 0.8 }}>
            {screen.result.ahead_of_you === 0
              ? "You're next!"
              : `${screen.result.ahead_of_you} ${screen.result.ahead_of_you === 1 ? "person" : "people"} ahead of you`}
          </p>
          <p style={{ opacity: 0.5, marginTop: "1rem" }}>We've sent your token on WhatsApp too.</p>
        </div>
      )}
    </div>
  );
}
