"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "../lib/toast";

export default function CandidateLogin() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("Mathematics");
  const [code, setCode] = useState("");

  const handleStart = () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("Please enter your candidate name and phone number.");
      return;
    }

    localStorage.setItem(
      "candidate",
      JSON.stringify({
        name: name.trim(),
        phone: phone.trim(),
        subject,
        code: code.trim().toUpperCase(),
      })
    );

    if (code.trim()) {
      localStorage.setItem("access_code", code.trim().toUpperCase());
    }

    router.push("/cbt");
  };

  return (
    <div className="rounded-3xl bg-white p-6 shadow-md border border-slate-200">
      <h3 className="mb-4 text-center text-2xl font-black text-slate-900">
        Candidate Portal Access
      </h3>

      <input
        placeholder="Full Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
      />

      <input
        placeholder="Phone Number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
      />

      <select
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="Mathematics">Mathematics</option>
        <option value="Biology">Biology</option>
        <option value="Economics">Economics</option>
        <option value="Literature in English">Literature in English</option>
        <option value="Government">Government</option>
      </select>

      <input
        placeholder="Access Code (Optional)"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm uppercase tracking-wider outline-none focus:ring-2 focus:ring-blue-500"
      />

      <button
        onClick={handleStart}
        className="mt-5 w-full rounded-xl bg-[#012153] py-3 text-sm font-bold text-white transition hover:bg-blue-900 active:scale-95"
      >
        Continue to CBT Exam Portal
      </button>
    </div>
  );
}
