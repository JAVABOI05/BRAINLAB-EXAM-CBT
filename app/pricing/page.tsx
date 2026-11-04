"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";
import {
  getSubscriptionPlans,
  validateCoupon,
  DEFAULT_PLANS,
  type SubscriptionPlan,
} from "../lib/platformConfig";
import { isCurrentUserAdmin } from "../lib/subscriptionEntitlements";

type UserSubscription = {
  plan_id: string;
  status: string;
  current_period_end: string;
};

type PaymentProviderKey = "paystack" | "flutterwave" | "bank_transfer" | "bachs";

function sanitizeRedirect(target: string | null | undefined): string {
  if (!target || typeof target !== "string") return "";
  const trimmed = target.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.startsWith("/\\")) {
    return trimmed;
  }
  return "";
}

function PricingContent() {
  const searchParams = useSearchParams();
  const rawRedirect = sanitizeRedirect(
    searchParams.get("redirect") ||
    searchParams.get("returnUrl") ||
    searchParams.get("next") ||
    ""
  );

  const [returnUrl, setReturnUrl] = useState<string>("");
  const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_PLANS);
  const [activeSub, setActiveSub] = useState<UserSubscription | null>(null);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");

  // Checkout Modal State
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProviderKey>("paystack");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountKobo: number;
    finalPriceKobo: number;
  } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [initiatingPayment, setInitiatingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  useEffect(() => {
    let active = true;

    // 1. Resolve and persist returnUrl in session storage
    if (rawRedirect) {
      setReturnUrl(rawRedirect);
      try {
        sessionStorage.setItem("bl_payment_return_url", rawRedirect);
      } catch {
        // ignore
      }
    } else if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("bl_payment_return_url");
        if (stored) setReturnUrl(stored);
      } catch {
        // ignore
      }
    }

    async function loadData() {
      try {
        const loadedPlans = await getSubscriptionPlans();
        if (!active) return;
        if (loadedPlans && loadedPlans.length > 0) {
          setPlans(loadedPlans.filter((p) => p.is_active));
        }

        // Check user session
        const { data: auth } = await supabase.auth.getUser();
        if (auth?.user) {
          setUser(auth.user);

          // Check if user is Super Admin or Admin
          const adminCheck = await isCurrentUserAdmin(auth.user.id);
          if (active && adminCheck) {
            setIsAdmin(true);
          }

          const { data: subData } = await supabase
            .from("user_subscriptions")
            .select("plan_id, status, current_period_end")
            .eq("user_id", auth.user.id)
            .eq("status", "active")
            .maybeSingle();

          if (active && subData) {
            setActiveSub(subData as UserSubscription);
          }
        }
      } catch {
        // Fallback plans remain active
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [rawRedirect]);

  function handleChoosePlan(plan: SubscriptionPlan) {
    if (isAdmin) {
      // Super admins already possess universal VIP root access
      window.location.href = returnUrl || "/dashboard";
      return;
    }

    if (plan.price_kobo === 0) {
      const target = returnUrl || "/dashboard";
      if (!user) {
        window.location.href = `/login?next=${encodeURIComponent(target)}`;
      } else {
        window.location.href = target;
      }
      return;
    }

    setCheckoutPlan(plan);
    setCouponCode("");
    setAppliedCoupon(null);
    setCouponError("");
    setPaymentError("");
    setSelectedProvider("paystack");
  }

  async function handleValidateCoupon() {
    if (!couponCode.trim() || !checkoutPlan) return;
    setValidatingCoupon(true);
    setCouponError("");

    try {
      const validation = await validateCoupon(
        couponCode.trim(),
        checkoutPlan.id,
        checkoutPlan.price_kobo
      );

      if (!validation.valid) {
        setCouponError(validation.message);
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon({
          code: validation.campaign?.code || couponCode.trim().toUpperCase(),
          discountKobo: validation.discount_kobo,
          finalPriceKobo: validation.final_price_kobo,
        });
      }
    } catch {
      setCouponError("Could not validate coupon.");
    } finally {
      setValidatingCoupon(false);
    }
  }

  async function handleProceedToPayment() {
    if (!checkoutPlan) return;
    if (!user) {
      const currentFullUrl = window.location.pathname + window.location.search;
      window.location.href = `/login?next=${encodeURIComponent(currentFullUrl)}`;
      return;
    }

    setInitiatingPayment(true);
    setPaymentError("");

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          planId: checkoutPlan.id,
          couponCode: appliedCoupon?.code || undefined,
          provider: selectedProvider,
          returnUrl: returnUrl || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setPaymentError(data.message || data.error || "Failed to initialize payment.");
        setInitiatingPayment(false);
        return;
      }

      if (data.adminBypass) {
        window.location.href = data.redirectUrl || returnUrl || "/dashboard";
        return;
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        setPaymentError("Gateway did not return a valid checkout link.");
        setInitiatingPayment(false);
      }
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Network error during checkout.");
      setInitiatingPayment(false);
    }
  }

  const payableAmountKobo = appliedCoupon
    ? appliedCoupon.finalPriceKobo
    : checkoutPlan
    ? checkoutPlan.price_kobo
    : 0;
  const payableAmountNaira = Math.round(payableAmountKobo / 100);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <main id="main" className="flex-1 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          {/* SUPER ADMIN VIP ACCESS BANNER */}
          {isAdmin && (
            <div className="mb-10 overflow-hidden rounded-3xl border-2 border-amber-300 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-amber-500/15 p-6 sm:p-8 text-slate-950 shadow-xl backdrop-blur-xs animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-slate-950 shadow-sm">
                    👑 Super Administrator · Universal VIP Access
                  </span>
                  <h2 className="mt-3 text-2xl font-black text-slate-950">
                    Universal Root Access Active (Exempt From Payment)
                  </h2>
                  <p className="mt-1.5 max-w-2xl text-xs sm:text-sm leading-relaxed text-slate-700">
                    As an authorized Administrator or Super Admin, you are completely exempt from all subscription charges. You possess unrestricted access to all CBT exam attempts, complete question explanations, step-by-step master workings, AI tutor queries, and live classrooms.
                  </p>
                </div>
                {returnUrl ? (
                  <div className="flex-shrink-0">
                    <Link
                      href={returnUrl}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3.5 text-xs font-black text-white hover:bg-slate-800 shadow-md transition active:scale-95"
                    >
                      ← Return to Where You Were
                    </Link>
                  </div>
                ) : (
                  <div className="flex-shrink-0">
                    <Link
                      href="/admin/dashboard"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3.5 text-xs font-black text-white hover:bg-slate-800 shadow-md transition active:scale-95"
                    >
                      Go to Admin Console →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* User returning from specific page notice */}
          {returnUrl && !isAdmin && (
            <div className="mb-6 flex items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-xs text-indigo-950 shadow-xs">
              <span className="flex items-center gap-2 font-bold">
                <span>⚡</span>
                <span>You will be automatically returned to your previous page after upgrading your plan.</span>
              </span>
              <Link href={returnUrl} className="font-extrabold text-indigo-700 hover:underline">
                Cancel &amp; Return ←
              </Link>
            </div>
          )}

          <div className="text-center">
            <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1 text-xs font-extrabold uppercase tracking-widest text-indigo-900">
              <span className="flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg><span>Transparent Monthly Subscriptions</span></span>
            </span>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Invest in your knowledge. <span className="text-indigo-700">Own your score.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Dynamic monthly plans with no lock-in. Full CBT solutions, question corrections, unlimited practice attempts, and AI Tutor derivations.
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2 text-xs font-bold text-emerald-900 shadow-xs">
              <span className="flex items-center gap-1"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg><span>Instant Tier Activation</span> · Verified via Live Gateways, ATM Cards &amp; Bank Transfer</span>
            </div>

            <div className="mt-4 flex justify-center gap-4 text-xs font-bold text-indigo-700">
              <Link href="/account/rewards" className="hover:underline">
                <span className="flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 12 20 22 4 22 4 12" /><rect width="20" height="5" x="2" y="7" /><line x1="12" x2="12" y1="22" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg><span>View Student Promo Codes</span><span aria-hidden="true">→</span></span>
              </Link>
              <Link href="/account/subscription/refund" className="hover:underline">
                <span className="flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /></svg><span>24-Hour Refund Portal</span><span aria-hidden="true">→</span></span>
              </Link>
            </div>
          </div>

          {error && (
            <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm font-semibold text-red-800" role="alert">
              {error}
            </div>
          )}

          {/* Pricing Grid */}
          <div className="mt-14 grid gap-8 lg:grid-cols-4 sm:grid-cols-2">
            {plans.map((plan) => {
              const isCurrent = activeSub?.plan_id === plan.id;
              const isPopular = plan.id === "plus";

              return (
                <article
                  key={plan.id}
                  className={`relative flex flex-col justify-between rounded-3xl border bg-white p-7 shadow-sm transition hover:shadow-md ${
                    isPopular
                      ? "border-indigo-600 ring-2 ring-indigo-600"
                      : "border-slate-200"
                  }`}
                >
                  {isPopular && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-sm">
                      Most Popular
                    </span>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-extrabold text-slate-950">{plan.name}</h2>
                      {isAdmin ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-900">
                          👑 VIP Admin
                        </span>
                      ) : isCurrent ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                          Current
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 text-xs leading-5 text-slate-500 min-h-[40px]">{plan.description}</p>

                    <div className="mt-6 flex items-baseline gap-1">
                      <span className="text-4xl font-black tracking-tight text-slate-950">
                        ₦{plan.price_naira.toLocaleString()}
                      </span>
                      <span className="text-xs font-bold text-slate-500">/{plan.interval}</span>
                    </div>

                    <div className="mt-6 border-t border-slate-100 pt-6">
                      <p className="text-xs font-black uppercase tracking-wider text-slate-700">What’s included:</p>
                      <ul className="mt-3 space-y-2.5 text-xs text-slate-600">
                        {plan.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={isAdmin}
                      onClick={() => handleChoosePlan(plan)}
                      className={`w-full rounded-xl py-3 text-xs font-extrabold transition active:scale-95 ${
                        isAdmin
                          ? "bg-amber-50 text-amber-800 border border-amber-300 cursor-default"
                          : isCurrent
                          ? "bg-slate-100 text-slate-400 cursor-default"
                          : isPopular
                          ? "bg-indigo-700 text-white hover:bg-indigo-800"
                          : "bg-[#012153] text-white hover:bg-[#0a2f72]"
                      }`}
                    >
                      {isAdmin
                        ? "Universal Access Active (Super Admin)"
                        : isCurrent
                        ? "Current Plan"
                        : plan.price_kobo === 0
                        ? (user ? "Current Free Tier →" : "Get Started Free →")
                        : `Choose ${plan.name} →`}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Checkout Modal */}
          {checkoutPlan && !isAdmin && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-fade-in backdrop-blur-xs">
              <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">
                      Order Summary
                    </span>
                    <h3 className="text-xl font-black text-slate-950">{checkoutPlan.name} Plan</h3>
                  </div>
                  <button
                    onClick={() => setCheckoutPlan(null)}
                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Base Tier Price ({checkoutPlan.interval}):</span>
                    <span className="font-bold text-slate-900">
                      ₦{checkoutPlan.price_naira.toLocaleString()}
                    </span>
                  </div>

                  {appliedCoupon && (
                    <div className="flex justify-between text-xs text-emerald-700 font-semibold bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                      <span>Promo Discount ({appliedCoupon.code}):</span>
                      <span>-₦{(appliedCoupon.discountKobo / 100).toLocaleString()}</span>
                    </div>
                  )}

                  <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
                    <span className="text-sm font-bold text-slate-900">Total Payable:</span>
                    <span className="text-2xl font-black text-indigo-700">
                      ₦{payableAmountNaira.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Promo Code Input */}
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Promo Coupon Code
                  </label>
                  <div className="mt-1.5 flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="e.g. BRAINLAB50"
                      className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono uppercase text-slate-900 focus:border-indigo-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={validatingCoupon || !couponCode.trim()}
                      onClick={handleValidateCoupon}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {validatingCoupon ? "Checking..." : "Apply"}
                    </button>
                  </div>
                  {couponError && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">{couponError}</p>
                  )}
                  {appliedCoupon && (
                    <p className="mt-1 text-xs text-emerald-600 font-bold">
                      ✓ Promo code {appliedCoupon.code} applied!
                    </p>
                  )}
                </div>

                {paymentError && (
                  <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-800 border border-rose-200">
                    {paymentError}
                  </div>
                )}

                {/* Payment Provider Selection */}
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Select Payment Method
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {/* Paystack */}
                    <button
                      type="button"
                      onClick={() => setSelectedProvider("paystack")}
                      className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-all duration-150 active:scale-95 ${
                        selectedProvider === "paystack"
                          ? "border-[#012153] bg-blue-50/80 ring-2 ring-[#012153]/20"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900 flex items-center gap-1.5"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg><span>Paystack</span></span>
                        <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[8px] font-bold text-blue-800">
                          Recommended
                        </span>
                      </div>
                      <span className="mt-0.5 text-[10px] text-slate-500 font-medium">
                        ATM Cards, USSD, Apple Pay
                      </span>
                    </button>

                    {/* Flutterwave */}
                    <button
                      type="button"
                      onClick={() => setSelectedProvider("flutterwave")}
                      className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-all duration-150 active:scale-95 ${
                        selectedProvider === "flutterwave"
                          ? "border-[#012153] bg-blue-50/80 ring-2 ring-[#012153]/20"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900 flex items-center gap-1.5"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M8 12h8" /><path d="M12 8v8" /></svg><span>Flutterwave</span></span>
                      </div>
                      <span className="mt-0.5 text-[10px] text-slate-500 font-medium">
                        Cards &amp; Mobile Money
                      </span>
                    </button>

                    {/* Bank Transfer */}
                    <button
                      type="button"
                      onClick={() => setSelectedProvider("bank_transfer")}
                      className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-all duration-150 active:scale-95 ${
                        selectedProvider === "bank_transfer"
                          ? "border-[#012153] bg-blue-50/80 ring-2 ring-[#012153]/20"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="3" x2="21" y1="22" y2="22" /><line x1="6" x2="6" y1="18" y2="11" /><line x1="10" x2="10" y1="18" y2="11" /><line x1="14" x2="14" y1="18" y2="11" /><line x1="18" x2="18" y1="18" y2="11" /><polygon points="12 2 20 7 4 7" /></svg><span>Bank Transfer</span></span>
                      <span className="mt-0.5 text-[10px] text-slate-500 font-medium">
                        Direct Account Transfer
                      </span>
                    </button>

                    {/* Bachs */}
                    <button
                      type="button"
                      onClick={() => setSelectedProvider("bachs")}
                      className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-all duration-150 active:scale-95 ${
                        selectedProvider === "bachs"
                          ? "border-[#012153] bg-blue-50/80 ring-2 ring-[#012153]/20"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-xs font-black text-slate-900">⚡ Bachs</span>
                      <span className="mt-0.5 text-[10px] text-slate-500 font-medium">
                        Cards, Transfer, USSD
                      </span>
                    </button>
                  </div>
                </div>

                {/* Bank Transfer Details Drawer */}
                {selectedProvider === "bank_transfer" && (
                  <div className="mt-3 rounded-2xl bg-amber-50/90 border border-amber-200 p-4 text-xs text-amber-950">
                    <p className="font-black text-amber-900 uppercase tracking-wider text-[10px]">
                      Official BrainLab Academy Account
                    </p>
                    <div className="mt-2 space-y-1 font-mono text-xs">
                      <p>
                        <span className="text-amber-800 font-sans">Bank:</span>{" "}
                        <strong>Guaranty Trust Bank (GTBank)</strong>
                      </p>
                      <p>
                        <span className="text-amber-800 font-sans">Account Name:</span>{" "}
                        <strong>BrainLab Educational Technologies Ltd</strong>
                      </p>
                      <p>
                        <span className="text-amber-800 font-sans">Account Number:</span>{" "}
                        <strong className="text-sm text-indigo-950">0123456789</strong>
                      </p>
                      <p>
                        <span className="text-amber-800 font-sans">Amount:</span>{" "}
                        <strong>₦{payableAmountNaira.toLocaleString()}</strong>
                      </p>
                    </div>
                    <p className="mt-2 text-[10px] text-amber-800 font-sans">
                      Make the transfer and click below to record your reference for automatic clearance.
                    </p>
                  </div>
                )}

                {/* Policy disclaimers */}
                <div className="mt-4 rounded-2xl bg-blue-50/70 p-3.5 text-[11px] leading-5 text-blue-900 border border-blue-200/60">
                  <p>
                    🛡️ <strong>24-Hour 100% Refund Guarantee:</strong> Full unconditional refund available if requested within 24 hours of payment.
                  </p>
                  <p className="mt-1 text-slate-700">
                    🔒 <strong>Secure Checkout:</strong> Live encryption via 256-bit SSL. Immediate activation on transaction success.
                  </p>
                </div>

                <div className="mt-5 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={initiatingPayment}
                    onClick={handleProceedToPayment}
                    className="w-full rounded-2xl bg-[#012153] hover:bg-[#071c43] py-3.5 text-xs font-extrabold text-white shadow-md transition-all duration-150 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:transform-none"
                  >
                    {initiatingPayment
                      ? `Connecting to Gateway...`
                      : !user
                      ? "Sign In to Complete Upgrade →"
                      : selectedProvider === "bank_transfer"
                      ? "Confirm Bank Transfer & Submit Reference →"
                      : `Proceed with ${
                          selectedProvider === "paystack"
                            ? "Paystack"
                            : selectedProvider === "flutterwave"
                            ? "Flutterwave"
                            : "Bachs"
                        } →`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckoutPlan(null)}
                    className="w-full rounded-xl py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Refund policy & FAQs reminder */}
          <div className="mt-16 rounded-3xl border border-slate-200 bg-white p-8 sm:p-10">
            <h3 className="text-lg font-black text-slate-950">Fair Billing &amp; Refund Guarantee</h3>
            <div className="mt-4 grid gap-6 sm:grid-cols-3 text-xs leading-6 text-slate-600">
              <div>
                <p className="font-bold text-slate-900">24-Hour Review Window</p>
                <p className="mt-1">
                  Students may request a refund within the configured 24-hour window from payment directly in their subscription settings.
                </p>
              </div>
              <div>
                <p className="font-bold text-slate-900">Cancel Anytime</p>
                <p className="mt-1">
                  Subscriptions do not lock you in. Cancelling stops future renewal charges while maintaining access until the end of your billing cycle.
                </p>
              </div>
              <div>
                <p className="font-bold text-slate-900">Instant Access &amp; Security</p>
                <p className="mt-1">
                  All transactions are processed through certified PCI-DSS compliant gateways with 256-bit encryption. Subscriptions activate immediately upon confirmation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm font-bold text-slate-400">Loading pricing plans...</div>}>
      <PricingContent />
    </Suspense>
  );
}
