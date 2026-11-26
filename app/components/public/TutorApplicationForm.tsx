"use client";
import { trackEvent } from "@/app/lib/analytics";

import { useState } from "react";
import { toast } from "@/app/lib/toast";
import { CANONICAL_PHONE_DISPLAY, CANONICAL_PHONE_DIGITS } from "@/app/lib/contactConfig";

const AVAILABLE_SUBJECTS = [
  "Mathematics",
  "English Language",
  "Physics",
  "Chemistry",
  "Biology",
  "Economics",
  "Government",
  "Literature in English",
  "Commerce",
  "Financial Accounting",
  "Agricultural Science",
  "Christian Religious Studies",
  "Islamic Studies",
  "Further Mathematics",
];

const QUALIFICATIONS = [
  "B.Sc / B.Ed",
  "M.Sc / M.Ed",
  "Ph.D",
  "HND",
  "NCE",
  "OND",
  "Other",
];

const EXPERIENCE_LEVELS = [
  "Under 1 year",
  "1-3 years",
  "4-7 years",
  "8+ years",
];

const CURRICULA = ["JAMB UTME", "WAEC SSCE", "NECO SSCE", "Post-UTME", "STEM Virtual Labs"];

export function TutorApplicationForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [qualification, setQualification] = useState("B.Sc / B.Ed");
  const [experience, setExperience] = useState("1-3 years");
  const [selectedCurricula, setSelectedCurricula] = useState<string[]>(["JAMB UTME"]);
  const [cvUrl, setCvUrl] = useState("");
  const [statement, setStatement] = useState("");
  const [isAdultConfirmed, setIsAdultConfirmed] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [website_url_hp, setWebsiteUrlHp] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    ok: boolean;
    ref?: string;
    message?: string;
  } | null>(null);

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  };

  const toggleCurriculum = (curr: string) => {
    setSelectedCurricula((prev) =>
      prev.includes(curr) ? prev.filter((c) => c !== curr) : [...prev, curr]
    );
  };

  const handleCopyRef = () => {
    if (submitResult?.ref) {
      navigator.clipboard.writeText(submitResult.ref);
      toast.success("Reference code copied to clipboard!");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !email || !phone) {
      toast.error("Please fill in your full name, email address, and phone number.");
      return;
    }

    if (selectedSubjects.length === 0) {
      toast.error("Please select at least one teaching subject.");
      return;
    }

    if (statement.trim().length < 20) {
      toast.error("Please provide a brief teaching statement (minimum 20 characters).");
      return;
    }

    if (!isAdultConfirmed) {
      toast.error("You must confirm you are 18 years of age or older to apply.");
      return;
    }

    if (!privacyConsent) {
      toast.error("You must agree to the Nigeria Data Protection Act (NDPA) privacy terms before submitting.");
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const res = await fetch("/api/tutors/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          stateOfResidence: location,
          highestQualification: qualification,
          primarySubjects: selectedSubjects,
          targetCurricula: selectedCurricula,
          yearsExperience: experience,
          portfolioUrl: cvUrl,
          statementOfPedagogy: statement,
          isAdultConfirmed,
          privacyConsent,
          website_url_hp,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        trackEvent("tutor_application_submitted", {
          qualification,
          subjects_count: selectedSubjects.length,
        });
        setSubmitResult({
          ok: true,
          ref: data.referenceCode,
          message: data.message,
        });
      } else {
        setSubmitResult({
          ok: false,
          message: data.error || "Unable to submit application automatically.",
        });
      }
    } catch {
      setSubmitResult({
        ok: false,
        message: "Network connection lost. Please check your internet or contact the Academic Desk directly.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="apply" className="rounded-3xl border border-blue-200/90 bg-white p-6 shadow-xl dark:border-blue-900/60 dark:bg-[#071328] sm:p-10 transition-colors">
      <div className="text-center max-w-xl mx-auto space-y-2 mb-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-900 dark:bg-blue-950/80 dark:text-cyan-300">
          Official Educator Application Form
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          Apply to Teach on BrainLab Academy
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Join our verified network of secondary and UTME masterclass educators. Submit your credentials below for review by our academic committee.
        </p>
      </div>

      {submitResult && submitResult.ok ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50/80 p-8 text-center dark:border-emerald-800/80 dark:bg-emerald-950/40 space-y-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-2xl dark:bg-emerald-900">
            ✓
          </div>
          <h3 className="text-xl font-black text-emerald-950 dark:text-emerald-100">
            Application Confirmed &amp; Stored
          </h3>
          <p className="text-xs text-emerald-800 dark:text-emerald-300 max-w-md mx-auto leading-relaxed">
            Official Reference Code:
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className="rounded-xl border border-emerald-400 bg-white px-4 py-2 font-mono text-base font-black text-emerald-950 dark:bg-slate-900 dark:text-emerald-200">
              {submitResult.ref}
            </span>
            <button
              type="button"
              onClick={handleCopyRef}
              className="rounded-xl border border-emerald-500/50 bg-emerald-100/60 px-3 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-200 transition dark:bg-emerald-900/60 dark:text-emerald-200"
            >
              Copy
            </button>
          </div>
          <p className="text-xs leading-relaxed text-emerald-800/90 dark:text-emerald-300 max-w-lg mx-auto">
            {submitResult.message}
          </p>

          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <a
              href={`https://wa.me/${CANONICAL_PHONE_DIGITS}?text=${encodeURIComponent(
                `Hello BrainLab Academic Desk, I submitted an educator application with Reference Code: ${submitResult.ref}.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-sm"
            >
              Follow Up on WhatsApp
            </a>
            <button
              type="button"
              onClick={() => {
                setSubmitResult(null);
                setStatement("");
                setSelectedSubjects([]);
              }}
              className="rounded-xl border border-emerald-600/40 px-5 py-2.5 text-xs font-bold text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100/50 transition"
            >
              Submit Another Application
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {submitResult && !submitResult.ok && (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 p-5 text-xs text-rose-900 dark:border-rose-800/80 dark:bg-rose-950/60 dark:text-rose-200">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div className="flex-1 space-y-1.5">
                  <p className="font-bold text-rose-950 dark:text-rose-100">Application Notice</p>
                  <p className="leading-relaxed text-rose-800 dark:text-rose-300">{submitResult.message}</p>
                  <div className="pt-2 flex flex-wrap gap-2">
                    <a
                      href={`https://wa.me/${CANONICAL_PHONE_DIGITS}?text=${encodeURIComponent(
                        "Hello BrainLab Academic Desk, I experienced an issue submitting my tutor application online and would like to connect directly."
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-500 transition"
                    >
                      💬 WhatsApp Academic Desk ({CANONICAL_PHONE_DISPLAY})
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Personal & Contact Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Full Legal Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Dr. Emeka Adeleke"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Official Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="emeka.adeleke@example.com"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Phone / WhatsApp Number *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 800 000 0000"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Location (State / City)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Lagos, Ikeja"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Academic Qualifications & Experience */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Highest Academic Qualification *
              </label>
              <select
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {QUALIFICATIONS.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Teaching Experience *
              </label>
              <select
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {EXPERIENCE_LEVELS.map((exp) => (
                  <option key={exp} value={exp}>
                    {exp}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Teaching Subject Multi-Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Teaching Subjects * (Select all that apply)
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SUBJECTS.map((sub) => {
                const active = selectedSubjects.includes(sub);
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => toggleSubject(sub)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "bg-blue-600 text-white shadow-xs"
                        : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-400 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300"
                    }`}
                  >
                    {active ? "✓ " : "+ "}
                    {sub}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Curriculum Familiarity */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Curriculum &amp; Exam Board Familiarity
            </label>
            <div className="flex flex-wrap gap-2">
              {CURRICULA.map((curr) => {
                const active = selectedCurricula.includes(curr);
                return (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => toggleCurriculum(curr)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-400 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300"
                    }`}
                  >
                    {active ? "✓ " : "+ "}
                    {curr}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional CV / LinkedIn URL */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              LinkedIn Profile or Online CV / Portfolio Link (Optional)
            </label>
            <input
              type="url"
              value={cvUrl}
              onChange={(e) => setCvUrl(e.target.value)}
              placeholder="https://linkedin.com/in/yourprofile or Google Drive CV link"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          {/* Statement of Teaching Philosophy */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Statement of Teaching Philosophy &amp; Methodology *
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {statement.length} / 1200
              </span>
            </div>
            <textarea
              rows={4}
              required
              maxLength={1200}
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Share how you demystify difficult concepts for secondary students, your familiarity with digital whiteboards, and your approach to UTME past question analysis..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          {/* Honeypot field (hidden from genuine users) */}
          <div style={{ position: "absolute", left: "-9999px", opacity: 0 }} aria-hidden="true">
            <input
              type="text"
              name="website_url_hp"
              tabIndex={-1}
              autoComplete="off"
              value={website_url_hp}
              onChange={(e) => setWebsiteUrlHp(e.target.value)}
            />
          </div>

          {/* Adult Confirmation & NDPA 2023 Consent Checkboxes */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60 text-xs">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                name="isAdultConfirmed"
                required
                checked={isAdultConfirmed}
                onChange={(e) => setIsAdultConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700"
              />
              <span className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                <strong>Age Confirmation:</strong> I confirm that I am aged 18 or older and applying as an independent educator.
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer border-t border-slate-200/80 pt-2.5 dark:border-slate-800">
              <input
                type="checkbox"
                name="privacyConsent"
                required
                checked={privacyConsent}
                onChange={(e) => setPrivacyConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700"
              />
              <span className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                <strong>NDPA 2023 Notice &amp; Consent:</strong> By applying, I consent to BrainLab Academy processing my contact and academic details strictly for educator vetting and recruitment under the Nigeria Data Protection Act 2023. I understand that submitting this application does not automatically grant a tutor role, account privileges, or teaching permissions.
              </span>
            </label>
          </div>

          {/* Submit Action */}
          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-700 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-700/25 transition-all hover:bg-blue-600 disabled:opacity-50 active:scale-95"
            >
              {isSubmitting ? "Submitting Application..." : "Submit Educator Application →"}
            </button>
            <p className="mt-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
              Applications are reviewed by the Academic Committee. Vetted candidates are invited for a live whiteboard teaching demonstration.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
