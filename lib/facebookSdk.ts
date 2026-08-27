/**
 * Loading Meta's JavaScript SDK for WhatsApp Embedded Signup.
 *
 * This is not a page we navigate to - Embedded Signup is a specific Meta
 * product that only works through FB.login() with a config_id, which is
 * what actually opens Meta's own popup and hands back a short-lived
 * authorisation code. There is no URL to link to instead; the SDK is the
 * integration point Meta requires.
 *
 * app_id and version come from the backend (GET /channels/whatsapp/
 * signup-config), not a hardcoded constant here - the same reason that
 * endpoint exists per its own docstring: the configuration can change
 * without a redeploy.
 */

declare global {
  interface Window {
    FB?: {
      init: (params: {
        appId: string;
        autoLogAppEvents?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: FacebookLoginResponse) => void,
        params: {
          config_id: string;
          response_type: "code";
          override_default_response_type: true;
          extras: {
            setup: Record<string, unknown>;
            featureType: string;
            sessionInfoVersion: string;
          };
        },
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

export type FacebookLoginResponse = {
  authResponse?: { code?: string };
  status?: string;
};

export type EmbeddedSignupMessage = {
  type: "WA_EMBEDDED_SIGNUP";
  event: "FINISH" | "CANCEL" | "ERROR";
  data?: {
    phone_number_id?: string;
    waba_id?: string;
    business_id?: string;
    current_step?: string;
    error_message?: string;
  };
};

// Meta only ever sends these from its own domains - anything else is not
// a real Embedded Signup message and must be ignored, the same discipline
// every other postMessage listener in this codebase would need.
const TRUSTED_ORIGINS = new Set(["https://www.facebook.com", "https://web.facebook.com"]);

export function isEmbeddedSignupMessage(event: MessageEvent): EmbeddedSignupMessage | null {
  if (!TRUSTED_ORIGINS.has(event.origin)) return null;
  try {
    const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
    if (data && data.type === "WA_EMBEDDED_SIGNUP") return data as EmbeddedSignupMessage;
  } catch {
    // Not JSON - not ours, ignore rather than throw.
  }
  return null;
}

let loadPromise: Promise<void> | null = null;

/** Loads the SDK script and calls FB.init() exactly once, however many times this is called. */
export function loadFacebookSdk(appId: string, version: string): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (window.FB) {
      window.FB.init({ appId, autoLogAppEvents: true, xfbml: true, version });
      resolve();
      return;
    }

    window.fbAsyncInit = () => {
      window.FB!.init({ appId, autoLogAppEvents: true, xfbml: true, version });
      resolve();
    };

    const existing = document.getElementById("facebook-jssdk");
    if (existing) return; // fbAsyncInit above will still fire once it loads

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.onerror = () => reject(new Error("Could not load Meta's SDK - check your connection or an ad blocker."));
    document.body.appendChild(script);
  });

  return loadPromise;
}

/** FB.login() wrapped as a promise - resolves with the code, or null if the user cancelled. */
export function loginForEmbeddedSignup(configId: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    if (!window.FB) {
      reject(new Error("Meta's SDK has not loaded yet."));
      return;
    }
    window.FB.login(
      (response) => {
        resolve(response.authResponse?.code || null);
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {}, featureType: "", sessionInfoVersion: "3" },
      },
    );
  });
}
