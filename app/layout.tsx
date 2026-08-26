import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

// The one characterful face in the system - reserved for ledger totals,
// headline numbers and the stamp mark, never for body copy or UI chrome.
// Fraunces' ink-trap ductus at high optical size is what carries the
// "this is a real record" weight the khata direction calls for.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["500", "600", "700", "900"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.krova.space"),
  title: {
    default: "Krova — AI Business Intelligence for Businesses",
    template: "%s | Krova",
  },
  description:
    "Krova helps businesses understand and manage customer conversations across WhatsApp and email, with AI-assisted follow-ups and customer insights. A product of Aqirox Technology Private Limited.",
  applicationName: "Krova",
  authors: [{ name: "Aqirox Technology Private Limited" }],
  openGraph: {
    title: "Krova — AI Business Intelligence for Businesses",
    description:
      "Understand and manage customer conversations, follow-ups and customer intelligence in one place.",
    url: "https://www.krova.space",
    siteName: "Krova",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased bg-os-bg text-os-ink" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
