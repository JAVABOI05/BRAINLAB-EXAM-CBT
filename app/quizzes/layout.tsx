import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quizzes & Drills · Student Portal",
  description: "Bite-sized diagnostic assessments and rapid subject knowledge quizzes.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function QuizzesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
