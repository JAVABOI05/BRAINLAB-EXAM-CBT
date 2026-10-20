"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import BrandHeader from "../../../components/BrandHeader";
import BrandFooter from "../../../components/BrandFooter";

function SubscriptionCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const reference = searchParams.get("reference");
  const isSimulated = searchParams.get("simulated") === "true";

  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState("");
  const [planId, setPlanId] = useState("");

  useEffect(() => {
    if (!reference) {
      setStatus("error");
      setErrorMessage("No payment reference was found in the return link.");
      return;
    }

    let isMounted = true;

    async function verify() {
      try {
        const res = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference }),
        });

        const data = await res.json();

        if (!isMounted) return;

        if (res.ok && data.ok) {
          setStatus("success");
          setPlanId(data.planId || "premium");
        } else {
          setStatus("error");
          setErrorMessage(data.error || data.details || "Payment could not be verified.");
        }
      } catch (err) {
        if (!isMounted) return;
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Network error verifying payment.");
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [reference]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      {status === "verifying" && (
        <div className="max-w-md rounded-2xl border border-blue-200 bg-white p-8 shadow-sm">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <h2 className="text-xl font-bold text-slate-900">Verifying Your Payment...</h2>
          <p className="mt-2 text-sm text-slate-600">
            Please wait while we confirm your transaction and activate your tier entitlements.
          </p>
          {isSimulated && (
            <span className="mt-4 inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
              🧪 Test Mode Sandbox Simulation
            </span>
          )}
        </div>
      )}

      {status === "success" && (
        <div className="max-w-lg rounded-3xl border border-emerald-200 bg-emerald-50/50 p-8 shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-2xl text-white">
            ✓
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-emerald-800">
            Subscription Activated
          </span>
          <h2 className="mt-3 text-2xl font-black text-slate-900">
            Welcome to BrainLab {planId ? planId.toUpperCase() : ""}!
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Your payment was confirmed successfully. Your unlimited CBT questions, AI tutor quota, and study tools are now fully unlocked.
          </p>

          <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-left">
            <div className="flex items-start gap-3">
              <span className="text-xl">🛡️</span>
              <div>
                <p className="text-xs font-bold text-blue-950">24-Hour 100% Satisfaction Guarantee</p>
                <p className="mt-0.5 text-xs text-blue-800">
                  You are eligible for an unconditional 100% refund within 24 hours of purchase if BrainLab does not meet your expectations. You can submit requests anytime from{" "}
                  <Link href="/account/subscription/refund" className="underline font-bold">
                    My Account Refund Portal
                  </Link>.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
            >
              Go to My Dashboard →
            </Link>
            <Link
              href="/learn"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Explore Learning Hub
            </Link>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="max-w-md rounded-2xl border border-rose-200 bg-rose-50/60 p-8 shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500 text-xl text-white">
            ✕
          </div>
          <h2 className="text-xl font-bold text-slate-900">Verification Issue</h2>
          <p className="mt-2 text-sm text-slate-700">{errorMessage}</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white"
            >
              Return to Pricing
            </Link>
            <Link
              href="/support"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700"
            >
              Contact Support
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SubscriptionCallbackPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <BrandHeader />
      <main className="flex-1 py-12">
        <Suspense
          fallback={
            <div className="flex min-h-[50vh] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          }
        >
          <SubscriptionCallbackContent />
        </Suspense>
      </main>
      <BrandFooter />
    </div>
  );
}
