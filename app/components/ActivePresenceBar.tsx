"use client";

import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/app/lib/supabase";
import OnlineRosterDrawer, { type ActiveUserPresence } from "./OnlineRosterDrawer";

interface ActivePresenceBarProps {
  activityContext?: string;
  currentClassId?: string;
  variant?: "pill" | "banner";
  className?: string;
}

export default function ActivePresenceBar({
  activityContext = "Exploring BrainLab",
  currentClassId,
  variant = "pill",
  className = "",
}: ActivePresenceBarProps) {
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [inClassCount, setInClassCount] = useState<number>(0);
  const [tutorCount, setTutorCount] = useState<number>(0);
  const [activeUsers, setActiveUsers] = useState<ActiveUserPresence[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPresenceAndHeartbeat() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        const accessToken = sessionData?.session?.access_token;
        if (user && accessToken && active) {
          setCurrentUserId(user.id);

          // 1. Send initial heartbeat
          await fetch("/api/presence", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              status: currentClassId ? "in_class" : "online",
              currentClassId: currentClassId || null,
              activityContext,
            }),
          });
        }

        // 2. Fetch active community roster
        const res = await fetch("/api/presence");
        const json = await res.json();
        if (active && res.ok && json.success) {
          setOnlineCount(json.onlineCount || 0);
          setInClassCount(json.inClassCount || 0);
          setTutorCount(json.tutorCount || 0);
          setActiveUsers(json.activeUsers || []);
        }
      } catch (err) {
        console.warn("Presence check failed:", err);
      }
    }

    void loadPresenceAndHeartbeat();

    // Set recurring 45s heartbeat and roster poll
    heartbeatTimerRef.current = setInterval(() => {
      void loadPresenceAndHeartbeat();
    }, 45000);

    return () => {
      active = false;
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    };
  }, [activityContext, currentClassId]);

  if (onlineCount === 0) return null;

  if (variant === "banner") {
    return (
      <>
        <div
          onClick={() => setIsDrawerOpen(true)}
          className={`flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-2.5 text-xs text-emerald-200 cursor-pointer hover:bg-emerald-950/30 transition shadow-sm ${className}`}
        >
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-extrabold text-white">Live Learning Network:</span>
            <span>
              {onlineCount} active learners ({tutorCount} {tutorCount === 1 ? "tutor" : "tutors"} online)
            </span>
          </div>
          <span className="font-bold underline text-emerald-300">View Roster →</span>
        </div>

        <OnlineRosterDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          users={activeUsers}
          onlineCount={onlineCount}
          inClassCount={inClassCount}
          tutorCount={tutorCount}
          currentUserId={currentUserId}
        />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsDrawerOpen(true)}
        className={`inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-950/30 px-3 py-1.5 text-xs font-bold text-emerald-300 shadow-sm hover:bg-emerald-900/40 transition active-press ${className}`}
        title="Click to see who is online"
      >
        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
        <span>
          {onlineCount} Online {tutorCount > 0 && `(${tutorCount} ${tutorCount === 1 ? "Tutor" : "Tutors"})`}
        </span>
      </button>

      <OnlineRosterDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        users={activeUsers}
        onlineCount={onlineCount}
        inClassCount={inClassCount}
        tutorCount={tutorCount}
        currentUserId={currentUserId}
      />
    </>
  );
}
