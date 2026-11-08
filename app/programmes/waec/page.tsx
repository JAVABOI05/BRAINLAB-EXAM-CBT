import type { Metadata } from "next";
import { ProgrammePageTemplate, ProgrammeData } from "@/app/components/public/ProgrammePageTemplate";

export const metadata: Metadata = {
  title: "WAEC SSCE Senior School Certificate Preparation | BrainLab Academy",
  description:
    "Master WAEC O-Level examinations with past questions, detailed step-by-step working, Chief Examiner report insights, and syllabus notes.",
  alternates: { canonical: "/programmes/waec" },
};

const WAEC_DATA: ProgrammeData = {
  id: "prog-waec",
  slug: "waec",
  title: "WAEC SSCE Senior School Certificate Programme",
  badge: "O-Level Certification",
  tagline: "Secure distinctions (A1-B3) across your 9 O-Level subjects.",
  summary:
    "Comprehensive preparation for May/June school candidates and Nov/Dec GCE private candidates. Combines objective multiple-choice practice with step-by-step worked solutions aligned with WAEC Chief Examiner standards.",
  status: "active",
  whoItIsFor: [
    "Senior Secondary 3 (SS3) students preparing for their final West African Senior School Certificate Examination.",
    "Private candidates writing WAEC GCE (Second Series) to complete their university entrance requirements.",
    "SS1 and SS2 students building strong curriculum foundations ahead of graduation year.",
  ],
  objectives: [
    "Master the complete Nigerian secondary school syllabus from SS1 through SS3.",
    "Understand the marking scheme requirements for numerical working and scientific descriptions.",
    "Avoid common candidate pitfalls and careless errors highlighted in WAEC Chief Examiners' annual reports.",
  ],
  subjects: [
    {
      name: "General Mathematics",
      category: "Compulsory",
      coverage: "Algebraic processes, geometry, trigonometry, statistics, probability, and financial mathematics.",
      topicCount: 22,
    },
    {
      name: "English Language",
      category: "Compulsory",
      coverage: "Essay writing structures, formal & informal letters, comprehension, summary writing, and lexis.",
      topicCount: 16,
    },
    {
      name: "Core Science Subjects (Physics, Chemistry, Biology)",
      category: "Science",
      coverage: "Practical-oriented theory, laboratory apparatus setups, balancing redox reactions, and classification.",
      topicCount: 28,
    },
    {
      name: "Commercial Subjects (Accounting, Commerce, Economics)",
      category: "Commercial & Social Sciences",
      coverage: "Balance sheets, double-entry bookkeeping, consumer behavior, and financial markets.",
      topicCount: 18,
    },
    {
      name: "Arts & Humanities (Literature, Government, CRS/IRS)",
      category: "Arts & Humanities",
      coverage: "African & non-African prose, poetry, constitutional history, and civic governance.",
      topicCount: 19,
    },
  ],
  includedProducts: [
    {
      name: "CBT Practice Simulator",
      badge: "Objective Practice",
      description: "Timed multiple-choice mock papers with full question explanations.",
      href: "/products/cbt",
    },
    {
      name: "Curriculum Learning Hub",
      badge: "Topic Notes",
      description: "Full senior secondary syllabus notes organized by term and topic.",
      href: "/products/learning-hub",
    },
    {
      name: "Live Classroom",
      badge: "Tutor Masterclasses",
      description: "Interactive whiteboard sessions solving past WAEC theory and objective papers.",
      href: "/products/live-classroom",
    },
    {
      name: "STEM Studio",
      badge: "Practical Science",
      description: "Simulate physics mechanics experiments and chemistry qualitative analysis.",
      href: "/products/stem-studio",
    },
  ],
  teachingFormat: "Curriculum Reading + Objective Practice + Live Masterclasses",
  schedule: "Structured termly syllabus with weekly past question reviews",
  duration: "6 to 9 Months",
  priceNote: "Included in Free & Premium plans",
  checkoutHref: "/pricing",
  enrolmentSteps: [
    {
      step: 1,
      title: "Select Your Subject Combination",
      description: "Choose your 9 core and elective subjects according to your secondary school department.",
    },
    {
      step: 2,
      title: "Study Termly Topic Modules",
      description: "Review lesson notes and take 10-question checkpoint quizzes at the end of each module.",
    },
    {
      step: 3,
      title: "Take Full-Length Practice Exams",
      description: "Simulate real exam conditions to build stamina and identify remaining revision gaps.",
    },
  ],
  faqs: [
    {
      question: "Does the programme cover both School (May/June) and Private (GCE) candidates?",
      answer: "Yes. The syllabus and question bank comprehensively cover both series of WAEC examinations.",
    },
    {
      question: "Are practical examination requirements covered?",
      answer: "Yes. STEM Studio provides virtual experiment simulations for physics pendulum, optics, and chemistry titration that mirror the physical laboratory setups examined in WAEC Alternative to Practical papers.",
    },
  ],
};

export default function WaecProgrammePage() {
  return <ProgrammePageTemplate data={WAEC_DATA} />;
}
