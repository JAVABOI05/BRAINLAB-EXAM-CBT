"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import BrandFooter from "./BrandFooter";
import BrandHeader from "./BrandHeader";
import ToastContainer from "./Toast";
import OfflineSyncManager from "./OfflineSyncManager";
import GlobalAnnouncementBanner from "./GlobalAnnouncementBanner";
import StudentPortalShell from "./StudentPortalShell";

// All authenticated student portal path prefixes (Experience B)
const STUDENT_PORTAL_PREFIXES = [
  "/dashboard",
  "/student",
  "/learn",
  "/learning",
  "/learning-hub",
  "/learning-dna",
  "/cbt",
  "/result",
  "/results",
  "/self-practice",
  "/quizzes",
  "/assessments",
  "/assignments",
  "/corrections",
  "/revision",
  "/ai-learning",
  "/classroom",
  "/arena",
  "/challenge-arena",
  "/leaderboard",
  "/messages",
  "/calendar",
  "/achievements",
  "/skills-passport",
  "/profile",
  "/settings",
  "/notifications",
  "/redeem-access",
  "/study-groups",
  "/recordings",
];

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";

  // 1. Admin / Operator Portal (Admin layout provides its own shell)
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");

  // 2. Tutor / Instructor Portal (Tutor layout provides its own shell)
  const isInstructorArea =
    pathname === "/tutor" ||
    pathname.startsWith("/tutor/") ||
    pathname === "/instructor" ||
    pathname.startsWith("/instructor/");

  // 3. Centralized Authentication Gateway (Dedicated auth card layout)
  const isAuthArea =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/") ||
    pathname === "/verify" ||
    pathname.startsWith("/verify/");

  // 4. Immersive Fullscreen Interactive Tasks (No navigation chrome)
  const isActiveExam = pathname === "/exam" || pathname.startsWith("/exam/");
  const isInstructions = pathname === "/instructions" || pathname.startsWith("/instructions/");
  const isStudioCanvas = pathname === "/classroom/studio";
  const isImmersiveTask = isActiveExam || isInstructions || isStudioCanvas;

  // 5. Dedicated Authenticated Student Portal Workspace (Experience B)
  const isStudentPortal =
    !isImmersiveTask &&
    STUDENT_PORTAL_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
    );

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

  // Dedicated Shell: Admin Area
  if (isAdminArea) {
    return (
      <>
        <ToastContainer />
        <OfflineSyncManager />
        {children}
      </>
    );
  }

  // Dedicated Shell: Instructor Area
  if (isInstructorArea) {
    return (
      <>
        <ToastContainer />
        <OfflineSyncManager />
        {children}
      </>
    );
  }

  // Dedicated Shell: Auth Gateway
  if (isAuthArea) {
    return (
      <>
        <ToastContainer />
        <OfflineSyncManager />
        {children}
      </>
    );
  }

  // Dedicated Shell: Immersive Fullscreen Interactive Tasks
  if (isImmersiveTask) {
    return (
      <>
        <ToastContainer />
        <OfflineSyncManager />
        {children}
      </>
    );
  }

  // Experience B: Dedicated Authenticated Student Portal Shell
  if (isStudentPortal) {
    return (
      <>
        <ToastContainer />
        <OfflineSyncManager />
        <StudentPortalShell>{children}</StudentPortalShell>
      </>
    );
  }

  // Experience A: Dedicated Public Website Experience (Marketing Navigation & Footer)
  return (
    <>
      <ToastContainer />
      <OfflineSyncManager />
      <GlobalAnnouncementBanner />
      <BrandHeader />
      <main id="main">{children}</main>
      <BrandFooter />
    </>
  );
}
