"use client";

import React, { useEffect, useState } from "react";
import { ClipboardList, Plus, Trash2, Pencil, Copy, Check, ExternalLink } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import {
  leadForms,
  type LeadForm,
  type LeadFormField,
  type FormFieldType,
} from "@/lib/api";

const FIELD_TYPE_LABEL: Record<FormFieldType, string> = {
  name: "Name",
  phone: "Phone number",
  email: "Email",
  text: "Short text",
  textarea: "Long text",
  select: "Dropdown",
  checkbox: "Checkbox",
};

function newField(): LeadFormField {
  return { key: `field_${Math.random().toString(36).slice(2, 8)}`, label: "", type: "text", required: false };
}

type Draft = {
  title: string;
  description: string;
  fields: LeadFormField[];
  is_published: boolean;
};

function emptyDraft(): Draft {
  return {
    title: "",
    description: "",
    fields: [
      { key: "name", label: "Name", type: "name", required: true },
      { key: "phone", label: "Phone number", type: "phone", required: true },
    ],
    is_published: false,
  };
}

export default function FormsPage() {
  const [forms, setForms] = useState<LeadForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = () => {
    setIsLoading(true);
    leadForms
      .list()
      .then((rows) => {
        setForms(rows);
        setLoadError(null);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Could not load forms."))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setSaveError(null);
    setIsModalOpen(true);
  };

  const openEdit = (form: LeadForm) => {
    setEditingId(form.id);
    setDraft({
      title: form.title,
      description: form.description || "",
      fields: form.fields.map((f) => ({ ...f })),
      is_published: form.is_published,
    });
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!draft.title.trim()) {
      setSaveError("Give this form a title.");
      return;
    }
    if (draft.fields.some((f) => !f.label.trim())) {
      setSaveError("Every field needs a label.");
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const body = { ...draft, description: draft.description.trim() || null };
      if (editingId) {
        await leadForms.update(editingId, body);
      } else {
        await leadForms.create(body);
      }
      setIsModalOpen(false);
      load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save this form.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (form: LeadForm) => {
    const ok = window.confirm(`Delete "${form.title}"? Its public link will stop working. Past submissions stay in your Leads.`);
    if (!ok) return;
    try {
      await leadForms.remove(form.id);
      load();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not delete this form.");
    }
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
    } catch {
      // still shown in full, selectable by hand
    }
  };

  const updateField = (index: number, patch: Partial<LeadFormField>) => {
    setDraft((d) => ({
      ...d,
      fields: d.fields.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    }));
  };

  const removeField = (index: number) => {
    setDraft((d) => ({ ...d, fields: d.fields.filter((_, i) => i !== index) }));
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-os-accent" />
            <h2 className="text-sm font-bold text-white">Forms</h2>
            <span className="text-[11px] text-os-text-dim font-mono">
              Build a form, share its link, and every submission lands in Leads.
            </span>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-white/90 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Create form
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : loadError ? (
          <p className="text-xs text-red-400">{loadError}</p>
        ) : forms.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No forms yet"
            description="Build a form for callback requests, a newsletter signup, or anything else you'd like a hosted link for. Submissions become leads automatically."
            action={{ label: "Create your first form", onClick: openCreate }}
          />
        ) : (
          <div className="space-y-3">
            {forms.map((form) => (
              <GlassCard key={form.id} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-bold text-white truncate">{form.title}</span>
                    <Badge variant={form.is_published ? "emerald" : "amber"} dot size="sm">
                      {form.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(form)}
                      className="p-1.5 rounded-lg text-os-text-dim hover:text-white hover:bg-white/[0.06]"
                      aria-label="Edit form"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(form)}
                      className="p-1.5 rounded-lg text-os-text-dim hover:text-red-400 hover:bg-white/[0.06]"
                      aria-label="Delete form"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {form.description && (
                  <p className="text-[11px] text-os-text-dim">{form.description}</p>
                )}
                <p className="text-[11px] text-os-text-dim font-mono">
                  {form.fields.length} field{form.fields.length === 1 ? "" : "s"} · {form.submission_count} submission{form.submission_count === 1 ? "" : "s"}
                </p>
                {form.public_url ? (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/[0.08] text-[11px] text-white break-all">
                      {form.public_url}
                    </code>
                    <a
                      href={form.public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.1]"
                      aria-label="Open form"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopy(form.public_url as string)}
                      className="shrink-0 px-3 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold border border-white/[0.1]"
                    >
                      {copiedUrl === form.public_url ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-300">Publish this form to get a shareable link.</p>
                )}
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Edit form" : "Create form"}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="text-[11px] text-os-text-dim font-mono">Title</label>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="e.g. Request a callback"
              className="mt-1 w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-os-text-dim outline-none focus:border-white/[0.2]"
            />
          </div>
          <div>
            <label className="text-[11px] text-os-text-dim font-mono">Description (shown on the form, optional)</label>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              rows={2}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-os-text-dim outline-none focus:border-white/[0.2] resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] text-os-text-dim font-mono">Fields</label>
            {draft.fields.map((field, i) => (
              <div key={field.key} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateField(i, { label: e.target.value })}
                    placeholder="Field label"
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder:text-os-text-dim outline-none"
                  />
                  <select
                    value={field.type}
                    onChange={(e) => updateField(i, { type: e.target.value as FormFieldType })}
                    className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white outline-none"
                  >
                    {Object.entries(FIELD_TYPE_LABEL).map(([value, label]) => (
                      <option key={value} value={value} className="bg-[#14151F]">
                        {label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeField(i)}
                    className="shrink-0 p-1.5 rounded-lg text-os-text-dim hover:text-red-400 hover:bg-white/[0.06]"
                    aria-label="Remove field"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {field.type === "select" && (
                  <input
                    type="text"
                    value={(field.options || []).join(", ")}
                    onChange={(e) => updateField(i, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                    placeholder="Options, comma-separated (e.g. Buying, Renting)"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder:text-os-text-dim outline-none"
                  />
                )}
                <label className="flex items-center gap-1.5 text-[11px] text-os-text-dim">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField(i, { required: e.target.checked })}
                  />
                  Required
                </label>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setDraft((d) => ({ ...d, fields: [...d.fields, newField()] }))}
              className="flex items-center gap-1.5 text-xs text-os-accent hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              Add field
            </button>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-white">
            <input
              type="checkbox"
              checked={draft.is_published}
              onChange={(e) => setDraft((d) => ({ ...d, is_published: e.target.checked }))}
            />
            Published (the public link is live and accepting submissions)
          </label>

          {saveError && <p className="text-xs text-red-400">{saveError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold border border-white/[0.1]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-white/90 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : editingId ? "Save changes" : "Create form"}
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
