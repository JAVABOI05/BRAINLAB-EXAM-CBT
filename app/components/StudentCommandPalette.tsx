"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { getUniversities } from "@/app/lib/nigerianInstitutions";

export interface SearchItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "Subjects & Syllabus" | "Simulators & Tools" | "Universities & Cut-offs" | "Study & Revisions" | "Account & Records";
  href: string;
  badge?: string;
  keywords?: string[];
}

const STATIC_SEARCH_ITEMS: SearchItem[] = [
  // Simulators & Tools
  {
    id: "tool-cbt",
    title: "CBT Exam Room Simulator",
    subtitle: "Authentic 4-subject 400-mark timed mock with 8-keypad parity",
    category: "Simulators & Tools",
    href: "/cbt",
    badge: "Official Engine",
    keywords: ["jamb", "mock", "exam", "test", "practice", "questions", "timer", "cbt"],
  },
  {
    id: "tool-self-practice",
    title: "Self-Practice Question Bank",
    subtitle: "Custom-configured drills with on-demand Socratic AI hints",
    category: "Simulators & Tools",
    href: "/self-practice",
    badge: "Flexible Drills",
    keywords: ["practice", "drill", "random", "untimed", "custom", "questions"],
  },
  {
    id: "tool-arena",
    title: "1v1 Challenge Arena",
    subtitle: "Real-time academic speed duels, blitzes, and national rankings",
    category: "Simulators & Tools",
    href: "/challenge-arena",
    badge: "Live Duels",
    keywords: ["arena", "pvp", "duel", "speed", "competition", "blitz", "leaderboard"],
  },
  {
    id: "tool-ai-learning",
    title: "Socratic AI Study Studio",
    subtitle: "Interactive formula breakdowns and step-by-step guidance",
    category: "Simulators & Tools",
    href: "/ai-learning",
    badge: "AI Powered",
    keywords: ["ai", "tutor", "hints", "derivations", "explanations", "socratic", "chat"],
  },
  {
    id: "tool-stem",
    title: "Virtual STEM Studio 3D",
    subtitle: "Interactive 3D molecules, circuit simulations, and physics labs",
    category: "Simulators & Tools",
    href: "/classroom/stem",
    badge: "3D Labs",
    keywords: ["stem", "lab", "physics", "circuits", "chemistry", "molecules", "krebs"],
  },
  {
    id: "tool-diagnostic",
    title: "Diagnostic Test & Readiness Engine",
    subtitle: "Identify syllabus weak spots and target cut-off margins",
    category: "Simulators & Tools",
    href: "/cbt/diagnostic",
    badge: "Assessment",
    keywords: ["diagnostic", "assessment", "readiness", "weakness", "score"],
  },

  // Subjects & Syllabus
  {
    id: "subj-english",
    title: "Use of English Syllabus",
    subtitle: "Lexis, structure, comprehension, and subject-verb concord rules",
    category: "Subjects & Syllabus",
    href: "/syllabus?subject=use-of-english",
    badge: "Compulsory",
    keywords: ["english", "concord", "comprehension", "lexis", "grammar", "synonyms"],
  },
  {
    id: "subj-maths",
    title: "Mathematics Syllabus & Modules",
    subtitle: "Algebra, calculus, matrices, trigonometry, and statistics",
    category: "Subjects & Syllabus",
    href: "/syllabus?subject=mathematics",
    badge: "Science/Commercial",
    keywords: ["maths", "math", "calculus", "algebra", "quadratic", "geometry", "trigonometry"],
  },
  {
    id: "subj-physics",
    title: "Physics Syllabus & Modules",
    subtitle: "Mechanics, waves, electricity, atomic physics, and thermodynamics",
    category: "Subjects & Syllabus",
    href: "/syllabus?subject=physics",
    badge: "Science",
    keywords: ["physics", "electricity", "mechanics", "motion", "energy", "waves", "optics"],
  },
  {
    id: "subj-chemistry",
    title: "Chemistry Syllabus & Modules",
    subtitle: "Periodic table, stoichiometry, organic chemistry, and electrolysis",
    category: "Subjects & Syllabus",
    href: "/syllabus?subject=chemistry",
    badge: "Science",
    keywords: ["chemistry", "organic", "reactions", "acids", "bases", "salts", "electrolysis"],
  },
  {
    id: "subj-biology",
    title: "Biology Syllabus & Modules",
    subtitle: "Genetics, physiology, cell biology, ecology, and evolution",
    category: "Subjects & Syllabus",
    href: "/syllabus?subject=biology",
    badge: "Science/Health",
    keywords: ["biology", "genetics", "cells", "respiration", "ecology", "heredity", "organs"],
  },
  {
    id: "subj-economics",
    title: "Economics Syllabus & Modules",
    subtitle: "Microeconomics, national income, monetary policy, and public finance",
    category: "Subjects & Syllabus",
    href: "/syllabus?subject=economics",
    badge: "Social Sciences",
    keywords: ["economics", "demand", "supply", "inflation", "market", "finance", "gdp"],
  },
  {
    id: "subj-government",
    title: "Government Syllabus & Modules",
    subtitle: "Constitutional development, political ideologies, and public institutions",
    category: "Subjects & Syllabus",
    href: "/syllabus?subject=government",
    badge: "Arts/Social",
    keywords: ["government", "constitution", "democracy", "politics", "citizenship"],
  },
  {
    id: "subj-literature",
    title: "Literature in English Syllabus",
    subtitle: "Prescribed African and non-African drama, prose, and poetry",
    category: "Subjects & Syllabus",
    href: "/syllabus?subject=literature-in-english",
    badge: "Arts & Humanities",
    keywords: ["literature", "drama", "poetry", "prose", "shakespeare", "african"],
  },

  // Study & Revisions
  {
    id: "study-learn-hub",
    title: "Curriculum Learning Hub",
    subtitle: "Organised lesson notes, video walkthroughs, and progress tracking",
    category: "Study & Revisions",
    href: "/learn",
    badge: "Curriculum",
    keywords: ["learn", "hub", "lessons", "topics", "notes", "curriculum"],
  },
  {
    id: "study-resources",
    title: "Academic Resources & Formula Sheets",
    subtitle: "Verified mathematical formulas, physics constants, and revision sheets",
    category: "Study & Revisions",
    href: "/resources",
    badge: "Formulas",
    keywords: ["resources", "formulas", "cheatsheet", "summary", "constants", "rules"],
  },
  {
    id: "study-flashcards",
    title: "Spaced Repetition Flashcards",
    subtitle: "Active recall memory training calibrated for high-yield exam retention",
    category: "Study & Revisions",
    href: "/learn?tab=flashcards",
    badge: "Active Recall",
    keywords: ["flashcards", "cards", "spaced", "memory", "revision", "recall"],
  },
  {
    id: "study-timetable",
    title: "Live Timetable & Schedules",
    subtitle: "Daily interactive classes, masterclass schedule, and instructor hours",
    category: "Study & Revisions",
    href: "/learn?tab=timetable",
    badge: "Calendar",
    keywords: ["timetable", "schedule", "classes", "calendar", "live", "sessions"],
  },
  {
    id: "study-recordings",
    title: "Classroom Lecture Recordings",
    subtitle: "Replay past live masterclasses with whiteboard derivations",
    category: "Study & Revisions",
    href: "/recordings",
    badge: "Video Vault",
    keywords: ["recordings", "replays", "lectures", "archive", "videos"],
  },
  {
    id: "study-community",
    title: "Study Circles & Peer Discussion",
    subtitle: "Topic discussion channels, study cohorts, and peer Q&A",
    category: "Study & Revisions",
    href: "/community",
    badge: "Community",
    keywords: ["community", "groups", "chat", "peers", "discussion", "friends"],
  },
  {
    id: "study-quizzes",
    title: "Quizzes & Competitive Assessments",
    subtitle: "Published school quizzes and national competition tournaments",
    category: "Study & Revisions",
    href: "/assessments",
    badge: "Quizzes",
    keywords: ["quizzes", "assessments", "contests", "competitions", "drills"],
  },

  // Account & Records
  {
    id: "rec-history",
    title: "Exam History & Official Certificates",
    subtitle: "Verified scorecards, attempt timestamps, and cryptographic certificates",
    category: "Account & Records",
    href: "/student/exams",
    badge: "Certificates",
    keywords: ["history", "results", "certificates", "attempts", "scores", "transcripts"],
  },
  {
    id: "rec-profile",
    title: "Student Identity & Profile Studio",
    subtitle: "Configure scholar avatar, dream school, target course, and study vibe",
    category: "Account & Records",
    href: "/profile",
    badge: "Identity",
    keywords: ["profile", "avatar", "ambition", "goals", "dream", "name"],
  },
  {
    id: "rec-skills",
    title: "Skills Passport & Achievement Badges",
    subtitle: "Gamification badges, streaks, verified mastery, and milestones",
    category: "Account & Records",
    href: "/skills-passport",
    badge: "Milestones",
    keywords: ["badges", "achievements", "passport", "streaks", "xp", "rank"],
  },
  {
    id: "rec-leaderboard",
    title: "National Student Leaderboard",
    subtitle: "Compare XP, streak points, and accuracy ratings against peers nationwide",
    category: "Account & Records",
    href: "/leaderboard",
    badge: "Rankings",
    keywords: ["leaderboard", "rank", "top", "xp", "scores", "champions"],
  },
  {
    id: "rec-pricing",
    title: "Subscription Plans & Cohort Access",
    subtitle: "Compare free Standard access with intensive Apex Cohort mentorship",
    category: "Account & Records",
    href: "/pricing",
    badge: "Plans",
    keywords: ["pricing", "plans", "cohort", "apex", "subscription", "upgrade", "tuition"],
  },
  {
    id: "rec-faq",
    title: "Helpdesk & Knowledge Base",
    subtitle: "Frequently asked questions, CBT instructions, and support",
    category: "Account & Records",
    href: "/faq",
    badge: "Support",
    keywords: ["faq", "help", "support", "helpdesk", "contact", "whatsapp"],
  },
];

