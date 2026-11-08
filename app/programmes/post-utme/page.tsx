import type { Metadata } from "next";
import { ProgrammePageTemplate, ProgrammeData } from "@/app/components/public/ProgrammePageTemplate";

export const metadata: Metadata = {
  title: "Post-UTME Screening Accelerator | BrainLab Academy",
  description:
    "Prepare for university-specific entrance examinations: UNILAG, UI, OAU, UNIBEN, ABU, and more with customized paper patterns and speed practice.",
  alternates: { canonical: "/programmes/post-utme" },
};

const POST_UTME_DATA: ProgrammeData = {
  id: "prog-post-utme",
  slug: "post-utme",
  title: "Post-UTME Screening Accelerator",
  badge: "University Screening",
  tagline: "Secure your university admission with institution-specific screening prep.",
  summary:
    "Post-UTME formats vary drastically across Nigerian universities—from 30-minute high-speed general papers to strict faculty subject tests. BrainLab trains candidates under specific institutional time constraints and marking schemes.",
  status: "active",
  whoItIsFor: [
    "UTME candidates who scored 200+ aiming for competitive programmes (Medicine, Law, Engineering, Pharmacy).",
    "Candidates applying to top federal and state universities with mandatory computer-based screening exams.",
    "Learners needing targeted speed-accuracy conditioning for 30-to-45-minute short exams.",
  ],
  objectives: [
    "Master institution-specific question styles and past screening trends.",
    "Develop lightning-fast test pace: solve 40 questions in 30 minutes without panic.",
    "Refine critical reasoning, current affairs, and faculty-specific advanced problem solving.",
  ],
  subjects: [
    {
      name: "General Paper & Critical Thinking",
      category: "Compulsory",
      coverage: "Logic puzzles, reading comprehension, current affairs, analogies, and quantitative aptitude.",
      topicCount: 12,
    },
    {
      name: "Engineering & Physical Sciences Combo",
      category: "Science",
      coverage: "Advanced calculus, mechanics, chemical equations, and technical reasoning.",
      topicCount: 15,
    },
    {
      name: "Medical & Health Sciences Combo",
      category: "Science",
      coverage: "Advanced biology genetics, organic chemistry, physiology, and physics optics.",
      topicCount: 16,
    },
    {
      name: "Law & Humanities Combo",
      category: "Arts & Humanities",
      coverage: "Advanced literature analysis, government structures, history, and verbal aptitude.",
      topicCount: 14,
    },
  ],
  includedProducts: [
    {
      name: "CBT Practice Simulator",
      badge: "Speed Drills",
      description: "Custom timers matching institution-specific 30-minute and 40-minute screening windows.",
      href: "/products/cbt",
    },
    {
      name: "Challenge Arena",
      badge: "1v1 Duels",
      description: "Fast-paced 10-question duels to hone rapid mental recall and instant elimination tactics.",
      href: "/products/challenge-arena",
    },
    {
      name: "AI Study Studio",
      badge: "Diagnostic AI",
      description: "Pinpoints high-frequency trap questions commonly used in university screenings.",
      href: "/products/ai-learning",
    },
    {
      name: "Curriculum Hub",
      badge: "Advanced Notes",
      description: "High-yield summaries of advanced topics frequently appearing on university tests.",
      href: "/products/learning-hub",
    },
  ],
  teachingFormat: "High-Velocity Mock Testing + Sprint Duels + Explanations",
  schedule: "Daily timed sprints and weekly full screening simulations",
  duration: "4 to 8 Weeks",
  priceNote: "Included in Premium & Plus plans",
  checkoutHref: "/pricing",
  enrolmentSteps: [
    {
      step: 1,
      title: "Select Your Target Institution & Faculty",
      description: "Set your target university (e.g. UNILAG, UI, OAU) to load the corresponding screening blueprint.",
    },
    {
      step: 2,
      title: "Practise Under Real Institutional Timers",
      description: "Take high-intensity 30-minute practice papers designed for competitive course cut-offs.",
    },
    {
      step: 3,
      title: "Review Trap Explanations",
      description: "Analyze the reasoning behind tricky distractors to maximize accuracy on screening day.",
    },
  ],
  faqs: [
    {
      question: "Are tests customized for specific universities?",
      answer: "Yes. Different universities configure different test structures—some emphasize general aptitude while others test 4 core UTME subjects. BrainLab allows you to configure mock parameters to match your school's format.",
    },
    {
      question: "When should I begin Post-UTME preparation?",
      answer: "We recommend beginning immediately after your UTME results are released to maintain academic momentum during the screening application window.",
    },
  ],
};

export default function PostUtmeProgrammePage() {
  return <ProgrammePageTemplate data={POST_UTME_DATA} />;
}
