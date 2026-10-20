"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PrivateSignInRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/account");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
      <p className="text-sm font-medium">Redirecting to account portal...</p>
    </div>
  );
}
