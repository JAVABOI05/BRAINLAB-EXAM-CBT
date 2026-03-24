"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CandidateLogin() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("Mathematics");
  const [code, setCode] = useState("");

  const handleStart = () => {
    if (!name.trim() || !phone.trim() || !code.trim()) {
      alert("Please fill all fields");
      return;
    }

    if (code.trim() !== "BRAINLAB-TEST-CODE") {
      alert("Invalid or Used Code");
      return;
    }

    localStorage.setItem(
      "candidate",
      JSON.stringify({
        name,
        phone,
        subject,
        code,
      })
    );

    router.push("/");
  };

  return (
    <div className="rounded-3xl bg-white p-6 shadow-md">
      <h3 className="mb-4 text-center text-2xl font-bold text-gray-800">
        Candidate Login
      </h3>

      <input
        placeholder="Full Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mt-3 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
      />

      <input
        placeholder="Phone Number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="mt-3 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
      />

      <select
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="mt-3 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option>Mathematics</option>
        <option>Biology</option>
      </select>

      <input
        placeholder="Access Code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="mt-3 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
      />

      <button
        onClick={handleStart}
        className="mt-4 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-3 font-semibold text-white shadow-md transition hover:scale-[1.02]"
      >
        CLICK TO TEST
      </button>

      <div className="mt-5 rounded-2xl bg-gray-100 p-4 text-sm">
        <b className="text-gray-800">Exam Shortcuts</b>
        <p className="mt-2 leading-6 text-gray-600">
          N = Next · P = Previous · F = Flag · S = Submit
          <br />
          A/B/C/D = Answer
        </p>
      </div>
    </div>
  );
}