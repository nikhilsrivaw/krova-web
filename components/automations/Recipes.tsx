"use client";

import React, { useState } from "react";
import { Check, MessageSquare, Plus } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  postCallRules,
  type AutomationRule,
  type AutomationStepConfig,
  type AutomationTrigger,
  type Capability,
} from "@/lib/api";

/**
 * Ready-made rules. Each is a whole rule - trigger, conditions, waits and actions already filled in the right way
 * (the "every day while..." triggers are the easy ones to get wrong) - added in one click and then editable like any
 * other. Shown only when the business has what the rule needs; healthcare never gets a "come back" nudge (NMC).
 */
type Recipe = {
  key: string;
  title: string;
  description: string;
  trigger: AutomationTrigger;
  steps: AutomationStepConfig[];
  needs?: Capability[];
  notForHealthcare?: boolean;
  // sends a WhatsApp follow-up: needs the approved post_call_followup template
  usesTemplate?: boolean;
  // counts as added when any rule already uses this trigger (the lead quick-start makes one under its own name)
  onePerTrigger?: boolean;
};

const RECIPES: Recipe[] = [
  {
    key: "complaint_alert",
    title: "Tell me the moment someone complains",
    description: "A complaint in any chat alerts the owner and puts a task in front of the team.",
    trigger: "complaint.detected",
    steps: [
      { action_type: "notify_team", action_config: { to: "owner", message: "A customer complained: {{title}}" } },
      { action_type: "create_escalation_task", action_config: { reason: "A customer complained - read the chat and call them." } },
    ],
  },
  {
    key: "churn_task",
    title: "Catch someone about to leave",
    description: "When a customer says they are stopping or moving elsewhere, the team gets a task before they go.",
    trigger: "churn_risk.detected",
    steps: [{ action_type: "create_escalation_task", action_config: { reason: "A customer may be leaving - talk to them today." } }],
  },
  {
    key: "payment_due",
    title: "Remind a day before a payment is due",
    description: "Fees, rent, an instalment or a balance a customer promised: one WhatsApp reminder the day before.",
    trigger: "commitment.due_soon",
    usesTemplate: true,
    steps: [{
      action_type: "whatsapp_followup", action_config: { message: "A friendly reminder: {{description}} is due tomorrow." },
      conditions: [
        { field: "days_until", operator: "equals", value: 1 },
        { field: "direction", operator: "equals", value: "they_owe" },
        { field: "kind", operator: "equals", value: "payment" },
      ],
    }],
  },
  {
    key: "payment_overdue",
    title: "Chase an overdue payment, then hand it over",
    description: "3 days late: a polite WhatsApp. 7 days late: a task for the team to call.",
    trigger: "commitment.overdue",
    usesTemplate: true,
    steps: [
      {
        action_type: "whatsapp_followup", action_config: { message: "Just checking in: {{description}} is still pending. Reply here if you need any help." },
        conditions: [
          { field: "days_overdue", operator: "equals", value: 3 },
          { field: "direction", operator: "equals", value: "they_owe" },
          { field: "kind", operator: "equals", value: "payment" },
        ],
      },
      {
        action_type: "create_escalation_task", action_config: { reason: "A payment is a week overdue: {{description}}. Please call." },
        conditions: [
          { field: "days_overdue", operator: "equals", value: 7 },
          { field: "direction", operator: "equals", value: "they_owe" },
          { field: "kind", operator: "equals", value: "payment" },
        ],
      },
    ],
  },
  {
    key: "date_reminder",
    title: "Remind before a renewal, expiry or due date",
    description: "For any date you set on a customer (membership end, AMC expiry, next service): reminders 7 days and 1 day before.",
    trigger: "customer.date_approaching",
    usesTemplate: true,
    steps: [
      {
        action_type: "whatsapp_followup", action_config: { message: "A reminder: your {{label}} is on {{date}}. Reply here to renew or ask anything." },
        conditions: [{ field: "days_until", operator: "equals", value: 7 }],
      },
      {
        action_type: "whatsapp_followup", action_config: { message: "Your {{label}} is tomorrow, {{date}}. Reply here if you need anything." },
        conditions: [{ field: "days_until", operator: "equals", value: 1 }],
      },
    ],
  },
  {
    key: "appointment_cancelled",
    title: "Offer a new time when an appointment is cancelled",
    description: "After a cancellation, the customer is invited to pick a new slot.",
    trigger: "appointment.cancelled",
    needs: ["scheduling"],
    usesTemplate: true,
    steps: [{ action_type: "whatsapp_followup", action_config: { message: "Your appointment has been cancelled. Reply here and we will find you a new time." } }],
  },
  {
    key: "quiet_customer",
    title: "Check in with someone gone quiet",
    description: "30 days with no message and nothing booked: a short, friendly check-in.",
    trigger: "customer.inactive",
    needs: ["scheduling"],
    notForHealthcare: true,
    usesTemplate: true,
    steps: [{
      action_type: "whatsapp_followup", action_config: { message: "It has been a while - hope all is well. Reply here whenever you would like to book again." },
      conditions: [
        { field: "days_since_customer_message", operator: "equals", value: 30 },
        { field: "has_upcoming_visit", operator: "equals", value: false },
      ],
    }],
  },
  {
    key: "quote_quiet",
    title: "A quote has gone quiet",
    description: "3 days with no answer on a quote: the team is reminded to follow up (KROVA never chases the buyer itself).",
    trigger: "quotation.aging",
    needs: ["quotations"],
    steps: [{
      action_type: "notify_team", action_config: { to: "assigned", message: "Quote {{reference}} has had no answer for 3 days - follow up." },
      conditions: [{ field: "days_open", operator: "equals", value: 3 }],
    }],
  },
  {
    key: "claim_changed",
    title: "Tell the team when a claim moves",
    description: "Any insurance or warranty claim status change alerts the team.",
    trigger: "claim.status_changed",
    needs: ["tpa_claim_tracking"],
    steps: [{ action_type: "notify_team", action_config: { to: "admins", message: "A claim changed: {{title}}" } }],
  },
  {
    key: "new_lead",
    title: "Reach out to every new lead",
    description: "A new enquiry from Justdial, IndiaMART, an ad or a form: the team is alerted, the lead gets a thank-you, and a check-in a day later unless they already replied or booked.",
    trigger: "lead.received",
    needs: ["lead_capture"],
    usesTemplate: true,
    onePerTrigger: true,
    steps: [
      { action_type: "create_escalation_task", action_config: { reason: "A new lead came in - see Leads for who and from where." } },
      { action_type: "whatsapp_followup", action_config: { message: "Thanks for your enquiry! Our team will get back to you shortly." } },
      {
        action_type: "whatsapp_followup", delay_seconds: 86400,
        action_config: { message: "Just checking in - did you find what you were looking for? Reply here and we will help.", stop_if: "replied,booked" },
      },
    ],
  },
  {
    key: "no_show_rebook",
    title: "Someone missed their booking",
    description: "When a booking is marked as did not come, they get a friendly message to pick a new time.",
    trigger: "appointment.no_show",
    needs: ["scheduling"],
    usesTemplate: true,
    steps: [{
      action_type: "whatsapp_followup", delay_seconds: 3600,
      action_config: { message: "We missed you today. Reply here and we will find you a new time.", stop_if: "replied,booked" },
    }],
  },
  {
    key: "first_visit_thanks",
    title: "Thank someone after their first visit",
    description: "The first time a booking is marked as came, a short thank-you goes out a couple of hours later.",
    trigger: "appointment.visited",
    needs: ["scheduling"],
    usesTemplate: true,
    steps: [{
      action_type: "whatsapp_followup", delay_seconds: 7200,
      action_config: { message: "Thank you for coming in today. Reply here anytime if you need anything." },
      conditions: [{ field: "visit_number", operator: "equals", value: 1 }],
    }],
  },
  {
    key: "order_delivered",
    title: "Check in when an order is delivered",
    description: "A day after an order is marked delivered, the customer is asked if everything is right.",
    trigger: "order.status_changed",
    needs: ["order_sync"],
    usesTemplate: true,
    steps: [{
      action_type: "whatsapp_followup", delay_seconds: 86400,
      action_config: { message: "Your order {{order_number}} was delivered - hope you like it! Reply here if anything is not right." },
      conditions: [{ field: "status", operator: "equals", value: "delivered" }],
    }],
  },
  {
    key: "order_cancelled",
    title: "Tell me when an order is cancelled",
    description: "Any cancelled order alerts the owner, so a lost sale never goes unnoticed.",
    trigger: "order.status_changed",
    needs: ["order_sync"],
    steps: [{
      action_type: "notify_team", action_config: { to: "owner", message: "Order {{order_number}} was cancelled." },
      conditions: [{ field: "status", operator: "equals", value: "cancelled" }],
    }],
  },
  {
    key: "paid_thanks",
    title: "Say thank you when a payment is complete",
    description: "When the last of what a customer owed comes in (link or recorded on the Ledger), they get a thank-you.",
    trigger: "payment.received",
    usesTemplate: true,
    steps: [{
      action_type: "whatsapp_followup", action_config: { message: "Payment received - thank you! {{description}} is now fully paid." },
      conditions: [{ field: "fully_paid", operator: "equals", value: true }],
    }],
  },
  {
    key: "birthday",
    title: "Wish customers on their birthday",
    description: "Add a 'Birthday' date on the customer and tick 'Comes every year'. A wish goes out on the day.",
    trigger: "customer.date_approaching",
    usesTemplate: true,
    steps: [{
      action_type: "whatsapp_followup", action_config: { message: "Happy birthday from all of us! Wishing you a wonderful year ahead." },
      conditions: [
        { field: "label", operator: "equals", value: "Birthday" },
        { field: "days_until", operator: "equals", value: 0 },
      ],
    }],
  },
];

