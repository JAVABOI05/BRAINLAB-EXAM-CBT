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
import { trackEvent } from "../lib/analytics";

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
    trackEvent("enrolment_started", {
      plan_id: plan.id,
      amount_ngn: Math.round(plan.price_kobo / 100),
    });
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

    trackEvent("enrolment_started", {
      plan_id: checkoutPlan.id,
      amount_ngn: payableAmountNaira,
      provider: selectedProvider,
    });
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
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-[#070D18] text-slate-900 dark:text-slate-100 transition-colors">
      <main id="main" className="flex-1 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          {/* SUPER ADMIN VIP ACCESS BANNER */}
          {isAdmin && (
            <div className="mb-10 overflow-hidden rounded-3xl border-2 border-amber-400/40 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-amber-500/15 p-6 sm:p-8 text-slate-950 dark:text-amber-100 shadow-xl backdrop-blur-xs animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-slate-950 shadow-sm">
                    <svg className="h-3.5 w-3.5 text-slate-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span>Super Administrator · Universal VIP Access</span>
                  </span>
                  <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
                    Universal Root Access Active (Exempt From Payment)
                  </h2>
                  <p className="mt-1.5 max-w-2xl text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-amber-200/80">
                    As an authorized Administrator or Super Admin, you are completely exempt from all subscription charges. You possess unrestricted access to all CBT exam attempts, complete question explanations, step-by-step master workings, AI tutor queries, and live classrooms.
                  </p>
                </div>
                {returnUrl ? (
                  <div className="flex-shrink-0">
                    <Link
                      href={returnUrl}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 dark:bg-amber-400 px-6 py-3.5 text-xs font-black text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-amber-300 shadow-md transition active:scale-95"
                    >
                      ← Return to Where You Were
                    </Link>
                  </div>
                ) : (
                  <div className="flex-shrink-0">
                    <Link
                      href="/admin/dashboard"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 dark:bg-amber-400 px-6 py-3.5 text-xs font-black text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-amber-300 shadow-md transition active:scale-95"
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
            <div className="mb-6 flex items-center justify-between rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/80 dark:bg-blue-950/40 px-4 py-3 text-xs text-blue-950 dark:text-blue-200 shadow-xs">
              <span className="flex items-center gap-2 font-bold">
                <svg className="h-4 w-4 text-blue-600 dark:text-cyan-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <span>You will be automatically returned to your previous page after upgrading your plan.</span>
              </span>
              <Link href={returnUrl} className="font-extrabold text-blue-700 dark:text-cyan-400 hover:underline">
                Cancel &amp; Return ←
              </Link>
            </div>
          )}

          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 px-3.5 py-1 text-xs font-extrabold uppercase tracking-widest text-blue-900 dark:text-cyan-300">
              <svg className="h-3.5 w-3.5 text-blue-600 dark:text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Two Clear Access Categories</span>
            </span>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
              Independent Learning for Everyone. <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
                Guided Structure in Apex Cohort.
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
              BrainLab is an educational platform, not a paywalled service. Every registered student learns free; Apex Cohort delivers intensive live tutorials, dedicated tutors, and continuous academic accountability.
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-4 py-2 text-xs font-bold text-emerald-900 dark:text-emerald-300 shadow-xs">
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Free Public Access for Every Registered Learner (₦0)</span>
              </span>
            </div>
          </div>

          {error && (
            <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm font-semibold text-red-800" role="alert">
              {error}
            </div>
          )}

          {/* Two Access Categories Direct Grid */}
          <div className="mt-14 grid gap-8 md:grid-cols-2 max-w-4xl mx-auto items-stretch">
            {/* 1. Public (₦0, Free) */}
            <article className="relative flex flex-col justify-between rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 mb-4">
                  OPEN TO EVERY LEARNER
                </div>
                <h2 className="text-2xl font-black text-slate-950 dark:text-white">Public Access</h2>
                <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Comprehensive self-directed practice tools and revision resources for every registered student.
                </p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-black tracking-tight text-slate-950 dark:text-white">₦0</span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">/ free forever</span>
                </div>

                <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">What’s included:</p>
                  <ul className="mt-3 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                      <span><strong>Full CBT Practice:</strong> Unlimited mock exams with JAMB 8-key interface &amp; timing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                      <span><strong>Question Bank:</strong> Complete past question library and worked solutions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                      <span><strong>AI Tutor:</strong> Generous fair-use interactive study assistance</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                      <span><strong>Learning Hub:</strong> Open curriculum syllabus notes and video resources</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                      <span><strong>Competition Arena:</strong> Live 1v1 duels, challenges, and national leaderboards</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                      <span><strong>STEM Studio:</strong> Public 3D interactive molecular and science viewers</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Link
                  href="/cbt"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white py-3.5 text-xs font-extrabold transition"
                >
                  Get Started, It&apos;s Free →
                </Link>
              </div>
            </article>

            {/* 2. Apex Cohort (Intensive JAMB Preparatory Class) */}
            {(() => {
              const isEnrolled = activeSub?.status === "active";
              const WHATSAPP_COHORT_URL = "https://wa.me/2349071988887?text=Hello%20BrainLab%2C%20I%20am%20coming%20from%20the%20website%20and%20would%20like%20to%20make%20enquiries%20about%20the%20intensive%20Apex%20Cohort%20JAMB%20Preparatory%20Class.";

              return (
                <article className="relative flex flex-col justify-between rounded-3xl border-2 border-indigo-600 dark:border-indigo-500 bg-white dark:bg-slate-900 p-8 shadow-xl">
                  <span className="absolute -top-3.5 right-6 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-sm">
                    INTENSIVE PREPARATORY CLASS
                  </span>

                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mb-4">
                      GUIDED TUTORIAL TRACK
                    </div>
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-black text-slate-950 dark:text-white">Apex Cohort</h2>
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 border border-amber-300/40">
                          <svg className="h-3 w-3 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          <span>VIP Admin</span>
                        </span>
                      ) : isEnrolled ? (
                        <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                          Active Enrolment
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      Our intensive BrainLab JAMB preparatory class featuring live lectures, dedicated subject mentors, and continuous academic accountability.
                    </p>

                    <div className="mt-6 flex flex-col">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 dark:text-white">
                          Admissions Open
                        </span>
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                          Free Enquiry
                        </span>
                      </div>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                        Intensive JAMB Preparatory Class · Direct Mentor Guidance
                      </span>
                    </div>

                    <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
                      <p className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300">Apex Cohort Advantages:</p>
                      <ul className="mt-3 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                        <li className="flex items-start gap-2">
                          <svg className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span><strong>Live Intensive Classes:</strong> Scheduled subject-by-subject master lectures</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span><strong>Dedicated Tutors:</strong> Personal academic mentorship and direct homework guidance</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span><strong>Assigned Weekly Roadmap:</strong> Structured milestones and scheduled assessments</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span><strong>Special Cohort Mocks:</strong> Monitored practice with detailed tutor intervention</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span><strong>Full Lesson Library:</strong> Complete recorded video archive and session notes</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span><strong>Enhanced AI Tutor:</strong> Priority quota and deep diagnostic breakdowns</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2.5">
                    {isAdmin ? (
                      <div className="w-full rounded-xl py-3.5 text-xs font-extrabold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-center">
                        Universal Access Active (Super Admin)
                      </div>
                    ) : isEnrolled ? (
                      <Link
                        href="/classroom"
                        className="w-full rounded-xl py-3.5 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white text-center shadow-md transition"
                      >
                        Enter Cohort Classroom →
                      </Link>
                    ) : (
                      <a
                        href={WHATSAPP_COHORT_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-900/20 transition active:scale-95 cursor-pointer"
                      >
                        <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        <span>Enquire on WhatsApp (Apex Cohort) →</span>
                      </a>
                    )}
                    <Link
                      href="/cbt"
                      className="text-center text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition py-1"
                    >
                      Or start 100% free self-practice in CBT Simulator →
                    </Link>
                  </div>
                </article>
              );
            })()}
          </div>

          {/* Checkout Modal */}
          {checkoutPlan && !isAdmin && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-fade-in backdrop-blur-xs">
              <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">
                      Apex Cohort Enrolment
                    </span>
                    <h3 className="text-xl font-black text-slate-950">Apex Cohort Programme Enrolment</h3>
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
                    <span>Programme Track Enrolment Fee:</span>
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
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <svg className="h-3 w-3 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                        <span>Bachs</span>
                      </span>
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
                  <p className="flex items-start gap-1.5">
                    <svg className="h-3.5 w-3.5 text-blue-700 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span><strong>24-Hour 100% Refund Guarantee:</strong> Full unconditional refund available if requested within 24 hours of payment.</span>
                  </p>
                  <p className="mt-1.5 flex items-start gap-1.5 text-slate-700">
                    <svg className="h-3.5 w-3.5 text-slate-700 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span><strong>Secure Checkout:</strong> Live encryption via 256-bit SSL. Immediate activation on transaction success.</span>
                  </p>
                </div>

                <div className="mt-5 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={initiatingPayment}
                    onClick={handleProceedToPayment}
                    className="w-full rounded-2xl bg-[#012153] hover:bg-[#071c43] py-3.5 text-xs font-extrabold text-white shadow-md transition-all duration-150 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:transform-none cursor-pointer"
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
                    className="w-full rounded-xl py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition active:scale-95 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Refund policy & FAQs reminder */}
          <div className="mt-16 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-10 shadow-sm">
            <h3 className="text-lg font-black text-slate-950 dark:text-white">Fair Billing &amp; Refund Policy <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded ml-2">[PENDING FORMAL APPROVAL]</span></h3>
            <div className="mt-4 grid gap-6 sm:grid-cols-3 text-xs leading-6 text-slate-600 dark:text-slate-300">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">24-Hour Review Window</p>
                <p className="mt-1">
                  Students may request a refund within the configured 24-hour window from payment directly in their subscription settings.
                </p>
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Cancel Anytime</p>
                <p className="mt-1">
                  Subscriptions do not lock you in. Cancelling stops future renewal charges while maintaining access until the end of your billing cycle.
                </p>
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Instant Access &amp; Security</p>
                <p className="mt-1">
                  All transactions are processed through certified PCI-DSS compliant gateways with 256-bit encryption. Subscriptions activate immediately upon confirmation.
                </p>
              </div>
            </div>
          </div>

          {/* Institutional & Schools quiet off-ramp */}
          <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
            <span>Are you a school administrator or educator looking for cohort deployment? </span>
            <Link href="/schools" className="font-semibold text-blue-600 dark:text-cyan-400 hover:underline">
              Explore School &amp; Institutional Solutions →
            </Link>
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
