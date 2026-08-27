/**
 * Calls to the Krova API.
 *
 * Auth is ours now, not Supabase's. Access tokens last 30 minutes, so a 401
 * mid-session is routine rather than a failure — this layer refreshes once and
 * retries, and only then treats it as signed out. Callers never see the
 * difference.
 */

import {
  API_BASE,
  clearSession,
  getAccessToken,
  refreshSession,
} from "./auth";

export class NotAuthenticated extends Error {
  constructor() {
    super("Your session has ended. Please sign in again.");
  }
}

async function send(
  method: string,
  path: string,
  body?: unknown,
  isFormData = false,
): Promise<Response> {
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  return fetch(`${API_BASE}/api/v1${path}`, {
    method,
    headers,
    body: isFormData
      ? (body as FormData)
      : body !== undefined
      ? JSON.stringify(body)
      : undefined,
  });
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isFormData = false,
): Promise<T> {
  if (!getAccessToken()) throw new NotAuthenticated();

  let res = await send(method, path, body, isFormData);

  // One retry after a refresh. An expired access token is the expected case
  // every half hour, and bouncing the user to the login screen for it would
  // make the product feel broken.
  if (res.status === 401 && (await refreshSession())) {
    res = await send(method, path, body, isFormData);
  }

  if (res.status === 401) {
    clearSession();
    throw new NotAuthenticated();
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = Array.isArray(err?.detail) ? err.detail[0]?.msg : err?.detail;
    throw new Error(detail || `Something went wrong (${res.status})`);
  }

  if (res.status === 204) return {} as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown, isFormData = false) =>
    request<T>("POST", path, body, isFormData),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

// ── Ledger ───────────────────────────────────────────────────────────────────

export type Commitment = {
  id: string;
  direction: "we_owe" | "they_owe";
  kind: string;
  description: string;
  amount_paise: number | null;
  amount_display: string | null;
  currency: string;
  due_at: string | null;
  due_at_explicit: boolean;
  overdue: boolean;
  status: "open" | "met" | "missed" | "cancelled" | "unconfirmed";
  confidence: number;
  source_quote: string | null;
  customer_id: string;
  customer_name: string | null;
  created_at: string;
};

export type EvidenceMessage = {
  id: string;
  channel: string;
  direction: "inbound" | "outbound";
  text: string | null;
  occurred_at: string;
};

export type CommitmentDetail = Commitment & { evidence: EvidenceMessage[] };

export type LedgerSummary = {
  owed_to_us_paise: number;
  owed_by_us_paise: number;
  overdue_count: number;
  overdue_paise: number;
  open_count: number;
  /** Deliberately outside every total — these are guesses awaiting a human. */
  unconfirmed_count: number;
};

export const ledger = {
  summary: () => api.get<LedgerSummary>("/ledger/summary"),

  commitments: (params?: {
    direction?: "we_owe" | "they_owe";
    status?: string;
    overdue_only?: boolean;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.direction) q.set("direction", params.direction);
    if (params?.status) q.set("status", params.status);
    if (params?.overdue_only) q.set("overdue_only", "true");
    q.set("limit", String(params?.limit ?? 200));
    return api.get<Commitment[]>(`/ledger/commitments?${q}`);
  },

  detail: (id: string) => api.get<CommitmentDetail>(`/ledger/commitments/${id}`),

  confirm: (id: string) =>
    api.post<Commitment>(`/ledger/commitments/${id}/confirm`),

  resolve: (id: string, outcome: "met" | "missed" | "cancelled") =>
    api.post<Commitment>(`/ledger/commitments/${id}/resolve`, { outcome }),

  customers: () => api.get<CustomerSummary[]>("/ledger/customers"),
};

export type CustomerSummary = {
  id: string;
  name: string | null;
  identities: { kind: string; value: string }[];
  last_contact_at: string | null;
  open_commitments: number;
  is_private: boolean;
  health_score?: number;
  outstanding_paise?: number;
  summary?: string;
  preferred_channel?: string;
};

// ── Approvals ─────────────────────────────────────────────────────────────────

export type AutonomyLevel = "observe" | "draft" | "act";

