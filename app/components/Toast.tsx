"use client";

import React, { useEffect, useState } from "react";
import { TOAST_EVENT, type ToastMessage } from "../lib/toast";

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<ToastMessage>;
      if (customEvent.detail) {
        const item = customEvent.detail;
        setToasts((prev) => [...prev.slice(-4), item]); // Keep at most 5

        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== item.id));
        }, item.duration || 3500);
      }
    };

    window.addEventListener(TOAST_EVENT, handleToast);
    return () => window.removeEventListener(TOAST_EVENT, handleToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((t) => {
        const isSuccess = t.type === "success";
        const isError = t.type === "error";
        const isWarning = t.type === "warning";

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl p-4 shadow-xl border backdrop-blur-md transition-all duration-300 transform translate-y-0 ${
              isSuccess
                ? "bg-slate-900/95 text-white border-emerald-500/40 shadow-emerald-950/20"
                : isError
                ? "bg-slate-900/95 text-white border-rose-500/40 shadow-rose-950/20"
                : isWarning
                ? "bg-slate-900/95 text-white border-amber-500/40 shadow-amber-950/20"
                : "bg-slate-900/95 text-white border-blue-500/40 shadow-blue-950/20"
            }`}
          >
            <span className="text-lg shrink-0 mt-0.5">
              {isSuccess ? "✅" : isError ? "❌" : isWarning ? "⚠️" : "ℹ️"}
            </span>

            <div className="flex-1 min-w-0">
              {t.title && <h4 className="text-xs font-black tracking-wide">{t.title}</h4>}
              <p className="text-xs text-slate-200 leading-snug">{t.message}</p>
            </div>

            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="text-slate-400 hover:text-white transition text-xs font-bold shrink-0 ml-1"
              aria-label="Close notification"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
