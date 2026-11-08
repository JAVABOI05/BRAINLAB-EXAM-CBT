import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Academic Downloads, Exam Timetables & Past Questions",
  description:
    "Free academic resources for Nigerian secondary students preparing for JAMB UTME, WAEC, and NECO. Download official exam syllabi, revision timetables, and formula sheets.",
  alternates: {
    canonical: "https://www.brainlabacademy.com.ng/resources",
  },
  openGraph: {
    title: "Academic Downloads & Past Questions | BrainLab Academy",
    description:
      "Free downloads, official exam syllabi, revision timetables, and formula sheets for Nigerian candidates.",
    url: "https://www.brainlabacademy.com.ng/resources",
  },
};

export default function ResourcesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
