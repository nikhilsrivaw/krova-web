"use client";

import { useEffect, useRef, useState } from "react";
import { conversations, type ThreadViewer } from "@/lib/api";

const BEAT_MS = 8000;

/**
 * "Rahul is replying" - tells the server this thread is open (and whether this
 * person is typing) every few seconds, and returns the teammates who have it
 * open too. Advisory only: a failed beat is ignored, and nothing is blocked by
 * it - the hard guard is on sending.
 */
export function useThreadPresence(customerId: string | null, typing: boolean): ThreadViewer[] {
  const [viewers, setViewers] = useState<ThreadViewer[]>([]);
  const typingRef = useRef(typing);
  typingRef.current = typing;

  useEffect(() => {
    setViewers([]);
    if (!customerId) return;
    let stopped = false;

    const beat = async () => {
      if (stopped || document.visibilityState === "hidden") return;
      try {
        const result = await conversations.presence(customerId, typingRef.current);
        if (!stopped) setViewers(result.viewers);
      } catch {
        /* presence is a nicety; never surface it */
      }
    };

    beat();
    const timer = window.setInterval(beat, BEAT_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      // Best effort: let the name disappear at once instead of after the window.
      conversations.presence(customerId, false, true).catch(() => {});
    };
  }, [customerId]);

  return viewers;
}
