"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import BrandHeader from "@/app/components/BrandHeader";
import BrandFooter from "@/app/components/BrandFooter";

type Certificate = {
  id: string;
  certificate_number: string;
  recipient_name: string;
  title: string;
  issuer_name: string;
  score: number | null;
  grade: string | null;
  issued_at: string;
  expires_at: string | null;
  revoked_at: string | null;
};

export default function AchievementsPage() {
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAchievements() {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (!active) return;

      if (authError || !auth.user) {
        router.replace("/account");
        return;
      }

      setUserEmail(auth.user.email || "");

      const { data, error } = await supabase
        .from("learning_certificates")
        .select("id,certificate_number,recipient_name,title,issuer_name,score,grade,issued_at,expires_at,revoked_at")
        .eq("user_id", auth.user.id)
        .order("issued_at", { ascending: false });

      if (!active) return;

      if (!error && data) {
        setCertificates(data as Certificate[]);
      }
      setLoading(false);
    }

    void loadAchievements();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <BrandHeader />

      <main id="main" className="flex-1 py-10 sm:py-14">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 space-y-6">
          <header className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-700">
                Learner Portfolio &amp; Credentials
              </span>
              {userEmail && <span className="text-xs font-medium text-slate-500">{userEmail}</span>}
            </div>
            <h1 className="mt-2 text-3xl font-extrabold text-slate-950 sm:text-4xl">
              Achievements &amp; Certificates
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Verified certifications, test completion credentials, and learning milestones awarded to your account. Each certificate carries a unique cryptographic ID verifiable worldwide.
            </p>
            <div className="mt-5 flex flex-wrap gap-4 text-xs font-bold">
              <Link href="/dashboard" className="text-indigo-700 hover:text-indigo-900">
                ← Learner Dashboard
              </Link>
              <Link href="/verify" className="text-slate-600 hover:text-slate-900">
                Public Verification Portal ↗
              </Link>
            </div>
          </header>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              Loading your achievement records…
            </div>
          ) : certificates.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center sm:p-12">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-700">
                🏅
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-900">No Certificates Issued Yet</h2>
              <p className="mt-2 max-w-md mx-auto text-sm text-slate-600">
                Complete published assessments, competition rounds, or structured learning paths to earn verified BrainLab credentials.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href="/assessments"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-800"
                >
                  Explore Assessments
                </Link>
                <Link
                  href="/learn"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Explore Learning Hub
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {certificates.map((cert) => {
                const isRevoked = Boolean(cert.revoked_at);
                const isExpired = cert.expires_at ? new Date(cert.expires_at).getTime() <= Date.now() : false;
                const status = isRevoked ? "Revoked" : isExpired ? "Expired" : "Active & Verified";

                return (
                  <article
                    key={cert.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-slate-500">{cert.certificate_number}</span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            status === "Active & Verified"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {status}
                        </span>
                      </div>

                      <h2 className="mt-3 text-lg font-bold text-slate-950">{cert.title}</h2>
                      <p className="mt-1 text-xs text-slate-500">Issued by {cert.issuer_name}</p>

                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600 font-medium">
                        <span className="rounded bg-slate-100 px-2 py-1">
                          Issued: {new Date(cert.issued_at).toLocaleDateString()}
                        </span>
                        {cert.score !== null && (
                          <span className="rounded bg-indigo-50 px-2 py-1 text-indigo-900 font-bold">
                            Score: {cert.score}% {cert.grade ? `(${cert.grade})` : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <Link
                        href={`/verify/${cert.certificate_number}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-900"
                      >
                        View Official Credential ↗
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          const url = `${window.location.origin}/verify/${cert.certificate_number}`;
                          void navigator.clipboard.writeText(url);
                          alert("Verification link copied to clipboard!");
                        }}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Copy Link
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <BrandFooter />
    </div>
  );
}
