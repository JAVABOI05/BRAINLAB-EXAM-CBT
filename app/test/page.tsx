"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function TestPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    async function loadQuestions() {
      const { data, error } = await supabase.from("questions").select("*");

      if (error) {
        setErrorText(error.message);
        return;
      }

      setRows(data || []);
    }

    loadQuestions();
  }, []);

  return (
    <main className="min-h-screen bg-white p-8">
      <h1 className="text-2xl font-bold">Supabase Test</h1>

      {errorText && (
        <p className="mt-4 rounded bg-red-100 p-3 text-red-700">
          Error: {errorText}
        </p>
      )}

      <div className="mt-6 space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded border p-4">
            <p><b>ID:</b> {row.id}</p>
            <p><b>Subject:</b> {row.subject}</p>
            <p><b>Question:</b> {row.question}</p>
            <p><b>Correct:</b> {row.correct_answer}</p>
          </div>
        ))}
      </div>
    </main>
  );
}