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

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type Session = {
  access_token: string;
  refresh_token: string;
  user_id: string;
  email: string;
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

export function isSignedIn(): boolean {
  return getAccessToken() !== null;
}

export function storeSession(session: Session): void {
  write(ACCESS_KEY, session.access_token);
  write(REFRESH_KEY, session.refresh_token);
  write(EMAIL_KEY, session.email);
}

export function clearSession(): void {
  write(ACCESS_KEY, null);
  write(REFRESH_KEY, null);
  write(EMAIL_KEY, null);
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
