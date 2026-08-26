"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { CommandPalette } from "./CommandPalette";
import {
  account,
  approvals,
  NotAuthenticated,
  type AutonomyLevel,
  type UserProfile,
} from "@/lib/api";
import { isSignedIn, clearSession } from "@/lib/auth";

interface AppLayoutProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function AppLayout({
  title,
  subtitle,
  actions,
  children,
}: AppLayoutProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [autonomy, setAutonomy] = useState<AutonomyLevel>("draft");
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await account.profile();
      setProfile(data);
      if (data.autonomy) setAutonomy(data.autonomy);
    } catch (err) {
      if (err instanceof NotAuthenticated) {
        clearSession();
        router.replace("/login");
        return;
      }
      setLoadError(
        err instanceof Error ? err.message : "Could not load your profile.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!isSignedIn()) {
      router.replace("/login");
      return;
    }
    loadProfile();
  }, [router, loadProfile]);

  const handleSetAutonomy = useCallback(async (level: AutonomyLevel) => {
    const previous = autonomy;
    setAutonomy(level);
    try {
      await approvals.setAutonomy(level);
    } catch {
      // The write failed - reflect the level the server actually holds,
      // not the one the user clicked, so the UI never claims a setting
      // that never took effect.
      setAutonomy(previous);
    }
  }, [autonomy]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center p-6">
        <div className="flex flex-col items-center text-center max-w-sm">
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h4 className="text-base font-semibold mb-1.5">
            Couldn&apos;t load your account
          </h4>
          <p className="text-xs text-os-text-dim leading-relaxed mb-6">
            {loadError || "Something went wrong."}
          </p>
          <button
            type="button"
            onClick={() => loadProfile()}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-white text-black hover:bg-white/90 active:scale-95 transition-all shadow-md"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white flex">
      {/* Persistent App Sidebar */}
      <AppSidebar
        businessName={profile?.business_name || "KROVA Business"}
        vertical={profile?.vertical || "General"}
        capabilities={profile?.capabilities || []}
        autonomy={autonomy}
        onAutonomyClick={() => setIsCommandOpen(true)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader
          title={title}
          subtitle={subtitle}
          autonomy={autonomy}
          onSetAutonomy={handleSetAutonomy}
          onOpenCommand={() => setIsCommandOpen(true)}
          actions={actions}
        />

        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>

      {/* Universal ⌘K Command Palette */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onSetAutonomy={handleSetAutonomy}
      />
    </div>
  );
}
