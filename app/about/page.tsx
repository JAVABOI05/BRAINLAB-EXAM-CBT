import Link from "next/link";

const values = [
  ["Learning before scores", "Results matter, but lasting understanding matters more."],
  ["Accessibility", "Learning should be usable on everyday phones and slower connections."],
  ["Personalization", "Guidance should reflect real learner needs and be understandable."],
  ["Community", "Learners should be able to learn with and support one another safely."],
  ["Innovation with purpose", "Technology should solve real learning problems, not just look impressive."],
  ["Trust and safety", "Protect learner information and maintain fair assessment practices."],
];

export const metadata = {
  title: "About BrainLab Academy",
  description: "Discover BrainLab Academy's vision, mission, values and long-term learning ecosystem direction.",
};

export default function AboutPage() {
  return (
    <main id="main">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-20">
          <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-blue-800">About BrainLab Academy</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-5xl">A better learning journey, beyond the exam.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">BrainLab Academy is being developed as an intelligent learning ecosystem connecting examination preparation, deeper understanding, collaborative learning and skills development.</p>
          <p className="mt-4 max-w-3xl leading-7 text-slate-600">Our first market is Nigeria, with the ambition to expand across Africa and, over time, serve learners in wider international markets. We will grow the platform in practical stages, starting with a reliable CBT experience and clearly distinguishing live capabilities from future plans.</p>
          <Link href="/cbt" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#012153] px-6 py-3 font-bold text-white transition hover:bg-[#0a2f72]">Explore CBT practice <span aria-hidden="true" className="ml-2">→</span></Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-14 sm:px-8 md:grid-cols-2 lg:py-20">
        <article className="rounded-3xl bg-[#012153] p-7 text-white sm:p-9">
          <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-blue-200">Our vision</p>
          <h2 className="mt-4 text-2xl font-extrabold leading-snug sm:text-3xl">To become Africa&apos;s most trusted and empowering intelligent learning ecosystem, helping every learner access knowledge, develop their potential and build the skills needed for the future.</h2>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
          <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-blue-800">Our mission</p>
          <h2 className="mt-4 text-2xl font-extrabold leading-snug text-slate-950 sm:text-3xl">To make learning more accessible, personalized, collaborative and effective by combining quality educational content, intelligent technology, meaningful assessment and supportive learning communities.</h2>
        </article>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-blue-800">What guides us</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Values that shape every decision.</h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {values.map(([title, description], index) => (
              <article key={title} className="rounded-2xl border border-slate-200 p-6">
                <p className="text-xs font-extrabold tracking-[0.16em] text-blue-800">0{index + 1}</p>
                <h3 className="mt-3 text-lg font-extrabold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14 text-center sm:px-8 lg:py-20">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">A connected experience, built with care.</h2>
        <p className="mx-auto mt-4 max-w-3xl leading-8 text-slate-600">Our long-term direction connects assessment, learning support, community and progress. New capabilities will be introduced only when their quality, safety and usefulness can be tested.</p>
        <Link href="/" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-bold text-slate-800 transition hover:border-slate-500">Back to homepage</Link>
      </section>
    </main>
  );
}
