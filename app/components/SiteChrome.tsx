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

  // Portal Environment Identifiers
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const isStudentArea =
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/student" ||
    pathname.startsWith("/student/");
  const isInstructorArea =
    pathname === "/tutor" ||
    pathname.startsWith("/tutor/") ||
    pathname === "/instructor" ||
    pathname.startsWith("/instructor/");
  const isAuthArea =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/");

  // Task-oriented interactive environments
  const isActiveExam = pathname === "/exam" || pathname.startsWith("/exam/");
  const isInstructions = pathname === "/instructions" || pathname.startsWith("/instructions/");
  const isClassroomSession =
    (pathname.startsWith("/classroom/") && pathname !== "/classroom/") ||
    pathname === "/classroom/studio";
  const isMessages = pathname === "/messages" || pathname.startsWith("/messages/");

  // Intercept any Supabase PKCE authentication code or error landing on an arbitrary route
  // and automatically route it to the dedicated callback handler.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    if ((code || error) && !window.location.pathname.startsWith("/auth/callback")) {
      window.location.replace(`/auth/callback${window.location.search}${window.location.hash}`);
    }
  }, []);

  // Isolate authenticated portals, auth gateway, and immersive test/classroom environments
  // completely from the public marketing header, learner toolbar, and footer.
  const hidePublicChrome =
    isAdminArea ||
    isStudentArea ||
    isInstructorArea ||
    isAuthArea ||
    isActiveExam ||
    isInstructions ||
    isClassroomSession;

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
