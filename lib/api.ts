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
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
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

  importCustomers: (contacts: { phone: string; name?: string | null }[]) =>
    api.post<ContactImportResult>("/ledger/customers/import", { contacts }),
};

export type ContactImportRowResult = {
  row_number: number;
  phone: string;
  outcome: "created" | "already_existed" | "invalid";
  reason: string | null;
  customer_id: string | null;
};

export type ContactImportResult = {
  created: number;
  already_existed: number;
  invalid: number;
  rows: ContactImportRowResult[];
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
  stage?: string | null;
  /** Confirmed tag labels only - suggestions live in crm.tags(). */
  tags?: string[];
  deal_value_paise?: number | null;
};

// ── CRM: tags, notes, pipeline stage ────────────────────────────────────────
// A tag is either a human's own label (confirmed immediately) or something
// the nightly profile worker proposed from real signal data (status
// "suggested", with `reasoning` attached) - a human still has to say yes.

export type CustomerTag = {
  id: string;
  label: string;
  status: "suggested" | "confirmed" | "rejected";
  reasoning: string | null;
  created_by_user_id: string | null;
  decided_by_user_id: string | null;
  decided_at: string | null;
  created_at: string;
};

export type CustomerNote = {
  id: string;
  body: string;
  author_user_id: string | null;
  author_name: string | null;
  created_at: string;
};

export type PipelineCard = {
  customer_id: string;
  name: string | null;
  deal_value_paise: number | null;
  health_score: number | null;
  tags: string[];
};

export type PipelineColumn = {
  /** null is the "not staged yet" bucket - always present, always first. */
  stage: string | null;
  total_deal_value_paise: number;
  customers: PipelineCard[];
};

export type PipelineBoard = { columns: PipelineColumn[] };

export type BulkTagResult = { tagged: number; already_tagged: number; not_found: number };

export const crm = {
  /** Every confirmed tag label in use across the business - for campaign targeting. */
  allTags: () => api.get<string[]>("/crm/tags"),

  pipeline: () => api.get<PipelineBoard>("/crm/pipeline"),

  bulkAddTag: (customerIds: string[], label: string) =>
    api.post<BulkTagResult>("/crm/tags/bulk", { customer_ids: customerIds, label }),

  setDealValue: (customerId: string, dealValuePaise: number | null) =>
    api.patch<{ customer_id: string; deal_value_paise: number | null }>(
      `/crm/customers/${customerId}/deal-value`,
      { deal_value_paise: dealValuePaise },
    ),

  tags: (customerId: string, includeRejected = false) =>
    api.get<CustomerTag[]>(
      `/crm/customers/${customerId}/tags${includeRejected ? "?include_rejected=true" : ""}`,
    ),

  addTag: (customerId: string, label: string) =>
    api.post<CustomerTag>(`/crm/customers/${customerId}/tags`, { label }),

  confirmTag: (tagId: string) => api.post<CustomerTag>(`/crm/tags/${tagId}/confirm`),

  rejectTag: (tagId: string) => api.post<CustomerTag>(`/crm/tags/${tagId}/reject`),

  deleteTag: (tagId: string) => api.delete<void>(`/crm/tags/${tagId}`),

  notes: (customerId: string) => api.get<CustomerNote[]>(`/crm/customers/${customerId}/notes`),

  addNote: (customerId: string, body: string) =>
    api.post<CustomerNote>(`/crm/customers/${customerId}/notes`, { body }),

  deleteNote: (noteId: string) => api.delete<void>(`/crm/notes/${noteId}`),

  setStage: (customerId: string, stage: string | null) =>
    api.patch<{ customer_id: string; stage: string | null }>(
      `/crm/customers/${customerId}/stage`,
      { stage },
    ),

  pipelineStages: () => api.get<{ stages: string[] }>("/crm/pipeline-stages"),

  setPipelineStages: (stages: string[]) =>
    api.put<{ stages: string[] }>("/crm/pipeline-stages", { stages }),
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
  is_carousel: boolean;
  card_count: number;
  /** One media id per card, in order - what a campaign built on this template sends. */
  carousel_media_ids: string[];
};

// ── Carousel templates ───────────────────────────────────────────────────────
// A carousel puts its header/footer/buttons on each card instead of the
// message - see shared/channels/whatsapp/templates.py's CarouselCard.

export type CarouselCardDraft = {
  /** From templates.uploadCarouselImage() - proves the image to Meta's reviewer. */
  header_handle: string;
  /** Same upload - what a later campaign or send actually uses. */
  media_id: string;
  body: string;
  buttons: TemplateButton[];
  examples?: Record<string, string>;
};

export type CarouselImageUpload = { header_handle: string; media_id: string };

