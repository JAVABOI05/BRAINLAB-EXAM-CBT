import Link from "next/link";

export const metadata = {
  title: "Courses and Learning Resources",
  description: "Learn about BrainLab Academy's planned course, resource and practical-skills pathways.",
};

const pathways = [
  ["Guided learning resources", "Organised notes, explainers and revision materials connected to topics learners want to understand."],
  ["Short courses", "Future structured pathways designed around clear learning goals and manageable steps."],
  ["Practical projects", "Opportunities to apply knowledge through projects and demonstrate what a learner can do."],
  ["Skills Passport", "A possible future portfolio for recording completed learning and projects, introduced only with clear learner control."],
];

export default function CoursesPage() {
  return (
    <main id="main">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-900">Future direction</span>
          <h1 className="mt-5 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-5xl">Learning that can take you beyond the exam.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">The longer-term direction for BrainLab Academy includes learning resources, structured courses and practical projects that help learners apply what they know. This page outlines the direction; it does not advertise a live course catalogue or claim that certificates are currently offered.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#012153] px-6 py-3 font-bold text-white hover:bg-[#0a2f72]">Explore CBT practice</Link><Link href="/learning/revision" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-bold text-slate-800 hover:border-slate-500">Plan your revision</Link></div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
        <div className="max-w-2xl"><p className="text-sm font-extrabold uppercase tracking-[0.14em] text-blue-800">Possible learning pathways</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">From understanding to application.</h2><p className="mt-4 leading-7 text-slate-600">New learning materials should be introduced with clear ownership, quality checks, accessible presentation and accurate descriptions of what learners will receive.</p></div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">{pathways.map(([title, description], index) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-extrabold tracking-[0.16em] text-blue-800">0{index + 1}</p><h3 className="mt-3 text-xl font-extrabold text-slate-950">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{description}</p></article>)}</div>
      </section>
      <section className="border-y border-slate-200 bg-slate-50"><div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:py-16"><h2 className="text-2xl font-extrabold text-slate-950">What needs to be true before launch?</h2><ul className="mt-5 grid gap-3 sm:grid-cols-2">{["A verified catalogue and accurate course descriptions","Content review and a process for correcting errors","Mobile-friendly, low-bandwidth access","Transparent pricing and completion requirements, where applicable","Privacy and access controls for learner records","A clear distinction between participation and accredited qualifications"].map((item) => <li key={item} className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">{item}</li>)}</ul></div></section>
      <section className="mx-auto max-w-5xl px-5 py-14 text-center sm:px-8 lg:py-20"><h2 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Start with a clear goal.</h2><p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600">The existing CBT portal and local revision planner are the current entry points while broader learning pathways are developed.</p><div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#012153] px-6 py-3 font-bold text-white">Open CBT portal</Link><Link href="/about" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-bold text-slate-800">Our mission</Link></div></section>
    </main>
  );
}
