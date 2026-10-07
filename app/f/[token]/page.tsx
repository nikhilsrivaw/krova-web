"use client";

/**
 * The public hosted form a business shares anywhere (bio, ad, QR code).
 * No AppLayout, no login - same reasoning app/kiosk/[token]/page.tsx gives
 * for hand-rolling fetch() against API_BASE instead of lib/api.ts's
 * request() (which demands a Bearer token this anonymous visitor doesn't
 * have). Backend: services/api/routers/lead_forms.py's public endpoints.
 */

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { API_BASE } from "@/lib/auth";
import type { FormFieldType } from "@/lib/api";

type PublicField = {
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[] | null;
};

type PublicForm = { title: string; description: string | null; fields: PublicField[] };

export default function PublicFormPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [form, setForm] = useState<PublicForm | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/forms/${token}/public`)
      .then(async (res) => {
        if (!res.ok) {
          setLoadError(res.status === 404 ? "This form isn't available." : "Could not load this form.");
          return;
        }
        setForm(await res.json());
      })
      .catch(() => setLoadError("Could not reach the server."));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/forms/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setSubmitError((body && body.detail) || "Could not submit this form. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setSubmitError("Could not reach the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#0A0A0A] px-4">
        <p className="text-sm text-white/60">{loadError}</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#0A0A0A]">
        <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#0A0A0A] px-4">
        <div className="max-w-sm text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h1 className="text-lg font-semibold text-white">Thank you</h1>
          <p className="text-sm text-white/60">Your submission has been received.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0A0A0A] px-4 py-10 flex justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5">
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold text-white">{form.title}</h1>
          {form.description && <p className="text-sm text-white/60">{form.description}</p>}
        </div>

        <div className="space-y-4">
          {form.fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <label className="text-xs text-white/70">
                {field.label}
                {field.required && <span className="text-red-400"> *</span>}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  required={field.required}
                  rows={3}
                  value={values[field.key] || ""}
                  onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.1] text-sm text-white outline-none focus:border-white/30 resize-none"
                />
              ) : field.type === "select" ? (
                <select
                  required={field.required}
                  value={values[field.key] || ""}
                  onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.1] text-sm text-white outline-none focus:border-white/30"
                >
                  <option value="" className="bg-[#0A0A0A]">Select...</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt} value={opt} className="bg-[#0A0A0A]">{opt}</option>
                  ))}
                </select>
              ) : field.type === "checkbox" ? (
                <label className="flex items-center gap-2 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={values[field.key] === "true"}
                    onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.checked ? "true" : "" }))}
                  />
                  Yes
                </label>
              ) : (
                <input
                  type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
                  required={field.required}
                  value={values[field.key] || ""}
                  onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.1] text-sm text-white outline-none focus:border-white/30"
                />
              )}
            </div>
          ))}
        </div>

        {submitError && <p className="text-xs text-red-400">{submitError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-4 py-2.5 rounded-lg bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:opacity-50 transition-all"
        >
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>
      </form>
    </div>
  );
}
