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
          <h2 className="text-sm font-extrabold uppercase tracking-[0.12em] text-white">Explore</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li><Link className="hover:text-white" href="/explore">Explore all pages</Link></li>
            <li><Link className="hover:text-white" href="/cbt">CBT and exam practice</Link></li>
            <li><Link className="hover:text-white" href="/login">CBT Practice</Link></li>
            <li><Link className="hover:text-white" href="/#learning-paths">Learning pathways</Link></li>
            <li><Link className="hover:text-white" href="/ai-learning">AI learning companion</Link></li>
            <li><Link className="hover:text-white" href="/courses">Courses and resources</Link></li>
            <li><Link className="hover:text-white" href="/community">Learning community</Link></li>
            <li><Link className="hover:text-white" href="/#future-learning">Future learning roadmap</Link></li>
            <li><Link className="hover:text-white" href="/resources">Learning resources</Link></li>
            <li><Link className="hover:text-white" href="/schools">For schools</Link></li>
            <li><Link className="hover:text-white" href="/about">About BrainLab</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-[0.12em] text-white">Help and updates</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li><Link className="hover:text-white" href="/login">Open CBT portal</Link></li>
            <li><Link className="hover:text-white" href="/support">Help and FAQs</Link></li>
            <li><Link className="hover:text-white" href="/contact">Contact</Link></li>
            <li><Link className="hover:text-white" href="/faq">Full FAQ centre</Link></li>
            <li><Link className="hover:text-white" href="/privacy">Privacy notice</Link></li>
            <li><Link className="hover:text-white" href="/terms">Terms of use</Link></li>
            <li><a className="hover:text-white" href="https://whatsapp.com/channel/0029Vb75fko3mFXyaqlnk70m" target="_blank" rel="noreferrer">WhatsApp updates channel</a></li>
          </ul>
          <p className="mt-4 text-xs leading-5 text-slate-400">Official contact and policy pages will be added when verified and ready.</p>
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
