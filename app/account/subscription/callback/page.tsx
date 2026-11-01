"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function SubscriptionCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const reference = searchParams.get("reference") || searchParams.get("trxref");
  const isCancelled = searchParams.get("cancelled") === "true";
  const provider = searchParams.get("provider");
  const rawRedirect = searchParams.get("redirect") || searchParams.get("returnUrl") || "";

  const [status, setStatus] = useState<"verifying" | "success" | "cancelled" | "bank_pending" | "error">(
    isCancelled ? "cancelled" : "verifying"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [planId, setPlanId] = useState("");
  const [returnTarget, setReturnTarget] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(3);

  // 1. Initial resolution of return URL
  useEffect(() => {
    let resolved = rawRedirect;
    if (!resolved && typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("bl_payment_return_url");
        if (stored) resolved = stored;
      } catch {
        // ignore
      }
    }
    if (resolved) {
      setReturnTarget(resolved);
    }
  }, [rawRedirect]);

  // 2. Verification effect
  useEffect(() => {
    if (isCancelled) {
      setStatus("cancelled");
      return;
    }

    if (!reference) {
      setStatus("error");
      setErrorMessage("No payment reference was found in the return link.");
      return;
    }

    let isMounted = true;
    let pollCount = 0;
    const maxPolls = 3;

    async function verify() {
      try {
        const res = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference }),
        });

        const data = await res.json();

        if (!isMounted) return;

        // If returned target from server metadata exists, prioritize it
        if (data.returnUrl && typeof data.returnUrl === "string") {
          setReturnTarget(data.returnUrl);
        }

        if (res.ok && data.ok) {
          if (data.isBankTransfer || data.status === "pending_clearance") {
            setStatus("bank_pending");
            setPlanId(data.planId || "plan");
          } else {
            setStatus("success");
            setPlanId(data.planId || "premium");
          }
        } else if (res.status === 202 || (pollCount < maxPolls && data.pending)) {
          // If gateway webhook or provider verification is still processing, retry briefly
          pollCount++;
          setTimeout(verify, 2000);
        } else {
          setStatus("error");
          setErrorMessage(data.error || data.details || "Payment could not be verified by the gateway.");
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
  }, [reference, isCancelled]);

  // 3. Countdown & auto-redirect effect on success
  useEffect(() => {
    if (status !== "success" || !returnTarget) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          try {
            sessionStorage.removeItem("bl_payment_return_url");
          } catch {
            // ignore
          }
          router.push(returnTarget);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [status, returnTarget, router]);

  function handleManualNavigate(target: string) {
    try {
      sessionStorage.removeItem("bl_payment_return_url");
    } catch {
      // ignore
    }
    router.push(target);
  }

  // Friendly human readable label for destination
  const destinationLabel = returnTarget.includes("correction")
    ? "Test Corrections & Master Solutions"
    : returnTarget.includes("classroom")
    ? "Interactive Classroom"
    : returnTarget.includes("exam")
    ? "Exam Simulator"
    : "Previous Page";

  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center p-6 text-center">
      {/* 1. VERIFYING STATE */}
      {status === "verifying" && (
        <div className="max-w-md rounded-3xl border border-blue-200 bg-white p-8 shadow-sm">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <h2 className="text-xl font-black text-slate-900">Verifying Payment...</h2>
          <p className="mt-2 text-sm text-slate-600">
            Confirming your live transaction with {provider === "bachs" ? "Bachs" : "the gateway"} and activating your tier access.
          </p>
        </div>
      )}

      {/* 2. CANCELLED STATE */}
      {status === "cancelled" && (
        <div className="max-w-md rounded-3xl border border-amber-200 bg-amber-50/70 p-8 shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl text-amber-700">
            ↩
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-amber-800">
            Checkout Cancelled
          </span>
          <h2 className="mt-3 text-xl font-black text-slate-900">
            Payment Was Not Completed
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            You cancelled your checkout session before finishing. No charges were made to your card or account.
          </p>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            {returnTarget ? (
              <button
                type="button"
                onClick={() => handleManualNavigate(returnTarget)}
                className="inline-flex items-center justify-center rounded-xl bg-[#012153] px-5 py-2.5 text-xs font-bold text-white shadow transition hover:bg-[#071c43] active:scale-95"
              >
                ← Return to {destinationLabel}
              </button>
            ) : (
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-xl bg-[#012153] px-5 py-2.5 text-xs font-bold text-white shadow transition hover:bg-[#071c43] active:scale-95"
              >
                ← Return to Pricing Plans
              </Link>
            )}
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* 3. BANK TRANSFER RECORDED STATE */}
      {status === "bank_pending" && (
        <div className="max-w-lg rounded-3xl border border-blue-200 bg-white p-8 shadow-md">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-2xl text-blue-700">
            📋
          </div>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-blue-800">
            Bank Transfer Recorded
          </span>
          <h2 className="mt-3 text-2xl font-black text-slate-900">
            Payment Reference Registered
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            Your bank transfer transaction reference{" "}
            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{reference}</span>{" "}
            has been securely saved. Our finance department clears incoming deposits promptly.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {returnTarget && (
              <button
                type="button"
                onClick={() => handleManualNavigate(returnTarget)}
                className="inline-flex items-center justify-center rounded-xl bg-[#012153] hover:bg-[#071c43] px-6 py-3 text-xs sm:text-sm font-bold text-white shadow transition active:scale-95"
              >
                Return to {destinationLabel} →
              </button>
            )}
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition active:scale-95"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* 4. SUCCESS STATE (WITH AUTOMATIC REDIRECT BACK) */}
      {status === "success" && (
        <div className="max-w-lg rounded-3xl border border-emerald-200 bg-emerald-50/50 p-8 shadow-md animate-in fade-in">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-3xl text-white shadow-lg shadow-emerald-500/20">
            ✓
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-emerald-800">
            Payment Verified · Subscription Active
          </span>
          <h2 className="mt-3 text-2xl font-black text-slate-900">
            Welcome to BrainLab {planId ? planId.toUpperCase() : "PRO"}!
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Your payment was confirmed. Your unlimited CBT questions, AI tutor quota, and step-by-step master solutions are now unlocked.
          </p>

          {/* Redirection banner if returning to where user was */}
          {returnTarget && (
            <div className="mt-5 rounded-2xl border-2 border-indigo-200 bg-indigo-50/90 p-4 text-center">
              <p className="text-xs font-bold text-indigo-950">
                Returning you to <span className="font-black text-indigo-700">{destinationLabel}</span> in{" "}
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 font-mono text-xs font-black text-white">
                  {countdown}
                </span>{" "}
                seconds...
              </p>
              <button
                type="button"
                onClick={() => handleManualNavigate(returnTarget)}
                className="mt-3 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-xs font-black text-white shadow-md shadow-indigo-600/20 transition hover:from-indigo-700 hover:to-purple-700 active:scale-95"
              >
                Continue to {destinationLabel} Now →
              </button>
            </div>
          )}

          {reference && (
            <div className="mt-4">
              <Link
                href={`/account/receipt/${encodeURIComponent(reference)}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-300 bg-white px-5 py-2.5 text-xs font-bold text-blue-900 shadow-sm transition hover:bg-blue-50 active:scale-95"
              >
                📄 Download Official Payment Receipt (PDF)
              </Link>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl bg-[#012153] hover:bg-[#071c43] px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-sm transition active:scale-95"
            >
              Go to My Dashboard →
            </Link>
            <Link
              href="/learn"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition active:scale-95"
            >
              Explore Learning Hub
            </Link>
          </div>
        </div>
      )}

      {/* 5. ERROR STATE */}
      {status === "error" && (
        <div className="max-w-md rounded-3xl border border-rose-200 bg-rose-50/60 p-8 shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-500 text-2xl text-white">
            ✕
          </div>
          <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-rose-800">
            Verification Issue
          </span>
          <h2 className="mt-3 text-xl font-bold text-slate-900">Could Not Verify Payment</h2>
          <p className="mt-2 text-sm text-slate-600">
            {errorMessage || "We were unable to confirm this transaction. If you were debited, your subscription will activate automatically once the gateway webhook delivers."}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-slate-800 active:scale-95"
            >
              Retry Verification
            </button>
            <Link
              href="/support"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95"
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
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <main className="flex-1 py-12">
        <Suspense fallback={<div className="p-12 text-center text-sm text-slate-500">Loading payment details...</div>}>
          <SubscriptionCallbackContent />
        </Suspense>
      </main>
    </div>
  );
}