export type MessageDraft = {
  id: string;
  customer_id: string;
  customer_name: string | null;
  channel: string;
  action: "reply" | "escalate" | "no_action";
  status: "pending" | "approved" | "sent" | "rejected" | "expired" | "superseded";
  /** The text that would actually send - the agent's words, or a person's edit if one exists. */
  body: string | null;
  reasoning: string | null;
  gap: string | null;
  confidence: number;
  low_confidence: boolean;
  /** The inbound message this replies to, truncated to 300 chars. */
  replying_to: string | null;
  expires_at: string | null;
  expired: boolean;
  created_at: string;
};

export const approvals = {
  list: (status: string = "pending") =>
    api.get<MessageDraft[]>(`/approvals?status=${status}`),

  count: () => api.get<{ pending: number; needs_you: number }>("/approvals/count"),

  /** Pass the edited text if a person changed it; omit to send the agent's words unchanged. */
  approve: (id: string, editedBody?: string) =>
    api.post<MessageDraft>(`/approvals/${id}/approve`, {
      body: editedBody || null,
    }),

  reject: (id: string, note?: string) =>
    api.post<MessageDraft>(`/approvals/${id}/reject`, { note: note || null }),

  setAutonomy: (autonomy: AutonomyLevel) =>
    api.post<{ autonomy: AutonomyLevel }>("/approvals/autonomy", { autonomy }),
};

// ── Conversations ─────────────────────────────────────────────────────────────
// One row per customer, not per channel - someone who emails Monday and
// WhatsApps Wednesday is one thread, because they're one person.

export type Identity = { kind: string; value: string };

export type ConversationItem = {
  customer_id: string;
  name: string | null;
  identities: Identity[];
  /** Every channel this customer has ever messaged on, not just the last one. */
  channels: string[];
  last_message: string | null;
  last_message_at: string | null;
  last_direction: "inbound" | "outbound" | null;
  message_count: number;
  open_commitments: number;
  /** Whether a free-form WhatsApp reply will still deliver right now. */
  window_open: boolean;
  window_closes_at: string | null;
  is_private: boolean;
  assigned_to_user_id: string | null;
};

export type ThreadMessage = {
  id: string;
  channel: string;
  direction: "inbound" | "outbound";
  text: string | null;
  subject: string | null;
  media: Record<string, unknown>;
  occurred_at: string;
  analysed: boolean;
};

export type ThreadCommitment = {
  id: string;
  direction: "we_owe" | "they_owe";
  description: string | null;
  amount_paise: number | null;
  due_at: string | null;
  status: string;
};

export type ConversationThread = {
  customer_id: string;
  name: string | null;
  identities: Identity[];
  window_open: boolean;
  window_closes_at: string | null;
  is_private: boolean;
  assigned_to_user_id: string | null;
  messages: ThreadMessage[];
  commitments: ThreadCommitment[];
};

export const conversations = {
  list: () => api.get<ConversationItem[]>("/conversations"),

  thread: (customerId: string) =>
    api.get<ConversationThread>(`/conversations/${customerId}`),

  setPrivate: (customerId: string, isPrivate: boolean) =>
    api.post<{ customer_id: string; is_private: boolean }>(
      `/conversations/${customerId}/private?private=${isPrivate}`,
    ),

  // Omit userId (or pass undefined) to unassign.
  assign: (customerId: string, userId?: string) =>
    api.post<{ customer_id: string; assigned_to_user_id: string | null }>(
      `/conversations/${customerId}/assign${userId ? `?user_id=${userId}` : ""}`,
    ),
};

// ── Team ─────────────────────────────────────────────────────────────────────

export type TeamMember = { user_id: string; full_name: string | null; email: string; role: string };

export const team = {
  list: () => api.get<TeamMember[]>("/team"),
};

// ── WhatsApp & Channels ───────────────────────────────────────────────────────

export type ChannelConnection = {
  id: string;
  channel: "whatsapp" | "instagram" | "email" | "voice";
  handle: string | null;
  /** What voice connections use instead of handle - the number itself. */
  external_account_id: string;
  display_name: string | null;
  status: "active" | "needs_reauth" | "disconnected";
  webhook_subscribed: boolean;
  number_registered: boolean;
  connected_at: string | null;
  token_expires_at: string | null;
  waba_id?: string | null;
  verified_name?: string | null;
  quality_rating?: string | null;
  tier?: string | null;
};

