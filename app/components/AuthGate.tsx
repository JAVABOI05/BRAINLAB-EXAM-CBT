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

type AuthStatus = "checking" | "authenticated" | "unauthenticated" | "error";

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
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [authError, setAuthError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const isPublic = isPublicPath(pathname);

  useEffect(() => {
    let active = true;
    let authEventReceived = false;
    let timeoutId: number | undefined;

    const clearSessionTimeout = () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
        timeoutId = undefined;
      }
    };

    const applySession = (session: Session | null) => {
      if (!active) return;
      clearSessionTimeout();
      setAuthError("");
      setAuthStatus(hasUsableSession(session) ? "authenticated" : "unauthenticated");
    };

    setAuthStatus("checking");
    setAuthError("");

    timeoutId = window.setTimeout(() => {
      if (!active) return;
      setAuthStatus("error");
      setAuthError(
        "Your sign-in session is taking longer than expected. Check your connection and try again."
      );
    }, 12000);

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventReceived = true;
      applySession(session);
    });

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active || authEventReceived) return;
        clearSessionTimeout();
        if (error) {
          setAuthStatus("error");
          setAuthError("We couldn't verify your sign-in session. Please try again.");
          return;
        }
        applySession(data.session);
      })
      .catch(() => {
        if (!active || authEventReceived) return;
        clearSessionTimeout();
        setAuthStatus("error");
        setAuthError("We couldn't reach the authentication service. Check your connection and retry.");
      });

    return () => {
      active = false;
      clearSessionTimeout();
      listener.subscription.unsubscribe();
    };
  }, [retryCount]);

  useEffect(() => {
    if (isPublic || authStatus !== "unauthenticated") return;

    const params = new URLSearchParams(window.location.search);
    if (params.has("code") || params.has("error")) {
      // Authentication callback landed on a protected route: finish it first.
      window.location.replace(
        `/auth/callback${window.location.search}${window.location.hash}`
      );
      return;
    }

    const target = `${pathname}${window.location.search}${window.location.hash}`;
    router.replace(`/login?mode=signin&next=${encodeURIComponent(target)}`);
  }, [authStatus, isPublic, pathname, router]);

  if (isPublic || authStatus === "authenticated") {
    return <>{children}</>;
  }

  if (authStatus === "error") {
    const target =
      typeof window === "undefined"
        ? pathname
        : `${pathname}${window.location.search}${window.location.hash}`;
    const signInHref = `/login?mode=signin&next=${encodeURIComponent(target)}`;

    return (
      <main
        role="alert"
        className="flex min-h-screen items-center justify-center bg-[#F4F6FA] px-6 text-center text-[#012153] dark:bg-[#050811] dark:text-slate-200"
      >
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-base font-extrabold">We couldn't verify your session</p>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{authError}</p>
          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
              className="rounded-xl bg-[#012153] px-5 py-3 text-sm font-bold text-white hover:bg-[#0a2e70]"
            >
              Try again
            </button>
            <a
              href={signInHref}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Sign in
            </a>
          </div>
        </div>
      </main>
    );
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
          {authStatus === "unauthenticated"
            ? "Taking you to sign in…"
            : "Checking your session…"}
        </p>
      </div>
    </div>
  );
}
