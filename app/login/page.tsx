"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import CBTExamPortalPage from "../cbt/page";

export default function LoginPage() {
  const router = useRouter();

  // If candidate or user session exists, ensure canonical URL is /cbt
  useEffect(() => {
    router.replace("/cbt");
  }, [router]);

  return <CBTExamPortalPage />;
}
