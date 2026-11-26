"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

/**
 * Sign-in gate for the whole learner experience.
 *
 * A signed-out visitor may only open the pages listed below. Every other
 * route requires sign-in (default deny), so any page added later is
 * protected automatically. Visitors are sent to the sign-in page and
 * returned to the page they asked for once they are signed in.
 *
 * Note: this gate controls what the browser shows. Data access is still
 * enforced by the API routes and database row-level security.
 */
const PUBLIC_EXACT_PATHS = ["/"];

const PUBLIC_PREFIXES = [
  // Sign-in, account and verification flows
  "/login",
  "/auth",
  "/account",
  "/verify",
  "/unsubscribe",
  "/access",
  "/result",
  // Staff areas enforce their own role checks
  "/admin",
  "/tutor",
  "/instructor",
  // Marketing, information and legal pages
  "/about",
  "/contact",
  "/faq",
  "/privacy",
  "/terms",
  "/pricing",
  "/plans",
  "/support",
  "/testimonials",
  "/products",
  "/for-students",
  "/for-tutors",
  "/schools",
  "/tutors",
  "/courses",
  "/resources",
  "/syllabus",
  "/programmes",
];

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

function hasUsableSession(session: Session | null): boolean {
  const user = session?.user;
  if (!user) return false;
  // Unconfirmed email accounts are not allowed in (matches the sign-in page).
  if (user.email && !user.email_confirmed_at) return false;
  return true;
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const isPublic = isPublicPath(pathname);

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSignedIn(hasUsableSession(data.session));
      })
      .catch(() => {
        if (active) setSignedIn(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setSignedIn(hasUsableSession(session));
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isPublic || signedIn !== false) return;

    const params = new URLSearchParams(window.location.search);
    if (params.has("code") || params.has("error")) {
      // Authentication callback landed on a protected route: finish it first.
      window.location.replace(
        `/auth/callback${window.location.search}${window.location.hash}`
      );
      return;
    }

    const target = `${pathname}${window.location.search}`;
    router.replace(`/login?mode=signin&next=${encodeURIComponent(target)}`);
  }, [isPublic, signedIn, pathname, router]);

  if (isPublic || signedIn === true) {
    return <>{children}</>;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen items-center justify-center bg-[#F4F6FA] px-6 text-center text-[#012153] dark:bg-[#050811] dark:text-slate-200"
    >
      <div className="space-y-3">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#012153]/20 border-t-[#012153] dark:border-white/20 dark:border-t-cyan-400" />
        <p className="text-sm font-semibold">
          {signedIn === false ? "Taking you to sign in…" : "Checking your session…"}
        </p>
      </div>
    </div>
  );
}
