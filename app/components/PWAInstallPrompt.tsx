"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function isAppleMobileDevice() {
  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export default function PWAInstallPrompt() {
  const pathname = usePathname();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isAppleMobile, setIsAppleMobile] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    try {
      if (window.sessionStorage.getItem("brainlab-install-prompt-dismissed") === "1") {
        setDismissed(true);
      }
    } catch {
      // The install experience remains available when storage is restricted.
    }

    setIsAppleMobile(isAppleMobileDevice());

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstallPrompt(null);
      setShowInstructions(false);
      setDismissed(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (
    dismissed ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/exam") ||
    pathname.startsWith("/instructions") ||
    pathname.startsWith("/classroom") ||
    pathname.startsWith("/auth")
  ) {
    return null;
  }

  const canOfferInstall = Boolean(installPrompt) || isAppleMobile;

  function dismiss() {
    setDismissed(true);
    try {
      window.sessionStorage.setItem("brainlab-install-prompt-dismissed", "1");
    } catch {
      // Ignore storage restrictions.
    }
  }

  async function install() {
    if (!installPrompt) {
      setShowInstructions(true);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice.outcome === "accepted") setDismissed(true);
  }

  if (!canOfferInstall) return null;

  return (
    <>
      <aside
        className="fixed inset-x-3 bottom-3 z-[60] mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-blue-200 bg-white p-3 shadow-[0_12px_40px_rgba(15,23,42,0.22)] dark:border-blue-900 dark:bg-[#0B1536]"
        aria-label="Install BrainLab Academy"
      >
        <img src="/icon-192.png" alt="" width="42" height="42" className="h-[42px] w-[42px] shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-slate-950 dark:text-white">Get the BrainLab app</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Add BrainLab Academy to your Home Screen for quick access.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void install()}
          className="shrink-0 rounded-xl bg-[#1356E8] px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
        >
          Install
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss app installation prompt"
          className="shrink-0 rounded-lg px-1.5 py-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          ✕
        </button>
      </aside>

      {showInstructions && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/60 p-3 sm:items-center"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowInstructions(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="brainlab-install-title"
            className="w-full max-w-md rounded-2xl bg-white p-5 text-slate-900 shadow-2xl dark:bg-[#0B1536] dark:text-white"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-cyan-300">iPhone installation</p>
                <h2 id="brainlab-install-title" className="mt-1 text-lg font-extrabold">Add BrainLab to your Home Screen</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                aria-label="Close installation instructions"
                className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>
            <ol className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-200">
              <li><strong>1.</strong> Open this website in Safari.</li>
              <li><strong>2.</strong> Tap the Share button at the bottom of the screen.</li>
              <li><strong>3.</strong> Choose <strong>Add to Home Screen</strong>.</li>
              <li><strong>4.</strong> If shown, turn on <strong>Open as Web App</strong>, then tap Add.</li>
            </ol>
            <p className="mt-4 rounded-xl bg-blue-50 p-3 text-xs text-blue-900 dark:bg-blue-950/60 dark:text-blue-100">
              The BrainLab icon will appear on your Home Screen. Open it from there whenever you want to study.
            </p>
            <button
              type="button"
              onClick={() => setShowInstructions(false)}
              className="mt-4 w-full rounded-xl bg-[#1356E8] px-4 py-3 text-sm font-bold text-white"
            >
              Got it
            </button>
          </section>
        </div>
      )}
    </>
  );
}
