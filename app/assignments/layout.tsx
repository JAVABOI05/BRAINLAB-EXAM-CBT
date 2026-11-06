import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Assignments · Student Portal",
  description: "Continuous assessment tasks, submissions, rubrics, and tutor feedback.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function AssignmentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
