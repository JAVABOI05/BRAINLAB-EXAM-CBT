import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-[70vh] items-center justify-center px-5 py-16">
      <div className="mx-auto max-w-xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-blue-900">
          <svg className="h-3.5 w-3.5 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>404 Error &bull; Page Not Found</span>
        </div>

        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">
          We couldn&apos;t find that page
        </h1>

        <p className="mt-3 text-base leading-7 text-slate-600">
          The link you followed may be broken, or the learning module may have moved.
          Don&apos;t worry — your revision progress and exam sessions are safe.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-xl bg-[#012153] px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#0d3475]"
          >
            ← Return to Home
          </Link>
          <Link
            href="/learning/revision"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50 transition"
          >
            Revision Planner
          </Link>
          <Link
            href="/resources"
            className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-900 hover:bg-blue-100 transition"
          >
            Formula Sheets
          </Link>
        </div>

        <p className="mt-10 text-xs text-slate-600 dark:text-slate-400">
          Need academic or technical support? Email{" "}
          <a
            href="mailto:support@brainlab.edu.ng"
            className="font-bold text-blue-800 dark:text-cyan-400 underline underline-offset-2"
          >
            support@brainlab.edu.ng
          </a>
        </p>
      </div>
    </main>
  );
}
