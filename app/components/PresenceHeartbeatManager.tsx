"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

/**
 * Global background manager that delivers heartbeats to /api/presence
 * whenever an authenticated user is active on BrainLab Academy.
 * Automatically respects the user's "share_online_presence" privacy setting
 * and switches state gracefully with tab focus and document visibility.
 */
export default function PresenceHeartbeatManager() {
  const pathname = usePathname();
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastHeartbeatTimeRef = useRef<number>(0);

  useEffect(() => {
    let active = true;

    async function sendHeartbeat(force = false) {
      if (typeof window === "undefined") return;
      if (document.visibilityState !== "visible" && !force) return;

      const now = Date.now();
      // Throttle: don't pulse more than once every 15 seconds
      if (!force && now - lastHeartbeatTimeRef.current < 15000) return;

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        if (!session || !session.user || !active) return;

        const meta = session.user.user_metadata || {};
        const isVisible = meta.share_online_presence !== false;

        lastHeartbeatTimeRef.current = now;

        await fetch("/api/presence", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            status: isVisible ? "online" : "offline",
            isVisible,
            activityContext: isVisible
              ? `Active on ${getReadablePathContext(pathname || "")}`
              : "Offline",
          }),
        });
      } catch {
        // Silently tolerate offline or network transient interruptions
      }
    }

    // 1. Initial pulse
    void sendHeartbeat(true);

    // 2. Periodic pulse every 45s while user stays on the platform
    heartbeatTimerRef.current = setInterval(() => {
      if (active) void sendHeartbeat();
    }, 45000);

    // 3. Tab visibility and focus handlers
    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void sendHeartbeat(true);
      }
    }

    function onFocus() {
      void sendHeartbeat(true);
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);

    return () => {
      active = false;
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
    };
  }, [pathname]);

  return null;
}

function getReadablePathContext(path: string): string {
  if (!path || path === "/" || path === "/dashboard") return "Learner Dashboard";
  if (path.startsWith("/cbt") || path.startsWith("/exam") || path.startsWith("/self-practice")) return "CBT Practice";
  if (path.startsWith("/messages")) return "Community Messages";
  if (path.startsWith("/arena") || path.startsWith("/challenge-arena")) return "Challenge Arena";
  if (path.startsWith("/learning") || path.startsWith("/learn")) return "Learning Hub";
  if (path.startsWith("/settings")) return "Settings";
  if (path.startsWith("/profile")) return "Learner Profile";
  if (path.startsWith("/tutor") || path.startsWith("/instructor")) return "Tutor Portal";
  if (path.startsWith("/admin")) return "Platform Administration";
  return "BrainLab";
}
