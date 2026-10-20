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

/**
 * A failed API call. `message` is what to show; `detail` is the server's
 * structured body when it sent one (e.g. {code: "assigned_to_other", ...}) so a
 * caller can offer "Take over" instead of just printing the error.
 */
export class ApiError extends Error {
  status: number;
  detail: Record<string, unknown> | null;
  constructor(message: string, status: number, detail: Record<string, unknown> | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
  get code(): string | null {
    return typeof this.detail?.code === "string" ? this.detail.code : null;
  }
}

/** The teammate whose chat/escalation this is, when an action was refused for that reason. */
export function assignedToOther(err: unknown): { id: string; name: string } | null {
  if (err instanceof ApiError && err.code === "assigned_to_other") {
    return { id: String(err.detail?.assignee_id ?? ""), name: String(err.detail?.assignee_name ?? "a teammate") };
  }
  return null;
}

function toApiError(res: Response, err: { detail?: unknown }): ApiError {
  const raw = err?.detail;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const d = raw as Record<string, unknown>;
    return new ApiError(String(d.message ?? `Something went wrong (${res.status})`), res.status, d);
  }
  const text = Array.isArray(raw) ? (raw[0] as { msg?: string })?.msg : (raw as string | undefined);
  return new ApiError(text || `Something went wrong (${res.status})`, res.status);
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
    const apiError = toApiError(res, await res.json().catch(() => ({})));
    if (apiError.code === "password_change_required" && typeof window !== "undefined") {
      // A handed-over password is only good for choosing your own.
      window.location.href = window.location.pathname.startsWith("/app") ? "/app/change-password" : "/change-password";
    }
    throw apiError;
  }

  if (res.status === 204) return {} as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

// A file download (Tally XML export, so far) needs the response body raw,
// never JSON.parse'd - same auth/refresh contract as request<T>, different
// final step.
async function requestBlob(method: string, path: string): Promise<Blob> {
  if (!getAccessToken()) throw new NotAuthenticated();

  let res = await send(method, path);
  if (res.status === 401 && (await refreshSession())) {
    res = await send(method, path);
  }
  if (res.status === 401) {
    clearSession();
    throw new NotAuthenticated();
  }
  if (!res.ok) {
    throw toApiError(res, await res.json().catch(() => ({})));
  }
  return res.blob();
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  getBlob: (path: string) => requestBlob("GET", path),
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
  // Money received so far, and what is still owed. amount_paise stays
  // what was promised - see shared/care/commitment_payments.py.
  amount_received_paise: number;
  outstanding_paise: number | null;
  outstanding_display: string | null;
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
  /** Both directions combined — a UI presenting this as receivables should use overdue_they_owe_* instead. */
  overdue_count: number;
  overdue_paise: number;
  overdue_they_owe_count: number;
  overdue_they_owe_paise: number;
  overdue_we_owe_count: number;
  overdue_we_owe_paise: number;
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

  // Money received against an open commitment - all of it or part. Closes
  // it as met once the promised amount has arrived.
  recordPayment: (id: string, amountPaise: number) =>
    api.post<Commitment>(`/ledger/commitments/${id}/payments`, { amount_paise: amountPaise }),

  /** Beta - WhatsApp Payments (India), unverified against a live WABA. See docs/whatsapp-hub-fixes-and-gaps.md. */
  requestPayment: (id: string, templateName: string, templateLanguage = "en") =>
    api.post<{ sent: boolean; message_id: string }>(`/ledger/commitments/${id}/request-payment`, {
      template_name: templateName,
      template_language: templateLanguage,
    }),

  // `q` searches every customer (name, phone, handle) on the server; `customer_id` returns just that one.
  customers: (params?: { q?: string; customer_id?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.customer_id) qs.set("customer_id", params.customer_id);
    if (params?.limit) qs.set("limit", String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get<CustomerSummary[]>(`/ledger/customers${suffix}`);
  },

  // Sent in batches of 1,000 so a large file never sits in one long request; `total` lets the server
  // check the whole file against the plan's import size, not just each batch.
  importCustomers: async (contacts: { phone: string; name?: string | null }[]): Promise<ContactImportResult> => {
    const BATCH = 1000;
    const merged: ContactImportResult = { created: 0, already_existed: 0, invalid: 0, rows: [] };
    for (let i = 0; i < contacts.length; i += BATCH) {
      const part = await api.post<ContactImportResult>("/ledger/customers/import", {
        contacts: contacts.slice(i, i + BATCH),
        total: contacts.length,
      });
      merged.created += part.created;
      merged.already_existed += part.already_existed;
      merged.invalid += part.invalid;
      merged.rows.push(...part.rows.map((r) => ({ ...r, row_number: r.row_number + i })));
    }
    return merged;
  },

  // Settled payments as a Tally-importable Receipt Voucher XML - clinics
  // hand this straight to their CA. Scope: payments received only, see the
  // backend's shared/reports/tally_export.py for why.
  exportTally: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.getBlob(`/ledger/export/tally${suffix}`);
  },
};

// ── Data export (a business's own customers/conversations, out) ────────────

export const dataExport = {
  customersCsv: () => api.getBlob("/export/customers"),
  conversationsCsv: (since?: string) =>
    api.getBlob(`/export/conversations${since ? `?since=${encodeURIComponent(since)}` : ""}`),
};

// ── Escalations ──────────────────────────────────────────────────────────

export type EscalationRow = {
  id: string;
  customer_id: string | null;
  channel: string;
  reason: string;
  // Stamped by a cold-path sweep a few minutes after creation, not at
  // creation time - null until then. Display-only: never a condition
  // field for escalation.raised (see CONDITION_FIELDS below), since it's
  // never actually present in scope at the moment that trigger dispatches.
  category: string | null;
  request_summary: string | null;
  caller_phone: string | null;
  contact_handle: string | null;
  status: "open" | "in_progress" | "resolved" | "dismissed";
  due_at: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
  acknowledged_at: string | null;
  escalated_further_at: string | null;
  /** The one person dealing with it; null = anyone may take it. */
  assigned_to_user_id?: string | null;
  assigned_to_name?: string | null;
  assigned_at?: string | null;
};

export type ZohoStatus = {
  configured: boolean;
  connected: boolean;
  organization_id: string | null;
  last_synced_at: string | null;
  last_sync_summary: Record<string, number> | null;
};

export type ReceivablesImportResult = {
  created: number;
  updated: number;
  reopened: number;
  resolved: number;
  rows: number;
  skipped: number;
  errors: { line: number; reason: string }[];
};

export type ReceivablesImportRun = {
  id: string;
  source: string;
  filename: string | null;
  mark_missing_paid: boolean;
  rows: number;
  created: number;
  updated: number;
  resolved: number;
  skipped: number;
  at: string | null;
};

export const receivables = {
  history: () => api.get<ReceivablesImportRun[]>("/receivables/history"),
  import: (file: File, markMissingPaid: boolean) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mark_missing_paid", String(markMissingPaid));
    return api.post<ReceivablesImportResult>("/receivables/import", formData, true);
  },
};

export const zoho = {
  status: () => api.get<ZohoStatus>("/zoho/status"),
  connectUrl: () => api.get<{ url: string }>("/zoho/connect"),
  sync: () => api.post<Record<string, number>>("/zoho/sync"),
  disconnect: () => api.delete<void>("/zoho/connection"),
};

export type LeadSource = {
  key: string;
  label: string;
  setup: "account_manager" | "self_serve";
  steps: string[];
  configured: boolean;
  webhook_url: string | null;
  last_lead_at: string | null;
};

export type LeadSourceLead = {
  id: string;
  source: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  query: string | null;
  status: "received" | "duplicate" | "no_phone";
  received_at: string;
};

export type LeadSourceKey = "magicbricks" | "99acres" | "housing" | "justdial" | "other";

export type LeadImportResult = {
  source: string;
  rows: number;
  received: number;
  duplicate: number;
  no_phone: number;
};

export const leadImports = {
  upload: (file: File, source: LeadSourceKey) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("source", source);
    return api.post<LeadImportResult>("/leads/import", formData, true);
  },
  manual: (body: { name?: string; phone?: string; email?: string; query?: string; source: LeadSourceKey }) =>
    api.post<{ status: string; id: string }>("/leads/manual", body),
};

export type EmailLeadsSettings = {
  configured: boolean;
  address: string | null;
  last_lead_at: string | null;
  steps: string[];
};

export type EmailLeadRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  query: string | null;
  status: "received" | "duplicate" | "no_phone";
  received_at: string;
};

export const emailLeads = {
  settings: () => api.get<EmailLeadsSettings>("/email-leads/settings"),
  generateToken: () => api.post<EmailLeadsSettings>("/email-leads/token"),
  leads: (limit = 10) => api.get<EmailLeadRow[]>(`/email-leads/leads?limit=${limit}`),
};

export const leadSources = {
  list: () => api.get<LeadSource[]>("/lead-sources"),
  generateToken: (key: string) => api.post<{ key: string; webhook_url: string }>(`/lead-sources/${key}/token`),
  leads: (limit = 10) => api.get<LeadSourceLead[]>(`/lead-sources/leads?limit=${limit}`),
};

export type FormFieldType =
  | "name"
  | "phone"
  | "email"
  | "text"
  | "textarea"
  | "select"
  | "checkbox"
  | "file"
  | "date"
  | "number"
  | "url";

export type LeadFormShowIf = { field_key: string; equals: string };

export type LeadFormField = {
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[] | null;
  // Which page this field renders on - 0 is the first page.
  step: number;
  // Only rendered (and only required) once the field named field_key
  // currently holds the value equals. Undefined/null = always shown.
  show_if?: LeadFormShowIf | null;
};

export type LeadForm = {
  id: string;
  title: string;
  description: string | null;
  fields: LeadFormField[];
  is_published: boolean;
  public_url: string | null;
  submission_count: number;
  logo_url: string | null;
  accent_color: string | null;
};

export type LeadFormInput = {
  title: string;
  description?: string | null;
  fields: LeadFormField[];
  is_published: boolean;
  accent_color?: string | null;
};

export const leadForms = {
  list: () => api.get<LeadForm[]>("/forms"),
  create: (body: LeadFormInput) => api.post<LeadForm>("/forms", body),
  update: (id: string, body: LeadFormInput) => api.patch<LeadForm>(`/forms/${id}`, body),
  remove: (id: string) => api.delete<void>(`/forms/${id}`),
  uploadLogo: (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<LeadForm>(`/forms/${id}/logo`, formData, true);
  },
};

export type IndiamartSettings = {
  configured: boolean;
  webhook_url: string | null;
  last_lead_at: string | null;
  steps: string[];
};

export type IndiamartLeadRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  query: string | null;
  status: "received" | "duplicate" | "no_phone";
  customer_id: string | null;
  received_at: string;
};

export type LeadRow = {
  id: string;
  source: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  query: string | null;
  status: "received" | "duplicate" | "no_phone";
  customer_id: string | null;
  received_at: string;
  /** When a person first answered by message or call. null = nobody yet. */
  first_touch_at?: string | null;
  assigned_to_name?: string | null;
};

export type LeadListResult = {
  items: LeadRow[];
  total: number;
};

export type LeadSourceCount = {
  source: string;
  total: number;
};

export const leads = {
  list: (params: { source?: string; status?: string; q?: string; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.source) qs.set("source", params.source);
    if (params.status) qs.set("status", params.status);
    if (params.q) qs.set("q", params.q);
    qs.set("limit", String(params.limit ?? 25));
    qs.set("offset", String(params.offset ?? 0));
    return api.get<LeadListResult>(`/leads?${qs.toString()}`);
  },
  sources: () => api.get<LeadSourceCount[]>("/leads/sources"),
};

export const indiamart = {
  settings: () => api.get<IndiamartSettings>("/indiamart/settings"),
  generateToken: () => api.post<IndiamartSettings>("/indiamart/token"),
  leads: (limit = 10) => api.get<IndiamartLeadRow[]>(`/indiamart/leads?limit=${limit}`),
};

export type JustdialSettings = {
  configured: boolean;
  webhook_url: string | null;
  last_lead_at: string | null;
  steps: string[];
};

export type InboundLeadRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  query: string | null;
  status: "received" | "duplicate" | "no_phone";
  customer_id: string | null;
  received_at: string;
};

export const justdial = {
  settings: () => api.get<JustdialSettings>("/justdial/settings"),
  generateToken: () => api.post<JustdialSettings>("/justdial/token"),
  leads: (limit = 20) => api.get<InboundLeadRow[]>(`/justdial/leads?limit=${limit}`),
};

export type EscalationSettings = {
  escalation_sla_hours: number | null;
  outbound_number_series: "080" | "022" | "140" | null;
};

export const escalations = {
  list: (acknowledged = false, filter?: "mine" | "unassigned") =>
    api.get<EscalationRow[]>(
      `/escalations?acknowledged=${acknowledged}${filter ? `&${filter}=true` : ""}`,
    ),
  /** "I've got this." A teammate who already holds it gets the 409 assignedToOther() reads. */
  claim: (id: string, force = false) =>
    api.post<EscalationRow>(`/escalations/${id}/claim`, { force }),
  release: (id: string) => api.post<EscalationRow>(`/escalations/${id}/release`),
  settings: () => api.get<EscalationSettings>("/escalations/settings"),
  updateSettings: (body: EscalationSettings) =>
    api.patch<EscalationSettings>("/escalations/settings", body),
  acknowledge: (id: string) => api.post<EscalationRow>(`/escalations/${id}/acknowledge`),
  setStatus: (id: string, status: "in_progress" | "resolved" | "dismissed", resolutionNote?: string) =>
    api.patch<EscalationRow>(`/escalations/${id}/status`, {
      status,
      resolution_note: resolutionNote ?? null,
    }),
  count: () => api.get<{ open: number }>("/escalations/count"),
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
  identities: Identity[];
  last_contact_at: string | null;
  open_commitments: number;
  is_private: boolean;
  health_score?: number;
  outstanding_paise?: number;
  summary?: string;
  preferred_channel?: string;
  stage?: string | null;
  /** Who pays for this customer (a parent, a company...) - set by hand, never inferred. */
  paid_by_customer_id?: string | null;
  paid_by_name?: string | null;
  /** The people this customer pays for. */
  pays_for?: { id: string; name: string | null }[];
  /** Confirmed tag labels only - suggestions live in crm.tags(). */
  tags?: string[];
  deal_value_paise?: number | null;
  /** WhatsApp policy / DPDPA consent - never inferred from a conversation, only set by an explicit action. */
  marketing_opt_in?: boolean;
};