export type WhatsAppWindow = {
  window_open: boolean;
  last_inbound_at: string | null;
  can_send_free_form: boolean;
  /** A human-readable reason, meant to be shown as-is - not a code to branch on. */
  explanation: string;
};

export type TemplateButton = {
  type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
  text: string;
  url?: string;
  phone_number?: string;
};

export type Template = {
  id: string;
  external_id: string | null;
  name: string;
  language: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  status: string;
  body_text: string | null;
  components: unknown[] | Record<string, unknown>;
  rejection_reason: string | null;
  sendable: boolean;
  /** The template's {{n}} placeholders, in order - what a send needs values for. */
  variables: string[];
  submitted_at: string | null;
  reviewed_at: string | null;
  edits_remaining: number | null;
};

// What GET /channels/whatsapp/signup-config actually returns - the browser
// needs exactly these three values to open Meta's dialog, nothing more.
export type WhatsAppSignupConfig = { app_id: string; config_id: string; graph_version: string };

// One Graph API call the backend made while finishing signup, surfaced so
// the UI can show its work rather than a bare "connected" - matches
// shared/channels/whatsapp/signup.py's GraphCall exactly.
export type SignupGraphCall = { method: string; path: string; permission: string; status: number };

// What POST /channels/whatsapp/embedded-signup actually returns - a
// different, richer shape than ChannelConnection (no id, but phone_number_id
// and the graph_calls trail instead). Was previously mistyped as
// ChannelConnection, which the backend has never returned from this route.
export type EmbeddedSignupResult = {
  connected: boolean;
  channel: string;
  waba_id: string;
  waba_name: string | null;
  phone_number_id: string;
  display_phone_number: string | null;
  verified_name: string | null;
  quality_rating: string | null;
  webhook_subscribed: boolean;
  number_registered: boolean;
  token_expires_at: string | null;
  graph_calls: SignupGraphCall[];
};

export const channels = {
  list: () => api.get<ChannelConnection[]>("/channels/"),

  whatsappSignupConfig: () => api.get<WhatsAppSignupConfig>("/channels/whatsapp/signup-config"),

  completeWhatsAppSignup: (code: string) =>
    api.post<EmbeddedSignupResult>("/channels/whatsapp/embedded-signup", { code }),

  disconnectWhatsApp: () => api.delete<void>("/channels/whatsapp"),

  windowState: (phone: string) =>
    api.get<WhatsAppWindow>(`/messages/window/${encodeURIComponent(phone)}`),

  sendText: (to: string, body: string) =>
    api.post<SendResult>("/messages/text", { to, body }),

  /** variables are positional - index 0 fills {{1}}, index 1 fills {{2}}, and so on. */
  sendTemplate: (to: string, templateName: string, variables: string[], language = "en") =>
    api.post<SendResult>("/messages/template", {
      to,
      template_name: templateName,
      language,
      variables,
    }),

  gmailConnectUrl: () =>
    api.get<{ authorize_url: string }>("/channels/gmail/connect"),
};

export type SendResult = {
  sent: boolean;
  message_id: string;
  channel: string;
  used_template: boolean;
  window_open: boolean;
};

export const templates = {
  list: () => api.get<Template[]>("/templates"),

  create: (data: {
    name: string;
    category: "UTILITY" | "MARKETING" | "AUTHENTICATION";
    body: string;
    language?: string;
    header_text?: string;
    footer?: string;
    buttons?: TemplateButton[];
  }) => api.post<Template>("/templates", data),

  delete: (id: string, allLanguages = false) =>
    api.delete<void>(`/templates/${id}${allLanguages ? "?all_languages=true" : ""}`),

  sync: () => api.post<Template[]>("/templates/sync"),
};

// ── Voice Provisioning & Logs ─────────────────────────────────────────────────
// Router prefix is /voice-onboarding on the real backend, not /voice - and
// every one of these shapes is taken directly from
// platform/services/api/routers/voice_provisioning.py, not guessed.

export type Subaccount = {
  subaccount_auth_id: string;
  status: string;
};

export type DocumentType = { id: string; name: string };

export type ComplianceRequirement = {
  requirement_id: string;
  document_types: DocumentType[];
};

