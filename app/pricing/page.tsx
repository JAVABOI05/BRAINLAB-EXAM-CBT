"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getSubscriptionPlans, validateCoupon, type SubscriptionPlan } from "../lib/platformConfig";

type UserSubscription = {
  plan_id: string;
  status: string;
  current_period_end: string;
};

export default function PricingPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [activeSub, setActiveSub] = useState<UserSubscription | null>(null);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Checkout Modal State
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<"bachs" | "paystack">("bachs");
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

    async function loadPlans() {
      setLoading(true);
      setError("");

      try {
        const loadedPlans = await getSubscriptionPlans();
        if (!active) return;
        setPlans(loadedPlans.filter((p) => p.is_active));

        // Check if user is signed in and has active sub
        const { data: auth } = await supabase.auth.getUser();
        if (auth.user) {
          setUser(auth.user);
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
        if (active) setError("Failed to connect to plan configuration.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPlans();

    return () => {
      active = false;
    };
  }, []);

  function openCheckout(plan: SubscriptionPlan) {
    if (plan.price_kobo === 0) return;
    setCheckoutPlan(plan);
    setCouponCode("");
    setAppliedCoupon(null);
    setCouponError("");
    setPaymentError("");
  }

  async function handleValidateCoupon() {
    if (!couponCode.trim() || !checkoutPlan) return;
    setValidatingCoupon(true);
    setCouponError("");

    try {
      // First attempt database-backed validation via Central Configuration Engine
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
      window.location.href = `/login?next=/pricing`;
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
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setPaymentError(data.message || data.error || "Failed to initialize payment.");
        setInitiatingPayment(false);
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

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <main id="main" className="flex-1 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="text-center">
            <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1 text-xs font-extrabold uppercase tracking-widest text-indigo-900">
              ⚡ Transparent Monthly Subscriptions
            </span>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Invest in your knowledge. <span className="text-indigo-700">Own your score.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Dynamic, monthly plans with no lock-in. All pricing and feature quotas are centrally managed and verified on the server.
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-xs font-semibold text-amber-900">
              <span>🛡️ Gateway Status: Test Mode Only · Real cards will not be charged.</span>
            </div>

            <div className="mt-4 flex justify-center gap-4 text-xs font-bold text-indigo-700">
              <Link href="/account/rewards" className="hover:underline">
                🎁 View Student Promo Codes →
              </Link>
              <Link href="/account/subscription/refund" className="hover:underline">
                🛡️ 24-Hour Refund Portal →
              </Link>
            </div>
          </div>

          {error && (
            <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm font-semibold text-red-800" role="alert">
              {error}
            </div>
          )}

          {loading ? (
            <div className="mt-14 text-center text-sm font-semibold text-slate-500">
              Loading dynamic plan configuration…
            </div>
          ) : (
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
                        {isCurrent && (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                            Current
                          </span>
                        )}
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
                        onClick={() => openCheckout(plan)}
                        className={`w-full rounded-xl py-3 text-xs font-extrabold transition ${
                          isCurrent
                            ? "bg-slate-100 text-slate-400 cursor-default"
                            : isPopular
                            ? "bg-indigo-700 text-white hover:bg-indigo-800"
                            : "bg-[#012153] text-white hover:bg-[#0a2f72]"
                        }`}
                      >
                        {isCurrent
                          ? "Current Plan"
                          : plan.price_kobo === 0
                          ? "Active by Default"
                          : `Choose ${plan.name} →`}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Checkout Modal */}
          {checkoutPlan && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
              <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
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
                    <div className="flex justify-between text-xs text-emerald-700 font-semibold bg-emerald-50 p-2 rounded-lg">
                      <span>Promo Discount ({appliedCoupon.code}):</span>
                      <span>-₦{(appliedCoupon.discountKobo / 100).toLocaleString()}</span>
                    </div>
                  )}

                  <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
                    <span className="text-sm font-bold text-slate-900">Total Payable:</span>
                    <span className="text-2xl font-black text-indigo-700">
                      ₦
                      {(
                        (appliedCoupon
                          ? appliedCoupon.finalPriceKobo
                          : checkoutPlan.price_kobo) / 100
                      ).toLocaleString()}
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
                      placeholder="e.g. BRAINLAUNCH20"
                      className="flex-1 rounded-xl border border-slate-300 p-2.5 text-xs font-mono font-bold uppercase focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={validatingCoupon || !couponCode.trim()}
                      onClick={handleValidateCoupon}
                      className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
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
                    Payment Gateway
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedProvider("bachs")}
                      className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-all duration-150 active:scale-95 ${
                        selectedProvider === "bachs"
                          ? "border-[#012153] bg-blue-50/80 ring-2 ring-[#012153]/20"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900">⚡ Bachs</span>
                        <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-800">
                          Recommended
                        </span>
                      </div>
                      <span className="mt-0.5 text-[10px] text-slate-500 font-medium">
                        Cards, Transfer, USSD
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedProvider("paystack")}
                      className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-all duration-150 active:scale-95 ${
                        selectedProvider === "paystack"
                          ? "border-[#012153] bg-blue-50/80 ring-2 ring-[#012153]/20"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-xs font-black text-slate-900">💳 Paystack</span>
                      <span className="mt-0.5 text-[10px] text-slate-500 font-medium">
                        Debit Cards &amp; Bank
                      </span>
                    </button>
                  </div>
                </div>

                {/* Policy disclaimers */}
                <div className="mt-5 rounded-2xl bg-blue-50/70 p-3.5 text-[11px] leading-5 text-blue-900 border border-blue-200/60">
                  <p>
                    🛡️ <strong>24-Hour 100% Refund Guarantee:</strong> Full unconditional refund available if requested within 24 hours of payment.
                  </p>
                  <p className="mt-1 text-amber-900">
                    🧪 <strong>Active Gateway:</strong> {selectedProvider === "bachs" ? "Bachs Checkout" : "Paystack"} (Secured via 256-bit encryption).
                  </p>
                </div>

                <div className="mt-6 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={initiatingPayment}
                    onClick={handleProceedToPayment}
                    className="w-full rounded-2xl bg-[#012153] hover:bg-[#071c43] py-3.5 text-xs font-extrabold text-white shadow-md transition-all duration-150 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:transform-none"
                  >
                    {initiatingPayment
                      ? `Connecting to ${selectedProvider === "bachs" ? "Bachs" : "Paystack"}...`
                      : !user
                      ? "Sign In to Proceed →"
                      : `Proceed with ${selectedProvider === "bachs" ? "Bachs" : "Paystack"} →`}
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
                <p className="font-bold text-slate-900">Test Mode Safety</p>
                <p className="mt-1">
                  Real card payments are currently locked in test mode. No student will be billed real funds without prior announcement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
