import Link from "next/link";

export const metadata = {
  title: "Explore BrainLab Academy",
  description: "Browse current BrainLab Academy pages and the Coming Soon areas planned for future development.",
};

const groups = [
  { title: "Start here", description: "The current entry points and the Academy story.", items: [
    { title: "Academy home", href: "/", status: "Available", detail: "Landing page and learning pathways." },
    { title: "About BrainLab", href: "/about", status: "Available", detail: "Vision, mission and values." },
    { title: "CBT portal", href: "/login", status: "Existing service", detail: "Continue to the existing candidate workflow." },
    { title: "Learner account", href: "/account", status: "Existing service", detail: "Sign in, create an account or recover access." },
    { title: "Learner dashboard", href: "/dashboard", status: "First version", detail: "A starting point for current learner tools." },
    { title: "Revision planner", href: "/learning/revision", status: "First version", detail: "Browser-local study goals and topic checklist." },
    { title: "Help and support", href: "/support", status: "Available", detail: "Current CBT and account FAQs." },
  ]},
  { title: "Learning and practice", description: "Planned spaces for study resources and new ways to practise.", items: [
    { title: "CBT and Exam Practice", href: "/cbt", status: "Coming soon", detail: "A dedicated overview of available practice." },
    { title: "AI Learning Companion", href: "/ai-learning", status: "Roadmap", detail: "Responsible AI-assisted explanations and practice." },
    { title: "Courses", href: "/courses", status: "Roadmap", detail: "Future structured learning pathways." },
    { title: "My Courses", href: "/learning/courses", status: "Coming soon", detail: "A future personal course area." },
    { title: "Learning Resources", href: "/resources", status: "Coming soon", detail: "Reviewed notes and topic guides." },
    { title: "Knowledge Base", href: "/knowledge-base", status: "Coming soon", detail: "A searchable reference library." },
    { title: "Challenge Arena", href: "/challenge-arena", status: "Coming soon", detail: "Optional practice challenges." },
  ]},
  { title: "Progress and portfolio", description: "Personal learning views planned for future development.", items: [
    { title: "My Progress", href: "/learning/progress", status: "Coming soon", detail: "Account-linked learning and practice signals." },
    { title: "Achievements", href: "/learning/achievements", status: "Coming soon", detail: "Verified milestones, when supported." },
    { title: "Learning DNA", href: "/learning-dna", status: "Concept", detail: "Explainable, data-supported learning insights." },
    { title: "Skills Passport", href: "/skills-passport", status: "Concept", detail: "A learner-controlled project and skills portfolio." },
  ]},
  { title: "Community", description: "Future moderated peer-learning spaces.", items: [
    { title: "Community overview", href: "/community", status: "Roadmap", detail: "The intended study community and safeguards." },
    { title: "Study Groups", href: "/study-groups", status: "Coming soon", detail: "Moderated subject and goal-based study circles." },
    { title: "Discussions", href: "/community/discussions", status: "Coming soon", detail: "Academic questions and peer discussion." },
    { title: "Messages", href: "/messages", status: "Coming soon", detail: "Private messaging, subject to safety design." },
    { title: "Notifications", href: "/notifications", status: "Coming soon", detail: "Important account and learning updates." },
  ]},
  { title: "For institutions and support", description: "Public information and essential policy pages.", items: [
    { title: "For Schools", href: "/schools", status: "Coming soon", detail: "Future school and institutional information." },
    { title: "Contact", href: "/contact", status: "Coming soon", detail: "A central verified contact directory." },
    { title: "FAQs", href: "/faq", status: "Coming soon", detail: "A fuller help centre." },
    { title: "Privacy Notice", href: "/privacy", status: "Draft pending", detail: "Not a complete legal policy yet." },
    { title: "Terms of Use", href: "/terms", status: "Draft pending", detail: "Not a complete legal terms document yet." },
  ]},
];

export default function ExplorePage() {
  return (
    <main id="main">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
          <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-blue-800">Academy directory</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-5xl">The map of BrainLab Academy.</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">Use this directory to see what is available now and which areas are reserved for future work. “Coming soon” means the page structure exists, not that the underlying feature is active.</p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-blue-50 px-3 py-2 text-blue-900">Available now</span><span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">Coming soon / roadmap</span><span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700">Policy review required</span></div>
        </div>
      </section>
      <div className="mx-auto max-w-7xl space-y-12 px-5 py-12 sm:px-8 lg:py-16">
        {groups.map((group) => <section key={group.title}><div className="max-w-2xl"><h2 className="text-2xl font-extrabold text-slate-950">{group.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{group.description}</p></div><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{group.items.map((item) => <article key={item.href} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><h3 className="font-extrabold text-slate-950">{item.title}</h3><span className={item.status === "Available" || item.status === "Existing service" || item.status === "First version" ? "shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-900" : "shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-900"}>{item.status}</span></div><p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{item.detail}</p><Link href={item.href} className="mt-4 inline-flex min-h-10 items-center font-bold text-blue-800 underline underline-offset-4">Open page <span aria-hidden="true" className="ml-2">→</span></Link></article>)}</div></section>)}
      </div>
    </main>
  );
}