// ── CRM: tags, notes, pipeline stage ────────────────────────────────────────
// A tag is either a human's own label (confirmed immediately) or something
// the nightly profile worker proposed from real signal data (status
// "suggested", with `reasoning` attached) - a human still has to say yes.

export type CustomerDate = {
  id: string;
  label: string;
  /** YYYY-MM-DD */
  date: string;
  note?: string | null;
  // Comes round every year (birthday, anniversary, yearly AMC).
  repeats_yearly?: boolean;
};

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
  /** null when the owner keeps business money from team members. */
  total_deal_value_paise: number | null;
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

  setMarketingOptIn: (customerId: string, optIn: boolean) =>
    api.patch<{ customer_id: string; marketing_opt_in: boolean; marketing_opt_in_at: string | null }>(
      `/crm/customers/${customerId}/marketing-opt-in`,
      { opt_in: optIn },
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

  // Link (or clear, with null) who pays for this customer. Automation
  // steps can then be sent to the payer instead - "fees due -> WhatsApp
  // the parent".
  setPayer: (customerId: string, paidByCustomerId: string | null) =>
    api.patch<{ customer_id: string; paid_by_customer_id: string | null; paid_by_name: string | null }>(
      `/crm/customers/${customerId}/payer`,
      { paid_by_customer_id: paidByCustomerId },
    ),

  // Key dates the business sets on a customer - "Renewal", "AMC expiry",
  // "Package ends". Its automation rules act on them through the
  // customer.date_approaching trigger.
  dates: (customerId: string) => api.get<CustomerDate[]>(`/crm/customers/${customerId}/dates`),
  addDate: (customerId: string, data: { label: string; date: string; note?: string | null; repeats_yearly?: boolean }) =>
    api.post<CustomerDate>(`/crm/customers/${customerId}/dates`, data),
  deleteDate: (dateId: string) => api.delete<void>(`/crm/dates/${dateId}`),
  dateLabels: () => api.get<string[]>("/crm/date-labels"),

  pipelineStages: () => api.get<{ stages: string[] }>("/crm/pipeline-stages"),

  setPipelineStages: (stages: string[]) =>
    api.put<{ stages: string[] }>("/crm/pipeline-stages", { stages }),
};

// ── Approvals ─────────────────────────────────────────────────────────────────

export type AutonomyLevel = "observe" | "draft" | "act" | "conditional";

export type AutoSendRules = {
  enabled: boolean;
  min_confidence: number;
  blocked_keywords: string[];
  autonomy: AutonomyLevel;
  drafted_last_30d: number;
  approval_rate_last_30d: number | null;
};

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
  /** A carousel the AI wants to send along with this reply, by name - null when it chose none. */
  share_carousel: string | null;
  /** What the AI filled the carousel's {{variables}} with, if it has any - so you can see "Hi Rahul" before it goes. */
  share_carousel_values: { body: string[]; cards: string[][] } | null;
};

export const approvals = {
  list: (status: string = "pending") =>
    api.get<MessageDraft[]>(`/approvals?status=${status}`),

  count: () => api.get<{ pending: number; needs_you: number }>("/approvals/count"),

  /**
   * Pass the edited text if a person changed it; omit to send the agent's words
   * unchanged. `sendCarousel: false` sends the reply without the carousel the AI
   * suggested with it (ignored when the draft has none).
   */
  approve: (id: string, editedBody?: string, sendCarousel: boolean = true) =>
    api.post<MessageDraft>(`/approvals/${id}/approve`, {
      body: editedBody || null,
      send_carousel: sendCarousel,
    }),

  reject: (id: string, note?: string) =>
    api.post<MessageDraft>(`/approvals/${id}/reject`, { note: note || null }),

  setAutonomy: (autonomy: AutonomyLevel) =>
    api.post<{ autonomy: AutonomyLevel }>("/approvals/autonomy", { autonomy }),

  autoSendRules: () => api.get<AutoSendRules>("/approvals/auto-send-rules"),

  updateAutoSendRules: (data: Partial<{ enabled: boolean; min_confidence: number; blocked_keywords: string[] }>) =>
    api.patch<AutoSendRules>("/approvals/auto-send-rules", data),
};

// ── Conversations ─────────────────────────────────────────────────────────────
// One row per customer, not per channel - someone who emails Monday and
// WhatsApps Wednesday is one thread, because they're one person.

/** masked: the owner hides numbers from team members - value is only the last 4 digits; send by customer id. */
export type Identity = { kind: string; value: string; masked?: boolean };
/**
 * Where a WhatsApp send goes: the customer's number - or, when it is masked, "customer:<id>", which the
 * server turns back into their number (services/api/routers/messages.py::_recipient).
 */
/** False for a number masked to its last 4 digits (••••••3210) - nothing to dial. */
export const dialable = (value?: string | null): value is string => !!value && !value.startsWith("•");

export function sendAddress(identities: Identity[], customerId: string): string | null {
  const phone = identities.find((i) => i.kind === "phone");
  if (!phone) return null;
  return phone.masked ? `customer:${customerId}` : phone.value;
}

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
  /** q searches actual message content in the database, not just the one
   * last-message preview the client already has - pass it for anything
   * beyond an instant client-side filter. */
  list: (q?: string) =>
    api.get<ConversationItem[]>(`/conversations${q ? `?q=${encodeURIComponent(q)}` : ""}`),

  thread: (customerId: string) =>
    api.get<ConversationThread>(`/conversations/${customerId}`),

  setPrivate: (customerId: string, isPrivate: boolean) =>
    api.post<{ customer_id: string; is_private: boolean }>(
      `/conversations/${customerId}/private?private=${isPrivate}`,
    ),

  /** Make this chat yours, whoever had it. Logged for the owner. */
  takeOver: (customerId: string) =>
    api.post<{ customer_id: string; assigned_to_user_id: string; previous_user_id: string | null }>(
      `/conversations/${customerId}/take-over`,
    ),

  /** Heartbeat from an open thread; returns the teammates who have it open too. */
  presence: (customerId: string, typing = false, left = false) =>
    api.post<{ viewers: ThreadViewer[] }>(`/conversations/${customerId}/presence`, { typing, left }),

  // Omit userId (or pass undefined) to unassign.
  assign: (customerId: string, userId?: string) =>
    api.post<{ customer_id: string; assigned_to_user_id: string | null }>(
      `/conversations/${customerId}/assign${userId ? `?user_id=${userId}` : ""}`,
    ),
};

// ── Team ─────────────────────────────────────────────────────────────────────

export type TeamMember = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  /** Owner / admin only: what the person types to sign in, and their state. */
  team_id?: string | null;
  last_login_at?: string | null;
  must_change_password?: boolean | null;
  locked?: boolean | null;
  /** False = Away: new chats are not routed to them. */
  available?: boolean;
  /** Where calls for this person ring (digits, no plus). Owner / admin, and the person themselves. */
  phone?: string | null;
};

export type CustomerBriefingData = {
  customer_id: string;
  name: string;
  private: boolean;
  phones: string[];
  language: string | null;
  stage: string | null;
  tags: string[];
  owner: { user_id: string; name: string | null } | null;
  lead: { source: string; query: string; received_at: string } | null;
  summary: string | null;
  last_said: string | null;
  messages: { who: "customer" | "us"; channel: string; text: string; at: string }[];
  escalation: { reason: string; status: string; at: string } | null;
  promises: {
    id: string; direction: "we_owe" | "they_owe"; kind: string; description: string;
    due_at: string | null; amount_paise: number | null; outstanding_paise: number | null; overdue: boolean;
  }[];
  owed_to_us_paise: number;
  owed_by_us_paise: number;
  next_visit: { at: string; with: string } | null;
  last_call: { at: string; outcome: string | null; summary: string | null; by: string | null } | null;
  notes: { body: string; at: string }[];
  headline: string;
};

export const team = {
  list: () => api.get<TeamMember[]>("/team"),
  /** Who this customer is and what is open with them. */
  briefing: (customerId: string) => api.get<CustomerBriefingData>(`/team/briefing/${customerId}`),
  /** Owner / admin: set where calls for a member ring. Empty clears it. */
  setMemberPhone: (userId: string, phone: string) =>
    api.patch<{ phone: string | null }>(`/team/members/${userId}/phone`, { phone }),
  /** Where calls for me ring. */
  setMyPhone: (phone: string) => api.put<{ phone: string | null }>("/team/me/phone", { phone }),
  /** Owner / admin. The password in the result is shown once and never again. */
  add: (body: { full_name: string; handle: string; role: "admin" | "agent"; password?: string }) =>
    api.post<TeamCredentials>("/team/members", body),
  setRole: (userId: string, role: "admin" | "agent") =>
    api.patch<{ user_id: string; role: string }>(`/team/members/${userId}`, { role }),
  resetPassword: (userId: string, password?: string) =>
    api.post<TeamCredentials>(`/team/members/${userId}/reset-password`, { password: password ?? null }),
  remove: (userId: string) =>
    api.delete<{ removed: string; released: { conversations: number; cases: number; escalations: number } }>(
      `/team/members/${userId}`,
    ),
};

export type TeamSettings = {
  auto_assign_on_reply: boolean;
  agent_visibility: "all" | "assigned";
  routing: "manual" | "round_robin";
  /** First-reply target in minutes; null = no reminders. */
  sla_minutes: number | null;
  /** What agents may see and do (shared/team/settings.py). */
  agent_money?: boolean;
  agent_payments?: boolean;
  agent_phones?: "shown" | "last4";
  agent_templates?: boolean;
};
/** What this person may see and do - all true for the owner and admins. */
export type Permissions = {
  see_money: boolean;
  take_payments: boolean;
  see_phones: boolean;
  send_templates: boolean;
};
/** Missing (an older backend) means everything is allowed - the API still refuses what is not. */
export const can = (p: UserProfile | null | undefined, key: keyof Permissions) =>
  p?.permissions?.[key] !== false;
export type MyWork = {
  chats: number; drafts_waiting: number; escalations: number; cases: number;
  /** Calls I spoke on and have not written up. */
  calls_to_write_up?: number;
};

export type CallState = {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  /** ringing_you -> talking -> ended */
  state: "ringing_you" | "talking" | "ended";
  direction: "placed" | "received";
  started_at: string;
  answered_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  reached_customer: boolean | null;
  wrapped_up: boolean;
};

export type WrapUpPromise = { description: string; due_on?: string | null; kind?: string };

export const calls = {
  /** Rings my phone; the customer is dialled when I pick up. */
  start: (customerId: string) => api.post<CallState>("/calls/start", { customer_id: customerId }),
  get: (id: string) => api.get<CallState>(`/calls/${id}`),
  /** Calls I spoke on and have not written up. */
  pendingWrapups: () => api.get<CallState[]>("/calls/pending/wrapup"),
  wrapUp: (id: string, body: { note: string; promises: WrapUpPromise[] }) =>
    api.post<{ ok: boolean; promises_filed: number }>(`/calls/${id}/wrapup`, body),
};

export const teamSettings = {
  get: () => api.get<TeamSettings>("/team/settings"),
  save: (body: TeamSettings) => api.put<TeamSettings>("/team/settings", body),
  myWork: () => api.get<MyWork>("/team/my-work"),
  setAvailable: (available: boolean) => api.put<{ available: boolean }>("/team/me/availability", { available }),
  transferOwnership: (userId: string, password: string) =>
    api.post<{ new_owner: string }>("/team/transfer-ownership", { user_id: userId, password }),
};

// ── Billing: the plan, the wallet, PayU ─────────────────────────────────────

export type BillingPlan = { key: "starter" | "pro" | "scale"; label: string; base: string; gst: string; total: string };

/** Why the plan is off - null when it is not. */
export type PlanStatus = {
  state: "required" | "suspended" | "ended" | null;
  blocked: boolean;
  /** Owner or admin: may open Billing and pay. */
  can_manage: boolean;
};

export type PlanUsage = {
  plan: string;
  messages_used: number;
  messages_limit: number;
  phone_lines_used: number;
  phone_lines_limit: number;
  team_used: number;
  team_limit: number;
  knowledge_tokens_used: number;
  knowledge_tokens_limit: number;
};

export type BillingOverview = {
  /** Null when the business is not on a sized plan (a trial). */
  usage?: PlanUsage | null;
  payments_enabled: boolean;
  plan_state?: "required" | "suspended" | "ended" | null;
  plans: BillingPlan[];
  subscription: {
    plan: string;
    status: "active" | "past_due" | "suspended" | "cancelled";
    amount: string;
    current_period_end: string;
    next_charge_at: string | null;
    cancel_at_period_end: boolean;
    last_failure: string | null;
    retry_until: string | null;
  } | null;
  blocked: boolean;
  wallet_balance: string | null;
  number_rent: string;
  low_balance: boolean;
  entries: { at: string; kind: string; amount: string; balance_after: string; note: string | null }[];
  payments: { at: string; purpose: string; status: string; total: string; failure: string | null }[];
};

/** Who GST invoices are made out to. */
export type BillingDetails = {
  legal_name: string; address: string; state_code: string; state_name: string; gstin: string;
  /** An address and state are on file. */
  complete: boolean;
  states: { code: string; name: string }[];
};

/** One invoice (plan payment) or receipt (wallet top-up). */
export type InvoiceRow = {
  id: string; number: string; kind: "invoice" | "receipt"; issued_at: string; description: string; total: string; gst: string;
};

/** A signed form the browser posts to PayU. */
export type PayuCheckout = { action: string; fields: Record<string, string>; total: string };

