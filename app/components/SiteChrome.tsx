"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import BrandFooter from "./BrandFooter";
import BrandHeader from "./BrandHeader";
import GlobalLearnerToolbar from "./GlobalLearnerToolbar";
import ToastContainer from "./Toast";

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const isActiveExam = pathname === "/exam" || pathname.startsWith("/exam/");

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

  // The active exam has its own task-focused interface. Admin pages retain their own navigation.
  const hidePublicChrome = isAdminArea || isActiveExam;

  return (
    <>
      <ToastContainer />
      <GlobalLearnerToolbar />
      {!hidePublicChrome && <BrandHeader />}
      {children}
      {!hidePublicChrome && <BrandFooter />}
    </>
  );
}
