"use client";

import React, { useEffect, useState } from "react";
import {
  isNotificationSupported,
  getDeviceNotificationPermission,
  requestDeviceNotificationPermission,
  sendWelcomeTestAlert,
  type DevicePermissionStatus,
} from "../lib/clientNotifications";

interface DeviceNotificationPromptProps {
  variant?: "floating" | "banner";
  className?: string;
  onPermissionChange?: (status: DevicePermissionStatus) => void;
}

export default function DeviceNotificationPrompt({
  variant = "floating",
  className = "",
  onPermissionChange,
}: DeviceNotificationPromptProps) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isNotificationSupported()) return;

    const currentPerm = getDeviceNotificationPermission();
    if (currentPerm !== "default") return;

    // Check if dismissed in the last 4 days
    try {
      const dismissedAt = localStorage.getItem("brainlab_notif_prompt_dismissed_at");
      if (dismissedAt) {
        const timeDiff = Date.now() - new Date(dismissedAt).getTime();
        const fourDays = 4 * 24 * 60 * 60 * 1000;
        if (timeDiff < fourDays) return;
      }
    } catch {}

    // Delay slight appearance so page renders first
    const timer = setTimeout(() => {
      setVisible(true);
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  const handleEnable = async () => {
    setBusy(true);
    const { granted, status } = await requestDeviceNotificationPermission();
    onPermissionChange?.(status);

    if (granted) {
      setSuccess(true);
      await sendWelcomeTestAlert();
      setTimeout(() => {
        setVisible(false);
      }, 2500);
    } else {
      // If user clicked Block or Cancel
      handleDismiss();
    }
    setBusy(false);
  };

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem("brainlab_notif_prompt_dismissed_at", new Date().toISOString());
    } catch {}
  };

  if (!visible) return null;

  if (variant === "banner") {
    return (
      <aside aria-label="Notification subscription" className={`rounded-2xl border border-blue-500/30 bg-blue-950/40 p-4 backdrop-blur-md shadow-lg ${className}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/40 text-xl text-blue-300">
              🔔
            </span>
            <div>
              <p className="text-xs font-black text-white">Turn on Live Class &amp; Streak Alerts</p>
              <p className="text-[11px] text-slate-300">
                Get alerted when tutors start revision sessions and protect your study streak flame.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {success ? (
              <span className="text-xs font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-xl">
                ✓ Notifications Active!
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/5 transition"
                >
                  Maybe Later
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleEnable}
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 px-3.5 py-1.5 text-xs font-black text-white shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  {busy ? "Activating…" : "Turn On Alerts"}
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    );
  }

  // Floating Bottom Toast Variant (Default)
  return (
    <aside aria-label="Notification subscription" className="fixed bottom-5 right-5 z-50 max-w-sm sm:max-w-md w-[calc(100%-2.5rem)] animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="rounded-3xl border border-blue-500/40 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-lg text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xl text-white shadow-md">
              🔔
            </span>
            <div>
              <h3 className="text-sm font-black text-white tracking-tight">
                Never Miss a Class or Streak
              </h3>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                Allow device notifications on this screen to get alerts when your tutor goes live and to protect your daily UTME revision flame.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss notification prompt"
            className="text-slate-400 hover:text-white text-lg font-bold p-1 leading-none transition"
          >
            ×
          </button>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          {success ? (
            <div className="w-full text-center py-1">
              <span className="text-xs font-black text-emerald-400 flex items-center justify-center gap-1.5">
                <span>✓</span>
                <span>Device Notifications Enabled!</span>
              </span>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 transition"
              >
                Maybe Later
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleEnable}
                className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-black text-white shadow-md shadow-blue-600/30 transition active:scale-95 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <span>🔔</span>
                <span>{busy ? "Allowing…" : "Enable Alerts"}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
