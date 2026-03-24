"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import LeaderboardCard from "./LeaderboardCard";

export default function ResultSection() {
  const router = useRouter();
  const [phone, setPhone] = useState("");

  const handleGoToResultPage = () => {
    const trimmed = phone.trim();

    if (!trimmed) {
      alert("Please enter your phone number.");
      return;
    }

    router.push(`/check-result?phone=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="mx-auto mt-8 grid max-w-6xl gap-6 md:grid-cols-2">
      <div className="rounded-3xl bg-white p-6 shadow-md">
        <h3 className="text-2xl font-bold text-gray-800">Check Your Result</h3>

        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Enter Phone Number"
          className="mt-3 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          onClick={handleGoToResultPage}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-3 font-semibold text-white shadow-md transition hover:scale-[1.02]"
        >
          Check Result
        </button>
      </div>

      <LeaderboardCard />
    </div>
  );
}