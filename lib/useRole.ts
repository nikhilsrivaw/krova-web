"use client";

import { useEffect, useState } from "react";
import { account, can, type Capability, type Permissions, type UserProfile } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

/**
 * Who is signed in, as far as what they may change. `supervisor` is the owner and the admins;
 * a team member (agent) is not. Until the profile has loaded nobody is treated as a
 * supervisor, so a setup control never flashes up for someone who may not use it.
 *
 * `allowed` is what the owner lets team members do (Team page -> "What agents can see"):
 * see_money, take_payments, see_phones, send_templates - all true for the owner and admins,
 * and all false until the profile has loaded, for the same reason.
 *
 * Hiding a button is only courtesy - the API refuses an agent regardless.
 *
 * The answer is remembered per sign-in (keyed on the access token), so signing out and in as
 * someone else in the same tab never shows the next person the last person's role.
 */
let cached: { token: string | null; promise: Promise<UserProfile | null> } | null = null;

function loadProfile(): Promise<UserProfile | null> {
  const token = getAccessToken();
  if (!cached || cached.token !== token) {
    const promise = account.profile().catch(() => {
      cached = null;
      return null;
    });
    cached = { token, promise };
  }
  return cached.promise;
}

const NOTHING: Permissions = { see_money: false, take_payments: false, see_phones: false, send_templates: false };

export function useRole(): {
  role: string | null; supervisor: boolean; ready: boolean; allowed: Permissions; capabilities: Capability[];
} {
  const [state, setState] = useState<{ profile: UserProfile | null; ready: boolean }>({ profile: null, ready: false });

  useEffect(() => {
    let live = true;
    loadProfile().then((profile) => {
      if (live) setState({ profile, ready: true });
    });
    return () => {
      live = false;
    };
  }, []);

  const role = state.profile?.role ?? null;
  const p = state.profile;
  const allowed: Permissions = p
    ? {
      see_money: can(p, "see_money"), take_payments: can(p, "take_payments"),
      see_phones: can(p, "see_phones"), send_templates: can(p, "send_templates"),
    }
    : NOTHING;
  return {
    role, ready: state.ready, supervisor: role === "owner" || role === "admin", allowed,
    // the features this business has switched on - empty until the profile has loaded
    capabilities: p?.capabilities ?? [],
  };
}
