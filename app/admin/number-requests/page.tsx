"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The 140/160 queue now lives in the admin panel. Old bookmarks land there.
export default function NumberRequestsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin#requests");
  }, [router]);
  return null;
}
