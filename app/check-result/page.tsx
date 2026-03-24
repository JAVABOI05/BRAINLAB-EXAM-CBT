import { Suspense } from "react";
import CheckResultClient from "./checkresultclient";

export default function CheckResultPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#dfe8f7] px-4 py-8">
          <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-md">
            <h1 className="text-center text-3xl font-bold text-gray-800">
              Check Your Result
            </h1>
            <div className="mt-6 text-center text-gray-600">Loading result...</div>
          </div>
        </main>
      }
    >
      <CheckResultClient />
    </Suspense>
  );
}