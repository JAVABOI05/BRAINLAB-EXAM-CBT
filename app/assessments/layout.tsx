import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learning Assessments Hub · BrainLab Academy",
  description: "Official quizzes, academic diagnostic drills, timed tests, and national school competitions.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function AssessmentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
