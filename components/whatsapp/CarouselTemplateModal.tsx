"use client";

import React, { useState } from "react";
import { Sparkles, Upload, Trash2, Plus, ImageIcon, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { templates, type Template } from "@/lib/api";

type CardState = {
  body: string;
  buttonLabel: string;
  imagePreviewUrl: string | null;
  headerHandle: string | null;
  mediaId: string | null;
  isUploading: boolean;
  uploadError: string | null;
};

const EMPTY_CARD: CardState = {
  body: "", buttonLabel: "", imagePreviewUrl: null,
  headerHandle: null, mediaId: null, isUploading: false, uploadError: null,
};

const MIN_CARDS = 2;
const MAX_CARDS = 10;

/**
 * A carousel template's cards get their content from an AI draft, but
 * nothing is submitted to Meta until a human has looked at every card -
 * same discipline as every other AI-authored thing on this platform.
 * The pictures are never AI-generated: a business's own photos, chosen here.
 */
export function CarouselTemplateModal({
  isOpen, onClose, onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (template: Template) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"MARKETING" | "UTILITY">("MARKETING");
  const [language, setLanguage] = useState("en");
  const [mainBody, setMainBody] = useState("");

  const [brief, setBrief] = useState("");
  const [cardCount, setCardCount] = useState(4);
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  const [cards, setCards] = useState<CardState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const reset = () => {
    setName(""); setMainBody(""); setBrief(""); setCards([]);
    setDraftError(null); setSubmitError(null);
  };

  const handleDraft = async () => {
    if (!brief.trim()) return;
    setIsDrafting(true);
    setDraftError(null);
    try {
      const result = await templates.draftCarouselCards(brief, cardCount);
      setCards(
        result.cards.map((c) => ({ ...EMPTY_CARD, body: c.body, buttonLabel: c.button_label })),
      );
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : "Could not draft cards right now.");
    } finally {
      setIsDrafting(false);
    }
  };

  const updateCard = (index: number, patch: Partial<CardState>) => {
    setCards((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  const handleImagePick = async (index: number, file: File) => {
    const previewUrl = URL.createObjectURL(file);
    updateCard(index, { imagePreviewUrl: previewUrl, isUploading: true, uploadError: null });
    try {
      const uploaded = await templates.uploadCarouselImage(file);
      updateCard(index, {
        headerHandle: uploaded.header_handle, mediaId: uploaded.media_id, isUploading: false,
      });
    } catch (err) {
      updateCard(index, {
        isUploading: false,
        uploadError: err instanceof Error ? err.message : "Could not upload this image.",
      });
    }
  };

  const addCard = () => setCards((prev) => (prev.length < MAX_CARDS ? [...prev, { ...EMPTY_CARD }] : prev));
  const removeCard = (index: number) =>
    setCards((prev) => (prev.length > MIN_CARDS ? prev.filter((_, i) => i !== index) : prev));

  const canSubmit =
    name.trim() &&
    mainBody.trim() &&
    cards.length >= MIN_CARDS &&
    cards.every((c) => c.body.trim() && c.headerHandle && c.mediaId && !c.isUploading);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const created = await templates.create({
        name: name.toLowerCase().replace(/\s+/g, "_"),
        category,
        body: mainBody,
        language,
        carousel_cards: cards.map((c) => ({
          header_handle: c.headerHandle!,
          media_id: c.mediaId!,
          body: c.body,
          buttons: c.buttonLabel ? [{ type: "QUICK_REPLY", text: c.buttonLabel }] : [],
        })),
      });
      onCreated(created);
      reset();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not submit this template.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { reset(); onClose(); }}
      title="New Carousel Template"
      subtitle="Up to 10 swipeable cards in one message - drafted by AI, reviewed by you, approved by Meta."
      maxWidth="xl"
    >
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Template Name</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="spring_collection"
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Category</label>
            <select
              value={category} onChange={(e) => setCategory(e.target.value as "MARKETING" | "UTILITY")}
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
            >
              <option value="MARKETING">Marketing</option>
              <option value="UTILITY">Utility</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">
            Message Text (shown above the cards)
          </label>
          <textarea
            rows={2} value={mainBody} onChange={(e) => setMainBody(e.target.value)}
            placeholder="Here's what's new this week, {{customer_name}}"
            className="w-full p-2.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white placeholder:text-os-text-dim focus:border-brass focus:outline-none"
          />
        </div>

        <div className="p-3.5 rounded-xl bg-brass/[0.06] border border-brass/20 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-brass-bright">
            <Sparkles className="w-3.5 h-3.5" /> Draft the cards
          </div>
          <div className="flex gap-2">
            <input
              type="text" value={brief} onChange={(e) => setBrief(e.target.value)}
              placeholder="What's this carousel for? e.g. a retention offer for customers who haven't ordered in 60 days"
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white placeholder:text-os-text-dim focus:border-brass focus:outline-none"
            />
            <select
              value={cardCount} onChange={(e) => setCardCount(Number(e.target.value))}
              className="px-2 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white"
            >
              {Array.from({ length: MAX_CARDS - MIN_CARDS + 1 }, (_, i) => i + MIN_CARDS).map((n) => (
                <option key={n} value={n}>{n} cards</option>
              ))}
            </select>
            <button
              type="button" onClick={handleDraft} disabled={isDrafting || !brief.trim()}
              className="px-3 py-1.5 rounded-lg bg-brass hover:bg-brass-dim text-white text-xs font-bold disabled:opacity-40 cursor-pointer whitespace-nowrap"
            >
              {isDrafting ? "Drafting..." : "Draft with AI"}
            </button>
          </div>
          {draftError && <p className="text-[11px] text-red-400">{draftError}</p>}
          <p className="text-[10px] text-os-text-dim">
            Only the text is drafted. Every card's picture is your own, and every word here is yours to edit before anything goes to Meta.
          </p>
        </div>

        {cards.length > 0 && (
          <div className="space-y-3">
            {cards.map((card, i) => (
              <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08] flex gap-3">
                <label className="w-20 h-20 shrink-0 rounded-lg border border-dashed border-white/20 flex items-center justify-center cursor-pointer bg-black/30 overflow-hidden relative">
                  {card.imagePreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={card.imagePreviewUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-os-text-dim" />
                  )}
                  {card.isUploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    </div>
                  )}
                  <input
                    type="file" accept="image/jpeg,image/png" className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImagePick(i, file);
                    }}
                  />
                </label>

                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-os-text-dim">Card {i + 1}</span>
                    <button
                      type="button" onClick={() => removeCard(i)}
                      disabled={cards.length <= MIN_CARDS}
                      className="text-os-text-dim hover:text-thread-bright disabled:opacity-30 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <textarea
                    rows={2} maxLength={160} value={card.body}
                    onChange={(e) => updateCard(i, { body: e.target.value })}
                    placeholder="This card's text (max 160 characters)"
                    className="w-full p-2 rounded-lg bg-black/40 border border-white/[0.1] text-xs text-white placeholder:text-os-text-dim focus:border-brass focus:outline-none"
                  />
                  <input
                    type="text" maxLength={25} value={card.buttonLabel}
                    onChange={(e) => updateCard(i, { buttonLabel: e.target.value })}
                    placeholder="Button label (optional, max 25 chars)"
                    className="w-full px-2 py-1.5 rounded-lg bg-black/40 border border-white/[0.1] text-xs text-white placeholder:text-os-text-dim focus:border-brass focus:outline-none"
                  />
                  {card.uploadError && <p className="text-[10px] text-red-400">{card.uploadError}</p>}
                  {!card.headerHandle && !card.isUploading && (
                    <p className="text-[10px] text-amber-400">Upload a picture for this card</p>
                  )}
                </div>
              </div>
            ))}

            {cards.length < MAX_CARDS && (
              <button
                type="button" onClick={addCard}
                className="text-[11px] text-brass-bright hover:text-brass flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add another card
              </button>
            )}
          </div>
        )}

        {submitError && (
          <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {submitError}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
          <button
            type="button" onClick={() => { reset(); onClose(); }}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-os-text-dim hover:text-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button" onClick={handleSubmit} disabled={!canSubmit || isSubmitting}
            className="px-4 py-2 rounded-xl bg-brass hover:bg-brass-dim text-white text-xs font-bold disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            {isSubmitting ? "Submitting..." : "Submit for Meta Review"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
