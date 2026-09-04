"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";

/**
 * Two-column shell shared by /login and /signup: form on the left, the
 * "Back in orbit" art full-bleed on the right (desktop only — the image
 * just drops on mobile rather than squeezing above the form).
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-os-bg lg:grid lg:grid-cols-2">
      <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16">
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-teal/10 blur-[100px]" />

        <div className="relative z-10 w-full max-w-sm">
          <div className="mb-10 flex justify-center">
            <Link href="/" aria-label="KROVA home" className="group relative inline-flex">
              <span className="absolute -inset-4 rounded-full bg-teal/20 blur-2xl opacity-70 transition-opacity duration-500 group-hover:opacity-100" />
              <Image
                src="/logo-mark.svg"
                alt="KROVA"
                width={64}
                height={64}
                priority
                className="relative h-16 w-16 drop-shadow-[0_10px_30px_rgba(0,0,0,0.55)] transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.03]"
              />
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 text-center"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-os-text-dim transition-colors hover:text-white"
            >
              <Sparkles size={10} className="text-teal" />
              Back to KROVA
            </Link>
          </motion.div>
        </div>
      </div>

      <div className="relative hidden lg:block">
        <Image
          src="/images/auth-back-in-orbit.webp"
          alt="KROVA mascot on a moon rock with a laptop — back in orbit"
          fill
          quality={95}
          sizes="50vw"
          className="object-cover object-top"
          priority
        />
      </div>
    </div>
  );
}
