"use client";

import Link from "next/link";
import { trackEvent } from "@/app/lib/analytics";

interface ProgrammeCardLinkProps {
  slug: string;
  title: string;
  href: string;
  isPlanned: boolean;
}

export function ProgrammeCardLink({
  slug,
  title,
  href,
  isPlanned,
}: ProgrammeCardLinkProps) {
  const handleClick = () => {
    trackEvent("programme_selected", {
      programme_slug: slug,
      programme_title: title,
      is_planned: isPlanned,
    });
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={`inline-flex w-full items-center justify-center rounded-xl py-3 text-xs font-black transition ${
        isPlanned
          ? "border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
          : "bg-blue-700 text-white hover:bg-blue-800 dark:bg-cyan-600 dark:hover:bg-cyan-500"
      }`}
    >
      {isPlanned ? "View Development Roadmap →" : "Explore Programme Details →"}
    </Link>
  );
}
