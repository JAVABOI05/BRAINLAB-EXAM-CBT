"use client";

import { useLearnerTheme } from "@/app/components/LearnerThemeProvider";

export default function ArenaThemeToggle({
  compact = true,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const { appearance, resolvedTheme, setAppearance } = useLearnerTheme();

  const toggleTheme = () => {
    if (resolvedTheme === "dark") {
      setAppearance("light");
    } else {
      setAppearance("dark");
    }
  };

  if (compact) {
    const isDarkMode = resolvedTheme === "dark";
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl border transition-all active:scale-95 shadow-2xs bl-focus-ring cursor-pointer shrink-0 ${
          isDarkMode
            ? "border-slate-800 bg-[#0D172E] text-amber-400 hover:bg-slate-800 hover:border-slate-700 hover:text-amber-300"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-300 hover:text-blue-600"
        } ${className}`}
        aria-label={`Switch to ${isDarkMode ? "Light" : "Dark"} Mode`}
        title={`Switch to ${isDarkMode ? "Light" : "Dark"} Mode`}
      >
        {isDarkMode ? (
          // Sun icon for dark mode (click to switch to light)
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </svg>
        ) : (
          // Moon icon for light mode (click to switch to dark)
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        )}
      </button>
    );
  }

  // Full 3-mode selector (when compact === false)
  return (
    <div
      className={`inline-flex items-center p-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/80 text-xs font-bold ${className}`}
    >
      <button
        type="button"
        onClick={() => setAppearance("light")}
        className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
          appearance === "light"
            ? "bg-white text-blue-700 shadow-sm"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        }`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
        </svg>
        <span>Light</span>
      </button>

      <button
        type="button"
        onClick={() => setAppearance("dark")}
        className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
          appearance === "dark"
            ? "bg-[#13203f] text-cyan-300 shadow-sm"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        }`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
        <span>Dark</span>
      </button>

      <button
        type="button"
        onClick={() => setAppearance("system")}
        className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
          appearance === "system"
            ? "bg-white dark:bg-[#13203f] text-blue-700 dark:text-cyan-300 shadow-sm"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        }`}
        title="Follow device system theme"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="20" height="14" x="2" y="3" rx="2" />
          <line x1="8" x2="16" y1="21" y2="21" />
          <line x1="12" x2="12" y1="17" y2="21" />
        </svg>
        <span>Auto</span>
      </button>
    </div>
  );
}
