"use client";

import { useEffect, useState, useCallback, useRef, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  isOnline,
  hasPendingOfflineData,
  syncQueuedExam,
  SYNC_EVENT_NAME,
  type SyncState,
} from "../lib/offlineSync";

const subscribeToConnectivity = (callback: () => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
};

const getConnectivitySnapshot = () => isOnline();
const getConnectivityServerSnapshot = () => true;

const subscribeToPendingData = (callback: () => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener(SYNC_EVENT_NAME, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SYNC_EVENT_NAME, callback);
  };
};
const getPendingDataSnapshot = () => hasPendingOfflineData();
const getPendingDataServerSnapshot = () => false;

export default function OfflineSyncManager() {
  const router = useRouter();
  const pathname = usePathname();
  const online = useSyncExternalStore(subscribeToConnectivity, getConnectivitySnapshot, getConnectivityServerSnapshot);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const hasPending = useSyncExternalStore(subscribeToPendingData, getPendingDataSnapshot, getPendingDataServerSnapshot);
  const [dismissed, setDismissed] = useState(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSync = useCallback(async () => {
    if (!isOnline()) return;
    setSyncState("syncing");
    setStatusMessage("Syncing queued exam answers with BrainLab server...");
    const res = await syncQueuedExam();
    if (res.ok) {
      if (res.type === "submitted") {
        setSyncState("synced");
        setStatusMessage("Offline exam submitted successfully!");
        if (pathname === "/exam") {
          setTimeout(() => {
            router.push("/result");
          }, 1200);
        }
      } else if (res.type === "progress") {
        setSyncState("synced");
        setStatusMessage("Cached exam answers synced.");
      } else {
        setSyncState("idle");
      }
    } else {
      setSyncState("error");
      setStatusMessage(res.error || "Sync attempt failed. Will retry automatically.");
    }

    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setSyncState("idle");
    }, 4500);
  }, [pathname, router]);

  useEffect(() => {
    // 1. Connectivity and pending-data state are subscribed external snapshots.

    // 2. Register Service Worker in production/client
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            // Periodically check for SW updates
            reg.addEventListener("updatefound", () => {
              const installing = reg.installing;
              if (installing) {
                installing.addEventListener("statechange", () => {
                  if (installing.state === "installed" && navigator.serviceWorker.controller) {
                    console.log("[PWA] New BrainLab version available.");
                  }
                });
              }
            });
          })
          .catch((err) => {
            console.warn("[PWA] Service Worker registration failed:", err);
          });
      });
    }

    // 3. Online/offline event handlers
    const handleOnline = () => {
      setDismissed(false);
      void triggerSync();
    };

    const handleOffline = () => {
      setDismissed(false);
      setSyncState("offline");
      setStatusMessage("You are offline. Answers & formula sheets are safely cached locally.");
    };

    const handleSyncCustomEvent = (event: Event) => {
      const custom = event as CustomEvent<{ state: SyncState; message?: string }>;
      if (custom.detail) {
        setSyncState(custom.detail.state);
        if (custom.detail.message) {
          setStatusMessage(custom.detail.message);
        }
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener(SYNC_EVENT_NAME, handleSyncCustomEvent);

    // Defer the initial sync until after subscriptions and the first render settle.
    const initialSyncTimer = window.setTimeout(() => {
      if (isOnline() && hasPendingOfflineData()) {
        void triggerSync();
      }
    }, 0);

    return () => {
      window.clearTimeout(initialSyncTimer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(SYNC_EVENT_NAME, handleSyncCustomEvent);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [triggerSync]);

  // If online, idle, and no pending data, keep UI clean
  if (online && syncState === "idle" && !hasPending) {
    return null;
  }

  if (dismissed && online && syncState !== "syncing") {
    return null;
  }

  return (
    <aside
      aria-live="polite"
      aria-label="Network and Offline Sync Status"
      className="fixed bottom-4 left-4 right-4 z-[9999] mx-auto max-w-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 sm:left-auto sm:right-6"
    >
      <div
        className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-md ${
          !online || syncState === "offline"
            ? "border-amber-300/80 bg-amber-950/90 text-amber-100"
            : syncState === "syncing"
            ? "border-blue-300/80 bg-[#012153]/95 text-blue-100"
            : syncState === "synced"
            ? "border-emerald-300/80 bg-emerald-950/95 text-emerald-100"
            : "border-slate-300/80 bg-slate-900/95 text-slate-100"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex-shrink-0 text-xl">
            {!online || syncState === "offline"
              ? "📴"
              : syncState === "syncing"
              ? "🔄"
              : syncState === "synced"
              ? "🟢"
              : "💾"}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wider">
              {!online
                ? "Offline Mode Active"
                : syncState === "syncing"
                ? "Syncing in Progress"
                : syncState === "synced"
                ? "Cloud Sync Complete"
                : hasPending
                ? "Queued Submissions Waiting"
                : "Network Resumed"}
            </p>
            <p className="truncate text-xs opacity-90">
              {statusMessage ||
                (!online
                  ? "Answers & progress saved safely on this device."
                  : hasPending
                  ? "Pending offline answers ready to upload."
                  : "All changes synchronized.")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {online && hasPending && syncState !== "syncing" && (
            <button
              type="button"
              onClick={() => void triggerSync()}
              className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-blue-500 transition"
            >
              Sync Now
            </button>
          )}

          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss offline banner"
            className="rounded-lg p-1 text-xs opacity-70 hover:opacity-100 transition"
          >
            ✕
          </button>
        </div>
      </div>
    </aside>
  );
}