export type VoiceApplication = {
  application_id: string;
  status:
    | "subaccount_created"
    | "compliance_submitted"
    | "compliance_approved"
    | "compliance_rejected";
  rejection_reason?: string | null;
};

export type VoiceNumber = {
  number: string;
  city: string | null;
  region: string | null;
  /** Plivo's own figures, in whatever unit/currency Plivo returns - not paise, not pre-formatted. */
  monthly_rental_rate: string | null;
  voice_rate: string | null;
};

export type CallLog = {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  direction: "inbound" | "outbound";
  duration_seconds: number | null;
  cost_paise: number;
  cost_display: string;
  cost_breakdown: {
    sarvam_stt_paise?: number;
    sarvam_tts_paise?: number;
    plivo_voice_paise?: number;
    plivo_cost_source?: string;
  };
  hangup_cause: string | null;
  started_at: string;
};

export const voice = {
  createSubaccount: () => api.post<Subaccount>("/voice-onboarding/subaccount"),

  requirements: () =>
    api.get<ComplianceRequirement>("/voice-onboarding/compliance/requirements"),

  /** Registers the business's own name with Plivo - takes no other input, the real endpoint reads it from the business record. */
  createEndUser: () =>
    api.post<{ end_user_id: string }>("/voice-onboarding/compliance/end-user"),

  /** business_name is only required for document types that ask for it (e.g. Registration Certificate). */
  uploadDocument: (data: {
    document_type_id: string;
    alias: string;
    file: File;
    business_name?: string;
  }) => {
    const formData = new FormData();
    formData.set("document_type_id", data.document_type_id);
    formData.set("alias", data.alias);
    formData.set("file", data.file);
    if (data.business_name) formData.set("business_name", data.business_name);
    return api.post<{ document_id: string }>(
      "/voice-onboarding/compliance/documents",
      formData,
      true,
    );
  },

  submitApplication: (data: {
    requirement_id: string;
    country_iso2?: string;
    number_type?: string;
  }) => api.post<VoiceApplication>("/voice-onboarding/compliance/application", data),

  applicationStatus: () =>
    api.get<VoiceApplication>("/voice-onboarding/compliance/status"),

  /** Sends whatever documents are currently on file back for review - takes no body. */
  resubmitApplication: () =>
    api.post<VoiceApplication>("/voice-onboarding/compliance/resubmit"),

  searchNumbers: (pattern?: string) => {
    const q = pattern ? `?pattern=${encodeURIComponent(pattern)}` : "";
    return api.get<VoiceNumber[]>(`/voice-onboarding/numbers/search${q}`);
  },

  buyNumber: (number: string) =>
    api.post<{ number: string; connection_id: string }>(
      "/voice-onboarding/numbers/buy",
      { number },
    ),

  releaseNumber: (number: string) =>
    api.post<void>(`/voice-onboarding/numbers/${encodeURIComponent(number)}/release`),

  logs: () => api.get<CallLog[]>("/voice-onboarding/logs"),
};

// ── Knowledge Base ────────────────────────────────────────────────────────────

export type KnowledgeKind = "price_list" | "faq" | "policy" | "hours" | "service" | "other";

export type KnowledgeItem = {
  id: string;
  title: string;
  kind: KnowledgeKind;
  source: "upload" | "typed" | "learned";
  content: string;
  filename: string | null;
  token_estimate: number;
  active: boolean;
  /** The gap text this item was written to answer, if any - matches KnowledgeGap.gap, not an id. */
  resolves_gap: string | null;
  created_at: string;
};

// Gaps have no id on the backend - they're identified by the gap text itself
// (grouped/deduped server-side from near-duplicate escalations).
export type KnowledgeGap = {
  gap: string;
  times_asked: number;
  last_asked: string | null;
  example_question: string | null;
};

export type KnowledgeStatus = {
  items: number;
  total_tokens: number;
  fits_in_context: boolean;
  advice: string;
};

