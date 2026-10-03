import type { Metadata } from "next";
import { headers } from "next/headers";
import AppShell from "./AppShell";

/**
 * Metadata has to come from a server layout: browsers only read the
 * manifest and apple-touch-icon from <head>, and a client component's
 * <link> tags in the body are not reliably picked up for "Add to Home
 * Screen" or the install prompt. The client shell lives in AppShell.tsx.
 */
export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") || "";
  const onSubdomain = host.startsWith("app.krova.space") || host.startsWith("app.localhost");
  return {
    manifest: onSubdomain ? "/app-manifest-root.json" : "/app-manifest.json",
    applicationName: "KROVA",
    appleWebApp: { capable: true, title: "KROVA", statusBarStyle: "black-translucent" },
    icons: {
      icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/icon.svg", type: "image/svg+xml" }],
      apple: "/apple-touch-icon.png",
    },
  };
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
