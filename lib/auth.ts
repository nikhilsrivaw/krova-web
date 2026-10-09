/**
 * Session handling.
 *
 * Krova issues its own tokens now — there is no external identity provider,
 * so the browser holds an access token and a refresh token and this module
 * is the only place that knows where they live.
 *
 * Access tokens are short-lived by design (30 minutes), so a single fetch
 * failing with 401 is expected rather than exceptional. `withFreshToken`
 * handles that by refreshing once and retrying, which keeps every caller from
 * having to think about it.
 */

const ACCESS_KEY = "krova.access";
const REFRESH_KEY = "krova.refresh";
const EMAIL_KEY = "krova.email";
const USER_ID_KEY = "krova.user_id";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type Session = {
  access_token: string;
  refresh_token: string;
  user_id: string;
  // Null for a phone-only account - see shared/db/models/identity.py's
  // User.email docstring.
  email: string | null;
  business_id: string | null;
  business_name: string | null;
  vertical: string | null;
};

/** localStorage throws in private windows and during SSR; never let that break a render. */
function read(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — the session simply won't survive a reload */
  }
}

export function getAccessToken(): string | null {
  return read(ACCESS_KEY);
}

export function getEmail(): string | null {
  return read(EMAIL_KEY);
}

// user_id is the one identifier guaranteed both unique and non-null
// (email is null for a phone-only account - see shared/db/models/
// identity.py's User.email docstring) - "is this thread/message mine"
// checks (app/conversations/page.tsx) should match on this, not email,
// so two phone-only team members are never confused for each other.
export function getUserId(): string | null {
  return read(USER_ID_KEY);
}

export function isSignedIn(): boolean {
  return getAccessToken() !== null;
}

export function storeSession(session: Session): void {
  write(ACCESS_KEY, session.access_token);
  write(REFRESH_KEY, session.refresh_token);
  write(EMAIL_KEY, session.email);
  write(USER_ID_KEY, session.user_id);
}

export function clearSession(): void {
  write(ACCESS_KEY, null);
  write(REFRESH_KEY, null);
  write(EMAIL_KEY, null);
  write(USER_ID_KEY, null);
}

export async function signIn(email: string, password: string): Promise<Session> {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.detail || "Could not sign in");
  storeSession(body);
  return body;
}

export async function register(input: {
  email: string;
  password: string;
  full_name?: string;
  business_name: string;
  vertical: string;
}): Promise<Session> {
  const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // FastAPI validation errors arrive as a list of field problems; show the
    // first one rather than "[object Object]".
    const detail = Array.isArray(body.detail)
      ? body.detail[0]?.msg
      : body.detail;
    throw new Error(detail || "Could not create the account");
  }
  storeSession(body);
  return body;
}

/**
 * Passwordless login/registration - a code by email, or read aloud over a
 * voice call for a phone number (never SMS - see shared/auth/otp.py's own
 * docstring on why). Same request() call whether or not an account
 * already exists at this destination; the caller decides whether to call
 * otpLogin or otpRegister next.
 */
export async function requestOtp(destination: string, channel: "email" | "call"): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/auth/otp/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ destination, channel }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "Could not send the verification code");
  }
}

export async function otpLogin(
  destination: string, channel: "email" | "call", code: string,
): Promise<Session> {
  const res = await fetch(`${API_BASE}/api/v1/auth/otp/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ destination, channel, code }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.detail || "Could not sign in");
  storeSession(body);
  return body;
}

// Either channel can create a brand-new account - see shared/auth/otp.py's
// own module docstring.
export async function otpRegister(input: {
  channel: "email" | "call";
  destination: string;
  code: string;
  full_name?: string;
  business_name: string;
  vertical: string;
}): Promise<Session> {
  const res = await fetch(`${API_BASE}/api/v1/auth/otp/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(body.detail) ? body.detail[0]?.msg : body.detail;
    throw new Error(detail || "Could not create the account");
  }
  storeSession(body);
  return body;
}

/**
 * Where to send the browser for Google sign-in/sign-up.
 *
 * businessName/vertical are only meaningful from the signup form - they ride
 * through Google's own round trip in a signed state param (see
 * shared/auth/tokens.py's create_google_oauth_state) so the callback can
 * create a new business if this turns out to be a new email. Omit both for
 * a plain login page: an unrecognised email there sends the browser back to
 * /signup instead of silently creating a business.
 */
export async function googleStart(
  businessName?: string,
  vertical?: string,
  fromApp = false
): Promise<string> {
  const params = new URLSearchParams();
  if (businessName) params.set("business_name", businessName);
  if (vertical) params.set("vertical", vertical);
  // The app subdomain gets the browser back to its own /auth/google/complete.
  if (fromApp) params.set("app", "1");
  const qs = params.toString();
  const res = await fetch(
    `${API_BASE}/api/v1/auth/google/start${qs ? `?${qs}` : ""}`
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.detail || "Could not start Google sign-in");
  return body.authorize_url as string;
}

/**
 * The last step after Google redirects back: trade the short-lived handoff
 * code (in the URL, never the real tokens - see the backend module comment
 * on create_google_handoff) for an actual session.
 */
export async function googleExchange(code: string): Promise<Session> {
  const res = await fetch(`${API_BASE}/api/v1/auth/google/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.detail || "Could not complete Google sign-in");
  storeSession(body);
  return body;
}

export async function signOut(): Promise<void> {
  const refresh = read(REFRESH_KEY);
  clearSession();
  if (!refresh) return;
  try {
    await fetch(`${API_BASE}/api/v1/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
  } catch {
    /* the local session is already gone; server-side revocation is best effort */
  }
}

/**
 * Swap the refresh token for a new pair.
 *
 * The server rotates on every use and revokes the whole family if a consumed
 * token reappears, so the new refresh token must replace the old one here or
 * the next refresh will look like a replay attack and sign the user out
 * everywhere.
 */
export async function refreshSession(): Promise<boolean> {
  const refresh = read(REFRESH_KEY);
  if (!refresh) return false;

  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) {
      clearSession();
      return false;
    }
    storeSession(await res.json());
    return true;
  } catch {
    return false;
  }
}
