"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Candidate = {
  name: string;
  phone: string;
  subject: string;
  code: string;
};

export default function InstructionsPage() {
  const router = useRouter();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("candidate");

    if (!saved) {
      router.push("/");
      return;
    }

    try {
      const parsed = JSON.parse(saved) as Candidate;
      setCandidate(parsed);
    } catch {
      router.push("/");
    }
  }, [router]);

  const handleStartExam = () => {
    if (!agreed) {
      alert("Please read and agree to the instructions before starting.");
      return;
    }

    router.push("/exam");
  };

  if (!candidate) {
    return (
      <main className="min-h-screen bg-[#dfe8f7] px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-md">
          <p className="text-lg text-gray-700">Loading instructions...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#dfe8f7] px-4 py-8">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-md">
        <h1 className="text-center text-3xl font-bold text-gray-800 md:text-4xl">
          BRAINLAB CBT Candidate Instructions
        </h1>

        <div className="mt-6 rounded-2xl bg-blue-50 p-5">
          <p className="text-sm leading-7 text-gray-700">
            <span className="font-semibold">Candidate:</span> {candidate.name}
            <br />
            <span className="font-semibold">Phone Number:</span>{" "}
            {candidate.phone}
            <br />
            <span className="font-semibold">Selected Subject:</span>{" "}
            {candidate.subject}
          </p>
        </div>

        <div className="mt-6 rounded-2xl bg-gray-50 p-5">
          <h2 className="text-lg font-bold text-gray-800">
            Question Distribution
          </h2>

          <div className="mt-3 space-y-2 text-sm leading-7 text-gray-700 md:text-base">
            <p>
              <span className="font-semibold">English:</span> 60 questions
            </p>
            <p>
              <span className="font-semibold">Chemistry:</span> 40 questions
            </p>
            <p>
              <span className="font-semibold">Physics:</span> 40 questions
            </p>
            <p>
              <span className="font-semibold">{candidate.subject}:</span> 40 questions
            </p>
            <p className="pt-2 font-semibold text-blue-700">
              Total Questions: 180
            </p>
            <p className="font-semibold text-blue-700">
              Total Score: 400 marks
            </p>
            <p className="font-semibold text-blue-700">
              Duration: 2 hours
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4 text-sm leading-7 text-gray-700 md:text-base">
          <p>
            Please read the following instructions carefully before starting the
            examination.
          </p>

          <ol className="list-decimal space-y-3 pl-6">
            <li>
              This examination contains 4 subjects: English, Chemistry, Physics,
              and {candidate.subject}.
            </li>
            <li>Answer all questions carefully before submitting.</li>
            <li>
              Ensure that you have a stable internet connection before you begin.
            </li>
            <li>Do not refresh the page unnecessarily during the exam.</li>
            <li>
              Keyboard aids are enabled:
              <br />
              A/B/C/D = Answer options
              <br />
              N = Next question
              <br />
              P = Previous question
              <br />
              F = Flag question
              <br />
              S = Submit exam
            </li>
            <li>
              Use of the on-screen calculator may be allowed where applicable.
            </li>
            <li>
              Do not switch tabs, minimize your browser, or leave the website
              during the exam.
            </li>
            <li>
              If you leave the exam page or switch tabs for 10 seconds or more,
              your exam will be automatically submitted.
            </li>
            <li>
              Once submitted, your exam cannot be reopened or edited again.
            </li>
            <li>
              By starting the exam, you confirm that you understand and accept
              all the rules above.
            </li>
          </ol>
        </div>

        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="font-semibold text-red-700">Important Warning</p>
          <p className="mt-2 text-sm leading-6 text-red-700">
            Leaving the exam page for 10 seconds or more will automatically
            submit your exam.
          </p>
        </div>

        <label className="mt-8 flex cursor-pointer items-start gap-3 rounded-2xl bg-gray-100 p-4">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-5 w-5"
          />
          <span className="text-sm leading-6 text-gray-700">
            I have read and understood the instructions and I agree to follow
            the examination rules.
          </span>
        </label>

        <div className="mt-8 flex flex-col gap-4 md:flex-row">
          <button
            onClick={() => router.push("/access")}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Back
          </button>

          <button
            onClick={handleStartExam}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-3 font-semibold text-white shadow-md transition hover:scale-[1.02]"
          >
            Start Exam
          </button>
        </div>
      </div>
    </main>
  );
}