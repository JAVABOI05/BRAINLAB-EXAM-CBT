"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import BrandFooter from "./BrandFooter";
import BrandHeader from "./BrandHeader";
import GlobalLearnerToolbar from "./GlobalLearnerToolbar";
import ToastContainer from "./Toast";
import OfflineSyncManager from "./OfflineSyncManager";
import GlobalAnnouncementBanner from "./GlobalAnnouncementBanner";

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const isActiveExam = pathname === "/exam" || pathname.startsWith("/exam/");
  const isInstructions = pathname === "/instructions" || pathname.startsWith("/instructions/");
  // Active live video room or studio has its own dedicated full-viewport controls.
  // The classroom lobby (/classroom) retains standard public brand navigation and light/dark theme controls.
  const isClassroomSession = (pathname.startsWith("/classroom/") && pathname !== "/classroom/") || pathname === "/classroom/studio";
  const isMessages = pathname === "/messages" || pathname.startsWith("/messages/");

  // Intercept any Supabase PKCE authentication code or error landing on an arbitrary route
  // (e.g. root '/' or '/account') and automatically route it to the dedicated callback handler.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    if ((code || error) && !window.location.pathname.startsWith("/auth/callback")) {
      window.location.replace(`/auth/callback${window.location.search}${window.location.hash}`);
    }
  }, []);

  // The active exam, instructions briefing, and live room sessions have their own focused task-oriented interfaces.
  // Admin pages retain their own dedicated dashboard navigation.
  const hidePublicChrome = isAdminArea || isActiveExam || isInstructions || isClassroomSession;

  return (
    <>
      <ToastContainer />
      <OfflineSyncManager />
      {!hidePublicChrome && <GlobalLearnerToolbar />}
      {!hidePublicChrome && <GlobalAnnouncementBanner />}
      {!hidePublicChrome && <BrandHeader />}
      {children}
      {!hidePublicChrome && !isMessages && <BrandFooter />}
    </>
  );
}