export type CarouselDraftCard = { body: string; button_label: string };

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

  /** `to` is the recipient's Instagram-scoped id (IGSID), not a username. */
  sendInstagramText: (to: string, body: string) =>
    api.post<SendResult>("/messages/instagram/text", { to, body }),

  gmailConnectUrl: () =>
    api.get<{ authorize_url: string }>("/channels/gmail/connect"),

  instagramConnectUrl: () =>
    api.get<{ url: string }>("/channels/instagram/connect-url"),

  /** The Page-based Facebook Login route, in place of the above - see backend for why. */
  instagramFbConnectUrl: () =>
    api.get<{ url: string }>("/channels/instagram/fb-connect-url"),

  gmailBackfillNow: () =>
    api.post<{
      mailbox: string; messages_read: number; messages_stored: number;
      customers_found: number; oldest_message: string | null; newest_message: string | null;
    }>("/channels/gmail/backfill"),

  sendInteractiveButtons: (to: string, body: string, buttons: { id: string; title: string }[]) =>
    api.post<SendResult>("/messages/interactive-buttons", { to, body, buttons }),

  sendInteractiveList: (
    to: string, body: string, buttonLabel: string,
    sections: { title: string; rows: { id: string; title: string; description?: string }[] }[],
  ) => api.post<SendResult>("/messages/interactive-list", { to, body, button_label: buttonLabel, sections }),

  sendProduct: (to: string, catalogId: string, productRetailerId: string, body?: string) =>
    api.post<SendResult>("/messages/product", { to, catalog_id: catalogId, product_retailer_id: productRetailerId, body }),

  sendProducts: (
    to: string, catalogId: string, header: string, body: string,
    sections: { title: string; product_retailer_ids: string[] }[],
  ) => api.post<SendResult>("/messages/products", { to, catalog_id: catalogId, header, body, sections }),

  sendCatalog: (to: string, body: string) =>
    api.post<SendResult>("/messages/catalog", { to, body }),

  /** The Business Manager Dataset that receives Purchase conversion events for
   * Click-to-WhatsApp ads. Pass null to stop sending them. */
  setAdTracking: (datasetId: string | null) =>
    api.post<{ dataset_id: string | null }>("/channels/whatsapp/ad-tracking", { dataset_id: datasetId }),
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
    /** 2-10 cards makes this a carousel template - header_text/footer/buttons above are ignored. */
    carousel_cards?: CarouselCardDraft[];
  }) => api.post<Template>("/templates", data),

  delete: (id: string, allLanguages = false) =>
    api.delete<void>(`/templates/${id}${allLanguages ? "?all_languages=true" : ""}`),

  sync: () => api.post<Template[]>("/templates/sync"),

  uploadCarouselImage: (file: File) => {
    const formData = new FormData();
    formData.set("file", file);
    return api.post<CarouselImageUpload>("/templates/carousel/image", formData, true);
  },

  draftCarouselCards: (brief: string, cardCount: number) =>
    api.post<{ cards: CarouselDraftCard[] }>("/templates/carousel/draft", {
      brief, card_count: cardCount,
    }),
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

export type AudienceKey =
  | "owes_money"
  | "overdue"
  | "we_promised"
  | "gone_quiet"
  | "by_tag"
  | "all_customers";

export type AudienceSegment = {
  value: AudienceKey;
  label: string;
  /** "gone_quiet" needs a days-quiet threshold; "by_tag" needs a tag label. */
  needs_params: boolean;
};

export type CampaignCardRequest = { media_id: string; variable_mapping: string[] };