export const knowledge = {
  list: () => api.get<KnowledgeItem[]>("/knowledge"),

  gaps: () => api.get<KnowledgeGap[]>("/knowledge/gaps"),

  status: () => api.get<KnowledgeStatus>("/knowledge/status"),

  create: (data: {
    title: string;
    content: string;
    kind?: KnowledgeKind;
    /** Pass the gap's own text (KnowledgeGap.gap) to close it out once this is added. */
    resolves_gap?: string;
  }) => api.post<KnowledgeItem>("/knowledge", data),

  upload: (data: { file: File; title: string; kind?: KnowledgeKind }) => {
    const formData = new FormData();
    formData.set("file", data.file);
    formData.set("title", data.title);
    if (data.kind) formData.set("kind", data.kind);
    return api.post<KnowledgeItem>("/knowledge/upload", formData, true);
  },

  delete: (id: string) => api.delete<void>(`/knowledge/${id}`),
};

// ── Campaigns ─────────────────────────────────────────────────────────────────
// audience values are fixed by the backend's Audience enum - not free text.

export type AudienceKey = "owes_money" | "overdue" | "we_promised" | "gone_quiet" | "all_customers";

export type AudienceSegment = {
  value: AudienceKey;
  label: string;
  /** Only "gone_quiet" needs audience_params today (a days-quiet threshold). */
  needs_params: boolean;
};

export type CampaignRequest = {
  name: string;
  audience: AudienceKey;
  audience_params?: Record<string, unknown>;
  template_name: string;
  template_language?: string;
  /** Which of each recipient's own fields fill the template's {{1}}, {{2}}, ... in order. */
  variable_mapping?: string[];
};

export type RecipientPreview = {
  customer_id: string;
  name: string | null;
  phone_masked: string;
  message_preview: string;
};

export type CampaignPreview = {
  audience: string;
  audience_label: string;
  will_reach: number;
  will_skip: number;
  skipped_reasons: { customer_id?: string; reason: string }[];
  total_outstanding: string | null;
  template: string;
  template_status: string;
  category: string | null;
  cost_note: string;
  daily_limit_note: string | null;
  sample: RecipientPreview[];
};

export type Campaign = {
  id: string;
  name: string;
  audience: string;
  audience_label: string;
  status: "draft" | "sending" | "sent" | "paused" | "failed";
  template_name: string | null;
  category: string | null;
  recipients: number;
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  created_at: string;
  completed_at: string | null;
};

