import Image from "next/image";
import Link from "next/link";

export default function BrandFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#00112b] text-slate-200">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Link href="/" className="inline-flex rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300" aria-label="BrainLab Academy home">
            <Image src="/brainlab-logo-light.svg" alt="BrainLab Academy" width={110} height={61} className="h-12 w-auto" />
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-7 text-slate-300">Learn smarter, practise with purpose and keep progressing. A learning ecosystem being built in stages.</p>
        </div>
        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-[0.12em] text-white">Learn &amp; Practise</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li><Link className="hover:text-white" href="/login">CBT Practice</Link></li>
            <li><Link className="hover:text-white" href="/learn">Learning Hub</Link></li>
            <li><Link className="hover:text-white" href="/learn?tab=timetable">Timetable &amp; Schedule</Link></li>
            <li><Link className="hover:text-white" href="/classroom/demo-class">Live Classroom Stage</Link></li>
            <li><Link className="hover:text-white" href="/recordings">Class Recordings</Link></li>
            <li><Link className="hover:text-white" href="/messages">Messages &amp; Discussions</Link></li>
            <li><Link className="hover:text-white" href="/self-practice">Self Practice</Link></li>
            <li><Link className="hover:text-white" href="/assessments">Quizzes &amp; Competitions</Link></li>
            <li><Link className="hover:text-white" href="/ai-learning">AI Learning</Link></li>
            <li><Link className="hover:text-white" href="/about">About BrainLab</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-[0.12em] text-white">Account &amp; Help</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li><Link className="hover:text-white" href="/dashboard">My learning space</Link></li>
            <li><Link className="hover:text-white" href="/account/access">Membership &amp; access</Link></li>
            <li><Link className="hover:text-white" href="/support">Help and FAQs</Link></li>
            <li><Link className="hover:text-white" href="/contact">Contact</Link></li>
            <li><Link className="hover:text-white" href="/privacy">Privacy notice</Link></li>
            <li><Link className="hover:text-white" href="/terms">Terms of use</Link></li>
            <li><a className="hover:text-white" href="https://whatsapp.com/channel/0029Vb75fko3mFXyaqlnk70m" target="_blank" rel="noreferrer">WhatsApp updates</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-slate-400 sm:px-8 md:flex-row md:items-center md:justify-between">
          <span>© {year} BrainLab Academy. All rights reserved.</span>
          <span>Built around learning, practice and progress.</span>
        </div>
      </div>
    </footer>
  );
}
