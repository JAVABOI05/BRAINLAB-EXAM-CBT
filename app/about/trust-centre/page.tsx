import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/app/components/public/Breadcrumbs";

export const metadata: Metadata = {
  title: "Trust Centre: Standards, Safety & Quality | BrainLab Academy",
  description:
    "Transparency, academic standards, data protection policies, child safeguarding, and payment security benchmarks at BrainLab Academy.",
  alternates: { canonical: "/about/trust-centre" },
};

interface TrustSection {
  id: string;
  badge: string;
  title: string;
  summary: string;
  reviewStatus: "PENDING_FORMAL_APPROVAL" | "APPROVED";
  reviewNotice: string;
  pillars: { title: string; detail: string }[];
}

const TRUST_SECTIONS: TrustSection[] = [
  {
    id: "content-quality",
    badge: "Curriculum Standards",
    title: "Content Quality & Examination Verification Method",
    summary:
      "Our past questions, explanations, and syllabus modules undergo systematic editorial and academic verification before publishing.",
    reviewStatus: "PENDING_FORMAL_APPROVAL",
    reviewNotice:
      "[PENDING FORMAL ACADEMIC BOARD REVIEW]: Final syllabus alignment certification and editorial workflow documentation subject to annual curriculum committee ratification.",
    pillars: [
      {
        title: "Three-Tier Question Item Review",
        detail:
          "Past examination questions and custom practice items are cross-checked across official exam board past papers, vetted by subject matter leads, and reviewed for typographical precision.",
      },
      {
        title: "Examiner Distractor Rationale",
        detail:
          "Every multiple-choice distractor is annotated with the specific misconception or calculation trap it targets, ensuring candidates learn the underlying rationale.",
      },
      {
        title: "Annual Syllabus Alignment",
        detail:
          "Curriculum modules are updated annually to reflect updates in JAMB and WAEC prescribed texts, syllabus changes, and novel selections.",
      },
    ],
  },
  {
    id: "tutor-standards",
    badge: "Educator Vetting",
    title: "Tutor Quality & Educator Vetting Standards",
    summary:
      "Tutors hosting live interactive classrooms and authoring learning modules must meet strict academic qualifications and pedagogical standards.",
    reviewStatus: "PENDING_FORMAL_APPROVAL",
    reviewNotice:
      "[PENDING FORMAL ACADEMIC BOARD REVIEW]: Tutor credential verification framework and background check procedures marked for annual administrative sign-off.",
    pillars: [
      {
        title: "Subject Qualification Verification",
        detail:
          "Instructors are required to demonstrate subject mastery, university credentials in their teaching fields, and verifiable teaching experience.",
      },
      {
        title: "Pedagogy Over Rote Shortcuts",
        detail:
          "Educators are evaluated on their ability to explain foundational principles and guide problem derivations rather than promoting rote cramming tricks.",
      },
      {
        title: "Continuous Student Feedback",
        detail:
          "Classroom recordings and live lecture reviews are audited to maintain high presentation standards and respectful, supportive student interaction.",
      },
    ],
  },
  {
    id: "data-protection",
    badge: "Privacy & Security",
    title: "Data Protection & Row-Level Security Architecture",
    summary:
      "Learner records, examination attempts, and credentials are protected with database-level isolation and encryption.",
    reviewStatus: "PENDING_FORMAL_APPROVAL",
    reviewNotice:
      "[PENDING LEGAL & COMPLIANCE REVIEW]: Data retention limits, NDPR compliance disclosures, and international transfer provisions marked for legal counsel approval.",
    pillars: [
      {
        title: "Supabase Database Row-Level Security (RLS)",
        detail:
          "Access to student test results, user profiles, and notes is strictly restricted at the database engine level so users can only access their authorized data.",
      },
      {
        title: "Server-Side Credential Isolation",
        detail:
          "API keys for artificial intelligence providers, payment gateways, and databases are strictly held in server-side runtime environments and never exposed to client browsers.",
      },
      {
        title: "Zero Private Data Monetization",
        detail:
          "BrainLab Academy does not sell, lease, or monetize student profiles, test scores, or study habits to third-party advertisers.",
      },
    ],
  },
  {
    id: "child-safety",
    badge: "Learner Safeguarding",
    title: "Child Safety & Youth Protection Principles",
    summary:
      "Many BrainLab learners are secondary school minors. We implement safe learning environments across all digital classrooms and forums.",
    reviewStatus: "PENDING_FORMAL_APPROVAL",
    reviewNotice:
      "[PENDING SAFEGUARDING BOARD REVIEW]: Child safeguarding policies and incident escalation pathways marked for statutory compliance review.",
    pillars: [
      {
        title: "Moderated Live Classrooms",
        detail:
          "Virtual lecture stages are educator-controlled with active moderation controls to prevent harassment, offensive language, or disruptions.",
      },
      {
        title: "Encrypted Communication Channels",
        detail:
          "Direct messaging and communication are constrained to academic inquiries and official support desks without unmonitored peer private channels.",
      },
      {
        title: "Parental Visibility Options",
        detail:
          "Guardians can opt in to receive termly score digests and study activity summaries to support their child's academic journey transparently.",
      },
    ],
  },
  {
    id: "payment-verification",
    badge: "Billing Integrity",
    title: "Payment Verification & Transaction Security",
    summary:
      "All financial transactions are conducted through certified, PCI-DSS compliant Nigerian payment gateways with transparent dispute resolution.",
    reviewStatus: "PENDING_FORMAL_APPROVAL",
    reviewNotice:
      "[PENDING FINANCIAL COMPLIANCE REVIEW]: Merchant settlement guarantees, refund reconciliation procedures, and gateway SLAs marked for finance committee review.",
    pillars: [
      {
        title: "Certified Gateway Gateways",
        detail:
          "Payments are processed directly through Paystack, Flutterwave, or Bachs with 256-bit SSL encryption. BrainLab never stores sensitive credit/debit card numbers.",
      },
      {
        title: "Immediate Digital Activation",
        detail:
          "Subscriptions and mock access activate instantly upon gateway confirmation webhook verification, with digital receipts issued automatically.",
      },
      {
        title: "Audited Refund Dispute Pathways",
        detail:
          "Unconditional 24-hour review window for student plans with direct dispute escalation channels via our billing desk at billing@brainlabacademy.com.ng.",
      },
    ],
  },
];