export const campaigns = {
  audiences: () => api.get<AudienceSegment[]>("/campaigns/audiences"),

  preview: (data: CampaignRequest) =>
    api.post<CampaignPreview>("/campaigns/preview", data),

  create: (data: CampaignRequest) => api.post<Campaign>("/campaigns", data),

  send: (id: string) => api.post<Campaign>(`/campaigns/${id}/send`),

  list: () => api.get<Campaign[]>("/campaigns"),
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export type AgeingBucket = {
  label: string;
  count: number;
  amount_paise: number;
  amount: string;
};

export type ReceivablesAgeing = {
  total_paise: number;
  total: string;
  buckets: AgeingBucket[];
  oldest_days: number | null;
  worst_customer: {
    customer_id: string;
    name: string | null;
    amount: string;
    promises: number;
    oldest_days: number;
  } | null;
};

export type KeptAnalytics = {
  promised: number;
  met: number;
  missed: number;
  still_open: number;
  /** 0-1, or null if nothing has come due yet to judge. */
  kept_rate: number | null;
  note: string;
};

export type ChannelActivity = {
  channel: string;
  inbound: number;
  outbound: number;
  customers: number;
};

export type AgentPerformance = {
  drafted: number;
  approved: number;
  edited: number;
  rejected: number;
  escalated: number;
  approval_rate: number | null;
  edit_rate: number | null;
  note: string;
  top_gaps: { gap: string; times: number }[];
};

export type AnalyticsOverview = {
  owed_to_you: string;
  owed_to_you_paise: number;
  oldest_debt_days: number | null;
  biggest_debtor: {
    customer_id: string;
    name: string | null;
    amount: string;
    promises: number;
    oldest_days: number;
  } | null;
  /** 0-1, or null if nothing has come due yet to judge. */
  promises_kept: number | null;
  promises_note: string;
  channels: ChannelActivity[];
  agent: {
    drafted: number;
    approval_rate: number | null;
    note: string;
    top_gaps: { gap: string; times: number }[];
  };
};

export const analytics = {
  overview: () => api.get<AnalyticsOverview>("/analytics/overview"),
  receivables: () => api.get<ReceivablesAgeing>("/analytics/receivables"),
  kept: () => api.get<KeptAnalytics>("/analytics/kept"),
  channels: () => api.get<ChannelActivity[]>("/analytics/channels"),
  agent: () => api.get<AgentPerformance>("/analytics/agent"),
};

// ── Account & Health ──────────────────────────────────────────────────────────

// `/auth/me` is the real endpoint - `/account/*` is the WhatsApp Business
// Account (profile customers see, number health, send-readiness), a
// genuinely different thing that lives in the `whatsapp` export below.
// Capability strings a vertical can declare - matches shared/verticals/
// templates/*.json on the backend exactly. Never a hardcoded per-vertical
// map on this side: /auth/me already resolves which ones a business has.
export type Capability =
  | "conversation_intelligence"
  | "scheduling"
  | "voice_booking"
  | "case_tracking"
  | "order_sync"
  | "property_listings"
  | "product_feedback";

export type UserProfile = {
  user_id: string;
  email: string;
  full_name: string | null;
  business_id: string | null;
  business_name: string | null;
  vertical: string | null;
  capabilities: Capability[];
  autonomy: AutonomyLevel | null;
  // Matches shared/db/models/identity.py's BusinessRole exactly - was
  // previously "owner" | "manager" | "team_member", values the backend has
  // never actually issued.
  role: "owner" | "admin" | "agent" | null;
};

export const account = {
  profile: () => api.get<UserProfile>("/auth/me"),

  updateProfile: (data: {
    full_name?: string;
    business_name?: string;
    vertical?: string;
  }) => api.post<UserProfile>("/auth/me", data),
};

// ── Scheduling (Clinics, Real Estate) ───────────────────────────────────────
// "Doctor" is the backend's table name, reused as-is for Real Estate's
// agents - a person with recurring hours, a customer, a time, mechanically
// identical either way. Vertical-facing copy ("Doctor" vs "Agent") is a
// display-only choice made by the page that renders this, never the data.

export type Doctor = {
  id: string;
  name: string;
  qualifications: string | null;
  consultation_fee_paise: number | null;
  department_id: string | null;
  active: boolean;
};

export type AvailabilityRule = {
  id: string;
  weekday: number; // Monday=0 .. Sunday=6
  start_time: string; // "HH:MM:SS"
  end_time: string;
  slot_duration_minutes: number;
};

export type Slot = { starts_at: string; ends_at: string };

export type AppointmentStatus = "requested" | "confirmed" | "visited" | "no_show" | "cancelled";
export type IntakeChannel = "voice" | "whatsapp" | "manual";

export type Appointment = {
  id: string;
  doctor_id: string;
  doctor_name: string;
  customer_id: string;
  property_id: string | null;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  intake_channel: IntakeChannel;
  notes: string | null;
};

export const scheduling = {
  listDoctors: () => api.get<Doctor[]>("/scheduling/doctors"),

  createDoctor: (data: {
    name: string;
    qualifications?: string;
    consultation_fee_paise?: number;
    department_id?: string;
  }) => api.post<Doctor>("/scheduling/doctors", data),

  updateDoctor: (
    id: string,
    data: Partial<{
      name: string;
      qualifications: string;
      consultation_fee_paise: number;
      active: boolean;
    }>,
  ) => api.patch<Doctor>(`/scheduling/doctors/${id}`, data),

  deleteDoctor: (id: string) => api.delete<void>(`/scheduling/doctors/${id}`),

  listRules: (doctorId: string) =>
    api.get<AvailabilityRule[]>(`/scheduling/doctors/${doctorId}/availability-rules`),

  createRule: (
    doctorId: string,
    data: { weekday: number; start_time: string; end_time: string; slot_duration_minutes?: number },
  ) => api.post<AvailabilityRule>(`/scheduling/doctors/${doctorId}/availability-rules`, data),

  deleteRule: (ruleId: string) => api.delete<void>(`/scheduling/availability-rules/${ruleId}`),

  openSlots: (doctorId: string, onDate: string) =>
    api.get<Slot[]>(`/scheduling/doctors/${doctorId}/open-slots?on=${onDate}`),

  listAppointments: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get<Appointment[]>(`/scheduling/appointments${suffix}`);
  },

  createAppointment: (data: {
    doctor_id: string;
    customer_id: string;
    starts_at: string;
    property_id?: string;
    notes?: string;
  }) => api.post<Appointment>("/scheduling/appointments", data),
};

