"use client";

/**
 * The public hosted form a business shares anywhere (bio, ad, QR code).
 * No AppLayout, no login - same reasoning app/kiosk/[token]/page.tsx gives
 * for hand-rolling fetch() against API_BASE instead of lib/api.ts's
 * request() (which demands a Bearer token this anonymous visitor doesn't
 * have). Backend: services/api/routers/lead_forms.py's public endpoints.
 *
 * Fields are grouped into pages by their own `step` number and shown one
 * page at a time; a field's `show_if` can hide it (and un-require it)
 * based on an earlier answer. A hidden "hp" input is a honeypot - see the
 * backend's own FormSubmitIn docstring for why a bot filling it gets a
 * normal-looking success instead of a rejection.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2, Paperclip } from "lucide-react";
import { API_BASE } from "@/lib/auth";
import type { FormFieldType, LeadFormShowIf } from "@/lib/api";

type PublicField = {
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[] | null;
  step: number;
  show_if?: LeadFormShowIf | null;
};

type PublicForm = {
  title: string;
  description: string | null;
  fields: PublicField[];
  logo_url: string | null;
  accent_color: string | null;
};

function isVisible(field: PublicField, values: Record<string, string>): boolean {
  if (!field.show_if) return true;
  return (values[field.show_if.field_key] || "") === field.show_if.equals;
}

export default function PublicFormPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [form, setForm] = useState<PublicForm | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
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

  const accent = form?.accent_color || "#FFFFFF";

  const pages = useMemo(() => {
    if (!form) return [];
    const steps = Array.from(new Set(form.fields.map((f) => f.step))).sort((a, b) => a - b);
    return steps.map((step) => form.fields.filter((f) => f.step === step));
  }, [form]);

  const currentPageFields = (pages[pageIndex] || []).filter((f) => isVisible(f, values));
  const isLastPage = pageIndex >= pages.length - 1;

  const handleFileChange = async (field: PublicField, file: File | undefined) => {
    if (!file) return;
    setUploadingKey(field.key);
    setSubmitError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/api/v1/forms/${token}/upload`, { method: "POST", body: formData });
      if (!res.ok) {
        setSubmitError("Could not upload this file.");
        return;
      }
      const body = await res.json();
      setValues((v) => ({ ...v, [field.key]: body.url }));
    } catch {
      setSubmitError("Could not reach the server.");
    } finally {
      setUploadingKey(null);
    }
  };

  const goNext = () => {
    const missing = currentPageFields.find((f) => f.required && !(values[f.key] || "").trim());
    if (missing) {
      setSubmitError(`Please fill in "${missing.label}" before continuing.`);
      return;
    }
    setSubmitError(null);
    setPageIndex((p) => p + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing = currentPageFields.find((f) => f.required && !(values[f.key] || "").trim());
    if (missing) {
      setSubmitError(`Please fill in "${missing.label}" before submitting.`);
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/forms/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values, hp: values.__hp || "" }),
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
        <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#111111] p-8 text-center shadow-2xl">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: `${accent}22` }}
          >
            <CheckCircle2 className="w-7 h-7" style={{ color: accent }} />
          </div>
          <h1 className="text-lg font-semibold text-white">Thank you</h1>
          <p className="mt-1.5 text-sm text-white/60">Your submission has been received.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0A0A0A] px-4 py-10 sm:py-16 flex justify-center">
      <div className="w-full max-w-md">
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-white/[0.08] bg-[#111111] p-6 sm:p-8 shadow-2xl"
        >
          <div className="space-y-3">
            {form.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover border border-white/[0.08]" />
            )}
            <div className="space-y-1.5">
              <h1 className="text-xl font-semibold tracking-tight text-white">{form.title}</h1>
              {form.description && <p className="text-sm leading-relaxed text-white/60">{form.description}</p>}
            </div>
          </div>

          {pages.length > 1 && (
            <div className="space-y-1.5">
              <div className="flex gap-1.5">
                {pages.map((_, i) => (
                  <div
                    key={i}
                    className="h-1 flex-1 rounded-full transition-colors"
                    style={{ backgroundColor: i <= pageIndex ? accent : "rgba(255,255,255,0.08)" }}
                  />
                ))}
              </div>
              <p className="text-[11px] text-white/40 font-mono">Step {pageIndex + 1} of {pages.length}</p>
            </div>
          )}

          {/* Honeypot - visually hidden, never shown to a real visitor. A real
              browser's autofill is discouraged from touching it via
              autoComplete="off" and tabIndex=-1 keeps keyboard users from
              ever landing in it by accident. */}
          <input
            type="text"
            value={values.__hp || ""}
            onChange={(e) => setValues((v) => ({ ...v, __hp: e.target.value }))}
            name="company_website"
            autoComplete="off"
            tabIndex={-1}
            aria-hidden="true"
            className="absolute -left-[9999px] h-0 w-0 opacity-0"
          />

          <div className="space-y-4">
            {currentPageFields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <label className="text-xs font-medium text-white/70">
                  {field.label}
                  {field.required && <span className="text-red-400"> *</span>}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    required={field.required}
                    rows={3}
                    value={values[field.key] || ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm text-white outline-none transition-colors resize-none"
                    onFocus={(e) => (e.currentTarget.style.borderColor = accent)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "")}
                  />
                ) : field.type === "select" ? (
                  <select
                    required={field.required}
                    value={values[field.key] || ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                    onFocus={(e) => (e.currentTarget.style.borderColor = accent)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "")}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm text-white outline-none transition-colors"
                  >
                    <option value="" className="bg-[#0A0A0A]">Select...</option>
                    {(field.options || []).map((opt) => (
                      <option key={opt} value={opt} className="bg-[#0A0A0A]">{opt}</option>
                    ))}
                  </select>
                ) : field.type === "checkbox" ? (
                  <label className="flex items-center gap-2.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 py-2.5 text-sm text-white/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={values[field.key] === "true"}
                      onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.checked ? "true" : "" }))}
                      className="accent-current"
                      style={{ color: accent }}
                    />
                    Yes
                  </label>
                ) : field.type === "file" ? (
                  <div className="flex items-center gap-2.5">
                    <label className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm text-white/80 cursor-pointer hover:bg-white/[0.06] transition-colors">
                      <Paperclip className="w-3.5 h-3.5" />
                      {uploadingKey === field.key ? "Uploading..." : values[field.key] ? "Replace file" : "Choose file"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,application/pdf"
                        className="hidden"
                        onChange={(e) => handleFileChange(field, e.target.files?.[0])}
                      />
                    </label>
                    {values[field.key] && !uploadingKey && (
                      <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: accent }} />
                    )}
                  </div>
                ) : (
                  <input
                    type={
                      field.type === "email" ? "email"
                      : field.type === "phone" ? "tel"
                      : field.type === "date" ? "date"
                      : field.type === "number" ? "number"
                      : field.type === "url" ? "url"
                      : "text"
                    }
                    required={field.required}
                    value={values[field.key] || ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                    onFocus={(e) => (e.currentTarget.style.borderColor = accent)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "")}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm text-white outline-none transition-colors"
                  />
                )}
              </div>
            ))}
          </div>

          {submitError && <p className="text-xs text-red-400">{submitError}</p>}

          <div className="flex items-center gap-2.5">
            {pageIndex > 0 && (
              <button
                type="button"
                onClick={() => setPageIndex((p) => p - 1)}
                className="px-4 py-2.5 rounded-xl bg-white/[0.06] text-white text-sm font-semibold hover:bg-white/[0.1] transition-all"
              >
                Back
              </button>
            )}
            {isLastPage ? (
              <button
                type="submit"
                disabled={isSubmitting || uploadingKey !== null}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all hover:brightness-110"
                style={{ backgroundColor: accent, color: "#0A0A0A" }}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                disabled={uploadingKey !== null}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all hover:brightness-110"
                style={{ backgroundColor: accent, color: "#0A0A0A" }}
              >
                Next
              </button>
            )}
          </div>
        </form>

        <p className="mt-5 text-center text-[11px] text-white/25">Powered by KROVA</p>
      </div>
    </div>
  );
}
