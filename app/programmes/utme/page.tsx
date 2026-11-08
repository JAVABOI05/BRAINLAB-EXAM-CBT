import type { Metadata } from "next";
import { ProgrammePageTemplate, ProgrammeData } from "@/app/components/public/ProgrammePageTemplate";

export const metadata: Metadata = {
  title: "JAMB UTME Comprehensive Preparation Programme | BrainLab Academy",
  description:
    "Master the Unified Tertiary Matriculation Examination with authentic 180-question mock tests, 4-subject combos, calculator integration, and syllabus notes.",
  alternates: { canonical: "/programmes/utme" },
};

const UTME_DATA: ProgrammeData = {
  id: "prog-utme",
  slug: "utme",
  title: "JAMB UTME Comprehensive Programme",
  badge: "Official Exam Prep",
  tagline: "Target 300+ in the Unified Tertiary Matriculation Examination.",
  summary:
    "An intensive, syllabus-aligned preparation programme covering all official JAMB subjects. Features timed 180-question mock examinations, scientific & standard calculator modes, automated mistake diagnostics, and SM-2 spaced repetition for formula retention.",
  status: "active",
  whoItIsFor: [
    "Secondary school graduates preparing for university entrance across Nigerian federal, state, and private universities.",
    "SS3 candidates sitting for UTME concurrently with their senior school certificate examinations.",
    "Candidates looking to improve on previous UTME scores with systematic weakness diagnosis.",
    "Independent self-study students requiring structured daily drills and past-question explanations.",
  ],
  objectives: [
    "Achieve mastery of the compulsory Use of English syllabus, including comprehension and novel analysis.",
    "Attain test-day time management agility: complete 60 English questions and 40 questions per subject within the 2-hour official duration.",
    "Eliminate recurring calculation and theoretical errors through targeted 5-question AI diagnostic drills.",
    "Retain critical mathematical theorems, chemical equations, and physics laws using daily spaced repetition decks.",
  ],
  subjects: [
    {
      name: "Use of English (Compulsory)",
      category: "Compulsory",
      coverage: "Comprehension passages, Lexis & Structure, Oral English forms, and prescribed JAMB novel study.",
      topicCount: 14,
    },
    {
      name: "Mathematics",
      category: "Science",
      coverage: "Number bases, fractions, algebra, calculus, matrices, trigonometry, statistics, and vectors.",
      topicCount: 20,
    },
    {
      name: "Physics",
      category: "Science",
      coverage: "Mechanics, thermal physics, waves & optics, electricity & magnetism, and modern nuclear physics.",
      topicCount: 18,
    },
    {
      name: "Chemistry",
      category: "Science",
      coverage: "Atomic structure, stoichiometry, chemical energetics, equilibrium, organic chemistry, and environmental chemistry.",
      topicCount: 16,
    },
    {
      name: "Biology",
      category: "Science",
      coverage: "Cell biology, plant & animal physiology, ecology, genetics, heredity, and evolutionary trends.",
      topicCount: 15,
    },
    {
      name: "Economics & Government",
      category: "Commercial & Social Sciences",
      coverage: "Micro & macro economics, public finance, international trade, constitution development, and political systems.",
      topicCount: 17,
    },
  ],
  includedProducts: [
    {
      name: "CBT Practice Simulator",
      badge: "Core Exam Engine",
      description: "Official 4-subject UTME simulation with timer, calculator, and 8-key navigation.",
      href: "/products/cbt",
    },
    {
      name: "Curriculum Learning Hub",
      badge: "Syllabus Notes",
      description: "Comprehensive topic notes linked directly to relevant past exam questions.",
      href: "/products/learning-hub",
    },
    {
      name: "AI Study Studio",
      badge: "Diagnostic AI",
      description: "Automated analysis of incorrect options and 5-question reinforcement drills.",
      href: "/products/ai-learning",
    },
    {
      name: "STEM Studio",
      badge: "Virtual Labs",
      description: "Interactive physics kinematics and chemistry titration virtual experiments.",
      href: "/products/stem-studio",
    },
  ],
  teachingFormat: "Self-Paced CBT Simulator + AI Guidance + Live Masterclasses",
  schedule: "Daily on-demand practice with weekly live masterclass sessions",
  duration: "3 to 6 Months recommended",
  priceNote: "Included in Free & Premium plans",
  checkoutHref: "/pricing",
  enrolmentSteps: [
    {
      step: 1,
      title: "Create Your Free Student Account",
      description: "Sign up with your email or phone number to set your 4 UTME subject combination.",
    },
    {
      step: 2,
      title: "Take a Diagnostic Baseline Mock Test",
      description: "Complete a full 180-question mock exam to map your baseline score and subject strengths.",
    },
    {
      step: 3,
      title: "Engage Daily AI Weakness Drills",
      description: "Work through customized 5-question drills and spaced repetition decks to secure your target score.",
    },
  ],
  faqs: [
    {
      question: "Does BrainLab match the authentic 2026 JAMB CBT screen interface?",
      answer: "Yes. Our CBT simulator accurately mirrors the real JAMB screen: an 8-key shortcut keyboard layout (A, B, C, D, N, P, R, S), real-time countdown timer, and built-in on-screen calculator.",
    },
    {
      question: "Can I practise on a weak mobile network or offline?",
      answer: "Yes. BrainLab features Progressive Web App (PWA) offline caching. Exam question packages download locally so you can complete full mocks even if the connection drops.",
    },
    {
      question: "Is the current JAMB prescribed novel included?",
      answer: "Yes. The curriculum includes chapter-by-chapter summaries, character profiles, themes, and dedicated practice questions for the prescribed UTME novel.",
    },
  ],
};

export default function UtmeProgrammePage() {
  return <ProgrammePageTemplate data={UTME_DATA} />;
}
