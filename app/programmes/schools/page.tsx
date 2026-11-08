import type { Metadata } from "next";
import { ProgrammePageTemplate, ProgrammeData } from "@/app/components/public/ProgrammePageTemplate";

export const metadata: Metadata = {
  title: "School & Tutorial Centre Institutional Programme | BrainLab Academy",
  description:
    "Enterprise CBT exam infrastructure, bulk student onboarding, teacher authoring studio, and multi-campus analytics for secondary schools.",
  alternates: { canonical: "/programmes/schools" },
};

const SCHOOLS_DATA: ProgrammeData = {
  id: "prog-schools",
  slug: "schools",
  title: "School & Tutorial Centre Institutional Programme",
  badge: "Institutional Licensing",
  tagline: "Equip your secondary school with enterprise-grade CBT examination and diagnostic infrastructure.",
  summary:
    "Designed for principals, proprietors, and directors of tutorial centres. Deploy authentic computer-based testing, conduct school-wide terminal mock examinations, generate branded student report slips, and monitor teacher diagnostic metrics.",
  status: "active",
  whoItIsFor: [
    "Private and public senior secondary schools preparing students for UTME and WAEC examinations.",
    "Tutorial and pre-degree foundation centres hosting regular weekly mock tests.",
    "School administrators seeking reliable, offline-resilient exam software that prevents network disruptions.",
  ],
  objectives: [
    "Streamline school terminal examinations with zero network vulnerability and instant grading.",
    "Empower subject teachers to author custom question banks tailored to termly schemes of work.",
    "Provide school leadership with actionable cohort analytics to pinpoint underperforming subjects early.",
  ],
  subjects: [
    {
      name: "Complete Secondary School Schemes of Work",
      category: "Compulsory",
      coverage: "Junior (JSS1-3) and Senior (SS1-3) curriculum coverage across all academic terms.",
      topicCount: 45,
    },
    {
      name: "Institutional Question Bank",
      category: "Compulsory",
      coverage: "Access to verified UTME and WAEC past examination items with teacher editing privileges.",
      topicCount: 30,
    },
    {
      name: "Custom School Examination Packages",
      category: "Technical",
      coverage: "Ability to upload and lock proprietary school examination questions with custom timing.",
      topicCount: 15,
    },
  ],
  includedProducts: [
    {
      name: "Institutional CBT Runtime",
      badge: "Exam Engine",
      description: "Offline-resilient exam environment with anti-cheat lockdown and candidate photo slips.",
      href: "/schools",
    },
    {
      name: "Teacher Authoring Studio",
      badge: "Question Creation",
      description: "Tools for teachers to create multiple-choice items, rich diagrams, and explanations.",
      href: "/for-tutors",
    },
    {
      name: "Cohort Diagnostic Analytics",
      badge: "Admin Cockpit",
      description: "School-wide dashboards tracking class averages, topic weaknesses, and teacher metrics.",
      href: "/schools",
    },
    {
      name: "STEM Studio Institutional",
      badge: "Virtual Labs",
      description: "Virtual lab bench deployment across school computer laboratories.",
      href: "/products/stem-studio",
    },
  ],
  teachingFormat: "School Lab Deployment + Offline CBT Server / PWA + Administrative Console",
  schedule: "Termly or Annual institutional licensing",
  duration: "Per Academic Session",
  priceNote: "Tiered pricing starting at ₦950 - ₦1,500 per student / term",
  checkoutHref: "/schools",
  enrolmentSteps: [
    {
      step: 1,
      title: "Request Institutional Onboarding",
      description: "Submit your school details to receive a 20-candidate sandbox mock pass at no cost.",
    },
    {
      step: 2,
      title: "Bulk Upload Candidates",
      description: "Import your student roster via CSV to automatically generate printable login slips.",
    },
    {
      step: 3,
      title: "Conduct Examinations & Generate Reports",
      description: "Administer timed tests and print official PDF result slips with your school crest.",
    },
  ],
  faqs: [
    {
      question: "Can BrainLab run without continuous internet in our school computer lab?",
      answer: "Yes. Our exam runtime downloads question packages into local browser storage. Even if internet service drops during an examination, students continue testing without interruption, and scores synchronize when connection is restored.",
    },
    {
      question: "Can our school print result slips with our school logo and principal's signature?",
      answer: "Yes. Premier Academy and Collegiate tiers support custom school branding, crest insertion, and principal signature upload on all candidate PDF result slips.",
    },
  ],
};

export default function SchoolsProgrammePage() {
  return <ProgrammePageTemplate data={SCHOOLS_DATA} />;
}
