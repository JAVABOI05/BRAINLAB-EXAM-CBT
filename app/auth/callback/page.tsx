"use client";

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

    async function completeSignIn() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (params.has("error") || params.has("error_description")) {
        setMessage("The sign-in could not be completed. Return to BrainLab and try again.");
        return;
      }
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setMessage("This sign-in link could not be verified or has expired. Return to BrainLab and try again.");
          return;
        }
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setMessage("No active sign-in was found. Return to BrainLab and try again.");
        return;
      }

      const { data: isOperator, error: permissionError } = await supabase.rpc("is_admin");
      if (permissionError) {
        setMessage("Your identity was received, but account permissions could not be verified. Please try again later.");
        return;
      }

      if (isOperator === true) {
        const response = await fetch("/api/auth/operator-gate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: session.access_token }),
        });
        if (!response.ok) {
          setMessage("Your sign-in succeeded, but secure account access could not be prepared. Please contact the platform owner.");
          return;
        }
        router.replace("/admin/dashboard");
        return;
      }

      router.replace("/dashboard");
    }

    void completeSignIn().catch(() => setMessage("The sign-in could not be completed. Return to BrainLab and try again."));
  }, [router]);

  return <main id="main" className="flex min-h-[65vh] items-center justify-center px-5 py-16"><section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-xl text-blue-900" aria-hidden="true">↻</div><h1 className="mt-5 text-2xl font-extrabold text-slate-950">Finishing sign-in</h1><p role="status" className="mt-3 leading-7 text-slate-600">{message}</p><Link href="/account" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#012153] px-5 py-3 font-bold text-white">Return to sign in</Link></section></main>;
}
