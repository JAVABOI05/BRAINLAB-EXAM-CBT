export default function Loading() {
  return (
    <main className="flex min-h-[55vh] items-center justify-center px-5 py-16" aria-busy="true" aria-live="polite">
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#012153] text-xl font-black text-white shadow-lg shadow-blue-950/15" aria-hidden="true">B</div>
        <p className="mt-5 text-lg font-extrabold text-slate-950">Preparing your learning space</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">Please wait while BrainLab loads the next page.</p>
        <div className="mt-5 h-1.5 w-44 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-700 motion-reduce:animate-none" />
        </div>
      </div>
    </main>
  );
}
