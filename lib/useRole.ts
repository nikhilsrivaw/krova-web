"use client";

import { useEffect, useState } from "react";
import { account } from "@/lib/api";

/**
 * Who is signed in, as far as what they may change. `supervisor` is the owner and the admins;
 * a team member (agent) is not. Until the profile has loaded nobody is treated as a
 * supervisor, so a setup control never flashes up for someone who may not use it.
 *
 * Hiding a button is only courtesy - the API refuses an agent regardless.
 */
let cached: Promise<string | null> | null = null;

function loadRole(): Promise<string | null> {
  if (!cached) {
    cached = account.profile().then((p) => p.role ?? null).catch(() => {
      cached = null;
      return null;
    });
  }
  return cached;
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
