import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Skills Passport · Student Portal",
  description: "Verified academic competencies, cognitive radar metrics, readiness indicators, and achievement badges.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function SkillsPassportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
