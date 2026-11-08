import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Institutional CBT Licensing for Secondary Schools",
  description:
    "Empower your school's graduating class with standardized JAMB UTME mock exams, custom access codes, and comparative cohort performance analytics.",
  alternates: {
    canonical: "https://www.brainlabacademy.com.ng/schools",
  },
  openGraph: {
    title: "Institutional CBT Licensing for Secondary Schools | BrainLab Academy",
    description:
      "Standardized CBT mock examinations, custom school access codes, and comparative academic analytics for Nigerian secondary schools.",
    url: "https://www.brainlabacademy.com.ng/schools",
  },
};

export default function SchoolsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
