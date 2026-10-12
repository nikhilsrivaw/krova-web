"use client";

import { useEffect } from "react";
import { getUserId } from "@/lib/auth";

/**
 * The browser keeps one login, shared by every tab. Sign in as someone else in another tab (a
 * team member to test, say) and this tab used to carry on showing the previous person's screens
 * while quietly acting as the new one.
 *
 * When the signed-in person changes, or signs out, in another tab, reload this one: it then
 * loads as the right person, or goes to the sign-in page. A token that merely refreshed for the
 * same person is ignored.
 */
export function useSessionWatch(): void {
  useEffect(() => {
    const startedAs = getUserId();

    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== "krova.user_id" && event.key !== "krova.access") return;
      if (getUserId() !== startedAs) window.location.reload();
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
}