// ── Case Tracking (Law Firms) ───────────────────────────────────────────────

export type CaseStatus = "intake" | "active" | "on_hold" | "closed";

export type Case = {
  id: string;
  customer_id: string;
  title: string;
  case_number: string | null;
  opposing_party: string | null;
  court: string | null;
  status: CaseStatus;
  next_hearing_at: string | null;
  notes: string | null;
  assigned_to_user_id: string | null;
};

export const cases = {
  list: (params?: { customer_id?: string; status?: CaseStatus }) => {
    const qs = new URLSearchParams();
    if (params?.customer_id) qs.set("customer_id", params.customer_id);
    if (params?.status) qs.set("status", params.status);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get<Case[]>(`/cases${suffix}`);
  },

  create: (data: {
    customer_id: string;
    title: string;
    case_number?: string;
    opposing_party?: string;
    court?: string;
    next_hearing_at?: string;
    notes?: string;
  }) => api.post<Case>("/cases", data),

  update: (
    id: string,
    data: Partial<{
      title: string;
      case_number: string;
      opposing_party: string;
      court: string;
      status: CaseStatus;
      next_hearing_at: string;
      notes: string;
      assigned_to_user_id: string;
      unassign: boolean;
    }>,
  ) => api.patch<Case>(`/cases/${id}`, data),

  upcomingHearings: (withinDays = 14) =>
    api.get<Case[]>(`/cases/upcoming-hearings?within_days=${withinDays}`),
};

// ── Product Feedback Signals (Startups) ─────────────────────────────────────

export type SignalKind = "bug" | "feature_request" | "complaint" | "churn_risk" | "praise";
export type SignalSeverity = "info" | "warning" | "critical";

export type Signal = {
  id: string;
  customer_id: string | null;
  kind: SignalKind;
  title: string;
  body: string | null;
  severity: SignalSeverity;
  created_at: string;
  dismissed_at: string | null;
};

export const signals = {
  list: (params?: { kind?: SignalKind; severity?: SignalSeverity; include_dismissed?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.kind) qs.set("kind", params.kind);
    if (params?.severity) qs.set("severity", params.severity);
    if (params?.include_dismissed) qs.set("include_dismissed", "true");
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get<Signal[]>(`/signals${suffix}`);
  },

  dismiss: (id: string) => api.post<Signal>(`/signals/${id}/dismiss`),
};

// ── Order Sync (E-commerce) ──────────────────────────────────────────────────

export type OrderStatus =
  | "pending"
  | "paid"
  | "fulfilled"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "return_requested"
  | "refunded";

export type StoreConnection = {
  id: string;
  platform: string;
  store_identifier: string;
  active: boolean;
};

export type OrderItem = { title: string | null; quantity: number | null; price_paise: number | null };

export type Order = {
  id: string;
  customer_id: string | null;
  source_platform: string;
  order_number: string | null;
  status: OrderStatus;
  items: OrderItem[];
  total_paise: number | null;
  tracking_number: string | null;
  carrier: string | null;
  placed_at: string;
};

