"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const started = useRef(false);
  const [message, setMessage] = useState("Verifying your sign-in…");

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function clearOperatorGate() {
      try {
        await fetch("/api/auth/operator-gate", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
      } catch {
        // Fail closed at the application authorization layer if cleanup fails.
      }
    }

    async function completeSignIn() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const nextParam = params.get("next");

      if (params.has("error") || params.has("error_description")) {
        await clearOperatorGate();
        const errDesc = params.get("error_description") || "The sign-in could not be completed.";
        setMessage(`${errDesc} Return to BrainLab and try again.`);
        return;
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          // Check if session is already active before reporting an error
          const { data: existing } = await supabase.auth.getSession();
          if (!existing?.session) {
            await clearOperatorGate();
            setMessage("This sign-in link could not be verified or has expired. Return to BrainLab and try again.");
            return;
          }
        }
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        await clearOperatorGate();
        setMessage("No active sign-in was found. Return to BrainLab and try again.");
        return;
      }

      // Email/password accounts must have completed Supabase email verification.
      // OAuth providers (e.g. Google) already verify email on the provider end.
      const isEmailProvider = session.user.app_metadata?.provider === "email";
      if (isEmailProvider && session.user.email && !session.user.email_confirmed_at) {
        await supabase.auth.signOut();
        await clearOperatorGate();
        setMessage("Your email has not been verified yet. Check your inbox for the verification link, then return to sign in.");
        return;
      }

      // Check if user is an operator / administrator
      let isOperator = false;
      try {
        const { data: adminFlag, error: rpcErr } = await supabase.rpc("is_admin");
        if (!rpcErr && adminFlag === true) {
          isOperator = true;
        }
      } catch {
        isOperator = false;
      }

      if (isOperator) {
        const response = await fetch("/api/auth/operator-gate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: session.access_token }),
          cache: "no-store",
        });
        if (!response.ok) {
          await clearOperatorGate();
          setMessage("Your sign-in succeeded, but secure account access could not be prepared. Please contact the platform owner.");
          return;
        }
        router.replace("/admin/dashboard");
        return;
      }

      // Standard learner: clean any operator cookies and proceed to destination
      await clearOperatorGate();
      const targetDestination = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
        ? nextParam
        : "/dashboard";
      router.replace(targetDestination);
    }

    void completeSignIn().catch(async () => {
      try {
        await fetch("/api/auth/operator-gate", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
      } catch {
        // Safe fail-closed cleanup
      }
      setMessage("The sign-in could not be completed. Return to BrainLab and try again.");
    });
  }, [router]);

  return (
    <main id="main" className="flex min-h-[65vh] items-center justify-center px-5 py-16">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-xl text-blue-900" aria-hidden="true">
          ↻
        </div>
        <h1 className="mt-5 text-2xl font-extrabold text-slate-950">Finishing sign-in</h1>
        <p role="status" className="mt-3 leading-7 text-slate-600">{message}</p>
        <Link href="/account" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#012153] px-5 py-3 font-bold text-white shadow hover:bg-[#0a2f72]">
          Return to sign in
        </Link>
      </section>
    </main>
  );
}
