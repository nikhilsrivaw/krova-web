"use client";

/**
 * Deliberately isolated test page - no imports from lib/api.ts, no React
 * state beyond a log string, no business logic at all. Just Meta's own
 * documented FB.init()/FB.login() sample, verbatim, with nothing of
 * KROVA's around it.
 *
 * Purpose: settle whether the "Feature unavailable" error a non-role
 * Facebook account hits is caused by anything in KROVA's code, by removing
 * every line of KROVA's code from the equation except this page's own
 * ~30 lines. If a public account still gets the same error here, it
 * cannot be a KROVA code issue - there is no KROVA logic left to blame.
 *
 * app_id and config_id are not secret - they are already sent to the
 * browser on every real Connect WhatsApp click, exactly as here.
 */

import { useEffect, useState } from "react";

const APP_ID = "1035146145528792";
const CONFIG_ID = "1054450264306300";

// Deliberately untyped (not importing facebookSdk.ts's Window.FB
// declaration) - this page must not share a single line with KROVA's real
// integration code, including types.
declare const window: Window & { FB?: any; fbAsyncInit?: () => void };

export default function RawFacebookTestPage() {
  const [log, setLog] = useState<string[]>(["Loading Meta's SDK..."]);

  const append = (line: string) => setLog((l) => [...l, line]);

  useEffect(() => {
    window.fbAsyncInit = () => {
      window.FB!.init({ appId: APP_ID, version: "v25.0" });
      append("FB.init() done. Ready - click the button.");
    };
    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.onerror = () => append("SDK script failed to load.");
    document.body.appendChild(script);
  }, []);

  const runTest = () => {
    if (!window.FB) {
      append("FB not ready yet - wait a second and try again.");
      return;
    }
    append("Calling FB.login()...");
    window.FB.login(
      (response) => {
        append("FB.login() callback fired: " + JSON.stringify(response));
      },
      {
        config_id: CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {} },
      },
    );
  };

  return (
    <div style={{ padding: 40, fontFamily: "monospace", maxWidth: 700 }}>
      <h1>Raw Meta Embedded Signup test - no KROVA code</h1>
      <p>
        This page contains nothing but Meta's own documented FB.init()/FB.login()
        sample. No KROVA business logic, no API calls, no state beyond this log.
      </p>
      <button onClick={runTest} style={{ padding: "10px 20px", fontSize: 16 }}>
        Click: Test WhatsApp Connect
      </button>
      <pre style={{ marginTop: 20, background: "#111", color: "#0f0", padding: 16, whiteSpace: "pre-wrap" }}>
        {log.join("\n")}
      </pre>
    </div>
  );
}
