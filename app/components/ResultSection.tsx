"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import LeaderboardCard from "./LeaderboardCard";
import { toast } from "../lib/toast";

export default function ResultSection() {
  const router = useRouter();
  const [phone, setPhone] = useState("");

  const handleGoToResultPage = () => {
    const trimmed = phone.trim();

    if (!trimmed) {
      toast.error("Please enter your phone number to check your result.");
      return;
    }

    router.push(`/result?phone=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="mx-auto mt-8 grid max-w-6xl gap-6 md:grid-cols-2">
      <div className="rounded-3xl bg-white p-6 shadow-md border border-slate-200">
        <h3 className="text-2xl font-black text-slate-900">Check Your CBT Result</h3>
        <p className="mt-1 text-xs text-slate-500">
          Enter the mobile number registered during your CBT practice session.
        </p>

        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Enter Registered Phone Number"
          className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          onClick={handleGoToResultPage}
          className="mt-4 w-full rounded-xl bg-[#012153] hover:bg-blue-900 px-4 py-3 text-sm font-bold text-white shadow-md transition active:scale-95"
        >
          Check Official Scorecard →
        </button>
      </div>

      <LeaderboardCard />
    </div>
  );
}
