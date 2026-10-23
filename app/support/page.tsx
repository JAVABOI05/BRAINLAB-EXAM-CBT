import Link from "next/link";

export const metadata = {
  title: "Help and Support",
  description: "Official support for BrainLab CBT practice, access codes, exam results, learner accounts, and academic tools.",
};

const faqs = [
  [
    "How do I start CBT practice?",
    "Open the CBT portal and enter your candidate name and subject combination. If an access code is enabled, enter your assigned PIN to start.",
    "/cbt",
    "Open CBT portal",
  ],
  [
    "What if my exam requires an access code?",
    "You can request or verify a valid access code by emailing our CBT support desk at support@brainlab.edu.ng or contacting us on WhatsApp. Never share your candidate PIN publicly.",
    "mailto:support@brainlab.edu.ng?subject=BrainLab%20Access%20Code%20Inquiry",
    "Email Access Code Support",
  ],
  [
    "Why can’t I see my result or corrections?",
    "Results and corrections follow the active exam release settings configured by your administrator. If immediate results are held, they will be released once approved. You can contact support for result verification.",
    "mailto:support@brainlab.edu.ng?subject=BrainLab%20Exam%20Result%20Inquiry",
    "Email Result Support",
  ],
  [
    "How do I manage my BrainLab account?",
    "Use the account portal to sign in with Google or email, view your active practice subscriptions, or reset your password.",
    "/account",
    "Account help",
  ],
  [
    "How do I join a Live Classroom session?",
    "Navigate to the Learning Hub and click the Live Classroom tab to join active tutorial sessions, view scheduled class times, or review past recordings.",
    "/learn?tab=live",
    "Go to Live Classroom",
  ],
];

export default function SupportPage() {
  return (
    <main id="main">
      {/* Hero Section */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-800">
            BrainLab Help &amp; Support
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-5xl">
            A clear next step whenever you need help.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Get instant support for computer-based testing, access code retrieval, result inquiries, and account access. For direct assistance, our official CBT helpdesk is reachable via email and WhatsApp.
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="mailto:support@brainlab.edu.ng?subject=BrainLab%20CBT%20Support%20Request"
              className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-[#012153] px-6 py-3 font-bold text-white shadow-sm transition-all hover:bg-[#0a2f72] active:scale-95"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0l-9.75 6.75L2.25 6.75" />
              </svg>
              <span>Open CBT support</span>
            </a>

            <a
              href="https://wa.me/2349074310204"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 font-bold text-slate-800 shadow-xs transition-all hover:border-emerald-500 hover:text-emerald-700 active:scale-95"
            >
              <span>Message on WhatsApp</span>
            </a>
          </div>

          {/* Official Support Channels Card */}
          <div className="mt-10 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Official Email Support</p>
              <a
                href="mailto:support@brainlab.edu.ng"
                className="mt-1 inline-block text-base font-extrabold text-blue-900 hover:underline"
              >
                support@brainlab.edu.ng
              </a>
              <p className="text-xs text-slate-500 mt-0.5">Direct candidate and access code inquiries</p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">WhatsApp Helpdesk</p>
              <a
                href="https://wa.me/2349074310204"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-base font-extrabold text-emerald-800 hover:underline"
              >
                +234 907 431 0204
              </a>
              <p className="text-xs text-slate-500 mt-0.5">Fast-track chat assistance</p>
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Coverage Hours</p>
              <p className="mt-1 text-sm font-bold text-slate-800">Monday – Saturday: 8:00 AM – 8:00 PM</p>
              <p className="text-xs text-slate-500 mt-0.5">Automated queue monitors outside hours</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section className="mx-auto max-w-5xl px-5 py-14 sm:px-8 lg:py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Answers to common questions about CBT examinations, PIN access, score releases, and learning spaces.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          {faqs.map(([question, answer, href, label], index) => {
            const isExternalOrMail = href.startsWith("mailto:") || href.startsWith("http");
            return (
              <article key={question} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
                <p className="text-xs font-extrabold tracking-[0.16em] text-blue-800">
                  QUESTION 0{index + 1}
                </p>
                <h3 className="mt-2 text-lg font-extrabold text-slate-950">{question}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{answer}</p>
                {isExternalOrMail ? (
                  <a
                    href={href}
                    className="mt-4 inline-flex items-center font-bold text-blue-800 underline underline-offset-4 hover:text-blue-950"
                  >
                    <span>{label}</span>
                    <span aria-hidden="true" className="ml-1.5">&rarr;</span>
                  </a>
                ) : (
                  <Link
                    href={href}
                    className="mt-4 inline-flex items-center font-bold text-blue-800 underline underline-offset-4 hover:text-blue-950"
                  >
                    <span>{label}</span>
                    <span aria-hidden="true" className="ml-1.5">&rarr;</span>
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* Account Security Notice */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 lg:py-16">
          <h2 className="text-2xl font-extrabold text-slate-950">A note about candidate security</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Never send your password or personal examination access PIN to anyone. BrainLab support agents will never ask for your account password. If you encounter any unauthorized access attempts, immediately email <a href="mailto:support@brainlab.edu.ng" className="font-bold text-blue-800 underline">support@brainlab.edu.ng</a>.
          </p>
        </div>
      </section>
    </main>
  );
}