interface StudentCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StudentCommandPalette({ isOpen, onClose }: StudentCommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load universities dynamically for university search items
  const universityItems = useMemo<SearchItem[]>(() => {
    try {
      const unis = getUniversities();
      return unis.slice(0, 30).map((u) => ({
        id: `uni-${u.id}`,
        title: u.acronym ? `${u.name} (${u.acronym})` : u.name,
        subtitle: `${u.category} University · ${u.state} State · Target cut-off benchmarks`,
        category: "Universities & Cut-offs" as const,
        href: `/cbt?target=${u.id}`,
        badge: u.category,
        keywords: [u.name, u.acronym, u.state, "university", "cutoff", "admission"],
      }));
    } catch {
      return [];
    }
  }, []);

  const allItems = useMemo(() => {
    return [...STATIC_SEARCH_ITEMS, ...universityItems];
  }, [universityItems]);

  const filteredItems = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      // Default: Top recommended items
      return STATIC_SEARCH_ITEMS.slice(0, 10);
    }

    return allItems
      .filter((item) => {
        if (item.title.toLowerCase().includes(q)) return true;
        if (item.subtitle && item.subtitle.toLowerCase().includes(q)) return true;
        if (item.category.toLowerCase().includes(q)) return true;
        if (item.badge && item.badge.toLowerCase().includes(q)) return true;
        if (item.keywords && item.keywords.some((k) => k.toLowerCase().includes(q))) return true;
        return false;
      })
      .slice(0, 12);
  }, [allItems, query]);

  // Reset selectedIndex on search change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Global key navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
          e.preventDefault();
          onClose(); // toggle logic if needed
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1 < filteredItems.length ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = filteredItems[selectedIndex];
        if (selected) {
          router.push(selected.href);
          onClose();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, router, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Student Command Palette and Quick Search"
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 lg:p-8 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity animate-in fade-in"
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A1120] text-slate-900 dark:text-white shadow-2xl overflow-hidden mt-12 sm:mt-16 animate-in zoom-in-95 duration-150">
        {/* Search Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/[0.08] px-5 py-4">
          <svg
            className="h-5 w-5 text-blue-600 dark:text-cyan-400 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subjects, topics, CBT mock, formulas, or universities..."
            className="w-full bg-transparent text-sm sm:text-base font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1"
            >
              Clear
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-100 dark:bg-white/[0.06] px-2 py-1 text-[11px] font-mono text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.1] transition cursor-pointer"
          >
            ESC
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-2 sm:p-3 space-y-1">
          {filteredItems.length > 0 ? (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    router.push(item.href);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition cursor-pointer ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold truncate">{item.title}</span>
                      {item.badge && (
                        <span
                          className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-cyan-300 border border-blue-200/50 dark:border-blue-800/50"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    {item.subtitle && (
                      <p
                        className={`text-xs mt-0.5 line-clamp-1 ${
                          isSelected ? "text-blue-100" : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {item.subtitle}
                      </p>
                    )}
                  </div>

                  <span
                    className={`text-[10px] font-semibold shrink-0 uppercase tracking-wider ${
                      isSelected ? "text-blue-100" : "text-slate-400"
                    }`}
                  >
                    {item.category} &rarr;
                  </span>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400">
              <p className="text-sm font-semibold">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-xs mt-1">Try searching by subject, exam (e.g. &ldquo;Physics&rdquo;, &ldquo;Calculus&rdquo;, &ldquo;UNILAG&rdquo;), or formula sheet.</p>
            </div>
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/[0.08] px-5 py-3 text-[11px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-[#070D18]">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded border border-slate-300 dark:border-white/10 px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                &uarr; &darr;
              </kbd>{" "}
              Navigate
            </span>
            <span>
              <kbd className="rounded border border-slate-300 dark:border-white/10 px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                &crarr;
              </kbd>{" "}
              Open
            </span>
          </div>
          <span>BrainLab Global Study Navigator</span>
        </div>
      </div>
    </div>
  );
}