export default function TrustCentrePage() {
  return (
    <div className="public-surface min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070e1b] dark:text-slate-100 transition-colors">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "About", href: "/about" },
          { label: "Trust Centre" },
        ]}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0a152b] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-blue-900 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300">
            BrainLab Trust &amp; Governance Centre
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl leading-[1.12]">
            Academic Standards, <br />
            <span className="text-blue-700 dark:text-cyan-400">Data Integrity &amp; Learner Safety.</span>
          </h1>

          <p className="max-w-3xl text-base text-slate-600 dark:text-slate-300 sm:text-lg leading-relaxed">
            Earning the trust of candidates, parents, educators, and partner schools is our highest operational priority. Here is how we verify content, protect privacy, vet tutors, and safeguard our community.
          </p>

          <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-amber-950 dark:border-amber-800/80 dark:bg-amber-950/30 dark:text-amber-200 max-w-3xl">
            <span className="font-bold block mb-1">Editorial &amp; Compliance Transparency Notice:</span>
            <p>
              To maintain absolute transparency, all policy statements and safety protocols below display their formal verification review status. Operational practices reflect current engineering controls; legal assurances are marked for formal periodic committee review.
            </p>
          </div>
        </div>
      </section>

      {/* Trust Pillars */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-16">
          {TRUST_SECTIONS.map((sec, idx) => (
            <div
              key={sec.id}
              id={sec.id}
              className="rounded-3xl border border-slate-200 bg-white p-7 sm:p-10 shadow-xs dark:border-slate-800 dark:bg-slate-900/80 space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 dark:text-cyan-300 dark:bg-blue-950/60 px-2.5 py-1 rounded-md">
                    {sec.badge}
                  </span>
                  <h2 className="text-2xl font-black text-slate-950 dark:text-white mt-2">
                    {idx + 1}. {sec.title}
                  </h2>
                </div>
                <span className="text-[10px] font-bold font-mono text-amber-900 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-3 py-1 rounded-full self-start sm:self-auto">
                  {sec.reviewStatus}
                </span>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {sec.summary}
              </p>

              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300 font-mono">
                {sec.reviewNotice}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                {sec.pillars.map((pil, pIdx) => (
                  <div
                    key={pIdx}
                    className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 dark:border-slate-800/80 dark:bg-slate-800/50 space-y-2"
                  >
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {pil.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {pil.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Review Inquiries CTA */}
      <section className="py-16 sm:py-24 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-[#070e1b] text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
            Questions on Governance, Quality or Safety?
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Our compliance and academic standards desks are available to address questions from schools, examination boards, and parents.
          </p>
          <div className="flex justify-center gap-3.5">
            <Link
              href="/contact?subject=Trust+and+Governance+Inquiry"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-700 hover:bg-blue-800 px-8 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 active:scale-95"
            >
              Contact Governance Desk →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
