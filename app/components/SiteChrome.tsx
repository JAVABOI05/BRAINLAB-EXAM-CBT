"use client";

import { usePathname } from "next/navigation";
import BrandFooter from "./BrandFooter";
import BrandHeader from "./BrandHeader";
import GlobalLearnerToolbar from "./GlobalLearnerToolbar";

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const isActiveExam = pathname === "/exam" || pathname.startsWith("/exam/");

  // The active exam has its own task-focused interface. Admin pages retain their own navigation.
  const hidePublicChrome = isAdminArea || isActiveExam;

  return (
    <>
      <GlobalLearnerToolbar />
      {!hidePublicChrome && <BrandHeader />}
      {children}
      {!hidePublicChrome && <BrandFooter />}
    </>
  );
}