export const orders = {
  listConnections: () => api.get<StoreConnection[]>("/orders/connections"),

  connectStore: (data: { platform: string; store_identifier: string; webhook_secret: string }) =>
    api.post<StoreConnection>("/orders/connections", data),

  disconnectStore: (id: string) => api.delete<void>(`/orders/connections/${id}`),

  list: (params?: { customer_id?: string; status?: OrderStatus; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.customer_id) qs.set("customer_id", params.customer_id);
    if (params?.status) qs.set("status", params.status);
    if (params?.limit) qs.set("limit", String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get<Order[]>(`/orders${suffix}`);
  },

  get: (id: string) => api.get<Order>(`/orders/${id}`),

  update: (id: string, data: Partial<{ status: OrderStatus; tracking_number: string; carrier: string }>) =>
    api.patch<Order>(`/orders/${id}`, data),
};

// ── Property Listings (Real Estate) ─────────────────────────────────────────

export type ListingType = "sale" | "rent";
export type PropertyStatus = "available" | "under_offer" | "sold" | "rented" | "withdrawn";

export type Property = {
  id: string;
  title: string;
  listing_type: ListingType;
  property_type: string | null;
  locality: string | null;
  address: string | null;
  bedrooms: number | null;
  area_sqft: number | null;
  price_paise: number | null;
  price_period: string | null;
  rera_registration_number: string | null;
  status: PropertyStatus;
  active: boolean;
  notes: string | null;
};

export const properties = {
  list: (params?: { status?: PropertyStatus; listing_type?: ListingType; include_inactive?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.listing_type) qs.set("listing_type", params.listing_type);
    if (params?.include_inactive) qs.set("include_inactive", "true");
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get<Property[]>(`/properties${suffix}`);
  },

  create: (data: {
    title: string;
    listing_type: ListingType;
    property_type?: string;
    locality?: string;
    address?: string;
    bedrooms?: number;
    area_sqft?: number;
    price_paise?: number;
    price_period?: string;
    rera_registration_number?: string;
    notes?: string;
  }) => api.post<Property>("/properties", data),

  update: (
    id: string,
    data: Partial<{
      title: string;
      property_type: string;
      locality: string;
      address: string;
      bedrooms: number;
      area_sqft: number;
      price_paise: number;
      price_period: string;
      rera_registration_number: string;
      status: PropertyStatus;
      active: boolean;
      notes: string;
    }>,
  ) => api.patch<Property>(`/properties/${id}`, data),

  delete: (id: string) => api.delete<void>(`/properties/${id}`),
};

// ── Formatting Utilities ──────────────────────────────────────────────────────

export function formatPaise(
  paise: number | null | undefined,
  compact = false,
): string {
  if (paise === null || paise === undefined) return "₹0";
  const rupees = paise / 100;
  if (compact && rupees >= 100000) {
    return `₹${(rupees / 100000).toFixed(1)}L`;
  }
  if (compact && rupees >= 1000) {
    return `₹${(rupees / 1000).toFixed(1)}k`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

// ── Verticals ────────────────────────────────────────────────────────────────

export type Vertical = { key: string; label: string; summary: string };

export async function fetchVerticals(): Promise<Vertical[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/verticals`);
    if (!res.ok) {
      // Offline fallback only - matches the real backend templates in
      // platform/shared/verticals/templates/*.json. Kept in sync by hand
      // since this path only fires when /auth/verticals itself is
      // unreachable; the real endpoint is the source of truth otherwise.
      return [
        { key: "general", label: "General business", summary: "A business that talks to its customers on WhatsApp, email and the phone." },
        { key: "clinic", label: "Clinic or dental practice", summary: "A clinic where patients book appointments, ask about treatments and fees, and collect reports." },
        { key: "real_estate", label: "Real estate agency or broker", summary: "An agency selling or renting property, where buyers and tenants ask about price, location, and booking a site visit." },
        { key: "law_firm", label: "Law firm or independent practice", summary: "A law firm where clients ask about case status, hearing dates, fees, and documents." },
        { key: "startup", label: "Startup or early-stage product", summary: "An early-stage company whose users report bugs, ask for features, and sometimes threaten to leave - support volume that outgrows a founder's own inbox fast." },
        { key: "ecommerce", label: "Online store", summary: "A store selling online, where customers ask where their order is, whether an item is in stock, and how to return something." },
        { key: "restaurant", label: "Restaurant or cafe", summary: "A restaurant handling table reservations, menu questions, delivery and party bookings." },
      ];
    }
    return res.json();
  } catch {
    return [
      { key: "clinic", label: "Clinic & Healthcare", summary: "Patient appointments and consultations" },
      { key: "coaching", label: "Coaching Institute", summary: "Student admissions and course inquiries" },
      { key: "salon", label: "Salon & Spa Chain", summary: "Service appointments and rescheduling" },
      { key: "agency", label: "Agency & Consultancy", summary: "Retainer client deliverables and invoices" },
      { key: "general", label: "General Professional", summary: "Standard business inquiries and ledger tracking" },
    ];
  }
}