export const billing = {
  overview: () => api.get<BillingOverview>("/billing"),
  /** Open to every member: is the plan paused, and may I fix it? */
  status: () => api.get<PlanStatus>("/billing/status"),
  quote: (amountRupees: number) =>
    api.get<{ credit: string; gst: string; fee: string; total: string }>(`/billing/quote?amount_rupees=${amountRupees}`),
  subscribe: (plan: BillingPlan["key"], coupon?: string) => api.post<PayuCheckout>("/billing/subscribe", { plan, coupon }),
  topup: (amountRupees: number) => api.post<PayuCheckout>("/billing/topup", { amount_rupees: amountRupees }),
  cancel: () => api.post<{ ends_on: string }>("/billing/cancel"),
  resume: () => api.post<{ resumed: boolean }>("/billing/resume"),
  details: () => api.get<BillingDetails>("/billing/details"),
  saveDetails: (d: { legal_name: string; address: string; state_code: string; gstin: string }) =>
    api.put<BillingDetails>("/billing/details", d),
  invoices: () => api.get<InvoiceRow[]>("/billing/invoices"),
  downloadInvoice: (id: string) => api.getBlob(`/billing/invoices/${id}/pdf`),
};

/** Hand the customer to PayU: build the form and submit it. Leaves this page. */
export function goToPayu(checkout: PayuCheckout): void {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = checkout.action;
  for (const [name, value] of Object.entries(checkout.fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

export type ThreadViewer = { user_id: string; name: string; typing: boolean };

export type TeamCredentials = {
  user_id: string;
  full_name: string | null;
  role: string;
  team_id: string;
  password: string;
};

// ── Team activity: what each person on the team has done ─────────────────────
// Owner / admin only. See services/api/routers/team_activity.py.

export type ActivityItem = {
  id: string;
  user_id: string | null;
  /** Their name or email as it was at the time - still reads sensibly after they leave. */
  user_label: string;
  role: string | null;
  action: string;
  /** work = day-to-day for a customer; config = changes how the business runs; security = data leaving or access granted. */
  kind: "work" | "config" | "security";
  summary: string;
  outcome: "ok" | "denied" | "failed";
  /** Ids and counts only - never message text. */
  detail: Record<string, string>;
  ip: string | null;
  user_agent: string | null;
  occurred_at: string;
};

export type ActivityPage = { items: ActivityItem[]; next_before: string | null };

export type MemberActivity = {
  user_id: string | null;
  name: string;
  role: string | null;
  last_active_at: string | null;
  messages_sent: number;
  drafts_approved: number;
  drafts_rejected: number;
  escalations_handled: number;
  conversations_assigned: number;
  config_changes: number;
  data_exports: number;
  sign_ins: number;
  refused_attempts: number;
};

export const teamActivity = {
  feed: (params: {
    user_id?: string;
    kind?: "work" | "config" | "security";
    outcome?: "ok" | "denied" | "failed";
    since?: string;
    before?: string;
    limit?: number;
  } = {}) => {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") qs.set(key, String(value));
    }
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get<ActivityPage>(`/team/activity${suffix}`);
  },

  summary: (days = 7) =>
    api.get<{ days: number; members: MemberActivity[] }>(`/team/activity/summary?days=${days}`),
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

export type TemplateAiDraft = {
  name: string;
  category: "UTILITY" | "MARKETING";
  language: string;
  body: string;
  header_text: string | null;
  footer: string | null;
  examples: Record<string, string>;
  buttons: TemplateButton[];
  // why this category, what each {{n}} is - in the owner's language
  note: string;
  used: number;
  limit: number;
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
  disconnectInstagram: () => api.delete<void>("/channels/instagram"),

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

  /**
   * Read live from Meta, not from our own messages table: the IGSID a
   * participant carries here is the only id the Send API accepts.
   */
  instagramConversations: () =>
    api.get<InstagramConversation[]>("/messages/instagram/conversations"),

  instagramInsights: (days: number = 7) =>
    api.get<InstagramInsights>(`/messages/instagram/insights?days=${days}`),

  publishInstagramPhoto: (file: File, caption: string) => {
    const formData = new FormData();
    formData.set("file", file);
    formData.set("caption", caption);
    return api.post<PublishPhotoResult>("/messages/instagram/publish", formData, true);
  },

  /**
   * Instagram's "Generic Template" - a horizontally-scrollable carousel
   * of up to 10 cards, each with its own picture/title/subtitle/up to 3
   * buttons. Unlike a WhatsApp carousel template, this needs no Meta
   * review - it sends instantly, like any other Instagram message.
   */
  uploadInstagramCarouselImage: (file: File) => {
    const formData = new FormData();
    formData.set("file", file);
    return api.post<{ image_url: string }>("/messages/instagram/carousel/image", formData, true);
  },

  sendInstagramCarousel: (to: string, elements: InstagramCarouselElement[]) =>
    api.post<SendResult>("/messages/instagram/carousel", { to, elements }),

  /**
   * Saved, reusable carousels - the agent (shared/ai/agent.py's
   * share_carousel) picks one of these by name during a live reply, and
   * a staff member can re-send one without rebuilding it card by card.
   */
  listSavedInstagramCarousels: () =>
    api.get<SavedInstagramCarousel[]>("/messages/instagram/carousels"),

  saveInstagramCarousel: (name: string, description: string, elements: InstagramCarouselElement[]) =>
    api.post<SavedInstagramCarousel>("/messages/instagram/carousels", { name, description, elements }),

  deleteSavedInstagramCarousel: (id: string) =>
    api.delete<void>(`/messages/instagram/carousels/${id}`),

  sendSavedInstagramCarousel: (id: string, to: string) =>
    api.post<SendResult>(`/messages/instagram/carousels/${id}/send`, { to }),

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

  /** The business's own Meta Commerce Catalog id, used to match a customer's
   * photo against their real product catalog. Pass null to clear it. */
  setCatalogId: (catalogId: string | null) =>
    api.post<{ catalog_id: string | null }>("/channels/whatsapp/catalog-id", { catalog_id: catalogId }),

  /** WhatsApp Payments (India) is Meta-native - a business sets this up
   * directly on their own Meta Business Suite and pastes back the id Meta
   * gives them. Krova only remembers it. */
  getPaymentConfig: () =>
    api.get<{ payment_configuration_id: string | null; payment_gateway: "razorpay" | "payu" | null }>(
      "/channels/whatsapp/payment-config",
    ),
  setPaymentConfig: (paymentConfigurationId: string | null, gateway: "razorpay" | "payu" | null) =>
    api.post<{ payment_configuration_id: string | null; payment_gateway: string | null }>(
      "/channels/whatsapp/payment-config",
      { payment_configuration_id: paymentConfigurationId, payment_gateway: gateway },
    ),
};

export type SendResult = {
  sent: boolean;
  message_id: string;
  channel: string;
  used_template: boolean;
  window_open: boolean;
};

export type InstagramParticipant = {
  /** The IGSID - what the Send API addresses, not the account id Meta shows in its dashboard. */
  id: string;
  username: string | null;
};

export type InstagramConversation = {
  id: string;
  participants: InstagramParticipant[];
};

export type InstagramInsights = {
  period_days: number;
  values: Record<string, number>;
};

export type PublishPhotoResult = {
  media_id: string;
  image_url: string;
};

export type InstagramCarouselButton = {
  type: "web_url" | "postback";
  title: string;
  url?: string;
  payload?: string;
};

export type InstagramCarouselElement = {
  title: string;
  subtitle?: string;
  image_url?: string;
  buttons?: InstagramCarouselButton[];
};

export type SavedInstagramCarousel = {
  id: string;
  name: string;
  description: string;
  elements: InstagramCarouselElement[];
};

/** A ready-made template to start the builder from - see GET /templates/examples. */
export type TemplateExample = {
  name: string;
  category: "UTILITY" | "MARKETING";
  body: string;
  /** Sample value for each {{number}}. */
  examples: Record<string, string>;
  /** What each {{number}} stands for, in order. */
  variables: string[];
  /** Quick-reply button labels, in order. */
  buttons: string[];
  purpose: string;
  note: string | null;
  /** Which feature's messages go out as this template. */
  feature: string;
};

export const templates = {
  list: () => api.get<Template[]>("/templates"),

  /** Templates KROVA's own features send under fixed names, written to fit their values. */
  examples: () => api.get<TemplateExample[]>("/templates/examples"),

  create: (data: {
    name: string;
    category: "UTILITY" | "MARKETING" | "AUTHENTICATION";
    body: string;
    language?: string;
    header_text?: string;
    footer?: string;
    buttons?: TemplateButton[];
    /** Sample value per {{variable}} - Meta rejects a template whose variable has none. */
    examples?: Record<string, string>;
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

  /** A whole template written by KROVA from what it is for. Nothing is submitted - it fills the form. */
  draft: (brief: string) => api.post<TemplateAiDraft>("/templates/draft", { brief }),

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

export type ComplianceState = {
  subaccount_auth_id: string;
  has_end_user: boolean;
  uploaded_document_type_ids: string[];
};

export type DocumentType = { id: string; name: string };

export type ComplianceRequirement = {
  requirement_id: string;
  document_types: DocumentType[];
  /** Each inner list is one "any one of these is enough" group (e.g. Udyam, COI or GST). */
  groups?: DocumentType[][];
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

export type OwnedNumber = {
  number: string;
  city: string | null;
  region: string | null;
  is_connected: boolean;
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
  /** What the wallet is charged for the call: real cost (speech, carrier, AI) plus any platform charge (none for now). */
  ai_paise?: number;
  platform_paise?: number;
  charged_paise?: number;
  charged_display?: string;
  /** Which of the business's numbers this call used. */
  number?: string | null;
  number_label?: string | null;
  hangup_cause: string | null;
  started_at: string;
  escalated: boolean;
  escalation_reason: string | null;
  outcome: "resolved" | "escalated" | "booked" | "no_action" | null;
  sentiment: "positive" | "neutral" | "negative" | null;
  topic: string | null;
  summary: string | null;
};

export type KeypadOption = {
  digit: string;
  label: string;
  action: "transfer" | "say" | "ai";
  number?: string | null;
  message?: string | null;
};

export type KeypadMenu = {
  enabled: boolean;
  /** Optional: the owner's own wording. Blank means it is built from the keys. */
  intro: string;
  options: KeypadOption[];
  /** What callers will hear after the greeting. */
  preview: string;
};

export const voice = {
  createSubaccount: () => api.post<Subaccount>("/voice-onboarding/subaccount"),

  /** Redraws the KYC wizard's own progress after a reload - see the backend endpoint's own docstring. 409s if no subaccount exists yet, same as every other compliance endpoint. */
  complianceState: () =>
    api.get<ComplianceState>("/voice-onboarding/compliance/state"),

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

  /** Every number Plivo says this subaccount owns, not just the ones Krova's own ChannelConnection rows know about - see the backend endpoint's own docstring. */
  ownedNumbers: () => api.get<OwnedNumber[]>("/voice-onboarding/numbers/owned"),

  /** Pass a connection id to see one number's calls only. */
  logs: (connectionId?: string | null) =>
    api.get<CallLog[]>(`/voice-onboarding/logs${connectionId ? `?connection_id=${connectionId}` : ""}`),

  /** Every connected number with its name, use, rent and the last 30 days. */
  myNumbers: () => api.get<VoiceNumberInfo[]>("/voice-onboarding/numbers/mine"),

  /** Settings of one number (the default one if none is named). */
  agentSettings: (connectionId?: string | null) =>
    api.get<AgentSettings>(`/voice-onboarding/agent-settings${connectionId ? `?connection_id=${connectionId}` : ""}`),

  /** The phone keypad menu ("press 1 for ...") of one number. Needs a connected voice number. */
  keypadMenu: (connectionId?: string | null) =>
    api.get<KeypadMenu>(`/voice-onboarding/keypad-menu${connectionId ? `?connection_id=${connectionId}` : ""}`),
  saveKeypadMenu: (menu: Omit<KeypadMenu, "preview">, connectionId?: string | null) =>
    api.put<KeypadMenu>(`/voice-onboarding/keypad-menu${connectionId ? `?connection_id=${connectionId}` : ""}`, menu),

  updateAgentSettings: (data: {
    /** This number's own name, e.g. "Sales". */
    label?: string;
    /** What this number is for. An incoming-only number is never used for outgoing calls. */
    use?: "both" | "inbound" | "outbound";
    /** Make outgoing calls go out from this number unless something more specific applies. */
    default_outbound?: boolean;
    greeting?: string;
    /** One of the codes from agentSettings().languages - not a fixed union, the real list comes from the server. */
    language?: string;
    language_mode?: "adaptive" | "fixed";
    speaker?: string;
    /** Send "" to clear a previously-set number. E.164, with or without a leading "+". */
    staff_phone_number?: string;
    /** Requires staff_phone_number to already be set (in this call or previously) - the backend rejects otherwise. */
    copilot_mode?: boolean;
    /** False even when copilot_mode is on: whether KROVA also listens live and whispers suggestions to staff - the one part of Copilot mode with an ongoing per-second AI cost. */
    copilot_live_suggestions?: boolean;
    /** Send "" to clear. Calls from this number get the owner voice interface instead of the customer-facing agent. */
    owner_phone?: string;
    /** Publish a public, no-login page of real call-answering stats at /trust/voice/{business_id}. Off by default. */
    public_trust_page_enabled?: boolean;
  }, connectionId?: string | null) =>
    api.patch<AgentSettings>(`/voice-onboarding/agent-settings${connectionId ? `?connection_id=${connectionId}` : ""}`, data),

  previewVoice: (speaker: string, language: string) =>
    api.post<{ audio_base64: string; format: string }>("/voice-onboarding/preview-voice", {
      speaker, language,
    }),
};

export type LanguageOption = { code: string; label: string };

export type VoiceNumberInfo = {
  connection_id: string;
  number: string;
  /** What the owner calls it; the number itself if unnamed. */
  label: string;
  use: "both" | "inbound" | "outbound";
  /** Outgoing calls go out from here unless a campaign or purpose says otherwise. */
  default_outbound: boolean;
  series: string | null;
  series_label: string | null;
  rent_paise: number;
  calls_30d: number;
  cost_paise_30d: number;
};

export type AgentSettings = {
  /** Which number these settings belong to. */
  connection_id: string;
  number: string;
  label: string;
  use: "both" | "inbound" | "outbound";
  default_outbound: boolean;
  series: string | null;
  greeting: string;
  /** A Sarvam bulbul:v3 language code - see `languages` for the real, current list. Never hardcode one here. */
  language: string;
  language_mode: "adaptive" | "fixed";
  speaker: string;
  male_speakers: string[];
  female_speakers: string[];
  languages: LanguageOption[];
  /** Set for a warm transfer-on-escalate and/or copilot mode to have anywhere to ring. */
  staff_phone_number: string | null;
  /** Human answers directly, a greeting plays before the ring - see /voice/live-assist for suggestions, gated separately below. */
  copilot_mode: boolean;
  /** False even when copilot_mode is on: live transcription + suggestions to staff (/voice/live-assist), the one part of Copilot mode with an ongoing per-second AI cost. */
  copilot_live_suggestions: boolean;
  /** Calls from this number get the owner voice interface (their own ledger position) instead of the customer-facing agent. */
  owner_phone: string | null;
  /** Whether /trust/voice/{business_id} is publicly viewable. Off by default. */
  public_trust_page_enabled: boolean;
};

export type VoiceTrust = {
  business_name: string;
  window_days: number;
  total_calls: number;
  /** Null means no call in the window has a real ring-time captured yet - not "answered instantly". */
  avg_ring_to_answer_seconds: number | null;
  escalation_rate: number | null;
  avg_duration_seconds: number | null;
};

// ── Automation rules (the trigger-to-action bridge) ─────────────────────────
// Started as the voice-only "post-call action" bridge - the backend table
// and endpoint (/post-call-rules) keep that original name rather than a
// rename migration for a naming-only gain, but the mechanism was always
// generic (trigger_type is a plain string, never FK'd to call.* alone).
// Now covers every real, already-tracked event in the product: a message
// arriving, a WhatsApp Flow being completed, an appointment booked or
// cancelled, an escalation raised, a queue token issued, a competitor
// mentioned - not only how a call ends. See
// shared/care/post_call_actions.py for the real dispatch points.

export type AutomationTrigger =
  | "call.completed"
  | "call.voicemail"
  | "call.no_answer"
  | "message.received"
  | "comment.received"
  | "story_mention.received"
  | "story_reply.received"
  | "flow.completed"
  | "appointment.booked"
  | "appointment.cancelled"
  | "appointment.rescheduled"
  | "escalation.raised"
  // A lead is resolved to a real customer (a phone number was found) -
  // fires the same way for Justdial, IndiaMART, a portal webhook, a
  // CSV/Excel upload, a manually typed lead, or a forwarded email.
  | "lead.received"
  | "queue_token.issued"
  | "competitor.mentioned"
  | "churn_risk.detected"
  | "demo.requested"
  | "pricing_question.asked"
  // The rest of Signals' AI-extracted kinds - see shared/care/
  // signal_dispatch.py. competitor/churn_risk/complaint/praise reach every
  // business (shared/ai/signals.py's business-neutral mode); demo, pricing,
  // bug and feature_request only come from product_feedback businesses.
  | "bug.detected"
  | "feature_request.detected"
  | "complaint.detected"
  | "praise.detected"
  // Deterministic-sweep signal kinds, customer-scoped.
  | "overdue_followup.detected"
  | "report_not_collected.detected"
  | "callback_overdue.detected"
  | "overdue_refund.detected"
  | "intent_leakage.detected"
  | "rto_risk.detected"
  // Direct status-comparison signal, tpa_claim_tracking capability - see
  // services/api/routers/insurance_claims.py::update_claim.
  | "claim.status_changed"
  // The time-based triggers - the only ones here that aren't "something
  // just happened". Fired once a day by shared/care/date_triggers.py so a
  // business can set its own timing with a days_until/days_overdue/
  // days_open condition, instead of inheriting the numbers baked into our
  // own sweeps. See that module's docstring.
  | "commitment.due_soon"
  | "commitment.overdue"
  | "quotation.aging"
  // Daily, for every customer who has messaged and not today - "this
  // person has gone quiet". Measured from the customer's own last message.
  | "customer.inactive"
  // A person moved the customer to another pipeline stage (the CRM's
  // stage picker). Stage names are the business's own.
  | "customer.stage_changed"
  // Daily, for every date the business set on a customer (renewal, AMC
  // expiry, package end...) - from 60 days before to 30 days after.
  | "customer.date_approaching"
  // A chat's newest customer message has waited past the reply-time target set under Team.
  | "reply.overdue"
  // A caller pressed a key on the phone keypad menu.
  | "keypad.pressed"
  // Outcomes: a booking marked came / did not come, a token done / skipped,
  // an order's status moving, money received against what a customer owed.
  | "appointment.visited"
  | "appointment.no_show"
  | "queue_token.done"
  | "queue_token.skipped"
  | "order.status_changed"
  | "payment.received";
// escalation_rate.detected / account_health.detected deliberately absent -
// business-level signals with no customer_id, so a rule on either could
// never fire. Webhook-only, see WEBHOOK_EVENT_TYPES below instead.

export type AutomationAction =
  | "whatsapp_followup"
  | "create_escalation_task"
  | "add_tag"
  | "send_flow"
  | "place_call"
  | "send_sms"
  | "send_email"
  | "instagram_followup"
  | "instagram_comment_reply"
  | "send_carousel"
  // Inside the business: alert people, hand the chat to someone, move the pipeline.
  | "notify_team"
  | "assign_to_agent"
  | "set_stage"
  // Money: a fee link from the business's own payment gateway, on a booking trigger.
  | "send_payment_link";

// The real channels a trigger can actually come from - matches the
// backend's own Channel enum (shared/db/models/channel.py). Kept here
// rather than reused from elsewhere since nothing else in lib/api.ts
// already exports a plain list of these.
export type AutomationChannel = "whatsapp" | "instagram" | "email" | "voice" | "web";

export type AutomationOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equal"
  | "less_than_or_equal";

// The real, per-trigger_type field allowlist a condition's `field` is
// checked against server-side (shared/care/post_call_actions.py's own
// CONDITION_FIELDS - kept in sync with it by hand, same as
// WEBHOOK_EVENT_TYPES below already is with WebhookEventType).
export const CONDITION_FIELDS: Record<AutomationTrigger, string[]> = {
  "call.completed": ["duration_seconds", "outcome", "sentiment", "escalated", "topic", "requested_service"],
  "call.voicemail": ["campaign_objective"],
  "call.no_answer": ["campaign_objective"],
  "message.received": ["text"],
  "comment.received": ["text"],
  // No fields - a story mention carries no text to filter on, so a rule
  // here is meant to run unconditionally (matches the backend's own
  // CONDITION_FIELDS, which deliberately has no entry for this trigger).
  "story_mention.received": [],
  "story_reply.received": ["text"],
  "flow.completed": ["flow_id"],
  "appointment.booked": ["starts_at", "intake_channel"],
  "appointment.cancelled": ["starts_at", "intake_channel", "reason"],
  "appointment.rescheduled": ["starts_at", "intake_channel"],
  "escalation.raised": ["reason"],
  "reply.overdue": ["minutes_waiting", "assigned"],
  "keypad.pressed": ["digit", "key_name", "action"],
  "lead.received": ["source", "name", "query"],
  "queue_token.issued": ["shift", "queue_number"],
  "competitor.mentioned": ["severity", "title", "body"],
  "churn_risk.detected": ["severity", "title", "body"],
  "demo.requested": ["severity", "title", "body"],
  "pricing_question.asked": ["severity", "title", "body"],
  "bug.detected": ["severity", "title", "body"],
  "feature_request.detected": ["severity", "title", "body"],
  "complaint.detected": ["severity", "title", "body"],
  "praise.detected": ["severity", "title", "body"],
  "overdue_followup.detected": ["severity", "title", "body"],
  "report_not_collected.detected": ["severity", "title", "body"],
  "callback_overdue.detected": ["severity", "title", "body"],
  "overdue_refund.detected": ["severity", "title", "body"],
  "intent_leakage.detected": ["severity", "title", "body"],
  "rto_risk.detected": ["severity", "title", "body"],
  "claim.status_changed": ["severity", "title", "body"],
  "commitment.due_soon": ["days_until", "kind", "direction", "amount_paise", "amount_outstanding_paise", "description"],
  "commitment.overdue": ["days_overdue", "kind", "direction", "amount_paise", "amount_outstanding_paise", "description"],
  "quotation.aging": ["days_open", "status", "amount_paise", "reference"],
  "customer.stage_changed": ["from_stage", "to_stage"],
  "customer.date_approaching": ["label", "days_until", "date", "note"],
  "appointment.visited": ["starts_at", "intake_channel", "provider", "visit_number"],
  "appointment.no_show": ["starts_at", "intake_channel", "provider", "no_show_count"],
  "queue_token.done": ["shift", "queue_number", "visit_number"],
  "queue_token.skipped": ["shift", "queue_number"],
  "order.status_changed": ["status", "previous_status", "order_number", "total_paise", "is_cod"],
  "payment.received": ["amount_paise", "amount_outstanding_paise", "fully_paid", "description"],
  "customer.inactive": [
    "days_since_customer_message", "days_since_any_message",
    "days_since_last_visit", "has_upcoming_visit", "stage",
  ],
};

export type AutomationCondition = {
  field: string;
  operator: AutomationOperator;
  value: string | number | boolean;
};

// One action in a rule's chain - a rule holds an ordered list of these
// (position is the array index, not a field on the object). Each step is
// independently gated by its own optional conditions and optional delay;
// there is no branching - a step whose condition doesn't hold is skipped,
// the rest of the chain still runs. See shared/db/models/integrations.py::
// AutomationStep's own docstring for why that's deliberate.
export type AutomationStepConfig = {
  action_type: AutomationAction;
  /**
   * whatsapp_followup: {message}. create_escalation_task: {reason}.
   * add_tag: {tag}. send_flow: {flow_id, body, screen, cta}.
   * place_call: {reason}. send_sms: {message}. send_email: {subject, body}.
   */
  action_config: Record<string, string>;
  // All must hold for the step to run (AND) - "days until due is 3 AND
  // it's a payment". Empty/omitted = always runs. See CONDITION_FIELDS
  // above for what each `field` may be, per the rule's own trigger_type.
  // AND only, deliberately: "A or B" is two rules with the same action.
  // (The API also returns a legacy single `condition`, the first of these,
  // for older clients - not typed here so nothing in this app reads it.)
  conditions?: AutomationCondition[] | null;
  // null/omitted = runs immediately (or, for step 2+, right after the
  // previous step). Set so this step waits this many seconds first.
  delay_seconds?: number | null;
};

export type AutomationRule = {
  id: string;
  // The business's own label for this rule ("New patient no-show
  // recovery") - purely descriptive, never interpreted. null/omitted =
  // not named yet, falls back to a trigger -> action summary in the UI.
  name?: string | null;
  trigger_type: AutomationTrigger;
  is_active: boolean;
  // null/omitted = fires for any channel - the original, unfiltered
  // behaviour. Set to one channel so a rule authored with e.g. WhatsApp
  // in mind doesn't also fire on every utterance of a live voice call -
  // message.received fires identically for both (and Instagram, email).
  channel?: AutomationChannel | null;
  // How often this rule may run for one customer: null = every time,
  // 0 = only once, N = at most once every N days.
  reentry_days?: number | null;
  steps: AutomationStepConfig[];
};

// Old names kept as aliases. Nothing in the app imports them any more -
// the /voice page's own tab, the last holdout, now uses the Automation*
// names like everything else - but they stay exported because the table
// and the API route are still called post-call rules, so a caller
// reaching for the old name is reaching for the right thing.
export type PostCallTrigger = AutomationTrigger;
export type PostCallAction = AutomationAction;
export type PostCallRule = AutomationRule;

// ── Automation execution history ──────────────────────────────────────────────
// The answer to "did my rule actually do anything?" - a question this
// builder could not answer at all before. See the backend's own
// AutomationRunLog docstring.

export type AutomationRunStatus =
  // The action was actually carried out.
  | "ran"
  // The step ran but had nothing to do - no phone number on the customer,
  // no connected channel. A real outcome, not a failure.
  | "no_action"
  // The step's condition didn't hold; `detail` says which field, and what
  // the value actually was.
  | "skipped"
  // The step has a delay and is waiting; it gets its own ran/no_action row
  // when it resumes.
  | "queued"
  // The action raised; `detail` carries the error.
  | "failed";

export type AutomationRunLog = {
  id: string;
  rule_id: string;
  // null when the rule was never named - the UI falls back to the trigger.
  rule_name?: string | null;
  trigger_type: AutomationTrigger;
  step_position: number;
  action_type: AutomationAction;
  status: AutomationRunStatus;
  // Already a plain sentence - shown verbatim, never translated here.
  detail?: string | null;
  customer_id?: string | null;
  occurred_at: string;
};

export type AutomationRunHistory = {
  // So an empty list can say "nothing in the last N days" rather than
  // leaving "never ran" and "aged out" indistinguishable.
  retention_days: number;
  runs: AutomationRunLog[];
};

export type AutomationTestStep = {
  position: number;
  action_type: AutomationAction;
  verdict: "would_run" | "would_skip" | "would_wait";
  detail?: string | null;
  // The message exactly as it would be sent, {{tokens}} resolved.
  preview?: string | null;
};

export type AutomationTestResult = {
  available_fields: string[];
  // Fields a condition needs that the supplied context doesn't have - the
  // single most confusing way for a rule to quietly do nothing.
  missing_fields: string[];
  steps: AutomationTestStep[];
};

// When automations may message customers: quiet hours (held until they end)
// and a per-customer daily cap (0 = none). Business time.
export type SendingLimits = {
  quiet_hours: boolean;
  quiet_start: number;
  quiet_end: number;
  daily_limit: number;
};

export type AutomationTemplate = {
  name: string;
  state: "approved" | "pending" | "rejected" | "missing" | "other";
  reason: string | null;
  purpose: string;
};

// An AI turn carries the rule it drafted, so the owner can ask for a change to it.
export type RuleDraftTurn = { role: "owner" | "ai"; text: string; rule?: RuleDraftOut["rule"] };

export type RuleDraftOut = {
  kind: "ask" | "rule";
  text: string;
  options: string[];
  rule: {
    name?: string | null;
    trigger_type: AutomationTrigger;
    channel?: AutomationChannel | null;
    reentry_days?: number | null;
    steps: AutomationStepConfig[];
  } | null;
  // AI replies used this month, and the month's allowance
  used: number;
  limit: number;
};

export const postCallRules = {
  list: () => api.get<AutomationRule[]>("/post-call-rules"),

  create: (data: {
    name?: string | null;
    trigger_type: AutomationTrigger;
    is_active?: boolean;
    channel?: AutomationChannel | null;
    reentry_days?: number | null;
    steps: AutomationStepConfig[];
  }) => api.post<AutomationRule>("/post-call-rules", data),

  update: (
    id: string,
    data: {
      name?: string | null;
      trigger_type: AutomationTrigger;
      is_active: boolean;
      channel?: AutomationChannel | null;
      reentry_days?: number | null;
      steps: AutomationStepConfig[];
    },
  ) => api.patch<AutomationRule>(`/post-call-rules/${id}`, data),

  remove: (id: string) => api.delete<void>(`/post-call-rules/${id}`),

  // "Describe it": the next AI turn - a question, or a whole rule to open on the canvas unsaved. Owner/admin only.
  aiDraft: (turns: RuleDraftTurn[]) => api.post<RuleDraftOut>("/post-call-rules/ai-draft", { turns }),

  // The WhatsApp template(s) Automations' own actions need - today the one behind every
  // "Send a WhatsApp follow-up" step - and where each stands with Meta.
  templates: () => api.get<AutomationTemplate[]>("/post-call-rules/templates"),

  limits: () => api.get<SendingLimits>("/post-call-rules/limits"),
  setLimits: (data: SendingLimits) => api.put<SendingLimits>("/post-call-rules/limits", data),

  // Submit the missing one(s) to Meta. Owner/admin only; safe to press twice.
  createTemplates: () =>
    api.post<{ created: string[]; already_there: string[]; failed: { name: string; error: string }[] }>(
      "/post-call-rules/templates", {},
    ),

  // What a rule actually did, newest first. Optionally narrowed to one
  // rule. See AutomationRunLog's own docstring for why "it ran but did
  // nothing" and "it never ran" are separate statuses rather than one.
  runs: (params?: { rule_id?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.rule_id) query.set("rule_id", params.rule_id);
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString();
    return api.get<AutomationRunHistory>(`/post-call-rules/runs${qs ? `?${qs}` : ""}`);
  },

  // Dry run - what this rule would do against the supplied trigger data.
  // Sends nothing, writes nothing, and the rule need not exist yet.
  test: (data: {
    trigger_type: AutomationTrigger;
    channel?: AutomationChannel | null;
    steps: AutomationStepConfig[];
    context: Record<string, string | number | boolean>;
  }) => api.post<AutomationTestResult>("/post-call-rules/test", data),
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
  /** The card field this item is ("about", "when", "team"...), if it is one. */
  topic?: string | null;
  /** After this moment the AI stops using it. */
  valid_until?: string | null;
  /** "faq" for a top question; null for a card field (see topic) or a free note. */
  card?: string | null;
};

/** One Business Card field (the same fields for every business type; the type only rewords them), with its value. */
export type KnowledgeCardField = {
  key: string; title: string; question: string; placeholder: string; kind: KnowledgeKind; limit: number;
  required: boolean; expires: boolean; link: boolean; value: string | null; item_id: string | null; valid_until: string | null;
};

export type KnowledgeTeamPerson = { name: string; role: string; handles: string; languages: string };

export type KnowledgeTeamCard = { contact: string; people: KnowledgeTeamPerson[]; languages: string; response_note: string };

export type KnowledgeFaq = { id: string; question: string; answer: string; active: boolean };

export type KnowledgeCard = {
  vertical: string; vertical_label: string; fields: KnowledgeCardField[]; team: KnowledgeTeamCard; faqs: KnowledgeFaq[];
  coverage: {
    required_total: number; required_done: number; fields_total: number; fields_done: number;
    team_done: number; faqs: number; faq_limit: number;
  };
  /** Roughly what the cards cost the AI to read on every message. */
  tokens: number;
};

// Gaps have no id on the backend - they're identified by the gap text itself
// (grouped/deduped server-side from near-duplicate escalations).
export type KnowledgeGap = {
  gap: string;
  times_asked: number;
  last_asked: string | null;
  example_question: string | null;
  /** The card field this most likely belongs to ("when", "payment", "team"...). A suggestion only. */
  suggested_field: string | null;
};

export type KnowledgeStatus = {
  items: number;
  total_tokens: number;
  fits_in_context: boolean;
  advice: string;
  /** "Other entries" (free notes) have their own small budget. */
  other_items: number;
  other_tokens: number;
  other_items_limit: number;
  other_tokens_limit: number;
};

/** What a one-time file read suggests for the card. Nothing is saved until the owner saves it. */
export type KnowledgeFileReading = {
  fields: { key: string; title: string; limit: number; current: string | null; suggested: string }[];
  faqs: { question: string; answer: string }[];
  truncated: boolean;
  reads_left_today: number;
  /** The longer, opened-when-needed knowledge the same file holds. */
  catalogue: KnowledgeCatalogueRow[];
  catalogue_now: number;
  bank: { question: string; answer: string }[];
  bank_room: number;
};

/** One Catalogue row. The AI is shown only the rows a customer's message names, never the whole list. */
export type KnowledgeCatalogueRow = { name: string; price: string; details: string };

/**
 * One row of the fee list (Knowledge -> Fees / Price list): a test, service or visit and what it costs. Staff tick
 * rows when making a token or a booking; the AI quotes them when a customer names one. `id` is set by the server.
 */
export type FeeRow = { id?: string; name: string; amount_paise: number; details: string };
/** What a token or booking was made for - a copy of the ticked rows, so a later price change leaves it alone. */
export type FeeItem = { id: string; name: string; amount_paise: number };
export const feeTotal = (items?: FeeItem[] | null) => (items ?? []).reduce((sum, i) => sum + i.amount_paise, 0);

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

  catalogue: () => api.get<{ rows: KnowledgeCatalogueRow[]; limit: number }>("/knowledge/catalogue"),

  /** Replace the whole catalogue; no rows removes it. */
  saveCatalogue: (rows: KnowledgeCatalogueRow[]) =>
    api.put<{ rows: KnowledgeCatalogueRow[]; limit: number }>("/knowledge/catalogue", { rows }),

  /** The fee list - open to the whole team, who tick from it. */
  fees: () => api.get<{ rows: FeeRow[]; limit: number }>("/knowledge/fees"),
  /** Replace the whole fee list (owner/admin); no rows removes it. */
  saveFees: (rows: FeeRow[]) => api.put<{ rows: FeeRow[]; limit: number }>("/knowledge/fees", { rows }),

  /** Saved answers shown to the AI only when a customer asks something like them. */
  bank: () => api.get<{ items: KnowledgeFaq[]; limit: number }>("/knowledge/bank"),

  addToBank: (data: { question: string; answer: string; resolves_gap?: string }) =>
    api.post<KnowledgeFaq>("/knowledge/bank", data),

  /** Read a PDF, photo or text file once and get suggestions for the card. The file is not kept. */
  readFile: (file: File) => {
    const formData = new FormData();
    formData.set("file", file);
    return api.post<KnowledgeFileReading>("/knowledge/read-file", formData, true);
  },

  delete: (id: string) => api.delete<void>(`/knowledge/${id}`),

  update: (id: string, patch: Partial<{
    title: string; content: string; kind: KnowledgeKind; active: boolean; valid_until: string; clear_valid_until: boolean;
  }>) => api.patch<KnowledgeItem>(`/knowledge/${id}`, patch),

  card: () => api.get<KnowledgeCard>("/knowledge/card"),

  /** Save one Business Card field; an empty value removes it. */
  saveCardField: (key: string, data: { content: string; valid_until?: string; resolves_gap?: string }) =>
    api.put<KnowledgeItem | null>(`/knowledge/card/${key}`, data),

  saveTeamCard: (data: KnowledgeTeamCard & { resolves_gap?: string }) =>
    api.put<KnowledgeTeamCard>("/knowledge/team-card", data),

  addFaq: (data: { question: string; answer: string; resolves_gap?: string }) => api.post<KnowledgeFaq>("/knowledge/faqs", data),

  /** "Always hand this to me": the AI passes this kind of question to a person from now on. */
  handoverGap: (gap: string) => api.post<void>("/knowledge/gaps/handover", { gap }),

  dismissGap: (gap: string) => api.post<void>("/knowledge/gaps/dismiss", { gap }),
};

// ── Payment links (the business's own Razorpay) ──────────────────────────────
// The money goes straight to the business's gateway; KROVA sends the link on WhatsApp and checks whether it was paid.

export type PaymentGateway = { connected: boolean; gateway: string | null; key_id_hint: string | null; connected_at: string | null };

export type PaymentLink = {
  id: string; commitment_id: string; gateway: string; short_url: string; amount_paise: number;
  /** created | partially_paid | paid | expired | cancelled - the gateway's own words */
  status: string; amount_paid_paise: number; created_at: string; paid_at: string | null;
};

/** The link always exists once made; `sent` says whether WhatsApp took it (if not, copy and share it). */
export type PaymentLinkSend = { link: PaymentLink; sent: boolean; reason: string | null };

type TemplateChoice = { template_name?: string; template_language?: string };

export const payments = {
  gateway: () => api.get<PaymentGateway>("/payments/gateway"),
  connectGateway: (key_id: string, key_secret: string) =>
    api.put<PaymentGateway>("/payments/gateway", { gateway: "razorpay", key_id, key_secret }),
  disconnectGateway: () => api.delete<void>("/payments/gateway"),

  sendForCommitment: (commitment_id: string, t: TemplateChoice = {}) =>
    api.post<PaymentLinkSend>("/payments/links", { commitment_id, ...t }),
  sendForToken: (entryId: string, amount_paise?: number, t: TemplateChoice = {}) =>
    api.post<PaymentLinkSend>(`/payments/queue/${entryId}/link`, { amount_paise, ...t }),
  sendForAppointment: (appointmentId: string, amount_paise?: number, t: TemplateChoice = {}) =>
    api.post<PaymentLinkSend>(`/payments/appointments/${appointmentId}/link`, { amount_paise, ...t }),
  /** The total of an unpaid order - taken in a chat, or a WhatsApp cart. */
  sendForOrder: (orderId: string, t: TemplateChoice = {}) =>
    api.post<PaymentLinkSend>(`/payments/orders/${orderId}/link`, { ...t }),

  links: (commitmentId?: string) =>
    api.get<PaymentLink[]>(`/payments/links${commitmentId ? `?commitment_id=${commitmentId}` : ""}`),
  check: (linkId: string) => api.post<PaymentLink>(`/payments/links/${linkId}/check`),

  /** Send the fee link by itself right after the AI books a token or appointment on WhatsApp. */
  auto: () => api.get<PaymentAuto>("/payments/auto"),
  setAuto: (s: PaymentAuto) => api.put<PaymentAuto>("/payments/auto", s),
};

export type PaymentAuto = {
  tokens: boolean; appointments: boolean; default_fee_paise: number | null;
  /** Collect only this much online; the rest at the counter, shown as the balance. null = the full fee. */
  advance_paise: number | null;
};

// ── Campaigns ─────────────────────────────────────────────────────────────────
// audience values are fixed by the backend's Audience enum - not free text.

export type AudienceKey =
  | "owes_money"
  | "overdue"
  | "we_promised"
  | "gone_quiet"
  | "by_tag"
  | "all_customers"
  | "numbers";

/**
 * Splits what someone typed or pasted into the "specific numbers" box into
 * separate entries - commas, semicolons and new lines separate numbers, but
 * not spaces, since "+91 98765 43210" is one number. Validation (is this a
 * real phone number) stays with the backend.
 */
export function parseNumberList(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((n) => n.trim())
    .filter(Boolean);
}

export type AudienceSegment = {
  value: AudienceKey;
  label: string;
  /** "gone_quiet" needs a days-quiet threshold; "by_tag" a tag label; "numbers" a list of phone numbers. */
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
  /**
   * Only meaningful when template_name is a template with a FLOW-type
   * button, created that way in Meta's own WhatsApp Manager - which
   * published Flow it opens is set there, not auto-detected here, so a
   * business names it explicitly to keep the two associated.
   */
  flow_id?: string;
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
  flow_id: string | null;
  category: string | null;
  recipients: number;
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  created_at: string;
  completed_at: string | null;
};

// A drip sequence is the campaign's own template (step 0, sent immediately)
// plus zero or more of these - each one a follow-up that fires after a
// delay, only while the recipient still matches the campaign's own
// audience and (for a "no_reply" step) hasn't written back. See
// shared/campaigns/sequencer.py.
export type CampaignStepRequest = {
  delay_days: number;
  condition: "always" | "no_reply";
  stop_on_reply?: boolean;
  template_name: string;
  template_language?: string;
  variable_mapping?: string[];
  carousel_cards?: CampaignCardRequest[];
  /** Same FLOW-button-template mechanism as the base campaign's own flow_id - a step can open a Flow too. */
  flow_id?: string;
};

export type CampaignStep = {
  id: string;
  step_order: number;
  delay_days: number;
  condition: "always" | "no_reply";
  stop_on_reply: boolean;
  template_name: string;
  template_language: string;
  flow_id: string | null;
  sent_count: number;
  failed_count: number;
  skipped_count: number;
};

export const campaigns = {
  audiences: () => api.get<AudienceSegment[]>("/campaigns/audiences"),

  preview: (data: CampaignRequest) =>
    api.post<CampaignPreview>("/campaigns/preview", data),

  create: (data: CampaignRequest) => api.post<Campaign>("/campaigns", data),

  send: (id: string) => api.post<Campaign>(`/campaigns/${id}/send`),

  list: () => api.get<Campaign[]>("/campaigns"),

  addStep: (campaignId: string, data: CampaignStepRequest) =>
    api.post<CampaignStep>(`/campaigns/${campaignId}/steps`, data),

  listSteps: (campaignId: string) => api.get<CampaignStep[]>(`/campaigns/${campaignId}/steps`),

  deleteStep: (campaignId: string, stepId: string) =>
    api.delete<void>(`/campaigns/${campaignId}/steps/${stepId}`),
};

// ── Outbound call campaigns ───────────────────────────────────────────────
// The voice-channel counterpart to campaigns above - same audience
// segmentation (the ledger, not a spreadsheet), but a phone call has no
// template/variable-mapping concept. `objective` is a plain-language brief
// ("Remind them about the outstanding balance") the AI drafts an actual
// opening line from once a call connects - never a fixed script.
//
// Real-world note this UI should say out loud, not hide: automated
// outbound calling in India needs a business number in the right
// TRAI-registered series (140 promotional, 160 BFSI-only transactional)
// and DLT registration - neither is instant-buy the way a regular local
// number is. This calls on whatever voice number IS connected; getting a
// compliant number connected is a separate, real-world step.

export type CallCampaignRequest = {
  name: string;
  audience: AudienceKey;
  audience_params?: Record<string, unknown>;
  objective: string;
  /** Set to run a fixed CallScript instead of an improvised call. */
  call_script_id?: string;
  /** Must match the series of the number used (service = 080/022, promotional = 140). */
  purpose?: CallCampaignPurpose;
  /** The number to call from. Leave out to use the one whose series suits the purpose. */
  connection_id?: string;
};

export type CallCampaignPurpose = "service" | "promotional";

export type CallRecipientPreview = {
  customer_id: string;
  name: string | null;
  phone_masked: string;
};

export type CallCampaignPreview = {
  audience: string;
  audience_label: string;
  will_reach: number;
  will_skip: number;
  skipped_reasons: { customer_id?: string; name?: string | null; reason: string }[];
  sample: CallRecipientPreview[];
};

export type CallCampaign = {
  id: string;
  name: string;
  audience: string;
  audience_label: string;
  objective: string;
  call_script_id: string | null;
  purpose?: CallCampaignPurpose | null;
  connection_id?: string | null;
  status: "draft" | "sending" | "sent" | "paused" | "cancelled" | "failed";
  recipients: number;
  /** Calls actually placed (jobs enqueued), not calls that were answered. */
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  created_at: string;
  completed_at: string | null;
};

export const callCampaigns = {
  audiences: () => api.get<AudienceSegment[]>("/call-campaigns/audiences"),

  preview: (data: CallCampaignRequest) =>
    api.post<CallCampaignPreview>("/call-campaigns/preview", data),

  create: (data: CallCampaignRequest) => api.post<CallCampaign>("/call-campaigns", data),

  send: (id: string) => api.post<CallCampaign>(`/call-campaigns/${id}/send`),

  list: () => api.get<CallCampaign[]>("/call-campaigns"),
};

// ── Call scripts (lead qualification / survey calling) ──────────────────────

export type CallScriptPurpose = "lead_qualification" | "survey";

export type CallScript = {
  id: string;
  name: string;
  purpose: CallScriptPurpose;
  questions: string[];
};

export type CallScriptResponseRow = {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  answers: Record<string, string>;
  score: number | null;
  summary: string | null;
  created_at: string;
};

export const callScripts = {
  list: () => api.get<CallScript[]>("/call-scripts"),

  create: (data: { name: string; purpose: CallScriptPurpose; questions: string[] }) =>
    api.post<CallScript>("/call-scripts", data),

  update: (id: string, data: { name: string; purpose: CallScriptPurpose; questions: string[] }) =>
    api.patch<CallScript>(`/call-scripts/${id}`, data),

  remove: (id: string) => api.delete<void>(`/call-scripts/${id}`),

  responses: (id: string) => api.get<CallScriptResponseRow[]>(`/call-scripts/${id}/responses`),
};

// ── 140/160-series number requests ────────────────────────────────────────
// Not a purchase flow - Plivo doesn't sell these as searchable inventory
// (confirmed directly). A business submits a request; Krova's own operator
// works through the queue and updates status once real Plivo coordination
// happens. No per-request approval gate - see components/voice/NumberRequestForm.tsx.

export type NumberRequestType = "promotional_140" | "transactional_160";
export type NumberRequestStatus = "requested" | "submitted_to_plivo" | "provisioned" | "rejected";

export type NumberRequest = {
  id: string;
  business_id: string;
  request_type: NumberRequestType;
  justification: string;
  bfsi_declaration: boolean;
  status: NumberRequestStatus;
  admin_notes: string | null;
  provisioned_number: string | null;
  created_at: string;
};

export const numberRequests = {
  create: (data: { request_type: NumberRequestType; justification: string; bfsi_declaration?: boolean }) =>
    api.post<NumberRequest>("/voice-onboarding/number-requests", data),

  listOwn: () => api.get<NumberRequest[]>("/voice-onboarding/number-requests"),

  /** Platform-admin only (PLATFORM_ADMIN_EMAIL) - every business's requests. */
  listAll: () => api.get<NumberRequest[]>("/voice-onboarding/number-requests/all"),

  /** Platform-admin only. */
  update: (
    id: string,
    data: Partial<{ status: NumberRequestStatus; admin_notes: string; provisioned_number: string }>,
  ) => api.patch<NumberRequest>(`/voice-onboarding/number-requests/${id}`, data),
};

// ── Platform admin panel (PLATFORM_ADMIN_EMAIL only) ──────────────────────────

export type AdminOverview = {
  businesses_total: number; businesses_new_7d: number; businesses_no_plan: number;
  subs_active: number; subs_past_due: number; subs_suspended: number; subs_cancelled: number;
  mrr: string; wallet_total: string; wallets_low: number; wallets_rent_short: number;
  number_requests_waiting: number;
  support_tickets_open: number; number_requests_with_plivo: number;
  payments_failed_7d: number; payments_pending_old: number; messages_this_month: number;
};
export type AdminBusiness = {
  id: string; name: string; vertical: string; plan: string; sub_status: string | null;
  owner_name: string | null; owner_email: string | null; owner_phone: string | null;
  created_at: string; wallet: string | null; voice_numbers: number; messages_month: number; is_active: boolean;
};
export type AdminPayment = {
  id: string; business_id: string; business_name: string | null; purpose: string; plan: string | null;
  total: string; status: string; mode: string | null; failure: string | null; txnid: string;
  created_at: string; paid_at: string | null;
};
export type AdminNumberRequest = NumberRequest & {
  business_name: string | null; owner_name: string | null; owner_email: string | null; owner_phone: string | null;
};
export type AdminBusinessDetail = {
  business: AdminBusiness;
  settings_flags: Record<string, unknown>;
  team: { name: string | null; email: string | null; username: string | null; role: string; last_login: string | null; active: boolean }[];
  subscription: {
    plan: string; status: string; amount: string; current_period_end: string; next_charge_at: string | null;
    attempts: number; last_failure: string | null; cancel_at_period_end: boolean;
  } | null;
  wallet_entries: { kind: string; amount: string; balance_after: string; note: string | null; created_at: string }[];
  payments: AdminPayment[];
  numbers: { number: string; label: string | null; status: string }[];
  number_requests: { id: string; type: string; status: string; created_at: string; provisioned_number: string | null }[];
};

const ADMIN_TOKEN_KEY = "krova_admin_token";

export const adminSession = {
  get: (): string | null => {
    try { return typeof window === "undefined" ? null : window.sessionStorage.getItem(ADMIN_TOKEN_KEY); } catch { return null; }
  },
  set: (token: string) => { try { window.sessionStorage.setItem(ADMIN_TOKEN_KEY, token); } catch { /* private window */ } },
  clear: () => { try { window.sessionStorage.removeItem(ADMIN_TOKEN_KEY); } catch { /* ignore */ } },
};

export class AdminSignedOut extends Error {
  constructor() { super("Your admin session ended. Sign in again."); }
}

// The admin panel has its own sign-in and its own token (header X-Admin-Token); it never uses a customer login.
async function adminCall<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = adminSession.get();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["X-Admin-Token"] = token;
  const res = await fetch(`${API_BASE}/api/v1/admin${path}`, {
    method, headers, body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== "/login") {
    adminSession.clear();
    throw new AdminSignedOut();
  }
  if (!res.ok) {
    const detail = (data as { detail?: unknown }).detail;
    throw new Error(typeof detail === "string" ? detail : "That did not work.");
  }
  return data as T;
}

// ── Help page: KROVA Buddy and support tickets ───────────────────────────────

export type HelpTurn = { role: "owner" | "ai"; text: string };
export type TicketCategory = "bug" | "how_to" | "billing" | "account" | "feature_request" | "other";
export type TicketStatus = "open" | "in_progress" | "resolved";

export type TicketDraft = { subject: string; category: TicketCategory; details: string; page?: string | null };

export type HelpAnswer = {
  answer: string;
  // true when Buddy thinks KROVA's team should look at this - `ticket` is its draft
  offer_ticket: boolean;
  ticket: TicketDraft | null;
  used: number;
  limit: number;
};

export type SupportTicket = {
  id: string;
  number: string;
  subject: string;
  category: TicketCategory;
  details: string;
  page: string | null;
  status: TicketStatus;
  reply: string | null;
  replied_at: string | null;
  created_at: string;
};

export const help = {
  ask: (turns: HelpTurn[], page?: string | null) => api.post<HelpAnswer>("/help/ask", { turns, page: page || null }),
  tickets: () => api.get<SupportTicket[]>("/help/tickets"),
  raise: (data: TicketDraft & { transcript?: HelpTurn[] }) => api.post<SupportTicket>("/help/tickets", data),
};

export type AdminTicket = SupportTicket & {
  business_id: string;
  business_name: string | null;
  raised_by: string | null;
  raised_by_contact: string | null;
  transcript: HelpTurn[];
  replied_by: string | null;
};

export const admin = {
  login: (email: string, password: string) => adminCall<{ token: string; email: string }>("POST", "/login", { email, password }),
  me: () => adminCall<{ email: string }>("GET", "/me"),
  overview: () => adminCall<AdminOverview>("GET", "/overview"),
  businesses: (q?: string) => adminCall<AdminBusiness[]>("GET", `/businesses${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  business: (id: string) => adminCall<AdminBusinessDetail>("GET", `/businesses/${id}`),
  payments: (state?: "pending" | "success" | "failed") => adminCall<AdminPayment[]>("GET", `/payments${state ? `?state=${state}` : ""}`),
  numberRequests: () => adminCall<AdminNumberRequest[]>("GET", "/number-requests"),
  updateNumberRequest: (
    id: string, data: Partial<{ status: NumberRequestStatus; admin_notes: string; provisioned_number: string }>,
  ) => adminCall<AdminNumberRequest>("PATCH", `/number-requests/${id}`, data),
  supportTickets: (state?: "open") => adminCall<AdminTicket[]>("GET", `/support-tickets${state ? `?state=${state}` : ""}`),
  updateSupportTicket: (id: string, data: Partial<{ status: TicketStatus; reply: string }>) =>
    adminCall<AdminTicket>("PATCH", `/support-tickets/${id}`, data),
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
  email: string | null;
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

// How fast the business replies, and the conversion rate at each speed.
// The buckets are fixed server-side (see shared/care/response_metrics.py)
// so the labels below are the only ones that can arrive.
export type ResponseSpeedBucket = {
  label: "under_15m" | "15m_to_1h" | "1h_to_4h" | "4h_to_24h" | "over_24h";
  asks: number;
  converted: number;
  conversion_rate: number | null;
};

export type ResponseSpeedChannel = {
  channel: string;
  answered: number;
  median_seconds: number | null;
};

export type ResponseSpeed = {
  asks: number;
  answered: number;
  unanswered: number;
  answer_rate: number | null;
  median_seconds: number | null;
  p90_seconds: number | null;
  buckets: ResponseSpeedBucket[];
  by_channel: ResponseSpeedChannel[];
  note: string;
};

// Quotations (Type 1 / B2B). An offer, not a promise - it gets revised,
// expires on its own terms, and ends won or lost.
export type QuotationStatus =
  | "draft"
  | "sent"
  | "negotiating"
  | "won"
  | "lost"
  | "expired"
  | "withdrawn";

export type QuotationItem = {
  id: string;
  description: string;
  quantity: string | null;
  unit_price_paise: number | null;
  line_total_paise: number | null;
  variant_id: string | null;
};

export type Quotation = {
  id: string;
  customer_id: string;
  customer_name: string | null;
  reference: string | null;
  status: QuotationStatus;
  total_paise: number | null;
  currency: string;
  sent_at: string | null;
  valid_until: string | null;
  notes: string | null;
  follow_up_count: number;
  last_followed_up_at: string | null;
  closed_at: string | null;
  outcome_note: string | null;
  supersedes_id: string | null;
  source_quote: string | null;
  items: QuotationItem[];
  // Days since sending - the number the 21-day staleness research is about.
  days_open: number | null;
};

export type QuotationPipeline = {
  open_count: number;
  open_value_paise: number;
  won_count: number;
  lost_count: number;
  expired_count: number;
  win_rate: number | null;
  stale_count: number;
  note: string;
};

export const quotations = {
  list: (params?: { status?: QuotationStatus; open_only?: boolean; customer_id?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.open_only) qs.set("open_only", "true");
    if (params?.customer_id) qs.set("customer_id", params.customer_id);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get<Quotation[]>(`/quotations${suffix}`);
  },

  pipeline: (staleDays = 21) =>
    api.get<QuotationPipeline>(`/quotations/pipeline?stale_days=${staleDays}`),

  create: (data: {
    customer_id: string;
    reference?: string | null;
    total_paise?: number | null;
    valid_until?: string | null;
    notes?: string | null;
    items?: Array<{ description: string; quantity?: string | null; unit_price_paise?: number | null }>;
    mark_sent?: boolean;
  }) => api.post<Quotation>("/quotations", data),

  recordOutcome: (id: string, status: QuotationStatus, outcome_note?: string | null) =>
    api.post<Quotation>(`/quotations/${id}/outcome`, { status, outcome_note }),
};

// The product catalogue. Sources differ completely by business - most
// sellers here are on WhatsApp/Instagram or their own site, not Shopify -
// so source_platform says where a row actually came from.
export type ProductVariant = {
  id: string;
  sku: string | null;
  title: string | null;
  options: Record<string, string>;
  price_paise: number | null;
  inventory_quantity: number | null;
  // null means the source never told us - which is not the same as
  // "out of stock", and must never be rendered as one.
  available: boolean | null;
};

export type Product = {
  id: string;
  source_platform: string;
  title: string;
  product_type: string | null;
  vendor: string | null;
  status: string;
  image_url: string | null;
  variants: ProductVariant[];
};

export type CatalogueSyncResult = {
  products_created: number;
  products_updated: number;
  variants_created: number;
  variants_updated: number;
  variants_retired: number;
  note: string;
};

export type CatalogueImportResult = CatalogueSyncResult & {
  warnings: string[];
};

export const products = {
  list: (params?: { search?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.limit) qs.set("limit", String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get<Product[]>(`/products${suffix}`);
  },

  syncMeta: () => api.post<CatalogueSyncResult>("/products/sync/meta", {}),

  importCsv: (file: File) => {
    const formData = new FormData();
    formData.set("file", file);
    return api.post<CatalogueImportResult>("/products/import", formData, true);
  },

  create: (data: {
    title: string;
    product_type?: string | null;
    vendor?: string | null;
    variants?: Array<{ sku?: string | null; title?: string | null; price_paise?: number | null }>;
  }) => api.post<Product>("/products", data),

  remove: (id: string) => api.delete<void>(`/products/${id}`),
};

export const analytics = {
  overview: () => api.get<AnalyticsOverview>("/analytics/overview"),
  receivables: () => api.get<ReceivablesAgeing>("/analytics/receivables"),
  kept: () => api.get<KeptAnalytics>("/analytics/kept"),
  channels: () => api.get<ChannelActivity[]>("/analytics/channels"),
  agent: () => api.get<AgentPerformance>("/analytics/agent"),
  team: () => api.get<TeamPerformance>("/analytics/team"),
  trustReport: (days = 30) => api.get<TrustReport>(`/analytics/trust-report?days=${days}`),
  responseSpeed: (days = 30) =>
    api.get<ResponseSpeed>(`/analytics/response-speed?days=${days}`),
};

// software-startup vertical - "proof of performance," not a marketing claim.
export type TrustSample = {
  body: string | null;
  confidence: number;
  cited_message_count: number;
  channel: string;
  created_at: string;
};

export type TrustReport = {
  total_replies: number;
  average_confidence: number | null;
  escalated: number;
  escalation_rate: number | null;
  samples: TrustSample[];
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
  | "case_tracking"
  | "order_sync"
  | "property_listings"
  | "product_feedback"
  | "care_recall"
  | "opd_queue"
  | "tpa_claim_tracking"
  | "photo_product_match"
  // Type 1 (B2B): quotations sent, chased, and won or lost.
  | "quotations"
  // Leads page and Forms page - off by default for the healthcare types, switchable in Features.
  | "lead_capture";

export type UserProfile = {
  user_id: string;
  // Null for a phone-only account - see shared/db/models/identity.py's
  // User.email docstring.
  email: string | null;
  full_name: string | null;
  // None until linked via account.requestAddPhone/verifyAddPhone -
  // optional, additive alternate login, see services/api/routers/
  // auth.py's own MeResponse docstring.
  phone: string | null;
  phone_verified: boolean;
  business_id: string | null;
  business_name: string | null;
  vertical: string | null;
  capabilities: Capability[];
  autonomy: AutonomyLevel | null;
  // Matches shared/db/models/identity.py's BusinessRole exactly - was
  // previously "owner" | "manager" | "team_member", values the backend has
  // never actually issued.
  role: "owner" | "admin" | "agent" | null;
  /** The Team ID, for people an owner or admin added. */
  team_id?: string | null;
  google_review_url: string | null;
  // Whether shared/care/commitment_deadline_calls.py's proactive voice
  // calls are on for this business - opt-in, off by default.
  proactive_deadline_calls_enabled: boolean;
  // Sent from /auth/me, like capabilities, because every page already fetches
  // it. See QueueLabels below for how these resolve.
  queue_labels: QueueLabels;
  /** Team page -> "What agents can see". Read it through can(). */
  permissions?: Permissions;
};

export const account = {
  profile: () => api.get<UserProfile>("/auth/me"),

  updateProfile: (data: {
    full_name?: string;
    business_name?: string;
    vertical?: string;
    google_review_url?: string;
    proactive_deadline_calls_enabled?: boolean;
  }) => api.post<UserProfile>("/auth/me", data),

  // Link a phone number to the signed-in account for alternate, OTP-via-
  // call login (lib/auth.ts's otpLogin) - never SMS, see shared/auth/
  // otp.py's own module docstring on why.
  requestAddPhone: (phone: string) => api.post<void>("/auth/account/phone/request", { phone }),
  verifyAddPhone: (phone: string, code: string) =>
    api.post<UserProfile>("/auth/account/phone/verify", { phone, code }),
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

  updateProfilePicture: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<{ profile_picture_url: string }>("/account/whatsapp/profile/picture", formData, true);
  },

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

// ── Scheduling ───────────────────────────────────────────────────────────────
// "Doctor" is the backend's table name, reused as-is for Real Estate's
// agents - a person with recurring hours, a customer, a time, mechanically
// identical either way. Vertical-facing copy ("Doctor" vs "Agent") is not a
// hardcoded per-page choice - it's resolved server-side (SchedulingLabels)
// across code defaults, the vertical's template, and the business's own
// settings, the same three-tier pattern Queue's labels use.

export type SchedulingLabels = {
  provider: string;
  provider_plural: string;
  credential_label: string;
  fee_label: string;
  booking_noun: string;
  booking_noun_plural: string;
};

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

// A one-off override of the weekly pattern above for one specific date - a
// provider out on leave, or in on a day they don't usually work.
export type AvailabilityException = {
  id: string;
  date: string; // "YYYY-MM-DD"
  is_unavailable: boolean;
  start_time: string | null; // set only when is_unavailable is false
  end_time: string | null;
  reason: string | null;
  /** Bookings already made for the time this takes away (returned when it is created). */
  affected?: { id: string; customer_name: string | null; starts_at: string }[];
};

export type Slot = { starts_at: string; ends_at: string };

export type AppointmentStatus =
  | "requested" | "awaiting_deposit" | "confirmed" | "visited" | "no_show" | "cancelled";
export type IntakeChannel = "voice" | "whatsapp" | "manual" | "web";

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
  customer_name?: string | null;
  fee_items?: FeeItem[];
};

export const scheduling = {
  getLabels: () => api.get<SchedulingLabels>("/scheduling/labels"),

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

  listExceptions: (doctorId: string) =>
    api.get<AvailabilityException[]>(`/scheduling/doctors/${doctorId}/availability-exceptions`),

  createException: (
    doctorId: string,
    data: { date: string; is_unavailable?: boolean; start_time?: string; end_time?: string; reason?: string },
  ) => api.post<AvailabilityException>(`/scheduling/doctors/${doctorId}/availability-exceptions`, data),

  /** Cancel the bookings a day off takes away (normal cancel: slot freed, calendar and automations run). */
  cancelBookingsForException: (exceptionId: string) =>
    api.post<{ cancelled: number }>(`/scheduling/availability-exceptions/${exceptionId}/cancel-bookings`),

  deleteException: (exceptionId: string) =>
    api.delete<void>(`/scheduling/availability-exceptions/${exceptionId}`),

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
    /** Rows ticked from the fee list. */
    fee_ids?: string[];
  }) => api.post<Appointment>("/scheduling/appointments", data),

  /** Change what a booking is for. Refused once its payment link has gone out. */
  setFees: (id: string, fee_ids: string[]) => api.put<Appointment>(`/scheduling/appointments/${id}/fees`, { fee_ids }),

  cancelAppointment: (id: string, reason?: string) =>
    api.post<Appointment>(`/scheduling/appointments/${id}/cancel`, { reason }),

  rescheduleAppointment: (id: string, starts_at: string) =>
    api.post<Appointment>(`/scheduling/appointments/${id}/reschedule`, { starts_at }),

  /** Record that the person came, did not come, or (to undo) is simply booked again. */
  setAppointmentStatus: (id: string, status: "confirmed" | "visited" | "no_show") =>
    api.post<Appointment>(`/scheduling/appointments/${id}/status`, { status }),
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

export type SignalKind = "bug" | "feature_request" | "complaint" | "churn_risk" | "praise" | "account_health" | "overdue_followup" | "report_not_collected" | "callback_overdue" | "intent_leakage" | "overdue_refund" | "rto_risk" | "demo_request" | "pricing_question" | "competitor_mention" | "escalation_rate" | "claim_status_changed";
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

  fileGithubIssue: (id: string) =>
    api.post<{ signal: Signal; github_issue_url: string; commitment_id: string }>(`/signals/${id}/file-github-issue`),
};

// ── Walk-in Queue ─────────────────────────────────────────────────────────────
//
// A token/shift system, not a calendar slot - a shift must be opened by staff
// before anyone (staff, kiosk, or the voice/WhatsApp agent) can issue a token
// into it. The third track is a fully separate sequence, never an insertion
// into the regular queue.
//
// Built for Indian OPD, but the mechanism is just "a line you join without a
// reservation" - a clinic calls it a token for a patient, a restaurant a table
// for a guest. Any business can turn it on and set its own words for it
// (QueueSettings below); nothing here is clinic-specific but the defaults a
// clinic's vertical template supplies.

export type Shift = "morning" | "evening" | "emergency";

// What this business calls the parts of its queue. Resolved server-side across
// code defaults, the vertical's template, and the business's own settings -
// never a second copy of that resolution here.
export type QueueLabels = {
  person: string;
  ticket: string;
  serving: string;
  shifts: Record<Shift, string>;
};

export type QueueSettings = {
  enabled: boolean;
  labels: QueueLabels;
  turn_near_threshold: number;
  /** The message the reception QR types; exactly this message gets a token without the AI. */
  qr_phrase: string;
};
export type QueueStatus = "waiting" | "in_consultation" | "done" | "skipped" | "cancelled";

export type ShiftSession = {
  id: string;
  shift: Shift;
  session_date: string;
  opened_at: string;
  closed_at: string | null;
};

export type QueueEntry = {
  id: string;
  customer_id: string | null;
  doctor_id: string | null;
  shift: Shift;
  queue_date: string;
  queue_number: number;
  status: QueueStatus;
  checked_in_at: string;
  called_at: string | null;
  completed_at: string | null;
  customer_name?: string | null;
  fee_items?: FeeItem[];
};

// ── Features (optional modules a business has switched on) ─────────────────
// A market type decides what a business starts with; this is where it chooses
// what it actually uses. See services/api/routers/capabilities.py.

export type FeatureInfo = {
  key: Capability;
  label: string;
  description: string;
  /** Concrete things that appear or start working when it is on. */
  adds: string[];
  /** What the owner still has to do once after switching it on, if anything. */
  setup: string | null;
  /** What the business has right now. */
  enabled: boolean;
  /** What its market type would give it with no changes of its own. */
  default: boolean;
  /** The business changed this one itself. */
  overridden: boolean;
  /**
   * The WhatsApp templates this feature's messages go out as. Without an
   * approved one the feature's sends are silently skipped.
   */
  templates: FeatureTemplate[];
  /** WhatsApp is connected, so missing templates can be submitted from here. */
  can_create_templates: boolean;
};

export type FeatureTemplate = {
  name: string;
  purpose: string;
  category: "UTILITY" | "MARKETING";
  /** What {{1}}, {{2}}, ... stand for, in order. */
  variables: string[];
  body: string;
  status: "approved" | "pending" | "rejected" | "missing" | "other";
  rejection_reason: string | null;
  /** KROVA can submit this one; if not, `note` says why. */
  one_click: boolean;
  note: string | null;
};

export type CreateTemplatesResult = {
  created: string[];
  already_there: string[];
  needs_manual: string[];
  failed: { name: string; error: string }[];
};

export const features = {
  list: () => api.get<FeatureInfo[]>("/capabilities"),
  set: (key: Capability, enabled: boolean) =>
    api.put<FeatureInfo>(`/capabilities/${key}`, { enabled }),
  /** Submit the feature's missing templates to Meta. Safe to repeat. */
  createTemplates: (key: Capability) =>
    api.post<CreateTemplatesResult>(`/capabilities/${key}/templates`),
};

export const queue = {
  checkIn: (data: { shift: Shift; customer_id?: string; doctor_id?: string; fee_ids?: string[] }) =>
    api.post<QueueEntry>("/queue/check-in", data),

  /** Change what a token is for. Refused once its payment link has gone out. */
  setFees: (id: string, fee_ids: string[]) => api.put<QueueEntry>(`/queue/${id}/fees`, { fee_ids }),

  list: (params?: { doctor_id?: string; shift?: Shift; status?: QueueStatus; queue_date?: string }) => {
    const qs = new URLSearchParams();
    if (params?.doctor_id) qs.set("doctor_id", params.doctor_id);
    if (params?.shift) qs.set("shift", params.shift);
    if (params?.status) qs.set("status", params.status);
    if (params?.queue_date) qs.set("queue_date", params.queue_date);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get<QueueEntry[]>(`/queue${suffix}`);
  },

  update: (id: string, status: QueueStatus) => api.patch<QueueEntry>(`/queue/${id}`, { status }),

  listShifts: () => api.get<ShiftSession[]>("/queue/shifts"),
  openShift: (shift: Shift) => api.post<ShiftSession>("/queue/shifts/open", { shift }),
  closeShift: (sessionId: string) => api.post<ShiftSession>(`/queue/shifts/${sessionId}/close`),

  getKioskConfig: () => api.get<{ enabled: boolean; token: string | null }>("/queue/kiosk"),
  enableKiosk: () => api.post<{ enabled: boolean; token: string | null }>("/queue/kiosk/enable"),
  disableKiosk: () => api.post<{ enabled: boolean; token: string | null }>("/queue/kiosk/disable"),

  getSettings: () => api.get<QueueSettings>("/queue/settings"),
  updateSettings: (data: {
    enabled?: boolean;
    labels?: Partial<Omit<QueueLabels, "shifts">> & { shifts?: Partial<Record<Shift, string>> };
    turn_near_threshold?: number;
    qr_phrase?: string;
  }) => api.put<QueueSettings>("/queue/settings", data),
};

// ── Claims ───────────────────────────────────────────────────────────────────
// A clinic tracking an insurance claim and a D2C store tracking a warranty/
// replacement claim are the same lifecycle (submit -> external party
// reviews -> approved/rejected/settled -> tell the customer). What a
// business calls the parts of it (ClaimLabels) is resolved server-side
// across code defaults, its vertical's template, and its own settings -
// same three-tier pattern Queue/Scheduling's labels already use.

export type ClaimLabels = {
  person: string;
  party_label: string;
  party_noun: string;
  reference_label: string;
};

export type ClaimStatus = "submitted" | "under_review" | "query_raised" | "approved" | "rejected" | "settled";

export type InsuranceClaim = {
  id: string;
  customer_id: string;
  insurer_or_tpa_name: string | null;
  policy_number: string | null;
  claim_number: string | null;
  status: ClaimStatus;
  claim_amount_paise: number | null;
  approved_amount_paise: number | null;
  submitted_at: string | null;
  decided_at: string | null;
  notes: string | null;
};

export const claims = {
  getLabels: () => api.get<ClaimLabels>("/insurance-claims/labels"),

  list: (params?: { customer_id?: string; status?: ClaimStatus }) => {
    const qs = new URLSearchParams();
    if (params?.customer_id) qs.set("customer_id", params.customer_id);
    if (params?.status) qs.set("status", params.status);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get<InsuranceClaim[]>(`/insurance-claims${suffix}`);
  },

  create: (data: {
    customer_id: string;
    insurer_or_tpa_name?: string;
    policy_number?: string;
    claim_number?: string;
    claim_amount_paise?: number;
    submitted_at?: string;
    notes?: string;
  }) => api.post<InsuranceClaim>("/insurance-claims", data),

  update: (
    id: string,
    data: Partial<{
      insurer_or_tpa_name: string;
      policy_number: string;
      claim_number: string;
      status: ClaimStatus;
      claim_amount_paise: number;
      approved_amount_paise: number;
      submitted_at: string;
      decided_at: string;
      notes: string;
    }>,
  ) => api.patch<InsuranceClaim>(`/insurance-claims/${id}`, data),
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
  is_cod: boolean;
  cod_confirmed_at: string | null;
  cod_declined_at: string | null;
  ndr_at: string | null;
  placed_at: string;
};

export type ShippingConnection = {
  id: string;
  platform: string;
  email: string;
  active: boolean;
};

/**
 * A payment link can be sent for an order taken on WhatsApp (a cart, or one taken in a chat) while it is unpaid.
 * A Shopify or WooCommerce order is paid through its own store, so it never gets one.
 */
export const orderTakesLink = (o: Order) =>
  o.status === "pending" && !!o.customer_id && !!o.total_paise && (o.source_platform === "whatsapp" || o.source_platform === "chat");

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

  /**
   * An order taken in a chat: products ticked from the product list, priced by the server. "link" sends a payment
   * link for the total (and the order is made only if the link can be); "cod" is cash on delivery.
   */
  takeInChat: (data: {
    customer_id: string; lines: { variant_id: string; quantity: number }[]; payment: "link" | "cod"; note?: string;
  } & TemplateChoice) =>
    api.post<{ order: Order; link: PaymentLink | null; sent: boolean; reason: string | null }>("/orders/chat", data),

  listShippingConnections: () => api.get<ShippingConnection[]>("/orders/shipping-connections"),

  connectShipping: (data: { email: string; password: string }) =>
    api.post<ShippingConnection>("/orders/shipping-connections", data),

  disconnectShipping: (id: string) => api.delete<void>(`/orders/shipping-connections/${id}`),
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
  /**
   * Whole rupees by default, which is right for ledger/revenue figures but
   * wrong for anything inherently sub-rupee: a single voice call's STT, TTS
   * and carrier costs are each tens of paise, so rounding made every one of
   * them read "₹0" no matter what was actually charged. Pass 2 there.
   */
  fractionDigits = 0,
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
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(rupees);
}

// ── Verticals ────────────────────────────────────────────────────────────────

export type Vertical = {
  key: string;
  label: string;
  summary: string;
  /** The optional modules this type switches on, in plain words (e.g. "Quotations"). */
  features?: string[];
  /** A heading related types sit under (e.g. "Healthcare"); null for the main market types. */
  group?: string | null;
};

/** Types in order, ungrouped first, each group together under its heading - for the "what kind of business" lists. */
export function groupVerticals(list: Vertical[]): { group: string | null; items: Vertical[] }[] {
  const out: { group: string | null; items: Vertical[] }[] = [];
  for (const v of [...list.filter((x) => !x.group), ...list.filter((x) => x.group)]) {
    const g = v.group ?? null;
    const last = out[out.length - 1];
    if (last && last.group === g) last.items.push(v);
    else out.push({ group: g, items: [v] });
  }
  return out;
}

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
        { key: "coaching", label: "Coaching or tuition centre", summary: "An exam-prep or skills coaching institute where students and parents ask about batches and fees, book a demo class, and need reminding about fee instalments." },
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

// Ready-made Flow JSON for the signed-in business's own vertical - a
// starting point to lightly edit, not a fixed builder. See
// shared/verticals/templates/*.json's "flow_templates" key.
export type FlowTemplate = {
  key: string;
  name: string;
  description: string;
  categories: string[];
  cta: string;
  body: string;
  screen: string;
  flow_json: Record<string, unknown>;
};

export const flows = {
  list: () => api.get<WhatsAppFlow[]>("/flows"),

  get: (id: string) => api.get<WhatsAppFlow>(`/flows/${id}`),

  templates: () => api.get<FlowTemplate[]>("/flows/templates"),

  create: (data: { name: string; categories: string[]; flow_json: Record<string, unknown> }) =>
    api.post<WhatsAppFlow>("/flows", data),

  publish: (id: string) => api.post<WhatsAppFlow>(`/flows/${id}/publish`),

  deprecate: (id: string) => api.post<WhatsAppFlow>(`/flows/${id}/deprecate`),

  refresh: (id: string) => api.post<WhatsAppFlow>(`/flows/${id}/refresh`),

  // Beta - points this flow at KROVA's own data_exchange endpoint, so a
  // screen can show real data (today: real open appointment slots)
  // instead of a fixed set of options. See services/api/routers/
  // flow_exchange.py.
  enableLiveData: (id: string) => api.post<{ enabled: boolean }>(`/flows/${id}/enable-live-data`),

  send: (
    id: string,
    data: { customer_id: string; body: string; screen: string; cta: string; data?: Record<string, unknown>; draft?: boolean },
  ) => api.post<FlowSendResult>(`/flows/${id}/send`, data),
};

// ── Outbound integrations ───────────────────────────────────────────────────

export type CalendarStatus = {
  connected: boolean;
  status: string | null;
  connected_at: string | null;
};

export type OutboundWebhookRow = {
  id: string;
  target_url: string;
  event_types: string[];
  active: boolean;
  format: "raw" | "slack" | "teams";
  secret: string | null; // only present in the create response
  last_delivery_at: string | null;
  last_delivery_status: string | null;
  failure_count: number;
};

export const WEBHOOK_EVENT_TYPES = [
  "appointment.booked",
  "appointment.cancelled",
  "queue_token.issued",
  "escalation.raised",
  "competitor.mentioned",
  "message.received",
  // Real backend event types from the voice roadmap work - always valid
  // to subscribe to (services/api/routers/integrations.py derives its
  // allowed set straight from the WebhookEventType enum), just never
  // added to this list before.
  "call.completed",
  "call.voicemail",
  "call.no_answer",
  // Same story, found in a wiring audit after the Flow live-data work -
  // fires when a customer completes any Flow (see shared/channels/
  // whatsapp/webhook.py's flow_reply handling), the backend already
  // accepted it, this list just never got it added.
  "flow.completed",
  // Fired from the CRM when someone moves a customer to another stage.
  "customer.stage_changed",
  // Real-time product-feedback signals (shared/ai/signals.py), gated to
  // businesses whose vertical declares product_feedback (today only
  // "startup") - the same real-time dispatch competitor.mentioned above
  // already used, extended to two more signal kinds worth acting on
  // instantly rather than just showing on the Signals page.
  "churn_risk.detected",
  "demo.requested",
  "pricing_question.asked",
  // The rest of the Signals feature's kinds, wired for real-time dispatch
  // in the same pass that closed the Automations silent-trap bug (see
  // shared/care/signal_dispatch.py) - all subscribable here regardless of
  // whether they can also drive an Automations rule.
  "bug.detected",
  "feature_request.detected",
  "complaint.detected",
  "praise.detected",
  "overdue_followup.detected",
  "report_not_collected.detected",
  "callback_overdue.detected",
  "overdue_refund.detected",
  "intent_leakage.detected",
  "rto_risk.detected",
  // Business-level signals (no customer_id) - can never drive an
  // Automations rule (every action needs a customer), so a webhook
  // subscription is the only way to act on either of these.
  "escalation_rate.detected",
  "account_health.detected",
] as const;

export const WEBHOOK_FORMATS = ["raw", "slack", "teams"] as const;

export type ApiKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  active: boolean;
  last_used_at: string | null;
  raw_key: string | null; // only present in the create response
};

export const integrations = {
  googleCalendarStatus: () => api.get<CalendarStatus>("/integrations/google-calendar"),

  googleCalendarConnectUrl: () =>
    api.get<{ url: string }>("/integrations/google-calendar/connect-url"),

  disconnectGoogleCalendar: () =>
    api.post<void>("/integrations/google-calendar/disconnect"),

  listWebhooks: () => api.get<OutboundWebhookRow[]>("/integrations/webhooks"),

  createWebhook: (data: { target_url: string; event_types: string[]; format?: string }) =>
    api.post<OutboundWebhookRow>("/integrations/webhooks", data),

  updateWebhook: (
    id: string,
    data: Partial<{ target_url: string; event_types: string[]; active: boolean; format: string }>,
  ) => api.patch<OutboundWebhookRow>(`/integrations/webhooks/${id}`, data),

  deleteWebhook: (id: string) => api.delete<void>(`/integrations/webhooks/${id}`),

  listApiKeys: () => api.get<ApiKeyRow[]>("/integrations/api-keys"),

  createApiKey: (name: string) => api.post<ApiKeyRow>("/integrations/api-keys", { name }),

  deleteApiKey: (id: string) => api.delete<void>(`/integrations/api-keys/${id}`),

  // Software-startup vertical: the closed bug-lifecycle loop.
  githubStatus: () => api.get<GitHubConnection | null>("/integrations/github"),

  connectGithub: (data: { repo_owner: string; repo_name: string; access_token: string; webhook_secret: string }) =>
    api.post<GitHubConnection>("/integrations/github", data),

  disconnectGithub: () => api.delete<void>("/integrations/github"),

  emailConnectionStatus: () => api.get<EmailConnection | null>("/integrations/email-connection"),

  connectEmail: (from_email: string) =>
    api.post<EmailConnection>("/integrations/email-connection", { from_email }),

  disconnectEmail: () => api.delete<void>("/integrations/email-connection"),

  // Software-startup vertical: billing dunning.
  stripeStatus: () => api.get<StripeConnectionInfo | null>("/integrations/stripe"),

  connectStripe: (webhook_secret?: string) =>
    api.post<StripeConnectionInfo>("/integrations/stripe", { webhook_secret: webhook_secret || null }),

  disconnectStripe: () => api.delete<void>("/integrations/stripe"),
};

export type StripeConnectionInfo = {
  id: string;
  webhook_url: string;
  status: string;
  connected_at: string | null;
  has_secret: boolean;
};

export type GitHubConnection = {
  id: string;
  repo_owner: string;
  repo_name: string;
  status: string;
  connected_at: string | null;
};

export type EmailConnection = {
  id: string;
  from_email: string;
  verified: boolean;
  connected_at: string | null;
};


// ── Ask KROVA (owner text chat, in the app) ───────────────────────────────────

export type OwnerTurn = { role: "user" | "assistant"; text: string };

export const owner = {
  ask: (question: string, history: OwnerTurn[] = []) =>
    api.post<{ answer: string }>("/owner/ask", { question, history }),
};

// ── Push notifications (Web Push / VAPID) ─────────────────────────────────────

export const push = {
  vapidPublicKey: () => api.get<{ public_key: string }>("/push/vapid-public-key"),

  subscribe: (endpoint: string, keys: { p256dh: string; auth: string }) =>
    api.post<void>("/push/subscribe", { endpoint, keys }),

  unsubscribe: (endpoint: string) =>
    api.delete<void>(`/push/subscribe?endpoint=${encodeURIComponent(endpoint)}`),

  /** Each kind of phone notification and whether I get it - my own choice, for this business. */
  preferences: () => api.get<PushKind[]>("/push/preferences"),
  setPreferences: (muted: string[]) => api.put<PushKind[]>("/push/preferences", { muted }),
};

export type PushKind = { key: string; label: string; on: boolean };

// ── Owner commands (command layer, phase 1) ───────────────────────────────────

export type CommandStatus = "pending" | "done" | "failed" | "cancelled";

export type CommandRecord = {
  id: string;
  tool: string;
  status: CommandStatus;
  preview: string[];
  result: Record<string, unknown> | null;
  error: string | null;
};

export type RegistrySetting = {
  key: string;
  label: string;
  kind: "int" | "bool" | "choice" | "int_list";
  value: number | boolean | string | number[];
  choices: string[];
  minimum: number | null;
  maximum: number | null;
};

export const commands = {
  settings: () => api.get<RegistrySetting[]>("/commands/settings"),
  preview: (tool: string, args: Record<string, unknown>) =>
    api.post<CommandRecord>("/commands/preview", { tool, args }),
  confirm: (id: string) => api.post<CommandRecord>(`/commands/${id}/confirm`),
  cancel: (id: string) => api.post<CommandRecord>(`/commands/${id}/cancel`),
};

export type UnderstandResult = {
  source: "pattern" | "ai" | "unavailable";
  tool: string | null;
  args: Record<string, unknown>;
  message: string | null;
};

export const commandBar = {
  understand: (text: string) => api.post<UnderstandResult>("/commands/understand", { text }),
};
