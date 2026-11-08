import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "National Examination Calendar & Countdown (2026/2027) | BrainLab Academy",
  description:
    "Official schedule, registration deadlines, and live countdown for JAMB UTME, WAEC SSCE, NECO SSCE, and Post-UTME examinations. Timestamps formatted in Africa/Lagos (WAT, UTC+1).",
  alternates: {
    canonical: "https://www.brainlabacademy.com.ng/resources/exam-calendar",
  },
  openGraph: {
    title: "National Examination Calendar & Countdown | BrainLab Academy",
    description:
      "Official schedule, registration deadlines, and live countdown for JAMB UTME, WAEC, and NECO examinations.",
    url: "https://www.brainlabacademy.com.ng/resources/exam-calendar",
  },
};

export default function ExamCalendarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
