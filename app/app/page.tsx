"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { appPath } from "@/lib/app-nav";

export default function AppIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace(appPath("/today"));
  }, [router]);
  return null;
}
