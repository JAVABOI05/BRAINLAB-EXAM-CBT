"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isCurrentUserAdmin } from "../lib/subscriptionEntitlements";

interface TierGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureTitle?: string;
  featureDescription?: string;
  requiredTierName?: string;
  currentPlanName?: string;
  redirectUrl?: string;
}

export default function TierGateModal({
  isOpen,
  onClose,
  featureTitle = "Apex Cohort Intensive Tutorial",
  featureDescription = "This live guided session is part of the Apex Cohort educational programme. Enrol to access structured timetables, dedicated tutor guidance, and weekly assignments.",
  requiredTierName = "Apex Cohort",
  currentPlanName = "Public Learner",
  redirectUrl = "/apex",
}: TierGateModalProps) {
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    let active = true;
    isCurrentUserAdmin().then((admin) => {
      if (active && admin) {
        setIsAdminUser(true);
        onClose(); // Automatically dismiss for Super Admins / Admins
      }
    });

    return () => {
      active = false;
    };
  }, [onClose]);

  // Super Admins and Admins are NEVER shown gating modals
  if (!isOpen || isAdminUser) return null;

  const targetHref = redirectUrl || "/apex";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-indigo-200 bg-white p-6 shadow-2xl sm:p-8">
        {/* Top Decorative Header */}
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-indigo-900">
            <svg className="h-3.5 w-3.5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg><span>Apex Cohort Programme</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-3xl text-white shadow-lg shadow-indigo-600/30">
            🏛️
          </div>

          <h3 className="mt-4 text-2xl font-black text-slate-950">
            {featureTitle}
          </h3>

          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {featureDescription}
          </p>

          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3.5 text-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span>Your Current Category:</span>
              <span className="font-extrabold text-slate-800">{currentPlanName}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-indigo-700 font-bold border-t border-slate-200/60 pt-1.5">
              <span>Programme Track:</span>
              <span className="font-black text-indigo-900">{requiredTierName}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-slate-300 py-3 text-xs font-extrabold text-slate-700 hover:bg-slate-50 transition"
          >
            Continue Independent Learning
          </button>
          <Link
            href={targetHref}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-center text-xs font-black text-white hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-600/25 transition"
          >
            Discover Apex Cohort →
          </Link>
        </div>
      </div>
    </div>
  );
}
