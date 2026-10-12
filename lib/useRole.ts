"use client";

import { useEffect, useState } from "react";
import { account } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

/**
 * Who is signed in, as far as what they may change. `supervisor` is the owner and the admins;
 * a team member (agent) is not. Until the profile has loaded nobody is treated as a
 * supervisor, so a setup control never flashes up for someone who may not use it.
 *
 * Hiding a button is only courtesy - the API refuses an agent regardless.
 *
 * The answer is remembered per sign-in (keyed on the access token), so signing out and in as
 * someone else in the same tab never shows the next person the last person's role.
 */
let cached: { token: string | null; promise: Promise<string | null> } | null = null;

function loadRole(): Promise<string | null> {
  const token = getAccessToken();
  if (!cached || cached.token !== token) {
    const promise = account.profile().then((p) => p.role ?? null).catch(() => {
      cached = null;
      return null;
    });
    cached = { token, promise };
  }
  return cached.promise;
}

export function useRole(): { role: string | null; supervisor: boolean; ready: boolean } {
  const [state, setState] = useState<{ role: string | null; ready: boolean }>({ role: null, ready: false });

  useEffect(() => {
    let live = true;
    loadRole().then((role) => {
      if (live) setState({ role, ready: true });
    });
    return () => {
      live = false;
    };
  }, []);

  return { ...state, supervisor: state.role === "owner" || state.role === "admin" };
}
