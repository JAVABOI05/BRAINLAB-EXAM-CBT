import type { Metadata } from "next";
import { ProgrammePageTemplate, ProgrammeData } from "@/app/components/public/ProgrammePageTemplate";

export const metadata: Metadata = {
  title: "STEM Studio Virtual Laboratory Programme | BrainLab Academy",
  description:
    "Conduct practical scientific experiments in 2D virtual laboratories: physics kinematics, DC circuits, acid-base pH titration, genetics crosses, and logic gates.",
  alternates: { canonical: "/programmes/stem" },
};

const STEM_DATA: ProgrammeData = {
  id: "prog-stem",
  slug: "stem",
  title: "STEM Studio Virtual Laboratory Programme",
  badge: "Practical Science",
  tagline: "Bridge textbook theory with interactive experimental mastery.",
  summary:
    "Designed for science candidates preparing for practical examinations and STEM coursework. Students manipulate parameters in real time across 5 interactive lab benches: Kinematics, Electrical Circuits, Titration, Genetics, and Digital Logic.",
  status: "active",
  whoItIsFor: [
    "Secondary school science students with limited access to physical school laboratory equipment.",
    "Candidates preparing for WAEC, NECO, and Cambridge Alternative to Practical science exams.",
    "Curious learners wanting to visualize complex equations and scientific phenomena dynamically.",
  ],
  objectives: [
    "Develop practical scientific intuition through parameter manipulation and real-time telemetry observation.",
    "Master graph plotting: understand relationships between variables (e.g. current vs voltage, projectile trajectory vs angle).",
    "Prepare confidently for exam questions requiring apparatus identification, titration readings, and circuit schematics.",
  ],
  subjects: [
    {
      name: "Physics Virtual Laboratories",
      category: "Science",
      coverage: "Kinematics & projectile motion, DC Ohm's Law circuits, simple pendulum harmonic motion, and optics.",
      topicCount: 8,
    },
    {
      name: "Chemistry Virtual Laboratories",
      category: "Science",
      coverage: "Strong acid - strong base pH titration, endpoint color change, Boyle's/Charles' gas laws, and redox series.",
      topicCount: 6,
    },
    {
      name: "Biology Genetic Laboratories",
      category: "Science",
      coverage: "Mendelian monohybrid and dihybrid Punnett squares, sex-linked inheritance, and blood group phenotypes.",
      topicCount: 5,
    },
    {
      name: "Digital Electronics & Logic Gates",
      category: "Technical",
      coverage: "AND, OR, NOT, NAND, NOR, and XOR gate truth tables, circuit diagrams, and Boolean algebraic simplification.",
      topicCount: 4,
    },
  ],
  includedProducts: [
    {
      name: "STEM Studio Workspaces",
      badge: "Interactive Labs",
      description: "Dedicated 2D simulation workbench with real-time parameter controls.",
      href: "/products/stem-studio",
    },
    {
      name: "Live Classroom",
      badge: "Smart Whiteboard",
      description: "Tutors present virtual simulations directly on the lecture stage during live masterclasses.",
      href: "/products/live-classroom",
    },
    {
      name: "CBT Practice Simulator",
      badge: "Practical Exams",
      description: "Past questions specifically testing experimental procedures and diagram interpretation.",
      href: "/products/cbt",
    },
    {
      name: "Learning Hub",
      badge: "Theory Guides",
      description: "In-depth experimental theory notes explaining underlying scientific principles.",
      href: "/products/learning-hub",
    },
  ],
  teachingFormat: "Interactive Simulations + Graph Plotters + Guided Experiment Worksheets",
  schedule: "Self-paced laboratory access with guided experiment challenges",
  duration: "Flexible Modular / Continuous",
  priceNote: "Discover access included in Free tier; full labs in Premium & Plus",
  checkoutHref: "/pricing",
  enrolmentSteps: [
    {
      step: 1,
      title: "Select an Interactive Simulation Bench",
      description: "Choose from Kinematics, Electrical Circuits, Titration, Genetics, or Logic Gates.",
    },
    {
      step: 2,
      title: "Adjust Parameters & Observe Telemetry",
      description: "Use slider controls to adjust voltages, angles, or concentrations and observe real-time graphs.",
    },
    {
      step: 3,
      title: "Solve Practical Past-Paper Problems",
      description: "Apply your experimental observations to solve past examination practical problems.",
    },
  ],
  faqs: [
    {
      question: "Do I need a high-end computer to run the virtual laboratories?",
      answer: "No. BrainLab STEM Studio is built on pure 2D canvas and vector rendering. It runs smoothly on basic smartphones, budget laptops, and low-spec tablets.",
    },
    {
      question: "Is there a low-data fallback for poor connectivity?",
      answer: "Yes. Every simulation bench includes a lightweight static SVG mode and formula table that displays immediately even on weak 2G or 3G mobile data.",
    },
  ],
};

export default function StemProgrammePage() {
  return <ProgrammePageTemplate data={STEM_DATA} />;
}