// mark a rule as made from a recipe, so "Added" shows and it is not added twice
const nameOf = (r: Recipe) => r.title;

export function Recipes({
  capabilities, vertical, existing, templateReady, canEdit, onAdded,
}: {
  capabilities: Capability[]; vertical: string | null; existing: AutomationRule[]; templateReady: boolean;
  canEdit: boolean; onAdded: (rule: AutomationRule) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const healthcare = (vertical || "").startsWith("health_") || vertical === "clinic";

  const shown = RECIPES.filter((r) =>
    (!r.needs || r.needs.some((c) => capabilities.includes(c))) && !(r.notForHealthcare && healthcare));
  const added = new Set(existing.map((r) => r.name));

  const add = async (r: Recipe) => {
    setBusy(r.key); setError(null);
    try {
      onAdded(await postCallRules.create({ name: nameOf(r), trigger_type: r.trigger, is_active: true, steps: r.steps }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add this.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-os-text-dim">
        Ready-made rules for your kind of business. Add one with a click; it then shows under Rules (or Scheduling), where you can
        change the message, the timing or switch it off.
      </p>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {shown.map((r) => {
          const isAdded = added.has(nameOf(r)) || (!!r.onePerTrigger && existing.some((x) => x.trigger_type === r.trigger));
          return (
            <GlassCard key={r.key} className="p-4 space-y-2 flex flex-col">
              <p className="text-xs font-bold text-white">{r.title}</p>
              <p className="text-[11px] text-os-text-dim flex-1">{r.description}</p>
              {r.usesTemplate && !templateReady && (
                <p className="text-[10px] text-amber-300 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Sends WhatsApp - needs the follow-up template approved (see above).
                </p>
              )}
              <div>
                {isAdded ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300"><Check className="w-3.5 h-3.5" /> Added</span>
                ) : canEdit ? (
                  <button type="button" onClick={() => add(r)} disabled={busy !== null}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                    <Plus className="w-3.5 h-3.5" /> {busy === r.key ? "Adding..." : "Add this"}
                  </button>
                ) : null}
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
