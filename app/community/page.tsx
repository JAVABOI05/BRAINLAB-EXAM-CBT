import Link from "next/link";

export const metadata = {
  title: "Learning Community",
  description: "Explore BrainLab Academy's planned approach to moderated study groups and peer learning.",
};

const ideas = [
  ["Study circles", "Small groups organised around a subject, exam goal or topic learners want to understand."],
  ["Topic discussions", "A structured place to ask academic questions, share study approaches and learn respectfully."],
  ["Shared revision goals", "A future way for learners to encourage one another and stay accountable to realistic study plans."],
  ["Safer participation", "Community features will need reporting, moderation, privacy controls and clear rules before launch."],
];

export default function CommunityPage() {
  return (
    <main id="main">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-900">Planned capability</span>
          <h1 className="mt-5 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-5xl">Learning is better when we learn together.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">BrainLab Academy aims to make room for supportive peer learning through study circles and academic discussions. Community participation, live chat and group messaging are not available on this page yet.</p>
          <Link href="/login" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#012153] px-6 py-3 font-bold text-white hover:bg-[#0a2f72]">Start with CBT practice <span aria-hidden="true" className="ml-2">→</span></Link>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-blue-800">The intended community</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">A place to ask, share and make progress.</h2>
          <p className="mt-4 leading-7 text-slate-600">The goal is a useful academic space, not an unmoderated social feed. Features should help learners focus on learning and give them clear ways to protect themselves.</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {ideas.map(([title, description], index) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-extrabold tracking-[0.16em] text-blue-800">0{index + 1}</p><h3 className="mt-3 text-xl font-extrabold text-slate-950">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{description}</p></article>)}
        </div>
      </section>
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-12 sm:px-8 md:grid-cols-2 lg:py-16">
          <article className="rounded-2xl bg-white p-6 ring-1 ring-slate-200"><h2 className="text-xl font-extrabold text-slate-950">Community rules must come first</h2><p className="mt-3 text-sm leading-7 text-slate-600">Before opening discussions, BrainLab needs clear conduct standards, moderation ownership, reporting and blocking flows, age-appropriate protections, and a response process for harmful content.</p></article>
          <article className="rounded-2xl bg-white p-6 ring-1 ring-slate-200"><h2 className="text-xl font-extrabold text-slate-950">No public member directory yet</h2><p className="mt-3 text-sm leading-7 text-slate-600">This overview does not expose learner profiles, messages or personal information. Any future community data must be protected with server-side authorization and suitable privacy controls.</p></article>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-5 py-14 text-center sm:px-8 lg:py-20"><h2 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Build your study habit while the community takes shape.</h2><p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600">Use the first-version revision planner to organise topics on this device, or continue with the existing CBT portal.</p><div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/learning/revision" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#012153] px-6 py-3 font-bold text-white">Open revision planner</Link><Link href="/about" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-bold text-slate-800">About BrainLab</Link></div></section>
    </main>
  );
}