export type CampaignRequest = {
  name: string;
  audience: AudienceKey;
  audience_params?: Record<string, unknown>;
  template_name: string;
  template_language?: string;
  /** Which of each recipient's own fields fill the template's {{1}}, {{2}}, ... in order. */
  variable_mapping?: string[];
  /** Present only when template_name is a carousel template - one entry per card. */
  carousel_cards?: CampaignCardRequest[];
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

export type TeamMemberPerformance = {
  user_id: string;
  full_name: string | null;
  email: string;
  messages_sent: number;
  replies_counted: number;
  avg_first_response_minutes: number | null;
  commitments_resolved: number;
  avg_resolution_hours: number | null;
};

export type TeamPerformance = {
  days: number;
  members: TeamMemberPerformance[];
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
  team: () => api.get<TeamPerformance>("/analytics/team"),
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

// ── WhatsApp Business Account management ─────────────────────────────────────
// Everything a business would otherwise leave Krova and open Meta's own
// WhatsApp Manager to do: the profile customers see, number verification,
// and the health signals that predict a restriction before it happens.

export type WhatsAppProfile = {
  about: string | null;
  address: string | null;
  description: string | null;
  email: string | null;
  websites: string[] | null;
  vertical: string | null;
  vertical_label: string | null;
  profile_picture_url: string | null;
};

export type WhatsAppHealth = {
  phone_number_id: string;
  display_phone_number: string | null;
  verified_name: string | null;
  quality_rating: string | null;
  messaging_limit_tier: string | null;
  daily_recipient_limit: number | null;
  status: string | null;
  code_verification_status: string | null;
  name_status: string | null;
  throughput_level: string | null;
  account_mode: string | null;
  is_official_business_account: boolean;
  healthy: boolean;
  warnings: string[];
};

export type WhatsAppBlocker = {
  entity: string;
  state: string;
  code: number | null;
  message: string;
  fix: string | null;
};

export type WhatsAppReadiness = {
  ready: boolean;
  can_send: string;
  needs_payment_method: boolean;
  action_required: string | null;
  billing_url: string | null;
  blockers: WhatsAppBlocker[];
  notes: string[];
};

export const waAccount = {
  profile: () => api.get<WhatsAppProfile>("/account/whatsapp/profile"),

  updateProfile: (
    data: Partial<{
      about: string; address: string; description: string;
      email: string; websites: string[]; vertical: string;
    }>,
  ) => api.post<WhatsAppProfile>("/account/whatsapp/profile", data),

  verticals: () => api.get<{ value: string; label: string }[]>("/account/whatsapp/verticals"),

  health: () => api.get<WhatsAppHealth>("/account/whatsapp/health"),

  readiness: () => api.get<WhatsAppReadiness>("/account/whatsapp/readiness"),

  requestCode: (method: "SMS" | "VOICE" = "SMS", language = "en") =>
    api.post<{ sent: boolean; method: string; detail: string }>("/account/whatsapp/request-code", { method, language }),

  verifyCode: (code: string) => api.post<{ verified: boolean }>("/account/whatsapp/verify-code", { code }),

  setTwoStepPin: (pin: string) => api.post<{ updated: boolean }>("/account/whatsapp/two-step-pin", { pin }),
};

// ── Migrating an existing number from another provider ───────────────────────
// Four steps, each its own call, because the code step needs a human holding
// the phone. The number keeps its quality rating, messaging tier, and
// approved templates - none of that rebuilds from zero.

export type MigrationCheck = { label: string; met: boolean | null; detail: string; who_fixes: string };

export type MigrationReadiness = {
  can_start: boolean;
  checks: MigrationCheck[];
  what_carries_over: string[];
};

export const migration = {
  readiness: () => api.get<MigrationReadiness>("/migration/whatsapp/readiness"),

  start: (phone: string) =>
    api.post<{ phone_number_id: string; display_phone_number: string; next_step: string }>(
      "/migration/whatsapp/start", { phone },
    ),

  requestCode: (phoneNumberId: string, method: "SMS" | "VOICE" = "SMS", language = "en") =>
    api.post<{ sent: boolean; method: string; detail: string }>(
      "/migration/whatsapp/request-code", { phone_number_id: phoneNumberId, method, language },
    ),

  verifyCode: (phoneNumberId: string, code: string) =>
    api.post<{ verified: boolean; next_step: string }>(
      "/migration/whatsapp/verify-code", { phone_number_id: phoneNumberId, code },
    ),

  finish: (phoneNumberId: string, displayPhoneNumber?: string) =>
    api.post<{ connected: boolean; phone_number_id: string; display_phone_number: string | null; note: string }>(
      "/migration/whatsapp/finish", { phone_number_id: phoneNumberId, display_phone_number: displayPhoneNumber },
    ),
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

export type SignalKind = "bug" | "feature_request" | "complaint" | "churn_risk" | "praise" | "account_health";
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

// ── Canned Responses ──────────────────────────────────────────────────────────

export type CannedResponse = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

export const cannedResponses = {
  list: () => api.get<CannedResponse[]>("/canned-responses"),
  create: (data: { title: string; body: string }) => api.post<CannedResponse>("/canned-responses", data),
  update: (id: string, data: Partial<{ title: string; body: string }>) =>
    api.patch<CannedResponse>(`/canned-responses/${id}`, data),
  remove: (id: string) => api.delete<void>(`/canned-responses/${id}`),
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

// ── WhatsApp Flows ───────────────────────────────────────────────────────────
// Native in-chat structured forms - a screen/component tree authored as
// Flow JSON, pushed to Meta, then opened for a specific customer. Scoped to
// navigate flows (see the backend's shared/db/models/flow.py): the entry
// screen and any data are fixed at send time, nothing calls back to Krova
// mid-flow.

export type FlowValidationIssue = {
  error_type: string | null;
  message: string | null;
  line_start: number | null;
  line_end: number | null;
};

export type WhatsAppFlow = {
  id: string;
  meta_flow_id: string;
  name: string;
  categories: string[];
  status: "DRAFT" | "PUBLISHED" | "DEPRECATED";
  validation_errors: FlowValidationIssue[];
  flow_json: Record<string, unknown>;
};

export type FlowSendResult = {
  sent: boolean;
  message_id: string;
  flow_token: string;
};

export const flows = {
  list: () => api.get<WhatsAppFlow[]>("/flows"),

  get: (id: string) => api.get<WhatsAppFlow>(`/flows/${id}`),

  create: (data: { name: string; categories: string[]; flow_json: Record<string, unknown> }) =>
    api.post<WhatsAppFlow>("/flows", data),

  publish: (id: string) => api.post<WhatsAppFlow>(`/flows/${id}/publish`),

  send: (
    id: string,
    data: { customer_id: string; body: string; screen: string; cta: string; data?: Record<string, unknown>; draft?: boolean },
  ) => api.post<FlowSendResult>(`/flows/${id}/send`, data),
};

