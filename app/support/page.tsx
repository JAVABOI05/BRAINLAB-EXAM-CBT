import Link from "next/link";

export const metadata = {
  title: "Help and Support",
  description: "Find help for BrainLab CBT access, exam results, learner accounts and planned Academy features.",
};

const faqs = [
  ["How do I start CBT practice?", "Open the CBT portal and enter the candidate details requested. Follow the access-code step and exam instructions shown for your session.", "/login", "Open CBT portal"],
  ["What if my exam requires an access code?", "Use the support link on the CBT portal to ask about obtaining a valid access code. Never share a code publicly.", "/login", "Access-code support"],
  ["Why can’t I see my result or corrections?", "Results and corrections follow the current exam release settings. If they are not available, check again later or contact the existing support channel.", "/login", "Return to CBT portal"],
  ["How do I manage my BrainLab account?", "Use the shared account page to sign in, create a learner account or request password recovery. Registration does not grant administrative permissions.", "/account", "Account help"],
  ["Can I use the AI Tutor or community chat now?", "Not yet. The AI learning companion, study groups, live chat and broader course pathways are planned capabilities and will be announced when they are ready.", "/ai-learning", "AI learning roadmap"],
];

export default function SupportPage() {
  return (
    <main id="main">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-blue-800">Help and support</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-5xl">A clear next step when you need help.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">Find guidance for the current CBT experience, account access and the learning features being developed. For exam-specific issues, use the support channel already provided by the CBT portal.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#012153] px-6 py-3 font-bold text-white hover:bg-[#0a2f72]">Open CBT support</Link>
            <a href="https://wa.me/2349074310204" target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-bold text-slate-800 hover:border-slate-500">Message on WhatsApp</a>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-5 py-14 sm:px-8 lg:py-20">
        <div className="max-w-2xl"><h2 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Frequently asked questions</h2><p className="mt-4 leading-7 text-slate-600">These answers describe the current portal and clearly distinguish it from future Academy plans.</p></div>
        <div className="mt-8 space-y-4">{faqs.map(([question, answer, href, label], index) => <article key={question} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><p className="text-xs font-extrabold tracking-[0.16em] text-blue-800">QUESTION 0{index + 1}</p><h3 className="mt-2 text-lg font-extrabold text-slate-950">{question}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{answer}</p><Link href={href} className="mt-4 inline-flex font-bold text-blue-800 underline underline-offset-4">{label} <span aria-hidden="true" className="ml-2">→</span></Link></article>)}</div>
      </section>
      <section className="border-y border-slate-200 bg-slate-50"><div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 lg:py-16"><h2 className="text-2xl font-extrabold text-slate-950">A note about account security</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">Never send your password or verification codes to anyone. Creating a learner account does not give access to restricted platform functions. BrainLab must enforce permissions on the server, not just hide links in the interface.</p></div></section>
    </main>
  );
}
