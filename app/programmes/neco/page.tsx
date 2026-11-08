import type { Metadata } from "next";
import { ProgrammePageTemplate, ProgrammeData } from "@/app/components/public/ProgrammePageTemplate";

export const metadata: Metadata = {
  title: "NECO SSCE National Senior School Preparation | BrainLab Academy",
  description:
    "Prepare for NECO June/July and Nov/Dec examinations with official syllabus coverage, past questions, and diagnostic drills.",
  alternates: { canonical: "/programmes/neco" },
};

const NECO_DATA: ProgrammeData = {
  id: "prog-neco",
  slug: "neco",
  title: "NECO SSCE Senior School Examination Programme",
  badge: "National Examination",
  tagline: "Achieve credit and distinction grades in the National Examinations Council tests.",
  summary:
    "Built specifically for candidates sitting for NECO June/July internal and Nov/Dec external examinations. Our structured learning modules and practice tests follow NECO's national curriculum benchmarks.",
  status: "active",
  whoItIsFor: [
    "SS3 candidates sitting for the June/July NECO Senior School Certificate Examination.",
    "External private candidates registering for the November/December NECO GCE series.",
    "Schools and tutorial centres running parallel preparation for both WAEC and NECO candidates.",
  ],
  objectives: [
    "Ensure complete coverage of the national senior secondary education curriculum.",
    "Build exam-room confidence through realistic timed multiple-choice and theory-guided sessions.",
    "Reinforce mastery in compulsory English and Mathematics credit requirements.",
  ],
  subjects: [
    {
      name: "English Language & Mathematics",
      category: "Compulsory",
      coverage: "Complete NECO syllabus for comprehension, essay, grammar, core arithmetic, and geometry.",
      topicCount: 20,
    },
    {
      name: "Natural Sciences (Physics, Chemistry, Biology)",
      category: "Science",
      coverage: "Scientific theory, formulas, biological diagrams, chemical reactions, and experiment methods.",
      topicCount: 26,
    },
    {
      name: "Commercial & Business Subjects",
      category: "Commercial & Social Sciences",
      coverage: "Commerce, Bookkeeping, Financial Accounting, Economics, and Office Practice.",
      topicCount: 16,
    },
    {
      name: "Social Sciences & Humanities",
      category: "Arts & Humanities",
      coverage: "Government, Civic Education, Christian Religious Studies, Islamic Studies, and History.",
      topicCount: 18,
    },
  ],
  includedProducts: [
    {
      name: "CBT Practice Simulator",
      badge: "Timed Mocks",
      description: "Timed practice sessions with automatic scoring and instant correction reviews.",
      href: "/products/cbt",
    },
    {
      name: "Learning Hub",
      badge: "Curriculum Modules",
      description: "Step-by-step modular notes for each syllabus topic across all secondary terms.",
      href: "/products/learning-hub",
    },
    {
      name: "AI Study Studio",
      badge: "Error Diagnosis",
      description: "Targeted error analysis to correct misunderstandings before exam day.",
      href: "/products/ai-learning",
    },
    {
      name: "STEM Studio",
      badge: "Virtual Labs",
      description: "Interactive simulations for practical physics and chemistry experiment questions.",
      href: "/products/stem-studio",
    },
  ],
  teachingFormat: "Curriculum Modules + Practice Tests + Error Analysis",
  schedule: "Daily self-paced learning with weekend mock evaluations",
  duration: "6 Months",
  priceNote: "Included in Free & Premium plans",
  checkoutHref: "/pricing",
  enrolmentSteps: [
    {
      step: 1,
      title: "Register Your BrainLab Account",
      description: "Create a free student profile and choose NECO as your primary or secondary exam track.",
    },
    {
      step: 2,
      title: "Complete Module Checkpoints",
      description: "Read through syllabus topic breakdowns and complete short 10-question checkpoint drills.",
    },
    {
      step: 3,
      title: "Take Full Timed Mock Exams",
      description: "Sit for full timed mock exams to evaluate your readiness for exam day.",
    },
  ],
  faqs: [
    {
      question: "Can I prepare for both WAEC and NECO at the same time on BrainLab?",
      answer: "Yes. Both examinations share the same Nigerian secondary school curriculum. Preparing through BrainLab prepares you simultaneously for both certifications.",
    },
    {
      question: "Does the question bank include recent NECO past questions?",
      answer: "Yes. The simulator contains verified past questions with detailed step-by-step explanations.",
    },
  ],
};

export default function NecoProgrammePage() {
  return <ProgrammePageTemplate data={NECO_DATA} />;
}
