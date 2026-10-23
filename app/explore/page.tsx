import Link from "next/link";

export const metadata = {
  title: "Explore BrainLab Academy",
  description: "Browse BrainLab Academy's complete learning spaces, CBT portals, study circles, and institutional tools.",
};

const sections = [
  { title: "Current core spaces", description: "The live and operational areas of BrainLab Academy.", items: [
    { title: "Home", href: "/", status: "Available", detail: "The platform homepage and entry points." },
    { title: "CBT Practice", href: "/cbt", status: "Available", detail: "JAMB UTME past question practice and mock portal." },
    { title: "Learning Hub", href: "/learn", status: "Available", detail: "Curriculum-aligned lessons, syllabus, and study notes." },
    { title: "Dashboard", href: "/dashboard", status: "Available", detail: "Your personalized study hub and revision progress." },
    { title: "Revision planner", href: "/learning/revision", status: "Available", detail: "Account-linked study goals and topic checklist." },
    { title: "Help and support", href: "/support", status: "Available", detail: "CBT guides, Bachs payment help, and account FAQs." },
  ]},
  { title: "Learning and practice", description: "Live academic resources, formula sheets, and interactive practice tools.", items: [
    { title: "Formula Sheets & Resources", href: "/resources", status: "Available", detail: "High-yield formulas, laws, and concord rules." },
    { title: "Knowledge Base", href: "/knowledge-base", status: "Available", detail: "Searchable academic reference library and FAQs." },
    { title: "Challenge Arena", href: "/challenge-arena", status: "Available", detail: "Daily 10-question sprint competitions & streaks." },
    { title: "Self-Paced Practice", href: "/self-practice", status: "Available", detail: "Custom timed CBT quizzes across past papers." },
    { title: "AI Learning Companion", href: "/ai-learning", status: "Available", detail: "AI-assisted explanations and topic summaries." },
    { title: "Classroom Stage", href: "/classroom/BL-LIVE-101", status: "Available", detail: "Live audio classroom and tutor presentations." },
  ]},
  { title: "Progress and portfolio", description: "Personalized diagnostics, study records, and achievement tracking.", items: [
    { title: "Learning DNA Diagnostic", href: "/learning-dna", status: "Available", detail: "Predicted JAMB score and competency spectrum." },
    { title: "Study Report & Badges", href: "/skills-passport", status: "Available", detail: "Mastery radar, verified certificates, and progress report." },
    { title: "Achievements & Streaks", href: "/learning/achievements", status: "Available", detail: "Study streaks, reward badges, and milestones." },
    { title: "National Leaderboard", href: "/leaderboard", status: "Available", detail: "Top candidate rankings across Nigeria." },
  ]},
  { title: "Community & Peer Learning", description: "Moderated peer circles, cohorts, and academic discussions.", items: [
    { title: "Community Overview", href: "/community", status: "Available", detail: "Academic cohorts, rules, and community guidelines." },
    { title: "Study Groups & Circles", href: "/study-groups", status: "Available", detail: "Moderated subject cohorts (Medicine, Engineering, Arts)." },
    { title: "Discussions & Q&A", href: "/community/discussions", status: "Available", detail: "Peer-to-peer past question explanations." },
    { title: "Direct Messaging", href: "/messages", status: "Available", detail: "Secure communication with tutors and circle leads." },
  ]},
  { title: "Institutions & Essential Policies", description: "School licensing, directory, and verified policies.", items: [
    { title: "For Schools & Institutions", href: "/schools", status: "Available", detail: "Computer lab CBT licensing and mock exam simulator." },
    { title: "Official Contact Directory", href: "/contact", status: "Available", detail: "Central contact lines, WhatsApp desk, and emails." },
    { title: "Comprehensive FAQs", href: "/faq", status: "Available", detail: "Searchable directory for parents, schools, and students." },
    { title: "Privacy Notice", href: "/privacy", status: "Available", detail: "Official NDPR-compliant data protection notice." },
    { title: "Terms of Use", href: "/terms", status: "Available", detail: "Governing terms, fair use, and academic integrity." },
  ]},
];

export default function ExplorePage() {
  return (
    <main id="main">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-800">Sitemap and platform overview</span>
          <h1 className="mt-3 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-5xl">Explore BrainLab Academy.</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">A clear index of current features, learning spaces, and institutional capabilities across the BrainLab platform.</p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
        <div className="space-y-12">
          {sections.map((section) => (
            <div key={section.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-extrabold text-slate-950">{section.title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{section.description}</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {section.items.map((item) => (
                  <article key={item.title} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-base font-extrabold text-slate-950">{item.title}</h3>
                        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                          {item.status}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-6 text-slate-600">{item.detail}</p>
                    </div>
                    <Link href={item.href} className="mt-4 inline-flex items-center text-xs font-bold text-blue-800 hover:text-blue-950">
                      Open page <span aria-hidden="true" className="ml-1">→</span>
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
