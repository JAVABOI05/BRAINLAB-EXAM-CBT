import type { Metadata } from "next";
import { ProgrammePageTemplate, ProgrammeData } from "@/app/components/public/ProgrammePageTemplate";

export const metadata: Metadata = {
  title: "Nursing & Health Sciences Professional Entrance [In Development] | BrainLab Academy",
  description:
    "Preparation programme for Basic Nursing, Midwifery, and Health Technology entrance examinations. Currently in active curriculum development.",
  alternates: { canonical: "/programmes/nursing" },
};

const NURSING_DATA: ProgrammeData = {
  id: "prog-nursing",
  slug: "nursing",
  title: "Nursing & Health Sciences Professional Entrance",
  badge: "Professional Track",
  tagline: "Specialized preparation for College of Nursing, Midwifery, and Health Technology entrance tests.",
  summary:
    "A dedicated preparation track for candidates applying to accredited Colleges of Nursing Sciences, Post-Basic Midwifery, and Colleges of Health Technology across Nigeria. Currently undergoing curriculum structuring and item validation.",
  status: "planned",
  statusNote:
    "This programme is currently in curriculum design and question validation. Registration is not yet open for live examinations. You can register your interest below to receive priority access upon launch.",
  whoItIsFor: [
    "O-Level holders seeking admission into General Nursing (RN) and Basic Midwifery (RM) programmes.",
    "Candidates preparing for NMCN-accredited school of nursing entrance examinations.",
    "Prospective community health, medical laboratory technician, and pharmacy technician applicants.",
  ],
  objectives: [
    "Master foundational human anatomy, physiology, and basic clinical vocabulary tested in entrance exams.",
    "Solve applied health science reasoning questions and medical arithmetic dosage calculations.",
    "Familiarize candidates with the exact testing formats used by leading hospital schools of nursing.",
  ],
  subjects: [
    {
      name: "Anatomy & Physiology Fundamentals",
      category: "Science",
      coverage: "Skeletal, circulatory, digestive, endocrine, and reproductive systems with diagram identification.",
      topicCount: 12,
    },
    {
      name: "Applied Health Sciences (Biology & Chemistry)",
      category: "Science",
      coverage: "Pathology basics, pharmacology arithmetic, nutrition, microbiology, and biochemical cycles.",
      topicCount: 14,
    },
    {
      name: "English Language & Medical Communication",
      category: "Compulsory",
      coverage: "Reading comprehension of medical texts, lexis, sentence structure, and vocabulary precision.",
      topicCount: 10,
    },
    {
      name: "Basic Health Mathematics & Dosage Arithmetic",
      category: "Science",
      coverage: "Metric conversions, ratios, percentages, fractions, and clinical measurement problems.",
      topicCount: 8,
    },
  ],
  includedProducts: [
    {
      name: "CBT Practice Simulator",
      badge: "In Development",
      description: "Dedicated question formats tailored to state and teaching hospital nursing entrance exams.",
      href: "/products/cbt",
    },
    {
      name: "AI Study Studio",
      badge: "In Development",
      description: "Socratic guidance on complex biological pathways and clinical calculation steps.",
      href: "/products/ai-learning",
    },
    {
      name: "Curriculum Hub",
      badge: "In Development",
      description: "High-yield illustrated summaries of key anatomical structures and health definitions.",
      href: "/products/learning-hub",
    },
    {
      name: "STEM Studio",
      badge: "In Development",
      description: "Interactive virtual simulations for physiology mechanisms and chemical solution prep.",
      href: "/products/stem-studio",
    },
  ],
  teachingFormat: "Curriculum Modules + Entrance CBT Simulations [Planned]",
  schedule: "To be announced upon formal curriculum certification",
  duration: "4 to 6 Months estimated",
  priceNote: "Pricing will be published upon curriculum certification",
  checkoutHref: "/contact?subject=Nursing+Programme+Waitlist",
  enrolmentSteps: [
    {
      step: 1,
      title: "Join the Nursing Academic Waitlist",
      description: "Submit your contact details and target schools of nursing to be notified when beta access opens.",
    },
    {
      step: 2,
      title: "Receive Curriculum Blueprint & Sample Questions",
      description: "Get early access to our preliminary syllabus outline and sample entrance test problems.",
    },
    {
      step: 3,
      title: "Enrol with Priority Beta Pricing",
      description: "Waitlist members receive priority invitation and promotional pricing upon official launch.",
    },
  ],
  faqs: [
    {
      question: "When will the Nursing & Health Sciences programme launch?",
      answer: "The curriculum and question bank are currently being reviewed by experienced nurse educators and health tutors. We anticipate opening beta access in the upcoming academic cycle. Register your interest to be notified.",
    },
    {
      question: "Can I use existing BrainLab Science subjects in the meantime?",
      answer: "Yes! The core entrance subjects (Biology, Chemistry, Physics, Mathematics, and English) are already fully active on our platform under the UTME and WAEC programmes.",
    },
  ],
};

export default function NursingProgrammePage() {
  return <ProgrammePageTemplate data={NURSING_DATA} />;
}
