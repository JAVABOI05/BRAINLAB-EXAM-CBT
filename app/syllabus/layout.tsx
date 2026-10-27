import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Official JAMB UTME Syllabus & Curriculum | BrainLab Academy",
  description:
    "Explore the official JAMB UTME examination syllabus, subtopic units, specific learning objectives, and recommended literature texts across all senior secondary subjects.",
  alternates: { canonical: "/syllabus" },
};

export default function SyllabusLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
