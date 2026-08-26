"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WorkspacePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-os-bg flex items-center justify-center text-xs font-mono text-os-text-dim">
      Loading KROVA Command Center...
    </div>
  );
}
